/**
 * マッピングマネージャー
 *
 * ストレージから動的マッピングを取得し、静的マッピングより優先して使用
 */

import { Race, MonsterType } from '@/types/card';
import {
  RACE_TEXT_TO_ID_BY_LANG as STATIC_RACE,
  MONSTER_TYPE_TEXT_TO_ID_BY_LANG as STATIC_MONSTER_TYPE,
} from '@/types/card-maps';
import { detectLanguage } from './language-detector';

interface DynamicMappings {
  race: Record<string, Race>;
  monsterType: Record<string, MonsterType>;
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
   * 指定言語のマッピングをロード（必要なら更新も実行）
   * Content script では background の updater は使用できないため、静的マッピングのみ使用
   */
  private async loadLanguageMapping(lang: string): Promise<void> {
    // Content script では動的更新は行わず、静的マッピングのみ使用
  }

  /**
   * 言語コードから種族マッピングテーブルを取得
   *
   * 優先順位：動的マッピング > 静的マッピング
   */
  getRaceTextToId(lang: string): Record<string, Race> {
    // 動的マッピングがある場合、それを使用
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping) {
      return dynamicMapping.race;
    }

    // 静的マッピングをフォールバック（jaは必ず存在）
    return STATIC_RACE[lang] || STATIC_RACE['ja']!;
  }

  /**
   * 言語コードからモンスタータイプマッピングテーブルを取得
   *
   * 優先順位：動的マッピング > 静的マッピング
   */
  getMonsterTypeTextToId(lang: string): Record<string, MonsterType> {
    // 動的マッピングがある場合、それを使用
    const dynamicMapping = this.dynamicMappings.get(lang);
    if (dynamicMapping) {
      return dynamicMapping.monsterType;
    }

    // 静的マッピングをフォールバック（jaは必ず存在）
    return STATIC_MONSTER_TYPE[lang] || STATIC_MONSTER_TYPE['ja']!;
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
