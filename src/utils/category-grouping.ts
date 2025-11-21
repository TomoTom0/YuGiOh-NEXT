/**
 * カテゴリグループ判定ユーティリティ
 * 
 * デッキ検索画面から取得したカテゴリリストに対して、
 * 50音順グループを自動判定する。
 */

import type { CategoryEntry } from '../types/dialog';

/**
 * 50音順のリスト（個々の文字）
 */
const KANA_LIST = [
  'ア', 'イ', 'ウ', 'エ', 'オ',
  'カ', 'キ', 'ク', 'ケ', 'コ',
  'サ', 'シ', 'ス', 'セ', 'ソ',
  'タ', 'チ', 'ツ', 'テ', 'ト',
  'ナ', 'ニ', 'ヌ', 'ネ', 'ノ',
  'ハ', 'ヒ', 'フ', 'ヘ', 'ホ',
  'マ', 'ミ', 'ム', 'メ', 'モ',
  'ヤ', 'ユ', 'ヨ',
  'ラ', 'リ', 'ル', 'レ', 'ロ',
  'ワ', 'ヲ', 'ン',
  'ヴ'  // 特殊
] as const;

/**
 * ひらがなかどうかを判定
 */
function isHiragana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x3041 && code <= 0x3096;
}

/**
 * カタカナかどうかを判定
 */
function isKatakana(char: string): boolean {
  const code = char.charCodeAt(0);
  return code >= 0x30A0 && code <= 0x30FF;
}

/**
 * ひらがなをカタカナに変換
 */
function hiraganaToKatakana(char: string): string {
  const code = char.charCodeAt(0);
  if (code >= 0x3041 && code <= 0x3096) {
    return String.fromCharCode(code + 0x60);
  }
  return char;
}

/**
 * カタカナから50音グループを取得
 * 濁点・半濁点は清音に変換して、個々の文字を返す
 */
function getKanaGroup(char: string): string {
  // カタカナに統一
  let katakana = char;
  if (isHiragana(char)) {
    katakana = hiraganaToKatakana(char);
  }

  // 濁点・半濁点を清音に変換
  const dakutenMap: Record<string, string> = {
    'ガ': 'カ', 'ギ': 'キ', 'グ': 'ク', 'ゲ': 'ケ', 'ゴ': 'コ',
    'ザ': 'サ', 'ジ': 'シ', 'ズ': 'ス', 'ゼ': 'セ', 'ゾ': 'ソ',
    'ダ': 'タ', 'ヂ': 'チ', 'ヅ': 'ツ', 'デ': 'テ', 'ド': 'ト',
    'バ': 'ハ', 'ビ': 'ヒ', 'ブ': 'フ', 'ベ': 'ヘ', 'ボ': 'ホ',
    'パ': 'ハ', 'ピ': 'ヒ', 'プ': 'フ', 'ペ': 'ヘ', 'ポ': 'ホ',
    'ヴ': 'ヴ'  // ヴは独立
  };

  const seion = dakutenMap[katakana] || katakana;

  // 個々の文字をそのまま返す
  return `ruby_${seion}`;
}

/**
 * 2つのグループの間にあるすべての文字を取得
 */
function getGroupsBetween(start: string, end: string): string[] {
  // ruby_ プレフィックスを除去
  const startKana = start.replace('ruby_', '');
  const endKana = end.replace('ruby_', '');

  const startIndex = KANA_LIST.indexOf(startKana as typeof KANA_LIST[number]);
  const endIndex = KANA_LIST.indexOf(endKana as typeof KANA_LIST[number]);

  if (startIndex === -1 || endIndex === -1) {
    return [start, end];
  }

  const result: string[] = [];
  for (let i = startIndex; i <= endIndex; i++) {
    result.push(`ruby_${KANA_LIST[i]}`);
  }

  return result;
}

/**
 * 一文字目が読み取り可能（ひらがな/カタカナ）かどうか
 */
function isKanaReadable(char: string): boolean {
  return isHiragana(char) || isKatakana(char);
}

/**
 * カナ文字以外（漢字、英数字、記号等）のグループ判定
 * 前後のカテゴリから推測する
 */
function determineGroupForNonKana(
  index: number,
  categories: { label: string }[]
): string[] {
  // 前方を探索
  let prevGroup: string | null = null;
  for (let i = index - 1; i >= 0; i--) {
    const prevLabel = categories[i]?.label;
    if (!prevLabel) continue;
    
    const firstChar = prevLabel[0];
    if (firstChar && isKanaReadable(firstChar)) {
      prevGroup = getKanaGroup(firstChar);
      break;
    }
  }
  
  // 後方を探索
  let nextGroup: string | null = null;
  for (let i = index + 1; i < categories.length; i++) {
    const nextLabel = categories[i]?.label;
    if (!nextLabel) continue;
    
    const firstChar = nextLabel[0];
    if (firstChar && isKanaReadable(firstChar)) {
      nextGroup = getKanaGroup(firstChar);
      break;
    }
  }
  
  // グループを決定
  if (prevGroup && nextGroup && prevGroup === nextGroup) {
    // 前後が同じ → 同じグループ
    return [prevGroup];
  }
  else if (prevGroup && nextGroup && prevGroup !== nextGroup) {
    // 前後が異なる → その間のすべてのグループ
    return getGroupsBetween(prevGroup, nextGroup);
  }
  else if (prevGroup) {
    // 前のみ判明 → 前と同じ
    return [prevGroup];
  }
  else if (nextGroup) {
    // 後のみ判明 → 後と同じ
    return [nextGroup];
  }
  else {
    // 不明 → その他
    return ['ruby_その他'];
  }
}

/**
 * カテゴリリストにグループ情報を付与
 * 
 * @param categories - value/label のみを持つカテゴリリスト
 * @returns グループ情報を含む CategoryEntry[]
 */
export function assignCategoryGroups(
  categories: Array<{ value: string; label: string }>
): CategoryEntry[] {
  return categories.map((cat, index) => {
    let group: string[];
    
    // ルール1: 最初のカテゴリ（王家の神殿）
    if (index === 0) {
      group = ['ruby_オ'];
    }
    // ルール2: 2番目
    else if (index === 1) {
      group = ['ruby_ア'];
    }
    // ルール3: 一文字目がひらがな/カタカナ
    else {
      const firstChar = cat.label[0];
      if (firstChar && isKanaReadable(firstChar)) {
        group = [getKanaGroup(firstChar)];
      }
      // ルール4: カナ文字以外（漢字、英数字、記号等）
      else {
        group = determineGroupForNonKana(index, categories);
      }
    }
    
    return {
      value: cat.value,
      label: cat.label,
      originalIndex: index,
      group
    };
  });
}
