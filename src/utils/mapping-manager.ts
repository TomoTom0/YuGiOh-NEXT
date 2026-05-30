/**
 * マッピングマネージャー
 *
 * ストレージから動的マッピングを取得し、静的マッピングより優先して使用
 */

import {
  Race,
  MonsterType,
  Attribute,
  SpellEffectType,
  TrapEffectType,
  RACE_ID_TO_NAME,
  ATTRIBUTE_ID_TO_NAME,
  MONSTER_TYPE_ID_TO_NAME,
  SPELL_EFFECT_TYPE_ID_TO_NAME,
  TRAP_EFFECT_TYPE_ID_TO_NAME,
} from '@/types/card-maps';
import { detectLanguage } from './language-detector';

interface DynamicMappings {
  race: Partial<Record<Race, string>>;
  monsterType: Partial<Record<MonsterType, string>>;
  attribute: Partial<Record<Attribute, string>>;
  spellEffect: Partial<Record<SpellEffectType, string>>;
  trapEffect: Partial<Record<TrapEffectType, string>>;
  updatedAt: number;
  quarter: string;
}

class MappingManager {
  private dynamicMappings: Map<string, DynamicMappings> = new Map();
  private initialized = false;
  private fetchingLanguages: Set<string> = new Set(); // 取得中の言語を追跡

  /**
   * マッピングが有効かバリデーション
   * 必須フィールド（race, monsterType, attribute）が全て存在し、かつ空でないことを確認
   */
  private isValidMapping(mapping: DynamicMappings): boolean {
    if (!mapping) return false;

    // 全ての必須フィールドが存在し、かつ空でないかチェック
    const hasRace = mapping.race && Object.keys(mapping.race).length > 0;
    const hasMonsterType = mapping.monsterType && Object.keys(mapping.monsterType).length > 0;
    const hasAttribute = mapping.attribute && Object.keys(mapping.attribute).length > 0;

    // **全て揃っている場合のみ有効**（いずれか1つでも空なら無効）
    const isValid = hasRace && hasMonsterType && hasAttribute;

    return isValid;
  }

  /**
   * ストレージから動的マッピングをロード
   *
   * @param lang 現在の言語（指定した場合、その言語のみチェック・更新）
   */
  async initialize(lang?: string): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // 言語が指定されている場合、その言語のマッピングを確認
      if (lang) {
        await this.loadLanguageMapping(lang);

        // マッピングがない場合は、同期的にfetchAndStoreMappingsを待つ
        if (!this.dynamicMappings.has(lang)) {
          try {
            await this.fetchAndStoreMappings(lang);
          } catch (error) {
            console.warn(`[MappingManager] Failed to fetch mappings for ${lang}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('[MappingManager] Failed to initialize:', error);
    }

    this.initialized = true;
  }

  /**
   * 指定言語のマッピングをロード（キャッシュがなければ同期的に取得）
   */
  private async loadLanguageMapping(lang: string): Promise<void> {
    try {
      // Chrome Storage からマッピング情報を読み込み
      const storageKey = `ygo-mappings:${lang}`;
      const stored = await chrome.storage.local.get(storageKey);

      if (stored[storageKey]) {
        const dynamicMapping = stored[storageKey] as DynamicMappings;

        // マッピングが有効か確認
        if (this.isValidMapping(dynamicMapping)) {
          this.dynamicMappings.set(lang, dynamicMapping);
        } else {
          // 無効なマッピングの場合は、新しく取得
          console.warn(
            `[MappingManager] Stored mappings for ${lang} are invalid or empty ` +
            `(race: ${Object.keys(dynamicMapping.race || {}).length}, ` +
            `monsterType: ${Object.keys(dynamicMapping.monsterType || {}).length}), ` +
            `fetching fresh data...`
          );
          if (!this.fetchingLanguages.has(lang)) {
            // 同期的に（await可能な形で）マッピング取得を実行
            await this.fetchAndStoreMappings(lang);
          }
        }
      } else {
        // キャッシュがなければ同期的に取得
        if (!this.fetchingLanguages.has(lang)) {
          await this.fetchAndStoreMappings(lang);
        }
      }
    } catch (error) {
      console.warn(`[MappingManager] Failed to load mappings for ${lang}:`, error);
      // エラーの場合は静的マッピングを使用
    }
  }

  /**
   * カード検索ページからマッピング情報を取得して保存
   */
  private async fetchAndStoreMappings(lang: string): Promise<void> {
    this.fetchingLanguages.add(lang);

    try {
      const { extractMappingsFromSearchPage } = await import('./extract-mappings');
      const mappings = await extractMappingsFromSearchPage(lang);

      if (mappings) {
        // 取得したマッピングをバリデーション
        if (!this.isValidMapping(mappings as DynamicMappings)) {
          // バリデーション失敗：不完全なマッピングは保存しない
          console.error(
            `[MappingManager] Extracted mappings for ${lang} are invalid or incomplete. ` +
            `Check if the page structure changed or if there are language-specific issues.`
          );
          return;
        }

        // バリデーション成功：保存
        const dynamicMapping: DynamicMappings = {
          ...mappings,
          updatedAt: Date.now(),
          quarter: new Date().toISOString().split('T')[0]!
        };

        this.dynamicMappings.set(lang, dynamicMapping);

        // Chrome Storage に保存
        const storageKey = `ygo-mappings:${lang}`;
        await chrome.storage.local.set({ [storageKey]: dynamicMapping });
      } else {
        // null が返されたのは、ページ構造の問題か通信エラーの可能性
        console.warn(
          `[MappingManager] Failed to extract mappings for ${lang} (returned null). ` +
          `This may be a temporary network issue or page structure change.`
        );
      }
    } catch (error) {
      console.error(`[MappingManager] Error fetching mappings for ${lang}:`, error);
    } finally {
      // 取得中フラグを削除（成功/失敗問わず）
      this.fetchingLanguages.delete(lang);
    }
  }

  /**
   * 言語コードから種族マッピングテーブルを取得（表示テキスト → 内部値）
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング（逆引き）
   * - その他：動的マッピング > なし（動的取得を促す）
   */
  getRaceTextToId(lang: string): Record<string, Race> {
    if (lang === 'ja') {
      // 日本語は常に静的マッピングの逆引きを返す
      const result: Record<string, Race> = {};
      for (const [internalId, jaText] of Object.entries(RACE_ID_TO_NAME)) {
        result[jaText] = internalId as Race;
      }
      return result;
    }

    // 日本語以外は動的マッピングを返す
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.race && Object.keys(dynamicMapping.race).length > 0) {
      // 動的マッピングは ID-to-text なので、逆引きして text-to-ID に変換
      const result: Record<string, Race> = {};
      for (const [internalId, text] of Object.entries(dynamicMapping.race)) {
        if (text) {
          result[text] = internalId as Race;
        }
      }
      return result;
    }

    return {};
  }

  /**
   * 言語コードからモンスタータイプマッピングテーブルを取得（表示テキスト → 内部値）
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング（逆引き）
   * - その他：動的マッピング > なし（動的取得を促す）
   */
  getMonsterTypeTextToId(lang: string): Record<string, MonsterType> {
    if (lang === 'ja') {
      const result: Record<string, MonsterType> = {};
      for (const [internalId, text] of Object.entries(MONSTER_TYPE_ID_TO_NAME)) {
        result[text] = internalId as MonsterType;
      }
      return result;
    }

    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.monsterType && Object.keys(dynamicMapping.monsterType).length > 0) {
      // 動的マッピングは ID-to-text なので、逆引きして text-to-ID に変換
      const result: Record<string, MonsterType> = {};
      for (const [internalId, text] of Object.entries(dynamicMapping.monsterType)) {
        if (text) {
          result[text] = internalId as MonsterType;
        }
      }
      return result;
    }

    return {};
  }

  /**
   * 言語コードから属性マッピングテーブルを取得（表示テキスト → 内部値）
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング（逆引き）
   * - その他：動的マッピング > なし（動的取得を促す）
   */
  getAttributeTextToId(lang: string): Record<string, Attribute> {
    if (lang === 'ja') {
      // 日本語は常に静的マッピングの逆引きを返す
      const result: Record<string, Attribute> = {};
      for (const [internalId, jaText] of Object.entries(ATTRIBUTE_ID_TO_NAME)) {
        result[jaText] = internalId as Attribute;
      }
      return result;
    }

    // 日本語以外は動的マッピングを返す
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.attribute && Object.keys(dynamicMapping.attribute).length > 0) {
      // 動的マッピングは ID-to-text なので、逆引きして text-to-ID に変換
      const result: Record<string, Attribute> = {};
      for (const [internalId, text] of Object.entries(dynamicMapping.attribute)) {
        if (text) {
          result[text] = internalId as Attribute;
        }
      }
      return result;
    }

    return {};
  }

  /**
   * 言語コードから魔法効果種類マッピングテーブルを取得（表示テキスト → 内部値）
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング（逆引き）
   * - その他：動的マッピング > なし（動的取得を促す）
   */
  getSpellEffectTextToId(lang: string): Record<string, SpellEffectType> {
    if (lang === 'ja') {
      // 日本語は常に静的マッピングの逆引きを返す
      const result: Record<string, SpellEffectType> = {};
      for (const [internalId, jaText] of Object.entries(SPELL_EFFECT_TYPE_ID_TO_NAME)) {
        result[jaText] = internalId as SpellEffectType;
      }
      return result;
    }

    // 日本語以外は動的マッピングを返す
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.spellEffect && Object.keys(dynamicMapping.spellEffect).length > 0) {
      // 動的マッピングは ID-to-text なので、逆引きして text-to-ID に変換
      const result: Record<string, SpellEffectType> = {};
      for (const [internalId, text] of Object.entries(dynamicMapping.spellEffect)) {
        if (text) {
          result[text] = internalId as SpellEffectType;
        }
      }
      return result;
    }

    return {};
  }

  /**
   * 言語コードから罠効果種類マッピングテーブルを取得（日本語表示名 → 内部値）
   *
   * 優先順位：動的マッピング > 日本語静的マッピング（逆引き）
   */
  getTrapEffectTextToId(lang: string): Record<string, TrapEffectType> {
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.trapEffect && Object.keys(dynamicMapping.trapEffect).length > 0) {
      // 動的マッピングは ID-to-text なので、逆引きして text-to-ID に変換
      const result: Record<string, TrapEffectType> = {};
      for (const [internalId, text] of Object.entries(dynamicMapping.trapEffect)) {
        if (text) {
          result[text] = internalId as TrapEffectType;
        }
      }
      return result;
    }

    // 動的マッピングがない場合は日本語静的マッピングの逆引きを返す
    const result: Record<string, TrapEffectType> = {};
    for (const [internalId, jaText] of Object.entries(TRAP_EFFECT_TYPE_ID_TO_NAME)) {
      result[jaText] = internalId as TrapEffectType;
    }
    return result;
  }

  /**
   * 指定言語のマッピングが利用可能かチェック
   */
  /**
   * 言語コードから種族マッピング（ID → 表示テキスト）を取得
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング
   * - その他：動的マッピング > 日本語静的マッピング（フォールバック）
   */
  getRaceIdToText(lang: string): Partial<Record<Race, string>> {
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.race && Object.keys(dynamicMapping.race).length > 0) {
      return dynamicMapping.race;
    }

    // フォールバック：日本語静的マッピング（全言語で利用可能）
    if (lang === 'ja') {
      return RACE_ID_TO_NAME;
    }

    // 動的マッピングが利用できない場合は空オブジェクト
    return {};
  }

  /**
   * 言語コードからモンスタータイプマッピング（ID → 表示テキスト）を取得
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング（理由：公式サイトの検索ページからモンスタータイプマッピングの抽出が困難なため）
   * - その他：動的マッピング（存在する場合） > 空オブジェクト
   *
   * @remarks
   * - 日本語でも動的マッピングが存在する場合はメモリに保存されるが、このメソッドでは常に静的マッピングが返される
   * - これは仕様であり、動的マッピングを優先する言語と異なり、日本語は信頼できる静的マッピングが提供されるため
   */
  getMonsterTypeIdToText(lang: string): Partial<Record<MonsterType, string>> {
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.monsterType && Object.keys(dynamicMapping.monsterType).length > 0) {
      return dynamicMapping.monsterType;
    }

    // フォールバック：日本語静的マッピング
    if (lang === 'ja') {
      return MONSTER_TYPE_ID_TO_NAME;
    }

    return {};
  }

  /**
   * 言語コードから属性マッピング（ID → 表示テキスト）を取得
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング
   * - その他：動的マッピング > 日本語静的マッピング（フォールバック）
   */
  getAttributeIdToText(lang: string): Partial<Record<Attribute, string>> {
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.attribute && Object.keys(dynamicMapping.attribute).length > 0) {
      return dynamicMapping.attribute;
    }

    // フォールバック：日本語静的マッピング
    if (lang === 'ja') {
      return ATTRIBUTE_ID_TO_NAME;
    }

    return {};
  }

  /**
   * 言語コードから魔法効果種類マッピング（ID → 表示テキスト）を取得
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング
   * - その他：動的マッピング > 日本語静的マッピング（フォールバック）
   */
  getSpellEffectIdToText(lang: string): Partial<Record<SpellEffectType, string>> {
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.spellEffect && Object.keys(dynamicMapping.spellEffect).length > 0) {
      return dynamicMapping.spellEffect;
    }

    // フォールバック：日本語静的マッピング
    if (lang === 'ja') {
      return SPELL_EFFECT_TYPE_ID_TO_NAME;
    }

    return {};
  }

  /**
   * 言語コードから罠効果種類マッピング（ID → 表示テキスト）を取得
   *
   * 優先順位：
   * - ja：常に日本語静的マッピング
   * - その他：動的マッピング > 日本語静的マッピング（フォールバック）
   */
  getTrapEffectIdToText(lang: string): Partial<Record<TrapEffectType, string>> {
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping?.trapEffect && Object.keys(dynamicMapping.trapEffect).length > 0) {
      return dynamicMapping.trapEffect;
    }

    // フォールバック：日本語静的マッピング
    if (lang === 'ja') {
      return TRAP_EFFECT_TYPE_ID_TO_NAME;
    }

    return {};
  }

  hasDynamicMapping(lang: string): boolean {
    return this.dynamicMappings.has(lang);
  }

  /**
   * 言語変更時に呼び出す：指定言語のマッピングを確保する
   * Chrome Storage からロードし、なければ取得する
   */
  async ensureMappingForLanguage(lang: string): Promise<void> {
    try {
      // 既に読み込まれている場合、そのマッピングが有効か確認
      if (this.dynamicMappings.has(lang)) {
        const mapping = this.dynamicMappings.get(lang);
        if (mapping && this.isValidMapping(mapping)) {
          return;
        } else {
          // 無効なマッピングの場合は削除して新しく取得
          console.warn(`[MappingManager] Mapping for ${lang} is invalid, removing and fetching fresh data...`);
          this.dynamicMappings.delete(lang);
        }
      }

      // 既に取得中の場合はスキップ（重複取得防止）
      if (this.fetchingLanguages.has(lang)) {
        return;
      }

      // Chrome Storage からマッピングを読み込む
      const storageKey = `ygo-mappings:${lang}`;
      const stored = await chrome.storage.local.get(storageKey);

      if (stored[storageKey]) {
        const dynamicMapping = stored[storageKey] as DynamicMappings;

        // マッピングが有効か確認
        if (this.isValidMapping(dynamicMapping)) {
          this.dynamicMappings.set(lang, dynamicMapping);
        } else {
          // 無効なマッピングの場合は新しく取得
          console.warn(
            `[MappingManager] Stored mappings for ${lang} are invalid or empty ` +
            `(race: ${Object.keys(dynamicMapping.race || {}).length}, ` +
            `monsterType: ${Object.keys(dynamicMapping.monsterType || {}).length}), ` +
            `fetching fresh data...`
          );
          await this.fetchAndStoreMappings(lang);
        }
      } else {
        // キャッシュがなければ同期的に取得
        await this.fetchAndStoreMappings(lang);
      }
    } catch (error) {
      console.warn(`[MappingManager] Failed to ensure mapping for ${lang}:`, error);
    }
  }
}

// シングルトンインスタンス
export const mappingManager = new MappingManager();

/**
 * マッピングマネージャーを初期化（コンテンツスクリプト起動時に呼び出す）
 *
 * ページ言語と設定言語の両方のマッピングを確保する
 */
export async function initializeMappingManager(): Promise<void> {
  try {
    // 現在のページの言語を検出
    const pageLanguage = detectLanguage(document);

    // その言語のマッピングを初期化
    await mappingManager.initialize(pageLanguage);

    // 設定言語のマッピングも確保する（Chrome Storage から直接読み込み）
    try {
      const stored = await chrome.storage.sync.get('appSettings');
      const appSettings = stored.appSettings as any;

      if (appSettings?.language && appSettings.language !== 'auto') {
        const configLanguage = appSettings.language;
        await mappingManager.ensureMappingForLanguage(configLanguage);
      }
    } catch (error) {
      console.warn('[MappingManager] Failed to load settings from storage:', error);
      // ストレージにアクセスできない場合も続行（フォールバック）
    }
  } catch (error) {
    console.error('[MappingManager] Failed to initialize:', error);
  }
}
