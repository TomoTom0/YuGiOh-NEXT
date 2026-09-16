/**
 * src/utils/loader-elements.ts のテスト（TASK-510 コードレビュー対応）
 *
 * loader.js と content.js が共有する要素ID（EXTENSION_IDS.loading）の削除・takeoverを
 * 識別属性（data-ygo-next-loader）でゲートする連携ユーティリティの検証。
 * loader側はフェイルセーフの ownElements 参照ベース保護を持つが、content側の
 * IDベース削除・takeover が同IDの他人要素を保護していなかった指摘への対応。
 *
 * PR#156レビュー指摘2対応: getElementById は文書順最初の要素のみ返すため、同IDの他人
 * 要素が先在すると拡張由来要素を捕捉できなかった。lookup（findLoaderOverlay /
 * findLoaderEarlyHide）と removeLoaderDerivedElements を識別属性セレクタベースに
 * 変更したことの検証を含む。
 *
 * 条件書: tests/design/loader-elements/conditions.toml
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EXTENSION_IDS } from '@/utils/dom-selectors';
import {
  LOADER_ATTR,
  markAsLoaderElement,
  removeLoaderDerivedElements,
  findLoaderOverlay,
  findLoaderEarlyHide
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

  it('[covers:remove-loader-derived-elements.removes-all-marked-when-foreign-precedes] 他人要素が先在する重複ID状態でも属性付きは全件削除する', () => {
    // 他人要素（属性なし）が先在し、その後に拡張由来要素が複数（旧要素＋新規生成）並ぶ
    // 状態。getElementById は最初の他人要素しか返さないためセレクタで全件取得する
    const foreignOverlay = createOverlay(false);
    const foreignEarlyHide = createEarlyHide(false);
    const ownOverlay1 = createOverlay(true);
    const ownOverlay2 = createOverlay(true);
    const ownEarlyHide1 = createEarlyHide(true);
    const ownEarlyHide2 = createEarlyHide(true);
    expect(document.body.contains(foreignOverlay)).toBe(true);

    removeLoaderDerivedElements();

    expect(ownOverlay1.isConnected).toBe(false);
    expect(ownOverlay2.isConnected).toBe(false);
    expect(ownEarlyHide1.isConnected).toBe(false);
    expect(ownEarlyHide2.isConnected).toBe(false);
    expect(foreignOverlay.isConnected).toBe(true);
    expect(foreignEarlyHide.isConnected).toBe(true);
  });

  it('[covers:find-loader-overlay.returns-marked-even-when-foreign-precedes] overlay lookupは先在する他人要素をスキップして属性付きdivを返す', () => {
    const foreignOverlay = createOverlay(false);
    const ownOverlay = createOverlay(true);

    // getElementById は文書順最初（他人要素）を返すが、識別属性セレクタは拡張由来のみ捕捉
    expect(findLoaderOverlay()).toBe(ownOverlay);

    // 属性付き要素が無ければnull（他人要素だけでは代用しない）
    ownOverlay.remove();
    expect(findLoaderOverlay()).toBe(null);
    expect(document.body.contains(foreignOverlay)).toBe(true);
  });

  it('[covers:find-loader-overlay.rejects-marked-non-div] 属性付きでもdiv以外はoverlayとして返さない', () => {
    const markedNonDiv = document.createElement('style');
    markedNonDiv.id = EXTENSION_IDS.loading.moduleLoadingOverlay;
    markAsLoaderElement(markedNonDiv);
    document.body.appendChild(markedNonDiv);

    expect(findLoaderOverlay()).toBe(null);
  });

  it('[covers:find-loader-early-hide.returns-marked-even-when-foreign-precedes] early-hide lookupは先在する他人要素をスキップして属性付きstyleを返す', () => {
    const foreignEarlyHide = createEarlyHide(false);
    const ownEarlyHide = createEarlyHide(true);

    expect(findLoaderEarlyHide()).toBe(ownEarlyHide);

    // 属性付き要素が無ければnull
    ownEarlyHide.remove();
    expect(findLoaderEarlyHide()).toBe(null);
    expect(document.head.contains(foreignEarlyHide)).toBe(true);
  });
});
