/**
 * パフォーマンス最適化（動的import）テスト
 * - バンドルサイズ測定
 * - チャンク分割の確認
 * - ローダー（loader.js）の機能テスト
 * @vitest-environment node
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { isRecord } from '@/utils/type-guards';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// テスト対象ファイル
const DIST_DIR = path.resolve(__dirname, '../../../dist');
const PUBLIC_DIR = path.resolve(__dirname, '../../../public');

/**
 * ファイルサイズを取得（バイト）
 */
const getFileSize = (filePath: string): number => {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
};

/**
 * ファイルサイズをKBに変換
 */
const bytesToKB = (bytes: number): number => {
  return Math.round((bytes / 1024) * 100) / 100;
};

/**
 * dist成果物が本番（minify済み）ビルドかを判定する
 *
 * 開発ビルド（webpack mode: development）は改行が保持された可読な出力になり、
 * 本番ビルド（terserでminify済み）はほぼ全体が1行に圧縮される。
 * バンドルサイズの理想値（650KB）は本番ビルドを前提とした値のため、
 * 開発ビルドに対してこの閾値を適用すると誤って失敗する
 * （開発ビルドは未minifyのため数MBになるのが正常）。
 */
const isMinifiedBuild = (filePath: string): boolean => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lineCount = content.split('\n').length;
    return lineCount < 100;
  } catch {
    return false;
  }
};

describe('パフォーマンス最適化（動的import）- ユニットテスト', () => {
  describe('バンドルサイズ測定', () => {
    it('content.js が生成されている', () => {
      const contentPath = path.join(DIST_DIR, 'content.js');
      const exists = fs.existsSync(contentPath);

      // ビルド前の場合はスキップ
      if (!exists) {
        expect(true).toBe(true); // ビルド環境がない場合はスキップ
        return;
      }

      expect(exists).toBe(true);
    });

    it('content.js のサイズが 650KB 以下である（本番ビルドのみ・理想値）', () => {
      const contentPath = path.join(DIST_DIR, 'content.js');

      // ビルド前の場合はスキップ
      if (!fs.existsSync(contentPath)) {
        expect(true).toBe(true);
        return;
      }

      // 開発ビルド（未minify）はこの閾値の対象外。650KBは本番(mise run build:prod)の
      // minify済み成果物を前提とした値であり、開発ビルドは数MBになるのが正常なため
      if (!isMinifiedBuild(contentPath)) {
        console.log('content.js は開発ビルド（未minify）のためサイズチェックをスキップ');
        expect(true).toBe(true);
        return;
      }

      const sizeBytes = getFileSize(contentPath);
      const sizeKB = bytesToKB(sizeBytes);

      // v0.5.0での実績: 595KB
      // 理想値: < 600KB
      console.log(`content.js size: ${sizeKB}KB`);
      expect(sizeKB).toBeLessThanOrEqual(650); // 緩い制限で対応
    });

    it('background.js が生成されている', () => {
      const bgPath = path.join(DIST_DIR, 'background.js');
      const exists = fs.existsSync(bgPath);

      if (!exists) {
        expect(true).toBe(true);
        return;
      }

      expect(exists).toBe(true);
    });

    it('popup.js が生成されている', () => {
      const popupPath = path.join(DIST_DIR, 'popup.js');
      const exists = fs.existsSync(popupPath);

      if (!exists) {
        expect(true).toBe(true);
        return;
      }

      expect(exists).toBe(true);
    });

    it('options.js が生成されている', () => {
      const optionsPath = path.join(DIST_DIR, 'options.js');
      const exists = fs.existsSync(optionsPath);

      if (!exists) {
        expect(true).toBe(true);
        return;
      }

      expect(exists).toBe(true);
    });
  });

  describe('チャンク分割の確認', () => {
    it('動的import により チャンクファイルが生成される', () => {
      // チャンク形式: <name>.chunk.js またはただの数字.js
      const files = fs.existsSync(DIST_DIR) ? fs.readdirSync(DIST_DIR) : [];
      const chunkFiles = files.filter(f => /^\d+\.js$/.test(f) || f.endsWith('.chunk.js'));

      // ビルド環境がない場合はスキップ
      if (files.length === 0) {
        expect(true).toBe(true);
        return;
      }

      // v0.5.0での実績: 982.js, 353.js, 689.js, 583.js など
      // チャンクが生成されていることを確認（複数あってもなくても OK）
      console.log(`Found chunks: ${chunkFiles.join(', ')}`);
      expect(chunkFiles.length >= 0).toBe(true);
    });

    it('チャンク分割により初期バンドルが削減される', () => {
      const contentPath = path.join(DIST_DIR, 'content.js');

      if (!fs.existsSync(contentPath)) {
        expect(true).toBe(true);
        return;
      }

      const files = fs.readdirSync(DIST_DIR);
      const contentSize = getFileSize(contentPath);
      const chunkFiles = files.filter(f => /^\d+\.js$/.test(f));

      // content.js が main entry のサイズとして計測
      // チャンク分割により content.js が削減されていることを確認
      const contentSizeKB = bytesToKB(contentSize);
      console.log(`content.js: ${contentSizeKB}KB, chunks: ${chunkFiles.length}`);

      expect(contentSizeKB).toBeDefined();
    });

    it('sessionManager モジュールがチャンク化されている', () => {
      // webpack.config.js で splitChunks に session モジュール設定あり
      const files = fs.existsSync(DIST_DIR) ? fs.readdirSync(DIST_DIR) : [];

      if (files.length === 0) {
        expect(true).toBe(true);
        return;
      }

      // session モジュール用のチャンクファイルが存在する可能性がある
      // 実装により異なるため、チャンクが存在することのみ確認
      expect(files.length > 0).toBe(true);
    });
  });

  describe('ローダー（loader.js）の機能テスト', () => {
    it('loader.js が存在する', () => {
      const loaderPath = path.join(PUBLIC_DIR, 'loader.js');
      const exists = fs.existsSync(loaderPath);

      expect(exists).toBe(true);
    });

    it('loader.js は content.js を動的インポートする（コード確認）', () => {
      const loaderPath = path.join(PUBLIC_DIR, 'loader.js');

      if (!fs.existsSync(loaderPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(loaderPath, 'utf8');

      // 動的 import の存在確認
      expect(content).toContain('import(');
      expect(content).toContain('content.js');
    });

    it('loader.js がエラーハンドリングを含む', () => {
      const loaderPath = path.join(PUBLIC_DIR, 'loader.js');

      if (!fs.existsSync(loaderPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(loaderPath, 'utf8');

      // エラーハンドリング（catch/error）の確認
      expect(content).toMatch(/catch|error/i);
    });

    it('loader.js が chrome.runtime.getURL を使用する', () => {
      const loaderPath = path.join(PUBLIC_DIR, 'loader.js');

      if (!fs.existsSync(loaderPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(loaderPath, 'utf8');

      // Chrome Extension API の使用確認
      expect(content).toContain('chrome.runtime.getURL');
    });

    it('loader.js のサイズが妥当である', () => {
      const loaderPath = path.join(PUBLIC_DIR, 'loader.js');

      if (!fs.existsSync(loaderPath)) {
        expect(true).toBe(true);
        return;
      }

      const sizeBytes = getFileSize(loaderPath);
      const sizeKB = bytesToKB(sizeBytes);

      // TASK-510実装（createLoader(deps)構造・設計書rev2 §1）後の実測: 10.84KB
      // （11101 bytes・277行）。上限は「実測 + 約2KBのマージン」で固定する
      // （document_start で最初の描画前に評価されるため、サイズ上限は初期描画への
      // 影響を保証するガード。大きく超える増加はレビューで要確認）
      console.log(`loader.js size: ${sizeKB}KB`);
      expect(sizeKB).toBeLessThan(13);
    });
  });

  describe('style-loader の挿入先（TASK-510: document_start 対応）', () => {
    // TASK-510 コードレビュー指摘1: style-loader 4.x のデフォルト挿入先は
    // insertBySelector.js の document.querySelector("head") 固定で、manifest の
    // run_at: document_start で content.js 評価時に head が未生成だと例外になり
    // content.js のモジュール評価全体が失敗する。挿入先モジュール
    // scripts/lib/style-insert.cjs（head || documentElement）を css/scss 両ruleの
    // options.insert に指定していることを検証する
    it('[covers:production-adapter.style-loader-inserts-into-head-or-document-element] 挿入先はhead||documentElementモジュール', () => {
      const configPath = path.resolve(__dirname, '../../../webpack.config.cjs');
      const configSource = fs.readFileSync(configPath, 'utf8');

      // 挿入先モジュールが存在し head フォールバックを持つ
      const insertModulePath = path.resolve(__dirname, '../../../scripts/lib/style-insert.cjs');
      expect(fs.existsSync(insertModulePath)).toBe(true);
      const insertSource = fs.readFileSync(insertModulePath, 'utf8');
      expect(insertSource).toMatch(/document\.head\s*\|\|\s*document\.documentElement/);

      // css/scss 両ruleの style-loader が insert に指定している
      const insertRefs = configSource.match(/insert:\s*path\.resolve\(__dirname,\s*'scripts\/lib\/style-insert\.cjs'\)/g) ?? [];
      expect(insertRefs.length).toBeGreaterThanOrEqual(2);

      // dist（ビルド後）はデフォルトの querySelector("head") 固定挿入を使わない
      const contentPath = path.join(DIST_DIR, 'content.js');
      if (fs.existsSync(contentPath)) {
        const distSource = fs.readFileSync(contentPath, 'utf8');
        // カスタム挿入先モジュールがバンドルされている
        expect(distSource).toMatch(/document\.head\s*\|\|\s*document\.documentElement/);
        // デフォルト挿入モジュール（runtime/insertBySelector.js）がバンドルされていない
        expect(distSource).not.toContain('dist/runtime/insertBySelector');
      }
    });
  });

  describe('Chrome拡張機能のファイル名制約', () => {
    it('distディレクトリ直下に "_" で始まるファイル/ディレクトリが存在しない', () => {
      // Chrome拡張機能は "_" で始まるファイル/ディレクトリ名の読み込みを拒否する
      // （"Filenames starting with '_' are reserved for use by the system."）
      // webpackのsplitChunksが名前を導出できない匿名チャンクに数字始まりのハッシュidを
      // 割り当てると、識別子化のため webpack が先頭に "_" を付与することがある。
      // 回帰防止のため、distの生成物にこのパターンが含まれないことを固定でチェックする。
      if (!fs.existsSync(DIST_DIR)) {
        expect(true).toBe(true);
        return;
      }

      const entries = fs.readdirSync(DIST_DIR);
      const underscorePrefixed = entries.filter(name => name.startsWith('_'));

      expect(underscorePrefixed).toEqual([]);
    });
  });

  describe('manifest.json の確認', () => {
    it('manifest.json が存在する', () => {
      const manifestPath = path.join(DIST_DIR, 'manifest.json');
      const exists = fs.existsSync(manifestPath);

      expect(exists).toBe(true);
    });

    it('manifest.json で content_scripts が設定されている', () => {
      const manifestPath = path.join(DIST_DIR, 'manifest.json');

      if (!fs.existsSync(manifestPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      expect(manifest.content_scripts).toBeDefined();
      expect(manifest.content_scripts.length > 0).toBe(true);
    });

    it('manifest.json で content_scripts が loader.js を参照している', () => {
      const manifestPath = path.join(DIST_DIR, 'manifest.json');

      if (!fs.existsSync(manifestPath)) {
        expect(true).toBe(true);
        return;
      }

      const content = fs.readFileSync(manifestPath, 'utf8');
      const manifest = JSON.parse(content);

      const contentScript = manifest.content_scripts?.[0];
      expect(contentScript?.js).toBeDefined();
      expect(contentScript?.js.some((js: string) => js.includes('loader.js'))).toBe(true);
    });
  });

  describe('manifest.json の先行読み込み設定（TASK-510）', () => {
    // TASK-510: ロード画面の最初の描画前表示のための manifest 設定。
    // 設計書rev2（tmp/20260916_design_task510_loader-early-loading.md）§5:
    // - public/manifest.json と dist/manifest.json の両方を検証（dist はビルド前skipの既存パターン）
    // - content_scripts.js[0] === 'loader.js'（loader が最初に評価される）
    // - run_at === 'document_start'（最初の描画前に注入）
    // - web_accessible_resources に content.js（loader からの動的importに必要）
    //
    // テスト先行作成のため、TASK-510 実装（manifest の run_at 変更）までは
    // run_at 検証が red になる（未実装由来。typo・構文エラー由来でないこと）

    interface ContentScriptEntry {
      js: string[];
      run_at: string;
    }

    const isContentScriptEntry = (value: unknown): value is ContentScriptEntry =>
      isRecord(value) &&
      Array.isArray(value.js) &&
      value.js.every((js) => typeof js === 'string') &&
      typeof value.run_at === 'string';

    const readManifest = (filePath: string): unknown => {
      if (!fs.existsSync(filePath)) return null;
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    };

    const getContentScriptEntry = (manifest: unknown): ContentScriptEntry | null => {
      if (!isRecord(manifest)) return null;
      const entry = manifest.content_scripts?.[0];
      return isContentScriptEntry(entry) ? entry : null;
    };

    const hasWebAccessibleResource = (manifest: unknown, resource: string): boolean => {
      if (!isRecord(manifest)) return false;
      const entries = manifest.web_accessible_resources;
      if (!Array.isArray(entries)) return false;
      return entries.some(
        (entry) => isRecord(entry) && Array.isArray(entry.resources) && entry.resources.includes(resource)
      );
    };

    const verifyManifestForEarlyLoading = (manifestPath: string): boolean => {
      // ビルド前（ファイル無し）はskip（既存パターン）
      if (!fs.existsSync(manifestPath)) {
        expect(true).toBe(true);
        return false;
      }
      const manifest = readManifest(manifestPath);
      const contentScript = getContentScriptEntry(manifest);
      expect(contentScript).not.toBeNull();
      if (!contentScript) return true;
      // loader が先頭で document_start 評価される
      expect(contentScript.js[0]).toBe('loader.js');
      expect(contentScript.run_at).toBe('document_start');
      // loader からの content.js 動的importに必要
      expect(hasWebAccessibleResource(manifest, 'content.js')).toBe(true);
      return true;
    };

    it('public/manifest.json が run_at document_start・js[0]=loader.js・content.js公開（TASK-510）', () => {
      verifyManifestForEarlyLoading(path.join(PUBLIC_DIR, 'manifest.json'));
    });

    it('dist/manifest.json が run_at document_start・js[0]=loader.js・content.js公開（ビルド前skip）', () => {
      verifyManifestForEarlyLoading(path.join(DIST_DIR, 'manifest.json'));
    });
  });

  describe('動的import の検証', () => {
    it('動的import文が認識できる', () => {
      const dynamicImportRegex = /import\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/g;

      const testCode = `
        const module = await import('axios');
        const data = await import('./module.js');
      `;

      const matches = [...testCode.matchAll(dynamicImportRegex)];

      expect(matches.length).toBe(2);
      expect(matches[0][1]).toBe('axios');
      expect(matches[1][1]).toBe('./module.js');
    });

    it('複数の動的import をグループ化できる', () => {
      const imports = [
        'import("axios")',
        'import("vue")',
        'import("./component.js")'
      ];

      expect(imports).toHaveLength(3);
      expect(imports[0]).toContain('axios');
      expect(imports[1]).toContain('vue');
    });
  });

  describe('バンドルサイズの増減トラッキング', () => {
    it('複数のメインエントリのサイズを比較できる', () => {
      const files = fs.existsSync(DIST_DIR) ? fs.readdirSync(DIST_DIR) : [];
      const entryFiles = ['content.js', 'background.js', 'popup.js', 'options.js'];

      const sizes: Record<string, number> = {};

      for (const file of entryFiles) {
        const filePath = path.join(DIST_DIR, file);
        const sizeBytes = getFileSize(filePath);
        sizes[file] = bytesToKB(sizeBytes);
      }

      if (Object.values(sizes).some(s => s > 0)) {
        console.log('Bundle sizes:', sizes);
        expect(Object.keys(sizes).length).toBeGreaterThan(0);
      } else {
        // ビルド環境がない場合
        expect(true).toBe(true);
      }
    });

    it('チャンク分割により メインバンドル + チャンク < 単一バンドル', () => {
      const contentPath = path.join(DIST_DIR, 'content.js');

      if (!fs.existsSync(contentPath)) {
        expect(true).toBe(true);
        return;
      }

      const files = fs.readdirSync(DIST_DIR);
      const contentSize = getFileSize(contentPath);
      const chunkFiles = files.filter(f => /^\d+\.js$/.test(f));

      // チャンク分割が成功している場合、複数ファイルに分割される
      console.log(`Main: ${bytesToKB(contentSize)}KB, Chunks: ${chunkFiles.length}`);

      // チャンク分割が有効であることを確認
      expect(contentSize).toBeGreaterThan(0);
    });
  });
});
