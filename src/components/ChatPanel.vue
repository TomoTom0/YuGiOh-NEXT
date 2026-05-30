<template>
  <div class="ygo-next chat-panel">
    <div class="chat-input-area">
      <textarea
        v-model="inputText"
        class="chat-input"
        placeholder="デッキについて質問する..."
        :disabled="isLoading"
        @keydown.enter.exact.prevent="send"
        @keydown.enter.shift.exact="inputText += '\n'"
        rows="2"
      />
      <button
        class="chat-send-btn"
        :disabled="isLoading || !inputText.trim()"
        @click="send"
      >
        送信
      </button>
    </div>

    <div v-if="errorMessage" class="chat-error">{{ errorMessage }}</div>

    <div ref="messagesRef" class="chat-messages">
      <template v-for="(msg, i) in messages" :key="i">
        <!-- ツールメッセージ -->
        <div v-if="msg.role === 'tool'" class="chat-message tool" @click="toggleToolExpand(i)">
          <span class="tool-icon">{{ msg.toolSuccess ? '>' : '!' }}</span>
          <span class="tool-name">{{ msg.toolName }}</span>
          <span class="tool-args">{{ formatToolArgs(msg.toolName, msg.toolArgs) }}</span>
          <span class="tool-status" :class="{ success: msg.toolSuccess, error: !msg.toolSuccess }">
            {{ msg.toolSuccess ? 'OK' : 'NG' }}
          </span>
          <div v-if="isLoading || expandedTools.has(i)" class="tool-content">{{ msg.content }}</div>
          <div v-if="msg.toolReasoning" class="tool-reasoning">{{ msg.toolReasoning }}</div>
        </div>
        <!-- ユーザーメッセージ + 停止ボタン -->
        <div v-else-if="msg.role === 'user'" class="chat-message-row user-row">
          <div class="chat-message user">
            <div class="chat-message-content">{{ msg.content }}</div>
            <div class="chat-message-time">{{ formatTime(msg.timestamp) }}</div>
          </div>
          <button
            v-if="isLoading && i === messages.length - 1"
            class="chat-stop-btn"
            @click="stopChat"
            title="停止"
          >■</button>
        </div>
        <!-- アシスタントメッセージ -->
        <div v-else class="chat-message assistant">
          <div class="chat-message-content">
            <template v-for="(part, pi) in parseCardLinks(resolveCardLinks(msg.content))" :key="pi">
              <span v-if="part.type === 'link' && part.cardId" class="card-link" @click="part.cardId && handleCardLinkClick(part.cardId)">{{ part.text }}</span>
              <span v-else>{{ part.text }}</span>
            </template>
          </div>
          <div class="chat-message-time">{{ formatTime(msg.timestamp) }}</div>
        </div>
      </template>
      <!-- ローディング -->
      <div v-if="isLoading" class="chat-message assistant">
        <div class="chat-message-content chat-loading">Thinking<span class="loading-dots"><span>.</span><span>.</span><span>.</span></span></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, watch } from 'vue';
import { useCardLinks } from '@/composables/useCardLinks';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useSearchStore } from '@/stores/search';
import { useCardDetailStore } from '@/stores/card-detail';
import { useSettingsStore } from '@/stores/settings';
import { chat, ChatAbortError } from '@/services/llm/llm-chat-service';
import type { ChatMessage, DeckSections } from '@/services/llm/types';
import type { CardInfo } from '@/types/card';
import { getCardInfo } from '@/utils/card-utils';

const { parseCardLinks, handleCardLinkClick } = useCardLinks();

const deckStore = useDeckEditStore();
const searchStore = useSearchStore();
const cardDetailStore = useCardDetailStore();
const settingsStore = useSettingsStore();

const messages = ref<ChatMessage[]>([]);
const inputText = ref('');
const isLoading = ref(false);
const errorMessage = ref('');
const messagesRef = ref<HTMLElement>();
const expandedTools = ref(new Set<number>());
let abortController: AbortController | null = null;

function buildDeckSections(): DeckSections {
  const resolveCards = (refs: Array<{ cid: string; quantity: number }>): CardInfo[] =>
    refs.flatMap(dc => {
      const card = getCardInfo(dc.cid);
      if (!card) console.debug('[buildDeckSections] cache miss:', dc.cid);
      return card ? Array(dc.quantity).fill(card) : [];
    });

  return {
    main: resolveCards(deckStore.deckInfo.mainDeck ?? []),
    extra: resolveCards(deckStore.deckInfo.extraDeck ?? []),
    side: resolveCards(deckStore.deckInfo.sideDeck ?? []),
    trash: resolveCards(deckStore.trashDeck ?? []),
    searchResults: searchStore.searchResults.map(r => r.card),
  };
}

function buildStoreRefs() {
  return {
    getDeckSections: buildDeckSections,
    addCard: (cardId: string, section: 'main' | 'extra' | 'side') => {
      const card = getCardInfo(cardId);
      if (!card) return { success: false, error: 'カードが見つかりません' };
      return deckStore.addCard(card, section) ?? { success: true };
    },
    removeCard: (cardId: string, section: 'main' | 'extra' | 'side' | 'trash', _quantity?: number) =>
      deckStore.removeCard(cardId, section) ?? { success: true },
    moveCard: (cardId: string, from: 'main' | 'extra' | 'side' | 'trash', to: 'main' | 'extra' | 'side' | 'trash') =>
      deckStore.moveCard(cardId, from, to),
    getDeckState: () => ({
      mainCount: deckStore.deckInfo.mainDeck.reduce((s, dc) => s + dc.quantity, 0),
      extraCount: deckStore.deckInfo.extraDeck.reduce((s, dc) => s + dc.quantity, 0),
      sideCount: deckStore.deckInfo.sideDeck.reduce((s, dc) => s + dc.quantity, 0),
    }),
    getCardInfoById: (cardId: string) => getCardInfo(cardId) ?? undefined,
    getCardsBySection: (section: 'main' | 'extra' | 'side' | 'trash') => {
      const deck = section === 'main' ? deckStore.deckInfo.mainDeck :
                   section === 'extra' ? deckStore.deckInfo.extraDeck :
                   section === 'side' ? deckStore.deckInfo.sideDeck :
                   deckStore.trashDeck;
      return (deck ?? []).map(dc => ({ cid: dc.cid, quantity: dc.quantity }));
    },
  };
}

function formatToolArgs(name: string | undefined, args: Record<string, unknown> | undefined): string {
  if (!args) return '';
  if (name === 'moveCard') {
    const count = Array.isArray(args.cardIds) ? args.cardIds.length : 1;
    const countStr = count > 1 ? ` x${count}` : '';
    return `${args.from ?? ''} -> ${args.to ?? ''}${countStr}`;
  }
  if (name === 'removeCardFromDeck') {
    const count = Array.isArray(args.cardIds) ? args.cardIds.length : 1;
    const countStr = count > 1 ? ` x${count}` : '';
    return `${args.section ?? args.from ?? ''}${countStr}`;
  }
  if (name === 'searchDeckCards') {
    const parts: string[] = [];
    if (args.cardType) parts.push(String(args.cardType));
    if (args.race) parts.push(String(args.race));
    if (args.attribute) parts.push(String(args.attribute));
    if (args.types && Array.isArray(args.types)) parts.push((args.types as string[]).join(','));
    if (args.section) parts.push(String(args.section));
    if (args.keyword) parts.push(String(args.keyword));
    return parts.join(' / ');
  }
  if (name === 'resolveCardName') return String(args.name ?? '');
  if (name === 'getCardDetail') return String(args.cardId ?? '');
  if (name === 'addCardToDeck') return `${args.section ?? ''} +${args.cardId ?? ''}`;
  return '';
}

function summarizeToolResult(name: string, result: { success: boolean; data?: unknown; error?: string }): string {
  if (!result.success) return result.error ?? 'エラー';
  const d = result.data;
  if (name === 'searchDeckCards' && d && typeof d === 'object' && 'cards' in d) {
    const data = d as Record<string, unknown>;
    const cards = data.cards as Array<{ name: string; quantity: number; section?: string }>;
    const total = data.totalCount as number;
    if (cards.length === 0) return '該当なし';
    const lines = cards.map(c => `${c.name}${c.quantity > 1 ? 'x' + c.quantity : ''}`);
    return `${total}枚: ${lines.join(', ')}`;
  }
  if (name === 'removeCardFromDeck' && d && typeof d === 'object' && 'removed' in d) {
    return `${(d as { removed: number }).removed}枚削除`;
  }
  if (name === 'moveCard' && d && typeof d === 'object' && 'moved' in d) {
    return `${(d as { moved: number }).moved}枚移動`;
  }
  if (name === 'addCardToDeck') return '追加完了';
  if (name === 'getDeckState') return 'デッキ状態取得';
  if (name === 'resolveCardName') {
    const data = d as { name?: string } | undefined;
    return data?.name ?? '特定完了';
  }
  if (name === 'getCardDetail') return 'カード情報取得';
  if (name === 'searchCards') {
    const arr = d as Array<unknown> | undefined;
    return `${arr?.length ?? 0}件`;
  }
  return '完了';
}

async function send() {
  const text = inputText.value.trim();
  if (!text || isLoading.value) return;

  inputText.value = '';
  errorMessage.value = '';

  messages.value.push({ role: 'user', content: text, timestamp: Date.now() });
  await scrollToBottom();

  abortController = new AbortController();
  isLoading.value = true;
  try {
    const apiKey = settingsStore.appSettings?.aiApiKey ?? '';
    const response = await chat(
      {
        userMessage: text,
        deckSections: buildDeckSections(),
        focusedCard: cardDetailStore.selectedCard ?? undefined,
        history: messages.value.slice(-10),
      },
      apiKey,
      buildStoreRefs(),
      (info) => {
        const summary = summarizeToolResult(info.name, info.result);
        messages.value.push({
          role: 'tool',
          content: summary,
          timestamp: Date.now(),
          toolName: info.name,
          toolSuccess: info.result.success,
          toolArgs: info.args,
          toolResultData: info.result.success ? info.result.data : undefined,
          toolReasoning: info.nanoReasoning,
        });
        scrollToBottom();
      },
      abortController.signal
    );

    messages.value.push({ role: 'assistant', content: response.message, timestamp: Date.now() });
  } catch (err) {
    if (err instanceof ChatAbortError) {
      messages.value.push({ role: 'assistant', content: '(処理を中断しました)', timestamp: Date.now() });
    } else {
      errorMessage.value = err instanceof Error ? err.message : String(err);
    }
  } finally {
    isLoading.value = false;
    abortController = null;
    await scrollToBottom();
  }
}

function stopChat() {
  abortController?.abort();
}

function toggleToolExpand(i: number) {
  const s = new Set(expandedTools.value);
  if (s.has(i)) s.delete(i);
  else s.add(i);
  expandedTools.value = s;
}

// ツール結果から確認済みカード名 → cardId のマップを収集
const knownCards = computed(() => {
  const map = new Map<string, string>();
  for (const msg of messages.value) {
    if (msg.role !== 'tool' || !msg.toolResultData) continue;
    const d = msg.toolResultData;
    if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray((d as Record<string, unknown>).cards)) {
      for (const c of (d as { cards: Array<Record<string, unknown>> }).cards) {
        if (typeof c.name === 'string' && typeof c.cardId === 'string') map.set(c.name, c.cardId);
      }
    }
    if (Array.isArray(d)) {
      for (const c of d as Array<Record<string, unknown>>) {
        if (typeof c.name === 'string' && typeof c.cardId === 'string') map.set(c.name, c.cardId);
      }
    }
    if (d && typeof d === 'object' && !Array.isArray(d)) {
      const obj = d as Record<string, unknown>;
      if (typeof obj.name === 'string' && typeof obj.cardId === 'string') map.set(obj.name, obj.cardId);
    }
  }
  return map;
});

// 未確認の {{...}} を除去してプレーンテキストに戻す。確認済みでcardIdがないものは補完。
function resolveCardLinks(content: string): string {
  return content.replace(/\{\{([^|{}]+?)(?:\|(\d+))?\}\}/g, (_match, name: string, cardId: string | undefined) => {
    const knownId = knownCards.value.get(name);
    if (cardId) return `{{${name}|${cardId}}}`;
    if (knownId) return `{{${name}|${knownId}}}`;
    return name;
  });
}

async function scrollToBottom() {
  await nextTick();
  if (messagesRef.value) {
    messagesRef.value.scrollTop = messagesRef.value.scrollHeight;
  }
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' });
}

watch(() => deckStore.pendingChatMessage, (msg) => {
  if (msg) {
    inputText.value = msg;
    deckStore.pendingChatMessage = null;
    nextTick(() => send());
  }
});
</script>

<style lang="scss" scoped>
.chat-panel {
  display: flex;
  flex-direction: column;
  width: 100%;
  flex: 1;
  min-height: 0;
  gap: 4px;
  padding: 8px;
  box-sizing: border-box;
}

.chat-messages {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 4px;
}

.chat-message {
  max-width: 85%;
  padding: 6px 10px;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.4;

  &.user {
    background: var(--button-bg);
    color: var(--button-text);

    .chat-message-time {
      color: rgba(255, 255, 255, 0.7);
    }
  }

  &.assistant {
    align-self: flex-start;
    background: var(--bg-secondary);
    color: var(--text-primary);
  }

  &.tool {
    align-self: center;
    max-width: 90%;
    background: var(--bg-tertiary, var(--bg-secondary));
    color: var(--text-secondary);
    font-size: 11px;
    padding: 3px 8px;
    border-radius: 4px;
    display: flex;
    align-items: center;
    gap: 4px;
    flex-wrap: wrap;

    .tool-icon {
      font-weight: bold;
      font-size: 10px;
    }

    .tool-name {
      font-weight: 500;
    }

    .tool-args {
      opacity: 0.7;
    }

    .tool-status {
      font-size: 10px;
      font-weight: bold;
      padding: 0 3px;
      border-radius: 2px;

      &.success {
        color: var(--success-color, #4caf50);
      }

      &.error {
        color: var(--error-color, #f44336);
      }
    }

    .tool-content {
      color: var(--text-secondary);
    }

    .tool-reasoning {
      color: var(--text-secondary);
      font-style: italic;
      width: 100%;
    }
  }
}

.chat-message-row {
  display: flex;
  align-items: center;
  gap: 4px;

  &.user-row {
    align-self: flex-end;
  }
}

.chat-stop-btn {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: 1px solid var(--input-border);
  background: var(--bg-primary);
  color: var(--error-color, #f44336);
  font-size: 12px;
  font-weight: bold;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;

  &:hover {
    background: var(--bg-secondary);
  }
}

.chat-message-content {
  white-space: pre-wrap;
  word-break: break-word;

  .card-link {
    color: var(--color-link);
    text-decoration: underline;
    cursor: pointer;

    &:hover {
      color: var(--color-link-hover);
    }
  }
}

.chat-message-time {
  font-size: 10px;
  color: var(--text-secondary);
  margin-top: 2px;
  text-align: right;
}

.chat-loading {
  color: var(--text-secondary);
  font-style: italic;

  .loading-dots {
    display: inline-block;

    span {
      animation: loading-dot-fade 1.4s infinite;
      opacity: 0;

      &:nth-child(1) { animation-delay: 0s; }
      &:nth-child(2) { animation-delay: 0.2s; }
      &:nth-child(3) { animation-delay: 0.4s; }
    }
  }
}

@keyframes loading-dot-fade {
  0%, 80%, 100% { opacity: 0; }
  40% { opacity: 1; }
}

.chat-error {
  padding: 4px 8px;
  background: var(--error-bg, #fee);
  color: var(--error-color, #c00);
  border-radius: 4px;
  font-size: 12px;
}

.chat-input-area {
  display: flex;
  width: 100%;
  gap: 4px;
  align-items: flex-end;
}

.chat-input {
  flex: 1;
  padding: 6px 8px;
  border: 1px solid var(--input-border);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 13px;
  resize: none;
  font-family: inherit;

  &:disabled {
    opacity: 0.6;
  }
}

.chat-send-btn {
  padding: 6px 12px;
  background: var(--button-bg);
  color: var(--button-text);
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 13px;
  white-space: nowrap;

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
}
</style>
