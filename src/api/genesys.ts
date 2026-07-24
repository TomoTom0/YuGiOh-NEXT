/**
 * GENESYSポイントリスト取得API
 *
 * 公式howtoページ（https://www.yugioh-card.com/japan/howto/genesys/?list=YYYYMM）
 * からGENESYSポイント情報を取得してパースする。
 *
 * カード名ベースで取得するため、カードID(cid)へのマッピングは
 * genesys-name-resolver で別途行う。
 */

import { getGenesysListUrl, getGenesysIndexUrl } from '../utils/url-builder';

/**
 * howtoページのテーブル行から抽出した生エントリ（cid解決前）
 */
export interface RawGenesysEntry {
  /** カード名（日本語） */
  name: string;
  /** GENESYSポイント（1-100） */
  point: number;
  /** tr要素のclass属性値（カード種類: effect/magic/trap/fusion/synchro/xyz/ritual） */
  cardKindClass: string;
}

/**
 * howtoページからパースした結果
 */
export interface ParsedGenesysList {
  /** 生エントリ（カード名+ポイント+種類） */
  entries: RawGenesysEntry[];
  /** 適用日（YYYY-MM-DD形式） */
  effectiveDate: string;
  /** リストパラメータ（YYYYMM形式） */
  listParam: string;
  /** 総カード数（data-count属性。取得できなければentries.length） */
  totalCount: number;
}

/**
 * リストパラメータ（YYYYMM）を適用日（YYYY-MM-01）に変換する
 *
 * GENESYSリストは常に月の1日適用のため、YYYYMM → YYYY-MM-01 の変換で妥当。
 * インデックスから実際の適用日が取れない場合のフォールバックとして使用。
 *
 * @param listParam リストパラメータ（例: "202606"）
 * @returns 適用日（例: "2026-06-01"）。不正な形式の場合はlistParamをそのまま返す
 */
export function listParamToEffectiveDate(listParam: string): string {
  if (listParam.length === 6 && /^\d{6}$/.test(listParam)) {
    const year = listParam.slice(0, 4);
    const month = listParam.slice(4, 6);
    return `${year}-${month}-01`;
  }
  return listParam;
}

/**
 * howtoインデックスページから抽出したリスト参照（実在するリストのメタ情報）
 */
export interface GenesysListRef {
  /** リストパラメータ（YYYYMM形式） */
  listParam: string;
  /** 適用日（YYYY-MM-DD形式） */
  effectiveDate: string;
  /** サイトが「最新版」と指定するリストか */
  isLatest: boolean;
}

/**
 * howtoインデックスページの <section id="point"> から実在するリスト一覧を抽出する
 *
 * 構造:
 *   <section id="point">
 *     <a href="?list=202608" class="btn howto marker">最新版：2026年8月1日適用リスト</a>
 *     <ul class="marker">
 *       <li><a href="?list=202606">2026年6月1日適用リスト</a></li>
 *     </ul>
 *   </section>
 *
 * GENESYSリストは月次でなく不規則に公開される（例: 6月→8月）ため、
 * 現在月の推論ではなくこの実情報から取得対象を決定する。
 *
 * @param html インデックスページのHTML
 * @returns 実在するリストの参照配列（重複listParamは除外）
 */
export function parseGenesysIndex(html: string): GenesysListRef[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const section = doc.querySelector('#point');
  if (!section) {
    return [];
  }

  const refs: GenesysListRef[] = [];
  const seen = new Set<string>();
  // href に "?list=" を含む <a> を収集。
  // （CSS属性セレクタ a[href*="?list="] は一部環境で "?" を正規表現として誤解釈するため JS で絞り込む）
  const links = section.querySelectorAll('a');
  for (const a of links) {
    const href = a.getAttribute('href') ?? '';
    const match = href.match(/[?&]list=(\d{6})/);
    const listParam = match?.[1];
    if (!listParam) {
      continue;
    }
    if (seen.has(listParam)) {
      continue;
    }
    seen.add(listParam);

    const text = a.textContent?.trim() ?? '';
    const dateMatch = text.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/);
    const effectiveDate = dateMatch?.[1] && dateMatch[2] && dateMatch[3]
      ? `${dateMatch[1]}-${dateMatch[2].padStart(2, '0')}-${dateMatch[3].padStart(2, '0')}`
      : listParamToEffectiveDate(listParam);
    const isLatest = text.includes('最新版') || (a.className ?? '').includes('btn');

    refs.push({ listParam, effectiveDate, isLatest });
  }

  // 最新版が検出できなければ、適用日が最も新しいものを最新版とする
  if (refs.length > 0 && !refs.some(r => r.isLatest)) {
    const newest = refs.reduce((a, b) => (a.effectiveDate >= b.effectiveDate ? a : b));
    newest.isLatest = true;
  }
  return refs;
}

/**
 * howtoインデックスページを取得し、実在するリスト一覧を返す
 *
 * @returns 実在するリストの参照配列
 */
export async function fetchGenesysIndex(): Promise<GenesysListRef[]> {
  const url = getGenesysIndexUrl();
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch GENESYS index: ${response.status} ${response.statusText}`);
  }
  const html = await response.text();
  return parseGenesysIndex(html);
}

/**
 * GENESYS howtoページのHTMLからポイントリストを抽出する
 *
 * テーブル構造:
 *   <table class="genesyspoint" data-count="872">
 *     <tbody>
 *       <tr data-original-index="2" data-point="13" class="effect">
 *         <td></td>
 *         <td>BF－精鋭のゼピュロス</td>   <!-- カード名（td index 1） -->
 *         <td><b>13</b></td>              <!-- ポイント（td index 2） -->
 *         <td></td>                       <!-- 前回からの変動 -->
 *       </tr>
 *
 * 注意: data-point属性値に末尾の余分なダブルクォートが付く場合がある
 *       （例: data-point="13""）。正規表現で数値のみ抽出して吸収する。
 *
 * @param html GENESYS howtoページのHTML
 * @param listParam リストパラメータ（YYYYMM形式）
 * @returns パース結果
 */
export function parseGenesysHtml(html: string, listParam: string): ParsedGenesysList {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  const table = doc.querySelector('table.genesyspoint');
  const totalCountAttr = table?.getAttribute('data-count') ?? '';
  const totalCountMatch = totalCountAttr.match(/\d+/);
  const totalCount = totalCountMatch ? parseInt(totalCountMatch[0], 10) : 0;

  const entries: RawGenesysEntry[] = [];
  const rows = doc.querySelectorAll('table.genesyspoint tbody tr');

  for (const row of rows) {
    const tds = row.querySelectorAll('td');
    // カード名は2列目（td index 1）、ポイントは3列目（td index 2）
    const nameCell = tds[1];
    const pointCell = tds[2];
    if (!nameCell) {
      continue;
    }

    const name = nameCell.textContent?.trim() ?? '';
    if (!name) {
      continue;
    }

    // ポイント: trのdata-point属性を優先、なければ3列目のbタグのテキスト
    let point = 0;
    const dataPoint = row.getAttribute('data-point') ?? '';
    const dataPointMatch = dataPoint.match(/\d+/);
    if (dataPointMatch) {
      point = parseInt(dataPointMatch[0], 10);
    } else if (pointCell) {
      const pointText = pointCell.textContent?.trim() ?? '';
      const pointMatch = pointText.match(/\d+/);
      if (pointMatch) {
        point = parseInt(pointMatch[0], 10);
      }
    }

    if (point === 0) {
      continue;
    }

    entries.push({
      name,
      point,
      cardKindClass: row.className.trim(),
    });
  }

  return {
    entries,
    effectiveDate: listParamToEffectiveDate(listParam),
    listParam,
    totalCount: totalCount || entries.length,
  };
}

/**
 * 指定されたリストパラメータのGENESYSポイントリストをサーバーから取得する
 *
 * @param listParam リストパラメータ（YYYYMM形式、例: "202606"）
 * @returns パース結果
 */
export async function fetchGenesysPointList(listParam: string): Promise<ParsedGenesysList> {
  const url = getGenesysListUrl(listParam);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch GENESYS point list: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  return parseGenesysHtml(html, listParam);
}
