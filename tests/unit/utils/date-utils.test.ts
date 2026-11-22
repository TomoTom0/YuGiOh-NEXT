import { describe, it, expect, afterEach, vi } from 'vitest';
import { isSameDay, toDateString, getTodayStart, getTodayEnd } from '../../../src/utils/date-utils';

describe('isSameDay', () => {
  it('同一のtimestampを渡した場合はtrueを返す [covers:is-same-day.identical-timestamps-true]', () => {
    const t = new Date(2026, 5, 15, 10, 0, 0).getTime();
    expect(isSameDay(t, t)).toBe(true);
  });

  it('年月日が一致していれば時刻が異なってもtrueを返す [covers:is-same-day.same-day-different-time-true]', () => {
    const start = new Date(2026, 5, 15, 0, 0, 0, 0).getTime();
    const end = new Date(2026, 5, 15, 23, 59, 59, 999).getTime();
    expect(isSameDay(start, end)).toBe(true);
  });

  it('年が異なる場合はfalseを返す [covers:is-same-day.different-year-false]', () => {
    const a = new Date(2025, 5, 15).getTime();
    const b = new Date(2026, 5, 15).getTime();
    expect(isSameDay(a, b)).toBe(false);
  });

  it('月が異なる場合はfalseを返す [covers:is-same-day.different-month-same-year-day-false]', () => {
    const a = new Date(2026, 0, 15).getTime();
    const b = new Date(2026, 1, 15).getTime();
    expect(isSameDay(a, b)).toBe(false);
  });

  it('日が異なる場合はfalseを返す [covers:is-same-day.different-date-same-year-month-false]', () => {
    const a = new Date(2026, 5, 14).getTime();
    const b = new Date(2026, 5, 15).getTime();
    expect(isSameDay(a, b)).toBe(false);
  });

  it('年末年始をまたぐ場合はfalseを返す [covers:is-same-day.cross-year-boundary-false]', () => {
    const a = new Date(2025, 11, 31, 23, 59, 59, 999).getTime();
    const b = new Date(2026, 0, 1, 0, 0, 0, 0).getTime();
    expect(isSameDay(a, b)).toBe(false);
  });

  it('NaNを渡した場合はNaN===NaNがfalseになるためfalseを返す [covers:is-same-day.invalid-timestamp-nan-false]', () => {
    expect(isSameDay(NaN, NaN)).toBe(false);
  });
});

describe('toDateString', () => {
  it('月・日が1桁の場合はゼロ埋めされる [covers:to-date-string.pads-single-digit-month-and-day]', () => {
    const t = new Date(2026, 2, 5).getTime(); // 3月5日
    expect(toDateString(t)).toBe('2026-03-05');
  });

  it('月・日が2桁の場合はそのまま出力される [covers:to-date-string.no-padding-for-double-digit-month-and-day]', () => {
    const t = new Date(2026, 11, 25).getTime(); // 12月25日
    expect(toDateString(t)).toBe('2026-12-25');
  });
});

describe('getTodayStart / getTodayEnd', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('システム時刻の日付でローカル0時0分0秒0ミリ秒を返す [covers:get-today-start.returns-local-midnight]', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 13, 45, 30, 500));

    expect(getTodayStart()).toBe(new Date(2026, 5, 15, 0, 0, 0, 0).getTime());
  });

  it('システム時刻の日付でローカル23時59分59秒999ミリ秒を返す [covers:get-today-end.returns-local-235959-999]', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 13, 45, 30, 500));

    expect(getTodayEnd()).toBe(new Date(2026, 5, 15, 23, 59, 59, 999).getTime());
  });

  it('getTodayStartとgetTodayEndは常に同じ日を指す [covers:get-today-start-end.bracket-same-day]', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 5, 15, 13, 45, 30, 500));

    const start = getTodayStart();
    const end = getTodayEnd();

    expect(isSameDay(start, end)).toBe(true);
    expect(start).toBeLessThan(end);
  });
});
