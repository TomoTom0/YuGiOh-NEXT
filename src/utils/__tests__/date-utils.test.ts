import { describe, it, expect } from 'vitest';
import { isSameDay, toDateString, getTodayStart, getTodayEnd } from '../date-utils';

describe('date-utils', () => {
  describe('isSameDay', () => {
    it('同じ日付のタイムスタンプはtrueを返す', () => {
      const date1 = new Date('2025-11-26T10:00:00').getTime();
      const date2 = new Date('2025-11-26T23:59:59').getTime();
      expect(isSameDay(date1, date2)).toBe(true);
    });

    it('異なる日付のタイムスタンプはfalseを返す', () => {
      const date1 = new Date('2025-11-25T23:59:59').getTime();
      const date2 = new Date('2025-11-26T00:00:00').getTime();
      expect(isSameDay(date1, date2)).toBe(false);
    });

    it('24時間以上経過しても同じ日付ならtrueを返す', () => {
      const date1 = new Date('2025-11-26T00:00:00').getTime();
      const date2 = new Date('2025-11-26T23:59:59').getTime();
      expect(isSameDay(date1, date2)).toBe(true);
      expect(date2 - date1).toBeGreaterThanOrEqual(23 * 60 * 60 * 1000);
    });

    it('24時間未満でも異なる日付ならfalseを返す', () => {
      const date1 = new Date('2025-11-25T23:00:00').getTime();
      const date2 = new Date('2025-11-26T01:00:00').getTime();
      expect(isSameDay(date1, date2)).toBe(false);
      expect(date2 - date1).toBeLessThan(24 * 60 * 60 * 1000);
    });
  });

  describe('toDateString', () => {
    it('タイムスタンプをYYYY-MM-DD形式に変換する', () => {
      const timestamp = new Date('2025-11-26T10:30:45').getTime();
      expect(toDateString(timestamp)).toBe('2025-11-26');
    });

    it('月と日が1桁の場合は0埋めする', () => {
      const timestamp = new Date('2025-01-05T10:30:45').getTime();
      expect(toDateString(timestamp)).toBe('2025-01-05');
    });
  });

  describe('getTodayStart', () => {
    it('今日の0時0分0秒のタイムスタンプを返す', () => {
      const start = getTodayStart();
      const date = new Date(start);
      expect(date.getHours()).toBe(0);
      expect(date.getMinutes()).toBe(0);
      expect(date.getSeconds()).toBe(0);
      expect(date.getMilliseconds()).toBe(0);
    });
  });

  describe('getTodayEnd', () => {
    it('今日の23時59分59秒のタイムスタンプを返す', () => {
      const end = getTodayEnd();
      const date = new Date(end);
      expect(date.getHours()).toBe(23);
      expect(date.getMinutes()).toBe(59);
      expect(date.getSeconds()).toBe(59);
      expect(date.getMilliseconds()).toBe(999);
    });
  });
});
