import { createNanoSession } from './gemini-nano';
import { executeTool } from './tool-executor';
import type { StoreRefs } from './tool-executor';
import type { ToolCallInfo } from './llm-chat-service';

// Stage 1: 指示のparse
const INTENT_PARSE_PROMPT = `遊戯王デッキアシスタントへの指示をJSONで分類してください。
フォーマット:
{"action":"move"|"remove"|"add"|"search"|"count"|"cardInfo","keyword"?:"検索語","kind"?:"name"|"race"|"attribute"|"type"|"text"|"auto","cardType"?:"monster"|"spell"|"trap","from"?:"main"|"extra"|"side"|"trash","to"?:"main"|"extra"|"side"|"trash","cardName"?:"カード名","quantity"?:"all"|数値}

kind: 検索語の意味。"name"=カード名、"race"=種族、"attribute"=属性、"type"=モンスタータイプ、"text"=効果テキスト、"auto"=自動判別(省略時)

action一覧:
- "move": カードを別セクションに移動
- "remove": カードをデッキから削除
- "add": カードをデッキに追加（外部から検索して追加含む）
- "search": 条件に合うカードをデッキ内から探す
- "count": デッキの枚数や条件に合うカードの枚数を数える
- "cardInfo": 特定カードの効果や詳細を確認する

例:
「ドラゴン族をサイドに移動」→{"action":"move","keyword":"ドラゴン族","kind":"race","from":"main","to":"side","quantity":"all"}
「ホワイトフェイスをサイドに移動」→{"action":"move","keyword":"ホワイトフェイス","kind":"name","from":"main","to":"side","quantity":"all"}
「魔法を全て削除」→{"action":"remove","cardType":"spell","from":"main","quantity":"all"}
「ブラック・マジシャンを追加」→{"action":"add","cardName":"ブラック・マジシャン","to":"main"}
「ドラゴン族は何枚？」→{"action":"count","keyword":"ドラゴン族","kind":"race"}
「デッキのモンスター一覧」→{"action":"search","cardType":"monster"}
「ブラマジの効果は？」→{"action":"cardInfo","cardName":"ブラック・マジシャン"}
「戦士族のサーチカードを探して」→{"action":"search","keyword":"サーチ","kind":"name","cardType":"spell"}
「手札で発動できるカードは？」→{"action":"search","keyword":"手札","kind":"text"}
JSON以外は絶対に返さないこと。`;

// Stage 4: 処理計画
const PLAN_PROMPT = `以下の検索結果から移動/削除すべきカードIDをJSONで返してください。
同じカードがN枚ある場合はIDをN回繰り返すこと。
フォーマット: {"cardIds":["id1","id1","id2",...]}
JSON以外は返さないこと。`;

// Stage 6: 結果報告
const REPORT_PROMPT = `以下の操作結果を日本語で1〜2文で報告してください。余計な説明は不要です。`;

interface ParsedIntent {
  action: 'move' | 'remove' | 'add' | 'search' | 'count' | 'cardInfo';
  keyword?: string;
  kind?: 'name' | 'race' | 'attribute' | 'type' | 'text' | 'auto';
  cardType?: 'monster' | 'spell' | 'trap';
  from?: 'main' | 'extra' | 'side' | 'trash';
  to?: 'main' | 'extra' | 'side' | 'trash';
  cardName?: string;
  quantity?: 'all' | number;
}

function extractJson(text: string): unknown {
  const match = text.trim().match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

async function nanoPrompt(systemPrompt: string, userMessage: string): Promise<string> {
  const session = await createNanoSession(systemPrompt);
  try {
    return await session.prompt(userMessage);
  } finally {
    session.destroy();
  }
}

async function handleSearchAction(
  intent: ParsedIntent,
  storeRefs: StoreRefs,
  onToolCall?: (info: ToolCallInfo) => void,
): Promise<string> {
  const searchArgs: Record<string, unknown> = {};
  if (intent.keyword) searchArgs.keyword = intent.keyword;
  if (intent.kind) searchArgs.kind = intent.kind;
  if (intent.cardType) searchArgs.cardType = intent.cardType;
  if (intent.from) searchArgs.section = intent.from;

  const searchResult = await executeTool({ name: 'searchDeckCards', arguments: searchArgs }, storeRefs);
  onToolCall?.({ name: 'searchDeckCards', args: searchArgs, result: searchResult });

  if (!searchResult.success) {
    return `検索に失敗しました: ${searchResult.error}`;
  }

  const data = searchResult.data as { cards: Array<{ name: string; cardId: string; quantity: number; race?: string; attribute?: string; section: string }>; totalCount: number };

  if (data.cards.length === 0) {
    return '該当するカードがデッキに見つかりませんでした。';
  }

  const lines = data.cards.map(c => {
    const details: string[] = [];
    if (c.race) details.push(c.race);
    if (c.attribute) details.push(c.attribute);
    const detail = details.length > 0 ? `(${details.join('/')})` : '';
    return `- ${c.name}${detail}: ${c.quantity}枚 [${c.section}]`;
  });

  const sectionLabel = intent.from ? ` (${intent.from === 'main' ? 'メイン' : intent.from === 'extra' ? 'エクストラ' : 'サイド'}デッキ内)` : ' (デッキ内)';
  const header = intent.keyword
    ? `「${intent.keyword}」の検索結果${sectionLabel}:`
    : intent.cardType
      ? `${intent.cardType === 'monster' ? 'モンスター' : intent.cardType === 'spell' ? '魔法' : '罠'}カードの検索結果${sectionLabel}:`
      : `検索結果${sectionLabel}:`;

  return `${header}\n${lines.join('\n')}\n合計: ${data.totalCount}枚`;
}

async function handleCountAction(
  intent: ParsedIntent,
  storeRefs: StoreRefs,
  onToolCall?: (info: ToolCallInfo) => void,
): Promise<string> {
  if (!intent.keyword && !intent.cardType && !intent.from) {
    // デッキ全体の枚数
    const stateResult = await executeTool({ name: 'getDeckState', arguments: {} }, storeRefs);
    onToolCall?.({ name: 'getDeckState', args: {}, result: stateResult });

    if (stateResult.success && stateResult.data) {
      const state = stateResult.data as Record<string, unknown>;
      return `デッキ全体の枚数: ${JSON.stringify(state)}`;
    }
    return 'デッキ情報の取得に失敗しました。';
  }

  // 条件付きカウント
  const searchArgs: Record<string, unknown> = {};
  if (intent.keyword) searchArgs.keyword = intent.keyword;
  if (intent.kind) searchArgs.kind = intent.kind;
  if (intent.cardType) searchArgs.cardType = intent.cardType;
  if (intent.from) searchArgs.section = intent.from;

  const searchResult = await executeTool({ name: 'searchDeckCards', arguments: searchArgs }, storeRefs);
  onToolCall?.({ name: 'searchDeckCards', args: searchArgs, result: searchResult });

  if (!searchResult.success) {
    return `検索に失敗しました: ${searchResult.error}`;
  }

  const data = searchResult.data as { cards: Array<{ name: string; quantity: number }>; totalCount: number };
  const filterDesc = intent.keyword ?? intent.cardType ?? '';
  return `${filterDesc ? `「${filterDesc}」の条件で` : ''}${data.totalCount}枚見つかりました。`;
}

async function handleCardInfoAction(
  intent: ParsedIntent,
  storeRefs: StoreRefs,
  onToolCall?: (info: ToolCallInfo) => void,
): Promise<string> {
  if (!intent.cardName) {
    return 'カード名を指定してください。';
  }

  // まずデッキ内から検索
  const resolveResult = await executeTool({ name: 'resolveCardName', arguments: { name: intent.cardName } }, storeRefs);
  onToolCall?.({ name: 'resolveCardName', args: { name: intent.cardName }, result: resolveResult });

  if (resolveResult.success) {
    const resolved = resolveResult.data as { cardId?: string; name?: string };
    if (resolved?.cardId) {
      const detailResult = await executeTool({ name: 'getCardDetail', arguments: { cardId: resolved.cardId } }, storeRefs);
      onToolCall?.({ name: 'getCardDetail', args: { cardId: resolved.cardId }, result: detailResult });

      if (detailResult.success && detailResult.data) {
        const card = detailResult.data as { name: string; cardType: string; text?: string };
        if (card.text) {
          return `${card.name}の効果:\n${card.text}`;
        }
        return `${card.name}の詳細情報を取得しましたが、効果テキストがありません。`;
      }
    }
  }

  return `カード「${intent.cardName}」が見つかりませんでした。デッキ内に存在するカードを指定してください。`;
}

export async function runNanoPipeline(
  userMessage: string,
  storeRefs: StoreRefs,
  onToolCall?: (info: ToolCallInfo) => void,
  signal?: AbortSignal,
): Promise<string> {
  if (signal?.aborted) throw new Error('aborted');

  // Stage 1: 指示のparse
  const intentRaw = await nanoPrompt(INTENT_PARSE_PROMPT, userMessage);
  if (signal?.aborted) throw new Error('aborted');

  const intent = extractJson(intentRaw) as ParsedIntent | null;
  if (!intent?.action) {
    return 'すみません、指示を理解できませんでした。もう少し具体的に教えてください。';
  }

  // 検索・質問系アクション
  if (intent.action === 'search') {
    return await handleSearchAction(intent, storeRefs, onToolCall);
  }

  if (intent.action === 'count') {
    return await handleCountAction(intent, storeRefs, onToolCall);
  }

  if (intent.action === 'cardInfo') {
    return await handleCardInfoAction(intent, storeRefs, onToolCall);
  }

  // 操作系アクション（move/remove）

  // Stage 2: 情報の取得
  let searchCardIds: Array<{ cardId: string; quantity: number }> = [];

  if ((intent.action === 'move' || intent.action === 'remove') && (intent.keyword || intent.cardType)) {
    const searchArgs: Record<string, unknown> = {};
    if (intent.keyword) searchArgs.keyword = intent.keyword;
    if (intent.kind) searchArgs.kind = intent.kind;
    if (intent.cardType) searchArgs.cardType = intent.cardType;
    if (intent.from) searchArgs.section = intent.from;

    const searchResult = await executeTool({ name: 'searchDeckCards', arguments: searchArgs }, storeRefs);
    onToolCall?.({ name: 'searchDeckCards', args: searchArgs, result: searchResult });

    if (!searchResult.success) {
      return `検索に失敗しました: ${searchResult.error}`;
    }

    const data = searchResult.data as { cards: Array<{ cardId: string; quantity: number }>; totalCount: number };
    if (data.cards.length === 0) {
      return '該当するカードがデッキに見つかりませんでした。';
    }
    searchCardIds = data.cards;
  }

  // addアクション
  if (intent.action === 'add' && intent.cardName) {
    const resolveResult = await executeTool({ name: 'resolveCardName', arguments: { name: intent.cardName } }, storeRefs);
    onToolCall?.({ name: 'resolveCardName', args: { name: intent.cardName }, result: resolveResult });

    // デッキ内に見つからない場合、外部検索を試みる
    if (!resolveResult.success || !(resolveResult.data as { cardId?: string })?.cardId) {
      const searchResult = await executeTool({ name: 'searchCards', arguments: { keyword: intent.cardName } }, storeRefs);
      onToolCall?.({ name: 'searchCards', args: { keyword: intent.cardName }, result: searchResult });

      if (searchResult.success && searchResult.data) {
        const results = searchResult.data as Array<{ cardId: string; name: string }>;
        if (results.length > 0) {
          const first = results[0];
          const addResult = await executeTool({ name: 'addCardToDeck', arguments: { cardId: first.cardId, section: intent.to ?? 'main' } }, storeRefs);
          onToolCall?.({ name: 'addCardToDeck', args: { cardId: first.cardId, section: intent.to ?? 'main' }, result: addResult });

          return addResult.success
            ? `「${first.name}」を${intent.to ?? 'メインデッキ'}に追加しました。`
            : `追加失敗: ${addResult.error}`;
        }
      }
      return `カード「${intent.cardName}」が見つかりませんでした。`;
    }

    const resolved = resolveResult.data as { cardId: string; name?: string };
    const addResult = await executeTool({ name: 'addCardToDeck', arguments: { cardId: resolved.cardId, section: intent.to ?? 'main' } }, storeRefs);
    onToolCall?.({ name: 'addCardToDeck', args: { cardId: resolved.cardId, section: intent.to ?? 'main' }, result: addResult });

    const cardLabel = resolved.name ?? intent.cardName;
    const reportInput = addResult.success ? `「${cardLabel}」を${intent.to ?? 'main'}に追加しました。` : `追加失敗: ${addResult.error}`;
    return await nanoPrompt(REPORT_PROMPT, reportInput);
  }

  if (signal?.aborted) throw new Error('aborted');

  // Stage 3-4: 操作系のcardIds構成
  let cardIds: string[];

  const isAllQuantity = intent.quantity === 'all' || intent.quantity === undefined;
  if (isAllQuantity) {
    const searchSummary = searchCardIds.map(c => `cardId:${c.cardId} quantity:${c.quantity}`).join('\n');
    const planRaw = await nanoPrompt(PLAN_PROMPT, `検索結果:\n${searchSummary}`);
    if (signal?.aborted) throw new Error('aborted');

    const plan = extractJson(planRaw) as { cardIds?: string[] } | null;
    if (plan?.cardIds && plan.cardIds.length > 0) {
      cardIds = plan.cardIds;
    } else {
      cardIds = searchCardIds.flatMap(c => Array(c.quantity).fill(c.cardId) as string[]);
    }
  } else {
    const limit = Number(intent.quantity);
    cardIds = searchCardIds.flatMap(c => Array(Math.min(c.quantity, limit)).fill(c.cardId) as string[]).slice(0, limit);
  }

  if (cardIds.length === 0) {
    return '操作対象のカードが見つかりませんでした。';
  }

  // Stage 5: tool実行
  let operationResult: { success: boolean; data?: unknown; error?: string };

  if (intent.action === 'move' && intent.from && intent.to) {
    const toolArgs = { cardIds, from: intent.from, to: intent.to };
    operationResult = await executeTool({ name: 'moveCard', arguments: toolArgs }, storeRefs);
    onToolCall?.({ name: 'moveCard', args: toolArgs, result: operationResult });
  } else if (intent.action === 'remove' && intent.from) {
    const toolArgs = { cardIds, from: intent.from, to: 'trash' };
    operationResult = await executeTool({ name: 'removeCardFromDeck', arguments: toolArgs }, storeRefs);
    onToolCall?.({ name: 'removeCardFromDeck', args: toolArgs, result: operationResult });
  } else {
    return '操作の構成に失敗しました。';
  }

  // Stage 6: 結果報告
  const resultSummary = operationResult.success
    ? `成功: ${JSON.stringify(operationResult.data)}`
    : `失敗: ${operationResult.error}`;

  return await nanoPrompt(REPORT_PROMPT, resultSummary);
}
