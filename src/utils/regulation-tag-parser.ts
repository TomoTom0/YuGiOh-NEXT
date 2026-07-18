import type {
  RegulationTag,
  RegulationTagPosition,
  RegulationBracket,
  RegType
} from '@/types/regulation';

/**
 * デッキ名の先頭/末尾からレギュレーションタグをパースする。
 *
 * タグ形式: [レギュレーション名] または [レギュレーション名-YYMM]
 * - 括弧: [ ] または 【 】
 * - 位置: デッキ名の先頭 または 末尾（空白で区切られた場合のみ）
 *         ※中央や、空白なしでデッキ名に密着したタグは対象外
 * - レギュレーション名: GENESYS / OCG（大文字小文字無視）
 * - YYMM: 4桁数字（省略時は null = 最新版）
 *
 * YYMM の実在性（該当月の版が存在するか）はここでは検証しない。
 * 実在一覧との照合は regulation-resolver が行う。
 */

/** タグ内の "レギュレーション名" + "-YYMM"（省略可）のパターン */
const TAG_CONTENT_PATTERN = /^(GENESYS|OCG)(?:-(\d{4}))?$/i;

/** レギュレーション名（大文字）→ RegType */
function resolveRegType(nameUpper: string): RegType | null {
  if (nameUpper === 'GENESYS') return 'genesys';
  if (nameUpper === 'OCG') return 'ocg';
  return null;
}

interface RawTagMatch {
  content: string;
  bracket: RegulationBracket;
  position: RegulationTagPosition;
  startIndex: number;
  endIndex: number;
  raw: string;
}

interface TagPattern {
  re: RegExp;
  bracket: RegulationBracket;
  position: RegulationTagPosition;
}

// 先頭（prefix）を優先して試す。{先頭, 末尾} × {角括弧, 隅付き} の4パターン。
const TAG_PATTERNS: TagPattern[] = [
  { re: /^\s*(\[)([^\]]+?)(\])(?=\s|$)/, bracket: 'square', position: 'prefix' },
  { re: /^\s*(【)([^】]+?)(】)(?=\s|$)/, bracket: 'corner', position: 'prefix' },
  { re: /(^|\s)(\[)([^\]]+?)(\])\s*$/, bracket: 'square', position: 'suffix' },
  { re: /(^|\s)(【)([^】]+?)(】)\s*$/, bracket: 'corner', position: 'suffix' }
];

function findTag(deckName: string): RawTagMatch | null {
  for (const { re, bracket, position } of TAG_PATTERNS) {
    const match = deckName.match(re);
    if (!match) continue;

    if (position === 'prefix') {
      // groups: [full, open, content, close]
      const open = match[1];
      const content = match[2];
      const close = match[3];
      if (open === undefined || content === undefined || close === undefined) continue;
      const tagLen = open.length + content.length + close.length;
      const leadingWsLen = match[0].length - tagLen;
      const startIndex = leadingWsLen; // ^ アンカーなので match.index === 0
      const endIndex = startIndex + tagLen;
      return { content, bracket, position, startIndex, endIndex, raw: open + content + close };
    }

    // suffix: groups: [full, leading(^ or 空白), open, content, close]
    const leading = match[1] ?? '';
    const open = match[2];
    const content = match[3];
    const close = match[4];
    if (open === undefined || content === undefined || close === undefined) continue;
    const matchStart = match.index ?? 0;
    const startIndex = matchStart + leading.length;
    const endIndex = startIndex + open.length + content.length + close.length;
    return { content, bracket, position, startIndex, endIndex, raw: open + content + close };
  }
  return null;
}

function parseContent(content: string): { type: RegType; yymm: string | null } | null {
  const match = content.trim().match(TAG_CONTENT_PATTERN);
  if (!match) return null;
  const name = match[1];
  if (name === undefined) return null;
  const type = resolveRegType(name.toUpperCase());
  if (!type) return null;
  const yymm = match[2] ?? null;
  return { type, yymm };
}

/**
 * デッキ名中のタグの YYMM を新しい値に置換する（修正提案用の純粋関数）。
 *
 * tag が表すデッキ名内の [startIndex, endIndex) を、指定 YYMM で再構築した
 * タグ文字列に置き換えた新しいデッキ名を返す。元の deckName は変更しない。
 * 括弧の種類・レギュレーション名・位置は tag から再現する。
 *
 * @param deckName 元のデッキ名
 * @param tag 置換対象のタグ（parseRegulationTag の結果）
 * @param newYymm 新しいYYMM（例: "2410"）
 * @returns タグの YYMM を置換したデッキ名
 */
export function replaceTagYymm(deckName: string, tag: RegulationTag, newYymm: string): string {
  const name = tag.type === 'genesys' ? 'GENESYS' : 'OCG';
  const open = tag.bracket === 'square' ? '[' : '【';
  const close = tag.bracket === 'square' ? ']' : '】';
  const newTag = `${open}${name}-${newYymm}${close}`;
  return deckName.slice(0, tag.startIndex) + newTag + deckName.slice(tag.endIndex);
}

/**
 * デッキ名からレギュレーションタグをパースする。
 * @param deckName デッキ名
 * @returns タグが有効なら RegulationTag、無い・無効なら null
 */
export function parseRegulationTag(deckName: string): RegulationTag | null {
  if (!deckName) return null;
  const tagMatch = findTag(deckName);
  if (!tagMatch) return null;
  const parsed = parseContent(tagMatch.content);
  if (!parsed) return null;
  return {
    type: parsed.type,
    yymm: parsed.yymm,
    raw: tagMatch.raw,
    bracket: tagMatch.bracket,
    position: tagMatch.position,
    startIndex: tagMatch.startIndex,
    endIndex: tagMatch.endIndex
  };
}
