import { describe, it, expect } from 'vitest';
import { parseRegulationTag, replaceTagYymm } from '../regulation-tag-parser';
import type { RegulationTag } from '@/types/regulation';

describe('parseRegulationTag', () => {
  it('先頭の [GENESYS] タグ（YYMM省略）をパースする', () => {
    const tag = parseRegulationTag('[GENESYS] マイデッキ');
    expect(tag).toEqual({
      type: 'genesys',
      yymm: null,
      raw: '[GENESYS]',
      bracket: 'square',
      position: 'prefix',
      startIndex: 0,
      endIndex: 9
    });
  });

  it('先頭の [GENESYS-2608] タグ（YYMMあり）をパースする', () => {
    const tag = parseRegulationTag('[GENESYS-2608] マイデッキ');
    expect(tag?.type).toBe('genesys');
    expect(tag?.yymm).toBe('2608');
  });

  it('末尾の [OCG] タグをパースする', () => {
    const tag = parseRegulationTag('マイデッキ [OCG-2410]');
    expect(tag?.type).toBe('ocg');
    expect(tag?.yymm).toBe('2410');
    expect(tag?.position).toBe('suffix');
  });

  it('隅付き括弧【】のタグもパースする', () => {
    const tag = parseRegulationTag('【OCG】 マイデッキ');
    expect(tag?.type).toBe('ocg');
    expect(tag?.bracket).toBe('corner');
  });

  it('大文字小文字を無視する', () => {
    const tag = parseRegulationTag('[genesys-2608] マイデッキ');
    expect(tag?.type).toBe('genesys');
  });

  it('GENE 省略形の [GENE] タグを GENESYS として解釈する', () => {
    const tag = parseRegulationTag('[GENE] マイデッキ');
    expect(tag).toEqual({
      type: 'genesys',
      yymm: null,
      raw: '[GENE]',
      bracket: 'square',
      position: 'prefix',
      startIndex: 0,
      endIndex: 6
    });
  });

  it('GENE 省略形 + YYMM もパースする', () => {
    const tag = parseRegulationTag('[GENE-2608] マイデッキ');
    expect(tag?.type).toBe('genesys');
    expect(tag?.yymm).toBe('2608');
  });

  it('GENE 省略形は大文字小文字を無視する', () => {
    const tag = parseRegulationTag('[gene-2608] マイデッキ');
    expect(tag?.type).toBe('genesys');
    expect(tag?.yymm).toBe('2608');
  });

  it('末尾の [GENE] タグもパースする', () => {
    const tag = parseRegulationTag('マイデッキ [GENE-2608]');
    expect(tag?.type).toBe('genesys');
    expect(tag?.position).toBe('suffix');
  });

  it('タグが無い場合は null を返す', () => {
    expect(parseRegulationTag('ただのデッキ名')).toBeNull();
  });

  it('中央にあるタグは対象外', () => {
    expect(parseRegulationTag('マイ[GENESYS]デッキ')).toBeNull();
  });

  it('未知のレギュレーション名は無視する', () => {
    expect(parseRegulationTag('[UNKNOWN] マイデッキ')).toBeNull();
  });

  it('空文字列は null を返す', () => {
    expect(parseRegulationTag('')).toBeNull();
  });
});

describe('replaceTagYymm', () => {
  it('GENESYS タグの YYMM を置換する', () => {
    const deckName = '[GENESYS-2608] マイデッキ';
    const tag = parseRegulationTag(deckName) as RegulationTag;
    expect(replaceTagYymm(deckName, tag, '2410')).toBe('[GENESYS-2410] マイデッキ');
  });

  it('GENE 省略形タグを置換すると GENESYS に正規化される', () => {
    const deckName = '[GENE-2608] マイデッキ';
    const tag = parseRegulationTag(deckName) as RegulationTag;
    expect(replaceTagYymm(deckName, tag, '2410')).toBe('[GENESYS-2410] マイデッキ');
  });

  it('OCG タグの YYMM を置換する', () => {
    const deckName = 'マイデッキ [OCG-2410]';
    const tag = parseRegulationTag(deckName) as RegulationTag;
    expect(replaceTagYymm(deckName, tag, '2501')).toBe('マイデッキ [OCG-2501]');
  });
});
