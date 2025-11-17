import type { DeckInfo } from '@/types/deck';

/**
 * エクスポートオプション
 */
export interface ExportOptions {
  /** サイドデッキを含めるかどうか */
  includeSide?: boolean;
}

/**
 * エクスポート用のデッキカード行データ
 */
interface ExportRow {
  section: 'main' | 'extra' | 'side';
  name: string;
  cid: string;
  ciid: string;
  quantity: number;
}

/**
 * DeckInfoからエクスポート用の行データを生成
 */
function generateExportRows(deckInfo: DeckInfo, options: ExportOptions = {}): ExportRow[] {
  const rows: ExportRow[] = [];
  const { includeSide = true } = options;

  // Main Deck
  deckInfo.mainDeck.forEach(({ card, quantity }) => {
    rows.push({
      section: 'main',
      name: card.name,
      cid: card.cardId,
      ciid: card.ciid,
      quantity
    });
  });

  // Extra Deck
  deckInfo.extraDeck.forEach(({ card, quantity }) => {
    rows.push({
      section: 'extra',
      name: card.name,
      cid: card.cardId,
      ciid: card.ciid,
      quantity
    });
  });

  // Side Deck
  if (includeSide) {
    deckInfo.sideDeck.forEach(({ card, quantity }) => {
      rows.push({
        section: 'side',
        name: card.name,
        cid: card.cardId,
        ciid: card.ciid,
        quantity
      });
    });
  }

  return rows;
}

/**
 * CSV形式でエクスポート
 */
export function exportToCSV(deckInfo: DeckInfo, options: ExportOptions = {}): string {
  const rows = generateExportRows(deckInfo, options);

  // ヘッダー行
  const header = 'section,name,cid,ciid,quantity';

  // データ行
  const dataRows = rows.map(row => {
    // CSV エスケープ: カンマやダブルクォートを含む場合はダブルクォートで囲む
    const escapeName = (name: string) => {
      if (name.includes(',') || name.includes('"') || name.includes('\n')) {
        return `"${name.replace(/"/g, '""')}"`;
      }
      return name;
    };

    return [
      row.section,
      escapeName(row.name),
      row.cid,
      row.ciid,
      row.quantity.toString()
    ].join(',');
  });

  return [header, ...dataRows].join('\n');
}

/**
 * TXT形式でエクスポート（人間が読みやすい形式）
 */
export function exportToTXT(deckInfo: DeckInfo, options: ExportOptions = {}): string {
  const rows = generateExportRows(deckInfo, options);

  // セクションごとにグループ化
  const mainRows = rows.filter(r => r.section === 'main');
  const extraRows = rows.filter(r => r.section === 'extra');
  const sideRows = rows.filter(r => r.section === 'side');

  const lines: string[] = [];

  // Main Deck
  if (mainRows.length > 0) {
    const totalMain = mainRows.reduce((sum, r) => sum + r.quantity, 0);
    lines.push(`=== Main Deck (${totalMain} cards) ===`);
    mainRows.forEach(row => {
      lines.push(`${row.quantity}x ${row.name} (${row.cid}:${row.ciid})`);
    });
    lines.push('');
  }

  // Extra Deck
  if (extraRows.length > 0) {
    const totalExtra = extraRows.reduce((sum, r) => sum + r.quantity, 0);
    lines.push(`=== Extra Deck (${totalExtra} cards) ===`);
    extraRows.forEach(row => {
      lines.push(`${row.quantity}x ${row.name} (${row.cid}:${row.ciid})`);
    });
    lines.push('');
  }

  // Side Deck
  if (options.includeSide !== false && sideRows.length > 0) {
    const totalSide = sideRows.reduce((sum, r) => sum + r.quantity, 0);
    lines.push(`=== Side Deck (${totalSide} cards) ===`);
    sideRows.forEach(row => {
      lines.push(`${row.quantity}x ${row.name} (${row.cid}:${row.ciid})`);
    });
  }

  return lines.join('\n');
}

/**
 * ファイルとしてダウンロード
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * デッキをCSVファイルとしてダウンロード
 */
export function downloadDeckAsCSV(
  deckInfo: DeckInfo,
  filename: string = 'deck.csv',
  options: ExportOptions = {}
): void {
  const csv = exportToCSV(deckInfo, options);
  downloadFile(csv, filename, 'text/csv');
}

/**
 * デッキをTXTファイルとしてダウンロード
 */
export function downloadDeckAsTXT(
  deckInfo: DeckInfo,
  filename: string = 'deck.txt',
  options: ExportOptions = {}
): void {
  const txt = exportToTXT(deckInfo, options);
  downloadFile(txt, filename, 'text/plain');
}
