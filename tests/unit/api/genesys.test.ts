/**
 * GENESYSポイントリスト取得APIのテスト
 * - parseGenesysHtml: howtoページHTMLからの抽出
 * - parseGenesysIndex: インデックスページから実在リストの発見
 * - listParamToEffectiveDate: YYYYMM -> YYYY-MM-01 変換
 */

import { describe, it, expect } from 'vitest';
import {
  parseGenesysHtml,
  parseGenesysIndex,
  listParamToEffectiveDate,
} from '@/api/genesys';

/** テスト用の最小howtoページHTMLを構築 */
function buildHtml(rows: string, count = 0): string {
  return `<table class="genesyspoint" data-count="${count}">
    <thead><tr><th></th><th>カード名</th><th>ポイント</th><th>変動</th></tr></thead>
    <tbody>${rows}</tbody>
  </table>`;
}

describe('api/genesys', () => {
  describe('parseGenesysHtml', () => {
    it('カード名・ポイント・種類を抽出する', () => {
      const html = buildHtml(`
        <tr data-point="13" class="effect"><td></td><td>BF－精鋭のゼピュロス</td><td><b>13</b></td><td></td></tr>
        <tr data-point="100" class="fusion"><td></td><td>ナチュル・エクストリオ</td><td><b>100</b></td><td></td></tr>
        <tr data-point="5" class="magic"><td></td><td>サイクロン</td><td><b>5</b></td><td></td></tr>
      `, 3);
      const result = parseGenesysHtml(html, '202606');
      expect(result.totalCount).toBe(3);
      expect(result.listParam).toBe('202606');
      expect(result.effectiveDate).toBe('2026-06-01');
      expect(result.entries).toHaveLength(3);
      expect(result.entries[0]).toEqual({ name: 'BF－精鋭のゼピュロス', point: 13, cardKindClass: 'effect' });
      expect(result.entries[1]).toEqual({ name: 'ナチュル・エクストリオ', point: 100, cardKindClass: 'fusion' });
      expect(result.entries[2]).toEqual({ name: 'サイクロン', point: 5, cardKindClass: 'magic' });
    });

    it('data-point属性に末尾の余分なダブルクォートがあっても数値を抽出する', () => {
      // 本番HTMLで観測された data-point="13"" の形式
      const html = buildHtml(`
        <tr data-point="13"" class="effect"><td></td><td>カードA</td><td><b>13</b></td><td></td></tr>
      `, 1);
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries[0]?.point).toBe(13);
    });

    it('data-point属性がない場合はtd内のbタグからポイントを抽出する', () => {
      const html = buildHtml(`
        <tr class="trap"><td></td><td>神の宣告</td><td><b>12</b></td><td></td></tr>
      `, 1);
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries[0]?.point).toBe(12);
    });

    it('ポイント0の行は除外する', () => {
      const html = buildHtml(`
        <tr data-point="0" class="effect"><td></td><td>カード0</td><td><b>0</b></td><td></td></tr>
        <tr data-point="7" class="effect"><td></td><td>カード7</td><td><b>7</b></td><td></td></tr>
      `, 2);
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.name).toBe('カード7');
    });

    it('テーブルが存在しない場合は空配列を返す', () => {
      const html = '<html><body>no table</body></html>';
      const result = parseGenesysHtml(html, '202606');
      expect(result.entries).toHaveLength(0);
      expect(result.totalCount).toBe(0);
    });

    it('data-count属性がない場合はentries.lengthをtotalCountにする', () => {
      const html = `<table class="genesyspoint"><tbody>
        <tr data-point="3" class="effect"><td></td><td>カード</td><td><b>3</b></td><td></td></tr>
      </tbody></table>`;
      const result = parseGenesysHtml(html, '202606');
      expect(result.totalCount).toBe(1);
    });
  });

  describe('listParamToEffectiveDate', () => {
    it('YYYYMMをYYYY-MM-01に変換する', () => {
      expect(listParamToEffectiveDate('202606')).toBe('2026-06-01');
      expect(listParamToEffectiveDate('202512')).toBe('2025-12-01');
    });

    it('不正な形式はそのまま返す', () => {
      expect(listParamToEffectiveDate('abc')).toBe('abc');
      expect(listParamToEffectiveDate('2026')).toBe('2026');
    });
  });

  describe('parseGenesysIndex', () => {
    /** テスト用インデックスページHTML（実構造を模倣） */
    function buildIndexHtml(latest: string, others: string[] = []): string {
      const otherLinks = others
        .map(p => `<li><a href="?list=${p}">20XX年X月1日適用リスト</a></li>`)
        .join('');
      return `<section id="point">
        <h2>「GENESYS」ポイントリスト</h2>
        <a href="?list=${latest}" class="btn howto marker">最新版：2026年8月1日適用リスト</a>
        <ul class="marker">${otherLinks}</ul>
      </section>`;
    }

    it('最新版と過去リストを抽出する', () => {
      // 実データと同じ構造: 最新版=202608, 過去=202606
      const html = `<section id="point">
        <a href="?list=202608" class="btn howto marker">最新版：2026年8月1日適用リスト</a>
        <ul class="marker"><li><a href="?list=202606">2026年6月1日適用リスト</a></li></ul>
      </section>`;
      const refs = parseGenesysIndex(html);
      expect(refs).toHaveLength(2);
      const latest = refs.find(r => r.isLatest);
      const past = refs.find(r => !r.isLatest);
      expect(latest?.listParam).toBe('202608');
      expect(latest?.effectiveDate).toBe('2026-08-01');
      expect(past?.listParam).toBe('202606');
      expect(past?.effectiveDate).toBe('2026-06-01');
      expect(past?.isLatest).toBe(false);
    });

    it('最新版が検出できなければ適用日が最新のものを最新版とする', () => {
      const html = `<section id="point">
        <ul class="marker">
          <li><a href="?list=202606">2026年6月1日適用リスト</a></li>
          <li><a href="?list=202608">2026年8月1日適用リスト</a></li>
        </ul>
      </section>`;
      const refs = parseGenesysIndex(html);
      expect(refs).toHaveLength(2);
      const latest = refs.find(r => r.isLatest);
      expect(latest?.listParam).toBe('202608');
    });

    it('重複するlistParamは除外する', () => {
      const html = buildIndexHtml('202608', ['202606']);
      // 202608 を2回出現させる
      const dupHtml = html + `<a href="?list=202608">最新版：2026年8月1日適用リスト</a>`;
      const refs = parseGenesysIndex(dupHtml);
      expect(refs).toHaveLength(2);
    });

    it('section#pointが無い場合は空配列', () => {
      const html = '<html><body>no section</body></html>';
      expect(parseGenesysIndex(html)).toHaveLength(0);
    });
  });
});