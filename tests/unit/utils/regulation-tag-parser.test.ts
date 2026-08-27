import { describe, it, expect } from 'vitest';
import { parseRegulationTag, replaceTagYymm } from '@/utils/regulation-tag-parser';

describe('parseRegulationTag', () => {
  describe('基本パターン', () => {
    it('先頭の角括弧タグ（YYMMあり）をパースする', () => {
      const tag = parseRegulationTag('[GENESYS-2608] 青眼の白龍デッキ');
      expect(tag).not.toBeNull();
      expect(tag?.type).toBe('genesys');
      expect(tag?.yymm).toBe('2608');
      expect(tag?.bracket).toBe('square');
      expect(tag?.position).toBe('prefix');
      expect(tag?.raw).toBe('[GENESYS-2608]');
    });

    it('末尾の角括弧タグ（YYMMあり）をパースする', () => {
      const tag = parseRegulationTag('青眼の白龍デッキ [GENESYS-2608]');
      expect(tag).not.toBeNull();
      expect(tag?.type).toBe('genesys');
      expect(tag?.yymm).toBe('2608');
      expect(tag?.position).toBe('suffix');
    });

    it('YYMM省略（最新版）をパースする', () => {
      const tag = parseRegulationTag('[GENESYS] 青眼');
      expect(tag?.type).toBe('genesys');
      expect(tag?.yymm).toBeNull();
    });

    it('隅付き括弧【】をパースする', () => {
      const tag = parseRegulationTag('【GENESYS-2608】 青眼');
      expect(tag?.bracket).toBe('corner');
      expect(tag?.type).toBe('genesys');
      expect(tag?.yymm).toBe('2608');
    });

    it('OCGタグをパースする', () => {
      const tag = parseRegulationTag('[OCG-2501] デッキ');
      expect(tag?.type).toBe('ocg');
      expect(tag?.yymm).toBe('2501');
    });

    it('末尾のOCGタグ（YYMM省略）をパースする', () => {
      const tag = parseRegulationTag('デッキ 【OCG】');
      expect(tag?.type).toBe('ocg');
      expect(tag?.yymm).toBeNull();
      expect(tag?.position).toBe('suffix');
    });
  });

  describe('大文字小文字・空白', () => {
    it('小文字のレギュレーション名を許容する', () => {
      expect(parseRegulationTag('[genesys-2608] x')?.type).toBe('genesys');
      expect(parseRegulationTag('[Genesys] x')?.type).toBe('genesys');
      expect(parseRegulationTag('[ocg-2501] x')?.type).toBe('ocg');
    });

    it('タグ内の前後空白を許容する', () => {
      const tag = parseRegulationTag('[ GENESYS-2608 ] 青眼');
      expect(tag?.type).toBe('genesys');
      expect(tag?.yymm).toBe('2608');
    });

    it('タグの前に空白があっても先頭タグとして扱う', () => {
      const tag = parseRegulationTag('  [GENESYS] 青眼');
      expect(tag?.position).toBe('prefix');
      expect(tag?.raw).toBe('[GENESYS]');
    });
  });

  describe('位置とインデックス', () => {
    it('タグ単体（デッキ名がタグのみ）を先頭タグとして扱う', () => {
      const tag = parseRegulationTag('[GENESYS-2608]');
      expect(tag?.position).toBe('prefix');
      expect(tag?.startIndex).toBe(0);
      expect(tag?.endIndex).toBe('[GENESYS-2608]'.length);
    });

    it('先頭タグの startIndex/endIndex が raw に一致する', () => {
      const name = '[GENESYS] 青眼';
      const tag = parseRegulationTag(name);
      expect(tag).not.toBeNull();
      expect(name.slice(tag!.startIndex, tag!.endIndex)).toBe('[GENESYS]');
    });

    it('末尾タグの startIndex/endIndex が raw に一致する', () => {
      const name = '青眼 [OCG-2501]';
      const tag = parseRegulationTag(name);
      expect(tag).not.toBeNull();
      expect(name.slice(tag!.startIndex, tag!.endIndex)).toBe('[OCG-2501]');
    });
  });

  describe('無効ケース（null を返す）', () => {
    it('タグ無しは null', () => {
      expect(parseRegulationTag('青眼の白龍デッキ')).toBeNull();
    });

    it('空文字は null', () => {
      expect(parseRegulationTag('')).toBeNull();
    });

    it('無効なレギュレーション名は null', () => {
      expect(parseRegulationTag('[FOO-2608] デッキ')).toBeNull();
      expect(parseRegulationTag('[RUSH] デッキ')).toBeNull();
    });

    it('空白なしで密着した後続タグは null', () => {
      expect(parseRegulationTag('[GENESYS]青眼')).toBeNull();
    });

    it('空白なしで密着した前方タグは null', () => {
      expect(parseRegulationTag('青眼[GENESYS]')).toBeNull();
    });

    it('中央のタグは null', () => {
      expect(parseRegulationTag('青眼 [GENESYS] デッキ')).toBeNull();
    });

    it('YYMMが4桁でない場合は null', () => {
      expect(parseRegulationTag('[GENESYS-268] x')).toBeNull();
      expect(parseRegulationTag('[GENESYS-26081] x')).toBeNull();
    });

    it('括弧の開閉が不一致は null', () => {
      expect(parseRegulationTag('[GENESYS】 x')).toBeNull();
    });
  });

  describe('replaceTagYymm', () => {
    it('prefix の [OCG-2501] を指定YYMMに置換', () => {
      const tag = parseRegulationTag('[OCG-2501] デッキ');
      if (!tag) throw new Error('tag should be parsed');
      expect(replaceTagYymm('[OCG-2501] デッキ', tag, '2410')).toBe('[OCG-2410] デッキ');
    });

    it('suffix のタグを置換', () => {
      const deckName = '青眼デッキ [OCG-2501]';
      const tag = parseRegulationTag(deckName);
      if (!tag) throw new Error('tag should be parsed');
      expect(replaceTagYymm(deckName, tag, '2410')).toBe('青眼デッキ [OCG-2410]');
    });

    it('corner 括弧の GENESYS タグを置換', () => {
      const deckName = '【GENESYS-2608】 デッキ';
      const tag = parseRegulationTag(deckName);
      if (!tag) throw new Error('tag should be parsed');
      expect(replaceTagYymm(deckName, tag, '2606')).toBe('【GENESYS-2606】 デッキ');
    });

    it('タグ以外の部分は保持', () => {
      const deckName = '[OCG-2501] 青眼の白龍デッキ';
      const tag = parseRegulationTag(deckName);
      if (!tag) throw new Error('tag should be parsed');
      expect(replaceTagYymm(deckName, tag, '2410')).toBe('[OCG-2410] 青眼の白龍デッキ');
    });
  });
});
