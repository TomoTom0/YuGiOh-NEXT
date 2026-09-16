/**
 * src/utils/loader-elements.ts のテスト（TASK-510 コードレビュー対応）
 *
 * loader.js と content.js が共有する要素ID（EXTENSION_IDS.loading）の削除・takeoverを
 * 識別属性（data-ygo-next-loader）でゲートする連携ユーティリティの検証。
 * loader側はフェイルセーフの ownElements 参照ベース保護を持つが、content側の
 * IDベース削除・takeover が同IDの他人要素を保護していなかった指摘への対応。
 *
 * 条件書: tests/design/loader-elements/conditions.toml
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EXTENSION_IDS } from '@/utils/dom-selectors';
import {
  LOADER_ATTR,
  markAsLoaderElement,
  removeLoaderDerivedElements,
  isLoaderOverlayElement
} from '@/utils/loader-elements';

const createOverlay = (marked: boolean): HTMLDivElement => {
  const overlay = document.createElement('div');
  overlay.id = EXTENSION_IDS.loading.moduleLoadingOverlay;
  if (marked) markAsLoaderElement(overlay);
  document.body.appendChild(overlay);
  return overlay;
};

const createEarlyHide = (marked: boolean): HTMLStyleElement => {
  const style = document.createElement('style');
  style.id = EXTENSION_IDS.loading.earlyHideStyle;
  if (marked) markAsLoaderElement(style);
  document.head.appendChild(style);
  return style;
};

describe('loader-elements（loader由来要素の識別とゲート付き削除）', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    document.head.innerHTML = '';
  });

  it('[covers:mark-as-loader-element.sets-identifier-attribute] マーク関数は識別属性を設定する', () => {
    const element = document.createElement('div');
    expect(element.hasAttribute(LOADER_ATTR)).toBe(false);
    markAsLoaderElement(element);
    expect(element.getAttribute(LOADER_ATTR)).toBe('1');
  });

  it('[covers:remove-loader-derived-elements.removes-only-marked-elements] 属性を持つ要素のみ削除し属性なし同ID要素は保護する', () => {
    // loader/content 由来（識別属性あり）: 除去される
    const ownOverlay = createOverlay(true);
    const ownEarlyHide = createEarlyHide(true);
    // 同IDだが拡張由来ではない（識別属性なし）: 改変・削除されない
    const foreignOverlay = createOverlay(false);
    const foreignEarlyHide = createEarlyHide(false);

    removeLoaderDerivedElements();

    expect(ownOverlay.isConnected).toBe(false);
    expect(ownEarlyHide.isConnected).toBe(false);
    expect(foreignOverlay.isConnected).toBe(true);
    expect(foreignEarlyHide.isConnected).toBe(true);
  });

  it('[covers:remove-loader-derived-elements.no-targets-is-noop] 対象要素が無い場合も例外を投げない', () => {
    expect(() => removeLoaderDerivedElements()).not.toThrow();
  });

  it('[covers:is-loader-overlay-element.accepts-only-marked-div] takeover判定は識別属性付きdivのみtrueとする', () => {
    const markedOverlay = createOverlay(true);
    const unmarkedOverlay = createOverlay(false);
    const markedNonDiv = document.createElement('style');
    markedNonDiv.id = EXTENSION_IDS.loading.moduleLoadingOverlay;
    markAsLoaderElement(markedNonDiv);
    document.body.appendChild(markedNonDiv);

    // loader由来のoverlayのみtakeover対象
    expect(isLoaderOverlayElement(markedOverlay)).toBe(true);
    // 同IDでも属性なし（他人要素）・属性があってもdiv以外はtakeoverしない
    expect(isLoaderOverlayElement(unmarkedOverlay)).toBe(false);
    expect(isLoaderOverlayElement(markedNonDiv)).toBe(false);
    expect(isLoaderOverlayElement(null)).toBe(false);
  });
});
