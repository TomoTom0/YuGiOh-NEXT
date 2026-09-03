import { describe, it, expect } from 'vitest';
import { effectiveYymm, buildTooltip, triggerLabel, triggerBadgeText, parseSelectorValue } from '../regulation-ui';
import type { ResolvedRegulation } from '@/types/regulation';

function resolved(overrides: Partial<ResolvedRegulation> = {}): ResolvedRegulation {
  return {
    mode: 'none',
    tag: null,
    effectiveDate: null,
    listParam: null,
    fallback: undefined,
    ...overrides
  };
}

describe('effectiveYymm', () => {
  it('fallback があれば適用済みYYMMを返す', () => {
    const r = resolved({
      mode: 'ocg',
      effectiveDate: '2025-01-01',
      fallback: { requestedYymm: '2502', reason: 'not-exist', appliedIdentifier: '2025-01-01', appliedYymm: '2501' }
    });
    expect(effectiveYymm(r)).toBe('2501');
  });

  it('タグ由来（tag.yymm）があればそれを返す', () => {
    const r = resolved({
      mode: 'ocg',
      tag: { type: 'ocg', yymm: '2501', raw: '[OCG-2501]', bracket: 'square', position: 'prefix', startIndex: 0, endIndex: 10 }
    });
    expect(effectiveYymm(r)).toBe('2501');
  });

  it('OCGモードでtagが無くeffectiveDateのみ（手動選択）ならYYMMを日付から導出する', () => {
    const r = resolved({ mode: 'ocg', effectiveDate: '2024-01-01' });
    expect(effectiveYymm(r)).toBe('2401');
  });

  it('GENESYSモードでtagが無くlistParamのみ（手動選択）ならYYMMを導出する', () => {
    const r = resolved({ mode: 'genesys', listParam: '202608' });
    expect(effectiveYymm(r)).toBe('2608');
  });

  it('版指定が何も無ければnull（最新版）', () => {
    const r = resolved({ mode: 'ocg' });
    expect(effectiveYymm(r)).toBeNull();
  });
});

describe('buildTooltip', () => {
  it('fallback時は指定版と直近適用版の両方を説明文に含める', () => {
    const r = resolved({
      mode: 'ocg',
      effectiveDate: '2025-01-01',
      fallback: { requestedYymm: '2502', reason: 'not-exist', appliedIdentifier: '2025-01-01', appliedYymm: '2501' }
    });
    expect(buildTooltip(r, false)).toBe('指定 OCG-2502 は存在しないため、直近版 OCG-2501 を適用中');
  });

  it('YYMM指定時は年月表記で適用中バージョンを説明する', () => {
    const r = resolved({ mode: 'genesys', listParam: '202608' });
    expect(buildTooltip(r, false)).toBe('適用中: GENESYS 2026年08月版');
  });

  it('YYMM省略時は最新版と説明する', () => {
    const r = resolved({ mode: 'ocg' });
    expect(buildTooltip(r, false)).toBe('適用中: OCG 最新版');
  });

  it('手動選択時は未保存であることを示す接頭辞を付与する', () => {
    const r = resolved({ mode: 'genesys' });
    expect(buildTooltip(r, true)).toBe('(手動選択・未保存) 適用中: GENESYS 最新版');
  });

  it('mode=none（デッキ名にタグ無し）はOCG最新版として説明する', () => {
    expect(buildTooltip(resolved({ mode: 'none' }), false)).toBe('適用中: OCG 最新版');
  });
});

describe('triggerLabel', () => {
  it('mode=none（デッキ名にタグ無し）はOCG最新版として扱う（resolveDeckRegulationの仕様に合わせる）', () => {
    expect(triggerLabel(resolved({ mode: 'none' }))).toBe('OCG 最新版');
  });

  it('YYMM指定時は種別+年月版のラベルを返す', () => {
    const r = resolved({ mode: 'ocg', effectiveDate: '2024-01-01' });
    expect(triggerLabel(r)).toBe('OCG 2024年01月版');
  });

  it('YYMM省略時は最新版ラベルを返す', () => {
    expect(triggerLabel(resolved({ mode: 'genesys' }))).toBe('GENESYS 最新版');
  });
});

describe('triggerBadgeText', () => {
  it('mode=noneはOCGとして扱う', () => {
    expect(triggerBadgeText(resolved({ mode: 'none' }))).toBe('OCG');
  });

  it('mode=ocgはOCGを返す', () => {
    expect(triggerBadgeText(resolved({ mode: 'ocg' }))).toBe('OCG');
  });

  it('mode=genesysはGENESYSを返す', () => {
    expect(triggerBadgeText(resolved({ mode: 'genesys' }))).toBe('GENESYS');
  });
});

describe('parseSelectorValue', () => {
  it('"auto" は特別扱いでそのまま文字列を返す', () => {
    expect(parseSelectorValue('auto')).toBe('auto');
  });

  it('"none" は mode=none の ResolvedRegulation を返す', () => {
    const r = parseSelectorValue('none');
    expect(r).not.toBe('auto');
    expect((r as ResolvedRegulation).mode).toBe('none');
  });

  it('"ocg:latest" は effectiveDate=null（最新版）を返す', () => {
    const r = parseSelectorValue('ocg:latest') as ResolvedRegulation;
    expect(r.mode).toBe('ocg');
    expect(r.effectiveDate).toBeNull();
    expect(r.tag).toBeNull();
  });

  it('"ocg:2024-01-01" は指定日付を effectiveDate に設定する', () => {
    const r = parseSelectorValue('ocg:2024-01-01') as ResolvedRegulation;
    expect(r.mode).toBe('ocg');
    expect(r.effectiveDate).toBe('2024-01-01');
    expect(r.listParam).toBeNull();
  });

  it('"genesys:latest" は listParam=null（最新版）を返す', () => {
    const r = parseSelectorValue('genesys:latest') as ResolvedRegulation;
    expect(r.mode).toBe('genesys');
    expect(r.listParam).toBeNull();
  });

  it('"genesys:202608" は指定listParamを設定する', () => {
    const r = parseSelectorValue('genesys:202608') as ResolvedRegulation;
    expect(r.mode).toBe('genesys');
    expect(r.listParam).toBe('202608');
    expect(r.effectiveDate).toBeNull();
  });
});
