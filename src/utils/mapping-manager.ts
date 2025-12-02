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

  /**
   * ストレージから動的マッピングをロード
   * 
   * @param lang 現在の言語（指定した場合、その言語のみチェック・更新）
   */
  async initialize(lang?: string): Promise<void> {
    if (this.initialized) return;

    try {
      // 言語が指定されている場合、その言語のマッピングを確認
      if (lang) {
        await this.loadLanguageMapping(lang);
      }
    } catch (error) {
      console.error('[MappingManager] Failed to initialize:', error);
    }

    this.initialized = true;
  }

  /**
   * 指定言語のマッピングをロード（キャッシュがなければ非同期で取得）
   */
  private async loadLanguageMapping(lang: string): Promise<void> {
    try {
      // Chrome Storage からマッピング情報を読み込み
      const storageKey = `ygo-mappings:${lang}`;
      const stored = await chrome.storage.local.get(storageKey);

      if (stored[storageKey]) {
        const dynamicMapping = stored[storageKey] as DynamicMappings;
        this.dynamicMappings.set(lang, dynamicMapping);
        console.log(`[MappingManager] Loaded dynamic mappings for ${lang} from storage`);
      } else {
        // キャッシュがなければ requestIdleCallback で非同期取得
        this.scheduleAsyncFetch(lang);
      }
    } catch (error) {
      console.warn(`[MappingManager] Failed to load mappings for ${lang}:`, error);
      // エラーの場合は静的マッピングを使用
    }
  }

  /**
   * requestIdleCallback を使ってidle時にマッピング情報を非同期取得
   */
  private scheduleAsyncFetch(lang: string): void {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.fetchAndStoreMappings(lang).catch(error => {
          console.error(`[MappingManager] Failed to fetch mappings for ${lang}:`, error);
        });
      });
    } else {
      // requestIdleCallback が利用できない場合は setTimeout でスケジュール
      setTimeout(() => {
        this.fetchAndStoreMappings(lang).catch(error => {
          console.error(`[MappingManager] Failed to fetch mappings for ${lang}:`, error);
        });
      }, 5000);
    }
  }

  /**
   * カード検索ページからマッピング情報を取得して保存
   */
  private async fetchAndStoreMappings(lang: string): Promise<void> {
    try {
      const { extractMappingsFromSearchPage } = await import('./extract-mappings');
      const mappings = await extractMappingsFromSearchPage(lang);

      if (mappings) {
        const dynamicMapping: DynamicMappings = {
          ...mappings,
          updatedAt: Date.now(),
          quarter: new Date().toISOString().split('T')[0]!
        };

        this.dynamicMappings.set(lang, dynamicMapping);

        // Chrome Storage に保存
        const storageKey = `ygo-mappings:${lang}`;
        await chrome.storage.local.set({ [storageKey]: dynamicMapping });
        console.log(`[MappingManager] Stored dynamic mappings for ${lang}`);
      }
    } catch (error) {
      console.error(`[MappingManager] Error fetching mappings for ${lang}:`, error);
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
    if (dynamicMapping && Object.keys(dynamicMapping.race).length > 0) {
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
    if (dynamicMapping && Object.keys(dynamicMapping.monsterType).length > 0) {
      return dynamicMapping.monsterType as Record<string, MonsterType>;
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
  getAttributeTextToId(lang: string): Partial<Record<Attribute, string>> {
    if (lang === 'ja') {
      // 日本語は常に静的マッピングの逆引きを返す
      const result: Partial<Record<Attribute, string>> = {};
      for (const [internalId, jaText] of Object.entries(ATTRIBUTE_ID_TO_NAME)) {
        result[jaText as Attribute] = internalId;
      }
      return result;
    }

    // 日本語以外は動的マッピングを返す
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping && Object.keys(dynamicMapping.attribute).length > 0) {
      return dynamicMapping.attribute;
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
  getSpellEffectTextToId(lang: string): Partial<Record<SpellEffectType, string>> {
    if (lang === 'ja') {
      // 日本語は常に静的マッピングの逆引きを返す
      const result: Partial<Record<SpellEffectType, string>> = {};
      for (const [internalId, jaText] of Object.entries(SPELL_EFFECT_TYPE_ID_TO_NAME)) {
        result[jaText as SpellEffectType] = internalId;
      }
      return result;
    }

    // 日本語以外は動的マッピングを返す
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping && Object.keys(dynamicMapping.spellEffect).length > 0) {
      return dynamicMapping.spellEffect;
    }

    return {};
  }

  /**
   * 言語コードから罠効果種類マッピングテーブルを取得（日本語表示名 → 内部値）
   *
   * 優先順位：動的マッピング > 日本語静的マッピング（逆引き）
   */
  getTrapEffectTextToId(lang: string): Partial<Record<TrapEffectType, string>> {
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping && Object.keys(dynamicMapping.trapEffect).length > 0) {
      return dynamicMapping.trapEffect;
    }

    // 動的マッピングがない場合は日本語静的マッピングの逆引きを返す
    const result: Partial<Record<TrapEffectType, string>> = {};
    for (const [internalId, jaText] of Object.entries(TRAP_EFFECT_TYPE_ID_TO_NAME)) {
      result[jaText as TrapEffectType] = internalId;
    }
    return result;
  }

  /**
   * 指定言語のマッピングが利用可能かチェック
   */
  hasDynamicMapping(lang: string): boolean {
    return this.dynamicMappings.has(lang);
  }
}

// シングルトンインスタンス
export const mappingManager = new MappingManager();

/**
 * マッピングマネージャーを初期化（コンテンツスクリプト起動時に呼び出す）
 */
export async function initializeMappingManager(): Promise<void> {
  // 現在のページの言語を検出
  const lang = detectLanguage(document);
  
  // その言語のマッピングを初期化
  await mappingManager.initialize(lang);
}
