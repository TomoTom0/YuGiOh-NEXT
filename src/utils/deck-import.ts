import type { DeckInfo } from '@/types/deck';
import type { CardInfo } from '@/types/card';

/**
 * インポート結果
 */
export interface ImportResult {
  /** インポートが成功したか */
  success: boolean;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** パースされたデッキ情報（成功時） */
  deckInfo?: DeckInfo;
  /** 警告メッセージ（任意） */
  warnings?: string[];
}

/**
 * インポート用の行データ
 */
interface ImportRow {
  section: 'main' | 'extra' | 'side';
  name?: string;
  cid: string;
  ciid: string;
  quantity: number;
}

/**
 * CSVファイルをパースしてインポート
 */
export function importFromCSV(content: string): ImportResult {
  try {
    const lines = content.trim().split('\n');

    if (lines.length === 0) {
      return { success: false, error: 'ファイルが空です' };
    }

    // ヘッダー行をスキップ（section,name,cid,ciid,quantity）
    const hasHeader = (lines[0] || '').toLowerCase().includes('section');
    const dataLines = hasHeader ? lines.slice(1) : lines;

    const rows: ImportRow[] = [];
    const warnings: string[] = [];

    for (let i = 0; i < dataLines.length; i++) {
      const line = (dataLines[i] || '').trim();
      if (!line) continue;

      const parsed = parseCSVLine(line);
      if (!parsed) {
        warnings.push(`行${i + 1}: CSVのパースに失敗しました`);
        continue;
      }

      const row = parseImportRow(parsed, i + 1, warnings);
      if (row) {
        rows.push(row);
      }
    }

    if (rows.length === 0) {
      return { success: false, error: 'インポート可能なデータがありません' };
    }

    const deckInfo = convertRowsToDeckInfo(rows);
    return { success: true, deckInfo, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (error) {
    return { success: false, error: `CSV読み込みエラー: ${error}` };
  }
}

/**
 * TXTファイルをパースしてインポート
 */
export function importFromTXT(content: string): ImportResult {
  try {
    const lines = content.trim().split('\n');

    if (lines.length === 0) {
      return { success: false, error: 'ファイルが空です' };
    }

    const rows: ImportRow[] = [];
    const warnings: string[] = [];
    let currentSection: 'main' | 'extra' | 'side' | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] || '').trim();

      // セクションヘッダーを検出
      if (line.includes('=== Main Deck')) {
        currentSection = 'main';
        continue;
      } else if (line.includes('=== Extra Deck')) {
        currentSection = 'extra';
        continue;
      } else if (line.includes('=== Side Deck')) {
        currentSection = 'side';
        continue;
      }

      // 空行をスキップ
      if (!line) continue;

      // カード行をパース（例: "2x 灰流うらら (12950:1)"）
      const match = line.match(/^(\d+)x\s+(.+?)\s+\((\d+):(\d+)\)$/);
      if (match && currentSection) {
        const quantityStr = match[1] || '1';
        const name = match[2] || '';
        const cid = match[3] || '';
        const ciid = match[4] || '1';
        rows.push({
          section: currentSection,
          name,
          cid,
          ciid,
          quantity: parseInt(quantityStr, 10)
        });
      } else if (currentSection) {
        warnings.push(`行${i + 1}: フォーマットが不正です`);
      }
    }

    if (rows.length === 0) {
      return { success: false, error: 'インポート可能なデータがありません' };
    }

    const deckInfo = convertRowsToDeckInfo(rows);
    return { success: true, deckInfo, warnings: warnings.length > 0 ? warnings : undefined };
  } catch (error) {
    return { success: false, error: `TXT読み込みエラー: ${error}` };
  }
}

/**
 * CSV行をパース（ダブルクォートのエスケープに対応）
 */
function parseCSVLine(line: string): string[] | null {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // エスケープされたダブルクォート
        current += '"';
        i += 2;
      } else {
        // クォート開始/終了
        inQuotes = !inQuotes;
        i++;
      }
    } else if (char === ',' && !inQuotes) {
      // フィールド区切り
      result.push(current);
      current = '';
      i++;
    } else {
      current += char;
      i++;
    }
  }

  // 最後のフィールド
  result.push(current);

  return result.length > 0 ? result : null;
}

/**
 * パースされたCSVフィールドをImportRowに変換
 */
function parseImportRow(fields: string[], lineNumber: number, warnings: string[]): ImportRow | null {
  // 最小限の形式: section,cid,quantity
  // 完全な形式: section,name,cid,ciid,quantity

  if (fields.length < 3) {
    warnings.push(`行${lineNumber}: フィールド数が不足しています（最低3列必要）`);
    return null;
  }

  const section = (fields[0] || '').trim().toLowerCase() as 'main' | 'extra' | 'side';
  if (!['main', 'extra', 'side'].includes(section)) {
    warnings.push(`行${lineNumber}: 不正なセクション "${fields[0]}" （main/extra/sideのいずれか）`);
    return null;
  }

  let name: string | undefined;
  let cid: string;
  let ciid: string;
  let quantity: number;

  if (fields.length === 3) {
    // 形式: section,cid,quantity
    cid = (fields[1] || '').trim();
    ciid = '1'; // デフォルト
    quantity = parseInt((fields[2] || '').trim(), 10);
  } else if (fields.length === 4) {
    // 形式: section,cid,ciid,quantity または section,name,cid,quantity
    const field1 = (fields[1] || '').trim();
    const field2 = (fields[2] || '').trim();
    const field3 = (fields[3] || '').trim();

    // field2が数字ならcid、そうでなければnameと判断
    if (/^\d+$/.test(field1) && /^\d+$/.test(field2)) {
      // section,cid,ciid,quantity
      cid = field1;
      ciid = field2;
      quantity = parseInt(field3, 10);
    } else {
      // section,name,cid,quantity
      name = field1;
      cid = field2;
      ciid = '1'; // デフォルト
      quantity = parseInt(field3, 10);
    }
  } else {
    // 形式: section,name,cid,ciid,quantity
    name = (fields[1] || '').trim();
    cid = (fields[2] || '').trim();
    ciid = (fields[3] || '').trim();
    quantity = parseInt((fields[4] || '').trim(), 10);
  }

  // バリデーション
  if (!/^\d+$/.test(cid)) {
    warnings.push(`行${lineNumber}: cidが不正です "${cid}"`);
    return null;
  }

  if (!/^\d+$/.test(ciid)) {
    warnings.push(`行${lineNumber}: ciidが不正です "${ciid}"`);
    return null;
  }

  if (isNaN(quantity) || quantity < 1 || quantity > 99) {
    warnings.push(`行${lineNumber}: quantityが不正です "${fields[fields.length - 1]}"`);
    return null;
  }

  return { section, name, cid, ciid, quantity };
}

/**
 * ImportRow配列をDeckInfoに変換
 */
function convertRowsToDeckInfo(rows: ImportRow[]): DeckInfo {
  // cid:ciidごとにカードを集約
  const cardMap = new Map<string, { section: 'main' | 'extra' | 'side'; card: CardInfo; quantity: number }>();

  for (const row of rows) {
    const key = `${row.section}:${row.cid}:${row.ciid}`;
    const existing = cardMap.get(key);

    if (existing) {
      // 同じカードが複数行にある場合は数量を加算
      existing.quantity += row.quantity;
    } else {
      // 新しいカードを追加
      // インポート時は最小限の仮データを作成（後でAPIから正しい情報を取得する必要がある）
      const card: CardInfo = {
        cardType: 'monster',
        attribute: 'light',
        levelType: 'level',
        levelValue: 0,
        types: [],
        race: 'warrior', // 仮の値
        atk: 0,
        def: 0,
        cardId: row.cid,
        ciid: row.ciid,
        name: row.name || `Card ${row.cid}`,
        imageUrl: '',
        effect: '',
        isExtraDeck: false,
        imgs: []
      } as CardInfo;

      cardMap.set(key, { section: row.section, card, quantity: row.quantity });
    }
  }

  // セクションごとに分類
  const mainDeck: { card: CardInfo; quantity: number }[] = [];
  const extraDeck: { card: CardInfo; quantity: number }[] = [];
  const sideDeck: { card: CardInfo; quantity: number }[] = [];

  for (const { section, card, quantity } of cardMap.values()) {
    const entry = { card, quantity };
    if (section === 'main') {
      mainDeck.push(entry);
    } else if (section === 'extra') {
      extraDeck.push(entry);
    } else if (section === 'side') {
      sideDeck.push(entry);
    }
  }

  return {
    dno: 0,
    name: '',
    mainDeck,
    extraDeck,
    sideDeck,
    category: [],
    tags: [],
    comment: '',
    deckCode: ''
  };
}

/**
 * ファイルを読み込んでインポート（自動フォーマット判定）
 */
export async function importDeckFromFile(file: File): Promise<ImportResult> {
  try {
    const content = await readFileAsText(file);
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'csv') {
      return importFromCSV(content);
    } else if (extension === 'txt') {
      return importFromTXT(content);
    } else {
      // 拡張子がない場合は内容から判定
      const firstLine = content.split('\n')[0]?.trim() || '';
      if (firstLine.toLowerCase().includes('section')) {
        return importFromCSV(content);
      } else if (firstLine.includes('===')) {
        return importFromTXT(content);
      } else {
        return { success: false, error: 'サポートされていないファイル形式です（.csv または .txt を使用してください）' };
      }
    }
  } catch (error) {
    return { success: false, error: `ファイル読み込みエラー: ${error}` };
  }
}

/**
 * Fileオブジェクトをテキストとして読み込む
 */
function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('ファイルの読み込みに失敗しました'));
      }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file, 'utf-8');
  });
}
