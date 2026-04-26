import { createNanoSession } from './gemini-nano';
import { executeTool } from './tool-executor';
import type { StoreRefs } from './tool-executor';
import type { ChatMessage, ToolCall } from './types';
import type { ToolCallInfo } from './llm-chat-service';

const MAX_TOOL_ITERATIONS = 10;

// Nano専用システムプロンプト
// デッキ全体リストは渡さない（searchDeckCardsで検索させる）
const NANO_SYSTEM_PROMPT = `あなたは遊戯王デッキアシスタントです。
ユーザーの指示をツールを使って処理し、結果を日本語で報告してください。

## ツール一覧

searchDeckCards: デッキ内を条件で検索
  args: { keyword?: string, kind?: "name"|"race"|"attribute"|"type"|"text"|"auto", cardType?: "monster"|"spell"|"trap", section?: "main"|"extra"|"side" }
  結果: cards[]{name,cardId,quantity,race,attribute,section,text}, totalCount
  例: {"tool":"searchDeckCards","args":{"keyword":"手札","kind":"text","cardType":"monster"}}

getCardDetail: カード1枚の効果テキストを取得
  args: { cardId: string }
  結果: name, cardType, text

resolveCardName: 曖昧なカード名→cardId解決（デッキ内照合）
  args: { name: string }
  結果: cardId, name

getDeckState: デッキ各セクションの枚数確認
  args: {}

moveCard: カードをセクション間で移動
  args: { cardIds: string[], from: "main"|"extra"|"side"|"trash", to: "main"|"extra"|"side"|"trash" }
  注意: quantity=3のカードはcardIdsに同一IDを3回繰り返す

removeCardFromDeck: カードをtrashへ削除
  args: { cardIds: string[], from: "main"|"extra"|"side" }

addCardToDeck: カードをデッキへ追加
  args: { cardId: string, section: "main"|"extra"|"side" }

searchCards: 外部DBからカードを検索（デッキ外のカードを追加する場合）
  args: { keyword: string }

getChatHistory: 直前の会話でのツール実行履歴と結果を取得
  args: {}
  使いどころ: 「その〇枚」「さっきの結果」等、前の返答で得た情報を参照する場合

## タスク分解パターン

デッキ内検索・集計（「手札で発動できるカードは？」「ドラゴン族は何枚？」）:
  → searchDeckCards(keyword, kind) → 結果を返答

カード効果確認（「ブラマジの効果は？」）:
  → resolveCardName → getCardDetail → textを返答

あるカードの効果でサーチ・特殊召喚できるカードを調べる:
  例: 「フレアで加えられるカードは？」「ホワイトフェイスをサーチできるカードは？」「〇〇でリクルートできるカードは？」
  → resolveCardName(そのカード名) → getCardDetail(cardId) → 効果テキストからサーチ/リクルート条件を特定
  ※そのカード名自体をkeywordにしたname検索はしない（カード自身が出てしまう）
  ※回答は必ずgetCardDetailで確認したテキストに基づくこと
  デッキ内限定（「このデッキでは」等）の場合 → searchDeckCards(条件)でデッキ内を確認
  デッキ限定なしの場合 → searchCards(条件)で外部DBから該当カードを検索
  **重要**: searchDeckCardsを直接呼ばないこと。必ずまずresolveCardName→getCardDetailで効果を確認してから条件を特定すること。

前ターン結果を参照する操作・分析（「その22枚を分類して」「それを移動して」）:
  → getChatHistory → 前の結果のcardIds取得
  → (分析) getCardDetailを各カードに実行 → 整理して返答
  → (移動) moveCard/removeCardFromDeck

対象特定→操作（「ドラゴン族をサイドに移動して」）:
  → searchDeckCards → cardIds取得 → moveCard → 報告

外部カード追加（「ブルーアイズを追加して」）:
  → resolveCardName → 見つからなければsearchCards → addCardToDeck

複数カードの効果を比較・分析（「このデッキの融合モンスターを効果で分類して」）:
  → searchDeckCards(cardType) → 各cardIdにgetCardDetail → まとめて返答

## 出力ルール
- ツール呼び出し: まず1行で理由・計画を述べ、その後に {"tool":"ツール名","args":{...}} を返す（例: 「ベミドバルの効果を確認します。\n{"tool":"getCardDetail","args":{"cardId":"1234"}}」）
- 最終回答: そのまま日本語テキストで返す
- **カード名の捏造禁止**: カード名を答えに含める場合は、必ずツールの返却値に含まれているカードのみ記載すること。デッキ内外を問わず、ツールで確認していないカード名は絶対に出力しない
- **カード名の出力形式**: 回答にカード名を含める場合は \`{{カード名|cardId}}\` または \`{{カード名}}\` 形式で記載すること。cardId が分かれば \`{{ブラック・マジシャン|4335}}\` のように記載し、分からなければ \`{{ブラック・マジシャン}}\` でよい
- 情報が不足している場合は適切なツールを呼んで補う（推測しない）`;

function parseToolCall(response: string): ToolCall | null {
  const text = response.trim();
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]) as { tool?: string; args?: Record<string, unknown> };
    if (parsed.tool && typeof parsed.tool === 'string') {
      return { name: parsed.tool, arguments: parsed.args ?? {} };
    }
  } catch {
    // not valid JSON
  }
  return null;
}

// ツール結果から確認済みカード名セットを収集
function collectVerifiedCardNames(messages: Array<{ role: string; toolResultData?: unknown }>): Set<string> {
  const names = new Set<string>();
  for (const msg of messages) {
    if (msg.role !== 'tool' || !msg.toolResultData) continue;
    const d = msg.toolResultData;
    if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray((d as Record<string, unknown>).cards)) {
      for (const c of (d as { cards: Array<Record<string, unknown>> }).cards) {
        if (typeof c.name === 'string') names.add(c.name);
      }
    }
    if (Array.isArray(d)) {
      for (const c of d as Array<Record<string, unknown>>) {
        if (typeof c.name === 'string') names.add(c.name);
      }
    }
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const obj = d as Record<string, unknown>;
      if (typeof obj.name === 'string') names.add(obj.name);
    }
  }
  return names;
}

// 回答内の {{...}} にツール未確認のカード名が含まれているか
function hasUnverifiedCardNames(response: string, verifiedNames: Set<string>): string[] {
  const unverified: string[] = [];
  const regex = /\{\{([^|{}]+?)(?:\|(\d+))?\}\}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(response)) !== null) {
    const name = match[1]!;
    if (!verifiedNames.has(name)) {
      unverified.push(name);
    }
  }
  return unverified;
}

function buildHistoryContext(history: ChatMessage[]): string {
  if (history.length === 0) return '';

  const lines: string[] = ['[直前の会話履歴]'];
  for (const msg of history) {
    if (msg.role === 'user') {
      lines.push(`ユーザー: ${msg.content}`);
    } else if (msg.role === 'assistant') {
      lines.push(`アシスタント: ${msg.content}`);
    } else if (msg.role === 'tool') {
      const detail = msg.toolResultData
        ? JSON.stringify(msg.toolResultData)
        : msg.content;
      lines.push(`[ツール ${msg.toolName ?? ''} 実行済み]: ${detail}`);
    }
  }
  return lines.join('\n');
}

export async function runNanoPipeline(
  userMessage: string,
  history: ChatMessage[],
  storeRefs: StoreRefs,
  onToolCall?: (info: ToolCallInfo) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw new Error('aborted');

  const session = await createNanoSession(NANO_SYSTEM_PROMPT);
  try {
    // 会話履歴コンテキスト + 現在の指示を最初のメッセージとして送る
    const historyContext = buildHistoryContext(history);
    const firstMessage = historyContext
      ? `${historyContext}\n\nユーザーの指示: ${userMessage}`
      : userMessage;

    let nanoResponse = await session.prompt(firstMessage);
    console.debug('[nano-pipeline] initial response:', nanoResponse);
    if (signal?.aborted) throw new Error('aborted');

    const toolResults: Array<{ role: string; toolResultData?: unknown }> = [];

    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const toolCall = parseToolCall(nanoResponse);
      console.debug(`[nano-pipeline] iteration ${i}: toolCall=${toolCall ? toolCall.name : 'null'}, response=${nanoResponse.substring(0, 200)}`);
      if (!toolCall) {
        // 最終回答: 未確認カード名があればNanoに修正させる（最大3回）
        for (let r = 0; r < 3; r++) {
          const verifiedNames = collectVerifiedCardNames(toolResults);
          const unverified = hasUnverifiedCardNames(nanoResponse, verifiedNames);
          if (unverified.length === 0) break;
          const names = unverified.join('、');
          nanoResponse = await session.prompt(
            `あなたの出力にツールで確認していないカード名が含まれています: ${names}\n` +
            `ルールを守って、ツール（resolveCardName / searchCards）でカード名を確認した上で {{カード名|cardId}} 形式で出力し直してください。`
          );
          if (signal?.aborted) throw new Error('aborted');
        }
        return nanoResponse;
      }

      const toolResult = await executeTool(toolCall, storeRefs);
      // NanoのレスポンスからツールJSON以外のテキスト（思考・理由）を抽出
      const reasoning = nanoResponse.replace(/\{[\s\S]*\}/, '').trim();
      onToolCall?.({ name: toolCall.name, args: toolCall.arguments, result: toolResult, nanoReasoning: reasoning || undefined });
      if (toolResult.success && toolResult.data !== undefined) {
        toolResults.push({ role: 'tool', toolResultData: toolResult.data });
      }

      if (signal?.aborted) throw new Error('aborted');

      const resultMessage = toolResult.success
        ? `ツール ${toolCall.name} の実行結果:\n${JSON.stringify(toolResult.data ?? '成功')}`
        : `ツール ${toolCall.name} のエラー: ${toolResult.error}`;

      nanoResponse = await session.prompt(resultMessage);
      console.debug(`[nano-pipeline] after ${toolCall.name}:`, nanoResponse.substring(0, 200));
      if (signal?.aborted) throw new Error('aborted');
    }

    return nanoResponse;
  } finally {
    session.destroy();
  }
}
