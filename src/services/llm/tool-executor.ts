import type { ToolCall, ToolResult, DeckSections } from './types';
import { resolveCardName } from './card-name-resolver';
import { searchCards } from '@/api/card-search';
import type { SearchOptions } from '@/types/api/search-types';
import { RACE_ID_TO_NAME, ATTRIBUTE_ID_TO_NAME, MONSTER_TYPE_ID_TO_NAME } from '@/types/card-maps';
import type { CardInfo } from '@/types/card';

export interface StoreRefs {
  getDeckSections: () => DeckSections;
  addCard: (cardId: string, section: 'main' | 'extra' | 'side') => { success: boolean; error?: string };
  removeCard: (cardId: string, section: 'main' | 'extra' | 'side' | 'trash') => { success: boolean; error?: string };
  moveCard: (cardId: string, from: 'main' | 'extra' | 'side' | 'trash', to: 'main' | 'extra' | 'side' | 'trash') => { success: boolean; error?: string };
  getDeckState: () => object;
  getCardInfoById: (cardId: string) => import('@/types/card').CardInfo | undefined;
  getCardsBySection: (section: 'main' | 'extra' | 'side' | 'trash') => Array<{ cid: string; quantity: number }>;
}

const sessionToolHistory: Array<{ name: string; args: Record<string, unknown>; result: unknown }> = [];

export function getSessionToolHistory() {
  return sessionToolHistory;
}

export function clearSessionToolHistory(): void {
  sessionToolHistory.length = 0;
}

export function recordToolCall(name: string, args: Record<string, unknown>, result: unknown): void {
  sessionToolHistory.push({ name, args, result });
}

export async function executeTool(
  tool: ToolCall,
  storeRefs: StoreRefs
): Promise<ToolResult> {
  try {
    switch (tool.name) {
      case 'searchCards': {
        const args = tool.arguments as Partial<SearchOptions> & { keyword: string };
        const results = await searchCards({ keyword: args.keyword, searchType: '1' });
        return {
          success: true,
          data: results.slice(0, 10).map(c => ({
            cardId: c.cardId,
            name: c.name,
            cardType: c.cardType,
          })),
        };
      }

      case 'getChatHistory': {
        return { success: true, data: sessionToolHistory };
      }

      case 'getCardDetail': {
        const { cardId, name } = tool.arguments as { cardId?: string; name?: string };
        let resolvedId = cardId;

        // cardIdがない、または数値ではない場合 → 名前解決
        if (!resolvedId && name) {
          const deckSections = storeRefs.getDeckSections();
          const resolution = await resolveCardName(name, deckSections);
          if ('notFound' in resolution) {
            return { success: false, error: `カード「${name}」が見つかりません` };
          }
          if ('ambiguous' in resolution) {
            return { success: false, error: `カード「${name}」は複数該当します: ${resolution.candidates.map(c => c.name).join(', ')}` };
          }
          resolvedId = resolution.cardId;
        }

        if (!resolvedId) {
          return { success: false, error: 'cardIdまたはnameを指定してください' };
        }

        const card = storeRefs.getCardInfoById(resolvedId);
        if (!card) {
          return { success: false, error: `カードID ${resolvedId} が見つかりません` };
        }
        return {
          success: true,
          data: {
            cardId: card.cardId,
            name: card.name,
            cardType: card.cardType,
            text: 'text' in card ? card.text : undefined,
          },
        };
      }

      case 'getDeckState': {
        return { success: true, data: storeRefs.getDeckState() };
      }

      case 'addCardToDeck': {
        const { cardId, section = 'main' } = tool.arguments as { cardId: string; quantity?: number; section?: 'main' | 'extra' | 'side' };
        const card = storeRefs.getCardInfoById(cardId);
        if (!card) {
          return { success: false, error: `カードID ${cardId} が見つかりません` };
        }
        const addResult = storeRefs.addCard(cardId, section);
        return { success: addResult.success, error: addResult.error };
      }

      case 'removeCardFromDeck': {
        const raw = tool.arguments as Record<string, unknown>;
        const cardId = raw.cardId as string | undefined;
        const cardIds = raw.cardIds as string[] | undefined;
        const from = (raw.from ?? raw.section) as 'main' | 'extra' | 'side' | undefined;
        const to = raw.to as 'main' | 'extra' | 'side' | 'trash' | undefined;
        const ids = cardIds ?? (cardId ? [cardId] : []);
        if (ids.length === 0) {
          return { success: false, error: 'cardIdまたはcardIdsを指定してください' };
        }
        if (!from) {
          return { success: false, error: 'sectionまたはfromを指定してください' };
        }
        const dest = to ?? 'trash';
        const removeResults: Array<{ cardId: string; success: boolean; error?: string }> = [];
        for (const id of ids) {
          const r = storeRefs.moveCard(id, from, dest);
          removeResults.push({ cardId: id, ...r });
        }
        const failures = removeResults.filter(r => !r.success);
        if (failures.length === 0) {
          return { success: true, data: { removed: removeResults.length } };
        }
        const removed = removeResults.filter(r => r.success).length;
        return { success: failures.length < ids.length, error: failures.map(f => `${f.cardId}: ${f.error}`).join('; '), data: removed > 0 ? { removed } : undefined };
      }

      case 'moveCard': {
        const rawMove = tool.arguments as Record<string, unknown>;
        const mCardId = rawMove.cardId as string | undefined;
        const mCardIds = rawMove.cardIds as string[] | undefined;
        const mFrom = (rawMove.from ?? rawMove.section) as 'main' | 'extra' | 'side' | 'trash' | undefined;
        const mTo = rawMove.to as 'main' | 'extra' | 'side' | 'trash' | undefined;
        const mIds = mCardIds ?? (mCardId ? [mCardId] : []);
        if (mIds.length === 0) {
          return { success: false, error: 'cardIdまたはcardIdsを指定してください' };
        }
        if (!mFrom || !mTo) {
          return { success: false, error: 'fromとtoを指定してください' };
        }
        const moveResults: Array<{ cardId: string; success: boolean; error?: string }> = [];
        for (const id of mIds) {
          const r = storeRefs.moveCard(id, mFrom, mTo);
          moveResults.push({ cardId: id, ...r });
        }
        const failures = moveResults.filter(r => !r.success);
        if (failures.length === 0) {
          return { success: true, data: { moved: moveResults.length } };
        }
        const moved = moveResults.filter(r => r.success).length;
        return { success: failures.length < moveResults.length, error: failures.map(f => `${f.cardId}: ${f.error}`).join('; '), data: moved > 0 ? { moved } : undefined };
      }

      case 'resolveCardName': {
        const { name } = tool.arguments as { name: string };
        const deckSections = storeRefs.getDeckSections();
        const resolution = await resolveCardName(name, deckSections);
        return { success: true, data: resolution };
      }

      case 'searchDeckCards': {
        type KindValue = 'name' | 'race' | 'attribute' | 'type' | 'text' | 'auto';
        const filters = tool.arguments as {
          keyword: string;
          kind?: KindValue | KindValue[];
          cardType?: 'monster' | 'spell' | 'trap';
          section?: 'main' | 'extra' | 'side';
        };
        const deckSections = storeRefs.getDeckSections();
        console.debug('[searchDeckCards] sections:', {
          main: deckSections.main.length, extra: deckSections.extra.length, side: deckSections.side.length,
        });
        const keyword = filters.keyword?.trim();
        const rawKind = filters.kind ?? 'auto';
        const kinds: KindValue[] = Array.isArray(rawKind) ? rawKind : [rawKind];
        const isAuto = kinds.length === 1 && kinds[0] === 'auto';
        const expandedKinds = isAuto
          ? (['name', 'race', 'attribute', 'type', 'text'] as const)
          : kinds;

        const sections: Array<{ cards: CardInfo[]; label: string }> = [];
        if (!filters.section || filters.section === 'main') sections.push({ cards: deckSections.main, label: 'メインデッキ' });
        if (!filters.section || filters.section === 'extra') sections.push({ cards: deckSections.extra, label: 'エクストラデッキ' });
        if (!filters.section || filters.section === 'side') sections.push({ cards: deckSections.side, label: 'サイドデッキ' });

        const hasKind = (k: string): boolean => (expandedKinds as readonly string[]).includes(k);
        const invalidKinds = new Set<string>();

        const raceKey = hasKind('race') && keyword
          ? (Object.entries(RACE_ID_TO_NAME) as [string, string][]).find(([, name]) => name === keyword || name.startsWith(keyword))?.[0]
          : undefined;
        if (hasKind('race') && keyword && !raceKey) {
          if (!isAuto) return { success: true, data: { cards: [], totalCount: 0 } };
          invalidKinds.add('race');
        }

        const attrKey = hasKind('attribute') && keyword
          ? (Object.entries(ATTRIBUTE_ID_TO_NAME) as [string, string][]).find(([, name]) => name === keyword || name.startsWith(keyword))?.[0]
          : undefined;
        if (hasKind('attribute') && keyword && !attrKey) {
          if (!isAuto) return { success: true, data: { cards: [], totalCount: 0 } };
          invalidKinds.add('attribute');
        }

        const typeIds = hasKind('type') && keyword
          ? (Object.entries(MONSTER_TYPE_ID_TO_NAME) as [string, string][]).filter(([, name]) => name === keyword || name.startsWith(keyword)).map(([id]) => id)
          : undefined;
        if (hasKind('type') && keyword && !typeIds?.length) {
          if (!isAuto) return { success: true, data: { cards: [], totalCount: 0 } };
          invalidKinds.add('type');
        }

        const results: Array<{ name: string; cardId: string; quantity: number; race?: string; attribute?: string; section: string; text?: string }> = [];
        for (const { cards, label } of sections) {
          const seen = new Map<string, { card: CardInfo; count: number }>();
          for (const card of cards) {
            const entry = seen.get(card.cardId);
            if (entry) entry.count++;
            else seen.set(card.cardId, { card, count: 1 });
          }
          for (const { card, count } of seen.values()) {
            if (keyword) {
              let matched = false;
              for (const k of expandedKinds) {
                if (invalidKinds.has(k)) continue;
                if (k === 'name') {
                  if (card.name.includes(keyword)) {
                    console.debug('[searchDeckCards] name match:', card.name, 'keyword:', keyword);
                    matched = true; break;
                  }
                } else if (k === 'race') {
                  if (card.cardType === 'monster' && card.race === raceKey) { matched = true; break; }
                } else if (k === 'attribute') {
                  if (card.cardType === 'monster' && card.attribute === attrKey) { matched = true; break; }
                } else if (k === 'type') {
                  if (card.cardType === 'monster' && card.types?.some(t => typeIds!.includes(t))) { matched = true; break; }
                } else if (k === 'text') {
                  if ((card.text && card.text.includes(keyword)) || (card.pendulumText && card.pendulumText.includes(keyword))) { matched = true; break; }
                }
              }
              if (!matched) continue;
            }
            if (filters.cardType && card.cardType !== filters.cardType) continue;
            results.push({
              name: card.name,
              cardId: card.cardId,
              quantity: count,
              race: card.cardType === 'monster' ? RACE_ID_TO_NAME[card.race] : undefined,
              attribute: card.cardType === 'monster' ? ATTRIBUTE_ID_TO_NAME[card.attribute] : undefined,
              section: label,
              text: card.text,
            });
          }
        }

        return {
          success: true,
          data: { cards: results, totalCount: results.reduce((s, r) => s + r.quantity, 0) },
        };
      }

      default:
        return { success: false, error: `未知のツール: ${tool.name}` };
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
