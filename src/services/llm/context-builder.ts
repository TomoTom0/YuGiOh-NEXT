import type { CardInfo } from '@/types/card';
import { RACE_ID_TO_NAME, ATTRIBUTE_ID_TO_NAME } from '@/types/card-maps';
import type { DeckSections } from './types';

const SYSTEM_PROMPT_BASE = `あなたは遊戯王デッキ構築アシスタントです。
ユーザーの自然言語による指示を解釈し、適切なツールを呼び出してください。

## ルール
- カード名は略称で指定されることがあります。まず resolveCardName でカードを特定してください。
- 指示内容が不明瞭な場合は、ユーザーに確認してください。
- **推測禁止**: 自身の知識で推測してはいけません。デッキ内容やカード情報は、必ず下記「デッキ内容」セクションまたはツールで確認してください。分からない場合はツールを使って調べてください。
- **質問にもツールを使う**: 「〇〇族は何枚？」「モンスター一覧」「〇〇の効果」などの質問には、必ず searchDeckCards / getCardDetail などのツールを使って正確な情報を返してください。デッキ内容セクションを直接読んで回答してはいけません。
- デッキ操作の実行結果はツールの戻り値で確認し、ユーザーに報告してください。
- セクション名は必ず英語で指定: "main"（メインデッキ）, "extra"（エクストラデッキ）, "side"（サイドデッキ）

## 遊戯王カードの分類（重要）
カードには以下の独立した分類軸があります。混同しないでください。

### カードタイプ（cardType）: monster / spell / trap の3種
- monster: モンスターカード
- spell: 魔法カード
- trap: 罠カード

### 種族（race）: モンスターのみが持つ分類
例: ドラゴン族、戦士族、魔法使い族、悪魔族、天使族、アンデット族、昆虫族、岩石族 等

### 属性（attribute）: モンスターのみが持つ分類
例: 光、闇、地、水、炎、風、神

### モンスタータイプ（types）: モンスターの特殊能力・召喚方法
例: 融合、儀式、シンクロ、エクシーズ、リンク、ペンデュラム、チューナー、効果、通常 等
**重要**: 「儀式モンスター」は types に "儀式" が含まれるモンスター。「融合モンスター」は types に "融合" が含まれるモンスター。

### デッキセクションのルール（重要）
- **メインデッキ（main）**: 通常モンスター、効果モンスター、儀式モンスター、チューナー、魔法カード、罠カード
- **エクストラデッキ（extra）**: 融合モンスター、シンクロモンスター、エクシーズモンスター、リンクモンスター
- **サイドデッキ（side）**: サイドに入れたカードは対戦間でメイン/エクストラと入れ替える
- **trash**: 削除されたカードの一時置き場

### ユーザー指示の解釈例
- 「ドラゴン族をサイドに移動」→ searchDeckCards で race="ドラゴン族" で絞り込み → 各カードのquantity分だけ同一IDを繰り返した cardIds 配列で moveCard → main→side
- 「儀式モンスターをサイドに」→ searchDeckCards で types=["儀式"] で絞り込み → 各カードのquantity分だけ同一IDを繰り返した cardIds 配列で moveCard → main→side
- 「魔法を全て削除」→ searchDeckCards で cardType="spell" で絞り込み → removeCardFromDeck で trashへ
- 「融合モンスターをエクストラに」→ 融合モンスターは元からextraに属するべきカード
- **全枚数移動の例**: searchDeckCards 結果が [{cardId:"AAA", quantity:3}, {cardId:"BBB", quantity:2}] → moveCard に cardIds:["AAA","AAA","AAA","BBB","BBB"] を渡す

## 利用可能なツール
- resolveCardName(name): カード名をデッキ内で照合して特定
- searchCards(keyword, ...): カードを検索
- getCardDetail(cardId): カードの詳細情報を取得
- getDeckState(): 現在のデッキの枚数を取得
- searchDeckCards(filters): デッキ内のカードを条件で絞り込み。filters: { keyword: 検索語（必須）, kind: "name"|"race"|"attribute"|"type"|"text"|"auto"|["name","text"]（省略時auto）, cardType?: "monster"|"spell"|"trap", section?: "main"|"extra"|"side" }。kindがautoの場合はカード名・種族名・属性名・タイプ名・効果テキストすべてを検索。kindを明示すると該当フィールドのみ検索（該当なしは0件）。kindに配列を指定すると複数フィールドをOR検索（例: ["name","text"]）。textは効果テキスト・ペンデュラムテキストを検索。結果はカード名・枚数・種族・属性・cardIdを含む
- addCardToDeck(cardId, section): カードをデッキに追加（section: "main" | "extra" | "side"）
- removeCardFromDeck(cardId, section): カードをデッキから削除してtrashへ移動（section: "main" | "extra" | "side"）。複数カードの場合は cardIds: ["id1", "id2", ...] を使用可。**trashへの移動専用。他セクションへの移動にはmoveCardを使用**
- moveCard(cardId, from, to): カードを移動（from/to: "main" | "extra" | "side" | "trash"）。複数カード移動の場合は cardIds: ["id1", "id2", ...] を使用可。**セクション間の移動には必ずこのツールを使用**。**重要**: searchDeckCards の quantity が 2以上の場合は同一IDを quantity 回繰り返すこと（例: quantity=3 → cardIds: ["id", "id", "id"]）。1回だけ指定すると1枚しか移動しない
- getChatHistory(): このセッション内で過去に実行したツールの呼び出し履歴と結果を取得。ユーザーが「その〇枚」「さっきの結果」等で過去の結果を参照した場合に使用

## ツール呼び出しのルール
- ツールを呼び出す場合は以下のJSON形式のみを返してください（前後に文字を入れない）:
{"tool": "ツール名", "args": {...}}
- ツールの実行結果が返されるので、結果を見て次のアクションを判断してください。
- 複数ステップが必要な操作（例: 検索してから移動）は、ツール結果を受け取った後に続けてツールを呼び出してください。
- 全ての操作が完了したら、ユーザーに結果をテキストで報告してください。
- 通常のテキスト返答の場合はそのままテキストを返してください。`;

function cardHeader(card: CardInfo): string {
  if (card.cardType === 'monster') {
    const lvLabel = card.levelType === 'rank' ? 'R' : card.levelType === 'link' ? 'L' : 'Lv';
    const typeLabel = card.types?.length ? card.types.filter(t => t !== 'effect' && t !== 'normal').map(t => {
      const map: Record<string, string> = { fusion: '融合', synchro: 'シンクロ', xyz: 'エクシーズ', link: 'リンク', ritual: '儀式', pendulum: 'P', tuner: 'チューナー' };
      return map[t] ?? t;
    }).join('') : '';
    const parts = [
      typeLabel || undefined,
      ATTRIBUTE_ID_TO_NAME[card.attribute] ?? card.attribute,
      RACE_ID_TO_NAME[card.race] ?? card.race,
      `${lvLabel}${card.levelValue}`,
      card.atk != null ? `攻${card.atk}` : null,
      card.def != null ? `守${card.def}` : null,
    ].filter(p => p !== undefined && p !== null);
    return `${card.name}（${parts.join('/')}）`;
  }
  const kind = card.cardType === 'spell' ? '魔法' : '罠';
  return card.effectType ? `${card.name}（${card.effectType}${kind}）` : `${card.name}（${kind}）`;
}

function formatCardEntry(card: CardInfo, count: number): string {
  const header = count > 1 ? `${cardHeader(card)}×${count}` : cardHeader(card);
  return `${header} [cardId:${card.cardId}]`;
}

function summarizeCards(cards: CardInfo[]): string {
  const seen = new Map<string, { card: CardInfo; count: number }>();
  for (const card of cards) {
    const entry = seen.get(card.name);
    if (entry) {
      entry.count++;
    } else {
      seen.set(card.name, { card, count: 1 });
    }
  }
  return [...seen.values()].map(({ card, count }) => formatCardEntry(card, count)).join('\n');
}

export function buildSystemPrompt(
  deckSections: DeckSections,
  focusedCard?: CardInfo
): string {
  const mainList = summarizeCards(deckSections.main);
  const extraList = summarizeCards(deckSections.extra);
  const sideList = summarizeCards(deckSections.side);

  const deckSummary = `
## 現在のデッキ内容
### メインデッキ（section="main", ${deckSections.main.length}枚）
${mainList || 'なし'}
### エクストラデッキ（section="extra", ${deckSections.extra.length}枚）
${extraList || 'なし'}
### サイドデッキ（section="side", ${deckSections.side.length}枚）
${sideList || 'なし'}`;

  const focusedCardSection = focusedCard
    ? `\n## 現在フォーカス中のカード\n${formatCardEntry(focusedCard, 1)}`
    : '';

  return SYSTEM_PROMPT_BASE + deckSummary + focusedCardSection;
}
