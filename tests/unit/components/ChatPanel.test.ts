/**
 * ChatPanel.vue のテスト
 *
 * tests/design/chat-panel/conditions.toml（TASK-573・TASK-331 Tier C第24号で全面条件化）
 * の全条件をカバーする。TASK-507テスト先行Phaseの回帰条件
 * （chat-panel.deck-sections-pass-search-results-directly）とそのテストは維持する。
 *
 * 観測方針（条件書ヘッダーの粒度方針と同一）:
 * - 観測対象は描画結果・chat mockへの引数（request/apiKey/storeRefs/コールバック/signal）・
 *   store状態。vm内部（messages/inputText等のref）は直接参照しない
 * - chat/ChatAbortErrorとgetCardInfoはmodule mock、storeは実物
 *   （deckStoreのaddCard/removeCard/moveCardはspy）で差し替え、
 *   ChatPanel側の呼び出し引数と結果の反映のみを検証する
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { mount, flushPromises } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import type { Pinia } from 'pinia';
import ChatPanel from '@/components/ChatPanel.vue';
import { useSearchStore } from '@/stores/search';
import { useDeckEditStore } from '@/stores/deck-edit';
import { useCardDetailStore } from '@/stores/card-detail';
import { useSettingsStore } from '@/stores/settings';
import { chat, ChatAbortError } from '@/services/llm/llm-chat-service';
import type { ToolCallInfo } from '@/services/llm/llm-chat-service';
import type { LlmResponse, ToolResult } from '@/services/llm/types';
import type { CardInfo, DeckCardRef } from '@/types/card';
import type { CardLinkPart } from '@/composables/useCardLinks';
import { getCardInfo } from '@/utils/card-utils';
import { isHTMLTextAreaElement } from '@/utils/type-guards';

// LLM呼び出し（llm-chat-service）。呼び出し引数とコールバックへの反映を観測するため
// mockへ置き換える。ChatAbortErrorはsend()のcatch節のinstanceof判定に使うためmock側クラス
vi.mock('@/services/llm/llm-chat-service', () => ({
  chat: vi.fn(),
  ChatAbortError: class ChatAbortError extends Error {},
}));

// カードリンク解析（useCardLinks）。parseCardLinks本体はuse-card-links条件書の対象のため、
// {{名前|cardId}} をlink partへ分割する忠実なstubへ置き換える（card-links条件の観測用）。
// handleCardLinkClickは本テストの観測対象外のためmockのまま
vi.mock('@/composables/useCardLinks', () => ({
  useCardLinks: () => ({
    parseCardLinks: (text: string | undefined): CardLinkPart[] => {
      if (!text) return [{ type: 'text', text: '' }];
      const parts: CardLinkPart[] = [];
      const regex = /\{\{([^|{}]+)\|(\d+)\}\}/g;
      let lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
          parts.push({ type: 'text', text: text.substring(lastIndex, match.index) });
        }
        parts.push({ type: 'link', text: match[1] ?? '', cardId: match[2] ?? '' });
        lastIndex = regex.lastIndex;
      }
      if (lastIndex < text.length) {
        parts.push({ type: 'text', text: text.substring(lastIndex) });
      }
      return parts.length > 0 ? parts : [{ type: 'text', text }];
    },
    handleCardLinkClick: vi.fn(),
  }),
}));

// getCardInfo（カードキャッシュ参照）。テストごとにcid→CardInfoの解決を制御できる形にする
// （既定は常にnull=cache miss。setCardCacheで解決するcidを登録する）
vi.mock('@/utils/card-utils', () => ({
  getCardInfo: vi.fn((): CardInfo | null => null),
}));

describe('components/ChatPanel', () => {
  let pinia: Pinia;

  beforeEach(() => {
    pinia = createPinia();
    setActivePinia(pinia);
    vi.clearAllMocks();
    // getCardInfoの実装を毎テストで既定（常にcache miss）へ戻す
    vi.mocked(getCardInfo).mockImplementation((): CardInfo | null => null);
    vi.mocked(chat).mockResolvedValue({ message: 'テスト回答', needsClarification: false });
  });

  // サンプルカード（tests/unit/stores/search.test.tsと同形のフラットなCardInfo。
  // src/types/card.ts のMonsterCard必須フィールドを過不足なく持つ）
  const createCard = (id: string): CardInfo => ({
    cardId: id,
    ciid: 'ciid1',
    lang: 'ja',
    imgs: [{ ciid: 'ciid1', imgHash: 'hash1' }],
    name: `Card ${id}`,
    cardType: 'monster',
    attribute: 'light',
    levelType: 'level',
    levelValue: 4,
    race: 'dragon',
    types: ['effect'],
    atk: 1800,
    def: 1000,
    isExtraDeck: false
  });

  // デッキ内カード参照（DeckCardRef。deckStore.deckInfo/trashDeckのseed用）
  const deckRef = (cid: string, quantity: number): DeckCardRef => ({
    cid,
    ciid: 'ciid1',
    lang: 'ja',
    quantity,
  });

  const mountPanel = () => mount(ChatPanel, { global: { plugins: [pinia] } });
  type PanelWrapper = ReturnType<typeof mountPanel>;

  // textarea入力→送信ボタンclick→flushまでの共通フロー
  const sendFromInput = async (wrapper: PanelWrapper, text: string) => {
    await wrapper.find('textarea.chat-input').setValue(text);
    await wrapper.find('button.chat-send-btn').trigger('click');
    await flushPromises();
  };

  // chatを未解決のPromiseにする（送信中の観測用）。resolveChatで後から解決する
  let resolveChat!: (response: LlmResponse) => void;
  const makeChatPending = () => {
    vi.mocked(chat).mockImplementation(
      () => new Promise<LlmResponse>((resolve) => { resolveChat = resolve; })
    );
  };

  // chat呼び出しの最後の引数tuple（request/apiKey/storeRefs/コールバック/signal）
  const lastChatCall = (): Parameters<typeof chat> => {
    const call = vi.mocked(chat).mock.calls.at(-1);
    if (!call) throw new Error('テスト内でchatが呼ばれていない');
    return call;
  };

  // ツールコールバック呼び出しのinfo組み立て（args/nanoReasoningは省略可）
  const toolInfo = (
    name: string,
    result: ToolResult,
    args: Record<string, unknown> = {},
    nanoReasoning?: string
  ): ToolCallInfo => {
    const info: ToolCallInfo = { name, args, result };
    if (nanoReasoning !== undefined) info.nanoReasoning = nanoReasoning;
    return info;
  };

  // getCardInfo mockをcid→CardInfoの写像へ差し替え（登録外はcache miss）
  const setCardCache = (cards: CardInfo[]) => {
    const map = new Map(cards.map((c) => [c.cardId, c]));
    vi.mocked(getCardInfo).mockImplementation((cid: string): CardInfo | null => map.get(cid) ?? null);
  };

  // chat未解決の送信中にツールコールバックを1件呼ぶ共通ハーネス。
  // 戻り値でtool行1件を含むwrapperを返す（この時点ではisLoading中）
  const invokeTool = async (info: ToolCallInfo): Promise<PanelWrapper> => {
    makeChatPending();
    const wrapper = mountPanel();
    await sendFromInput(wrapper, 'ツールを確認して');
    const onTool = lastChatCall()[3];
    if (!onTool) throw new Error('chatへコールバックが渡されていない');
    onTool(info);
    await flushPromises();
    return wrapper;
  };

  // textarea要素の値を型ガード経由で取得（src/utils/type-guards.tsのガードを使用）
  const textareaValue = (wrapper: PanelWrapper): string => {
    const el = wrapper.find('textarea.chat-input').element;
    if (!isHTMLTextAreaElement(el)) throw new Error('textarea.chat-inputが取得できない');
    return el.value;
  };

  // --- 送信ガード・送信フロー ---

  it('[covers:chat-panel.send-blocked-when-empty-or-loading] 空・空白のみ入力と送信中はchatが呼ばれない', async () => {
    const wrapper = mountPanel();
    const sendBtn = wrapper.find('button.chat-send-btn');

    // 未入力・空白のみは送信ボタンdisabled
    expect(sendBtn.attributes('disabled')).toBeDefined();
    await wrapper.find('textarea.chat-input').setValue('   ');
    expect(sendBtn.attributes('disabled')).toBeDefined();

    // Enter送信（keydown.enter.exact）もガードされる
    await wrapper.find('textarea.chat-input').trigger('keydown.enter');
    await flushPromises();
    expect(vi.mocked(chat)).not.toHaveBeenCalled();

    // 送信中（chat未解決）の再送: pendingChatMessage watch経由でsendが走っても
    // isLoadingガード（L202）で早期returnしchatの追加呼び出しにならない
    makeChatPending();
    await sendFromInput(wrapper, '1回目の質問');
    expect(vi.mocked(chat)).toHaveBeenCalledTimes(1);

    const deckStore = useDeckEditStore();
    deckStore.pendingChatMessage = '2回目の質問';
    await flushPromises();
    expect(vi.mocked(chat)).toHaveBeenCalledTimes(1);
  });

  it('[covers:chat-panel.send-flow-user-message-and-loading] 送信でtrim済みuserメッセージ追加・入力クリア・応答assistantメッセージとchat引数', async () => {
    const settingsStore = useSettingsStore();
    settingsStore.appSettings.aiApiKey = 'test-api-key';
    const cardDetailStore = useCardDetailStore();
    cardDetailStore.selectedCard = createCard('focused');

    const wrapper = mountPanel();
    await sendFromInput(wrapper, '  デッキを評価して  ');

    // 入力がクリアされる
    expect(textareaValue(wrapper)).toBe('');
    // userメッセージはtrim済みテキストで描画される
    expect(wrapper.find('.chat-message.user .chat-message-content').text()).toBe('デッキを評価して');

    // chat引数: 第1引数request（userMessage/history/focusedCard）、第2引数apiKey
    const [request, apiKey] = lastChatCall();
    expect(request.userMessage).toBe('デッキを評価して');
    expect(request.history).toEqual([]);
    expect(request.focusedCard).toMatchObject({ cardId: 'focused' });
    expect(apiKey).toBe('test-api-key');

    // 応答後にassistantメッセージ（response.message）が追加される
    expect(wrapper.find('.chat-message.assistant .chat-message-content').text()).toBe('テスト回答');

    // focusedCard未選択（selectedCard=null）時はundefined。2回目のhistoryには1往復分
    cardDetailStore.selectedCard = null;
    await sendFromInput(wrapper, '2回目の質問');
    const request2 = lastChatCall()[0];
    expect(request2.focusedCard).toBeUndefined();
    expect(request2.history.map((m) => m.content)).toEqual(['デッキを評価して', 'テスト回答']);
  });

  it('[covers:chat-panel.history-limited-to-last-ten] historyは今回のuserメッセージを除く直近最大10件', async () => {
    let n = 0;
    vi.mocked(chat).mockImplementation(() => {
      n += 1;
      return Promise.resolve({ message: `応答${n}`, needsClarification: false });
    });
    const wrapper = mountPanel();

    // 1〜6往復を完了させた上で7回目を送る（history候補は12件→10件へ切られる）
    for (let i = 1; i <= 6; i++) {
      await sendFromInput(wrapper, `質問${i}`);
    }
    await sendFromInput(wrapper, '質問7');

    const history = lastChatCall()[0].history;
    expect(history).toHaveLength(10);
    // 最古の2件（1往復目）が除外され、2往復目user〜6往復目assistantが時系列順に並ぶ
    expect(history.map((m) => m.content)).toEqual([
      '質問2', '応答2',
      '質問3', '応答3',
      '質問4', '応答4',
      '質問5', '応答5',
      '質問6', '応答6',
    ]);
    expect(history.map((m) => m.role)).toEqual([
      'user', 'assistant', 'user', 'assistant', 'user',
      'assistant', 'user', 'assistant', 'user', 'assistant',
    ]);
  });

  it('[covers:chat-panel.send-error-shows-error-message] chatが通常エラーでrejectすると.chat-errorにerr.message表示・assistant追加なし', async () => {
    vi.mocked(chat).mockRejectedValue(new Error('APIエラー'));
    const wrapper = mountPanel();
    await sendFromInput(wrapper, 'エラーになる質問');

    expect(wrapper.find('.chat-error').text()).toBe('APIエラー');
    // assistantメッセージは追加されず、isLoadingも解除される（textareaが有効に戻る）
    expect(wrapper.findAll('.chat-message.assistant')).toHaveLength(0);
    expect(wrapper.find('textarea.chat-input').attributes('disabled')).toBeUndefined();
  });

  it('[covers:chat-panel.send-abort-appends-interruption-message] ChatAbortErrorでrejectすると中断メッセージ追加・エラー表示なし', async () => {
    vi.mocked(chat).mockRejectedValue(new ChatAbortError());
    const wrapper = mountPanel();
    await sendFromInput(wrapper, '中断される質問');

    expect(wrapper.find('.chat-message.assistant .chat-message-content').text()).toBe('(処理を中断しました)');
    expect(wrapper.find('.chat-error').exists()).toBe(false);
  });

  it('[covers:chat-panel.stop-button-aborts-in-flight] 送信中の停止ボタンはchatへ渡したsignalをabortし、完了後に消える', async () => {
    makeChatPending();
    const wrapper = mountPanel();
    await sendFromInput(wrapper, '停止対象の質問');

    const signal = lastChatCall()[4];
    expect(signal).toBeInstanceOf(AbortSignal);

    // 送信中は最後のuserメッセージ行に停止ボタンが表示される
    const stopBtn = wrapper.find('.chat-stop-btn');
    expect(stopBtn.exists()).toBe(true);

    await stopBtn.trigger('click');
    expect(signal?.aborted).toBe(true);

    // 応答完了（isLoading解除）後は停止ボタンが消える
    resolveChat({ message: '完了', needsClarification: false });
    await flushPromises();
    expect(wrapper.find('.chat-stop-btn').exists()).toBe(false);
  });

  it('[covers:chat-panel.pending-chat-message-auto-sends] pendingChatMessage設定で入力へ入り自動送信される', async () => {
    mountPanel();
    const deckStore = useDeckEditStore();

    deckStore.pendingChatMessage = 'このカードをデッキに入れて';
    await flushPromises();

    expect(vi.mocked(chat)).toHaveBeenCalledTimes(1);
    expect(lastChatCall()[0].userMessage).toBe('このカードをデッキに入れて');
    expect(deckStore.pendingChatMessage).toBeNull();
  });

  it('[covers:chat-panel.enter-to-send-shift-enter-newline] Enterで送信されShift+Enterでは改行が入る', async () => {
    const wrapper = mountPanel();
    const textarea = wrapper.find('textarea.chat-input');

    // Shift+Enter: 送信されず改行がinputTextへ追加される
    await textarea.setValue('こんばんは');
    await textarea.trigger('keydown.enter.shift');
    await flushPromises();
    expect(vi.mocked(chat)).not.toHaveBeenCalled();
    expect(textareaValue(wrapper)).toBe('こんばんは\n');

    // Enter（修飾なし）: 送信される（userMessageはtrim済み）
    await textarea.trigger('keydown.enter');
    await flushPromises();
    expect(vi.mocked(chat)).toHaveBeenCalledTimes(1);
    expect(lastChatCall()[0].userMessage).toBe('こんばんは');
  });

  // --- ツールメッセージ（コールバック・表示） ---

  it('[covers:chat-panel.tool-callback-appends-summarized-tool-message] コールバックでtoolメッセージ追加・toolResultDataは成功時のみ', async () => {
    makeChatPending();
    const wrapper = mountPanel();
    await sendFromInput(wrapper, 'ツールを確認して');
    const onTool = lastChatCall()[3];
    if (!onTool) throw new Error('chatへコールバックが渡されていない');

    // 成功例（data.nameの要約・args伝播・reasoning伝播）と失敗例（error要約）
    onTool(toolInfo(
      'resolveCardName',
      { success: true, data: { cardId: '89631139', name: '青眼の白龍' } },
      { name: '青眼の白龍' },
      'カード名を特定する推論'
    ));
    onTool(toolInfo(
      'addCardToDeck',
      { success: false, data: { cards: [{ name: '失敗カード', cardId: '12345678' }] }, error: '枚数制限超過' },
      { section: 'main', cardId: 'c1' }
    ));
    await flushPromises();

    const tools = wrapper.findAll('.chat-message.tool');
    expect(tools).toHaveLength(2);

    // 成功側: toolName/toolArgs/OK/要約（data.name）/toolReasoningが伝播
    expect(tools[0]?.find('.tool-name').text()).toBe('resolveCardName');
    expect(tools[0]?.find('.tool-args').text()).toBe('青眼の白龍');
    expect(tools[0]?.find('.tool-status').text()).toBe('OK');
    expect(tools[0]?.find('.tool-content').text()).toBe('青眼の白龍');
    expect(tools[0]?.find('.tool-reasoning').text()).toBe('カード名を特定する推論');

    // 失敗側: NG・errorの要約・reasoningなし
    expect(tools[1]?.find('.tool-status').text()).toBe('NG');
    expect(tools[1]?.find('.tool-content').text()).toBe('枚数制限超過');
    expect(tools[1]?.find('.tool-reasoning').exists()).toBe(false);

    // toolResultDataは成功時のみ渡る: 成功側データのカード名は{{...}}からリンク化され、
    // 失敗側データのカード名（dataに含まれていても）と未知の名前はプレーンテキストのまま
    resolveChat({ message: '{{青眼の白龍}} {{失敗カード}} {{未知のカード}}', needsClarification: false });
    await flushPromises();
    expect(wrapper.findAll('.card-link').map((l) => l.text())).toEqual(['青眼の白龍']);
    const assistantText = wrapper.find('.chat-message.assistant .chat-message-content').text();
    expect(assistantText).toContain('失敗カード');
    expect(assistantText).toContain('未知のカード');
  });

  it.each([
    // 失敗: error優先、無ければ'エラー'
    { name: 'unknownTool', result: { success: false }, expected: 'エラー' },
    { name: 'unknownTool', result: { success: false, error: '制限超過' }, expected: '制限超過' },
    // searchDeckCards: totalCountとカード列挙（quantity>1のみxN）、0件は'該当なし'
    { name: 'searchDeckCards', result: { success: true, data: { cards: [], totalCount: 0 } }, expected: '該当なし' },
    { name: 'searchDeckCards', result: { success: true, data: { cards: [{ name: 'A', quantity: 2 }, { name: 'B', quantity: 1 }], totalCount: 3 } }, expected: '3枚: Ax2, B' },
    // ツール別の固定文言
    { name: 'removeCardFromDeck', result: { success: true, data: { removed: 2 } }, expected: '2枚削除' },
    { name: 'moveCard', result: { success: true, data: { moved: 3 } }, expected: '3枚移動' },
    { name: 'addCardToDeck', result: { success: true }, expected: '追加完了' },
    { name: 'getDeckState', result: { success: true, data: { mainCount: 40 } }, expected: 'デッキ状態取得' },
    { name: 'resolveCardName', result: { success: true, data: { name: '青眼の白龍' } }, expected: '青眼の白龍' },
    { name: 'resolveCardName', result: { success: true, data: {} }, expected: '特定完了' },
    { name: 'getCardDetail', result: { success: true, data: { cardId: '1234' } }, expected: 'カード情報取得' },
    { name: 'searchCards', result: { success: true, data: [{}, {}, {}] }, expected: '3件' },
    { name: 'searchCards', result: { success: true }, expected: '0件' },
    { name: 'otherTool', result: { success: true, data: { any: 1 } }, expected: '完了' },
  ])(
    '[covers:chat-panel.tool-result-summary-formats] summarizeToolResult: $name → $expected',
    async (c: { name: string; result: ToolResult; expected: string }) => {
      const wrapper = await invokeTool(toolInfo(c.name, c.result));

      expect(wrapper.find('.chat-message.tool .tool-content').text()).toBe(c.expected);
      // 成功可否はOK/NGにも反映される
      expect(wrapper.find('.chat-message.tool .tool-status').text()).toBe(c.result.success ? 'OK' : 'NG');
    }
  );

  it.each([
    // 未知ツールは空文字（argsの有無によらず）。args無し（undefined）は
    // ToolCallInfo.argsが必須のためコールバック経路では生成できない防御分岐
    { name: 'unknownTool', args: { x: 1 }, expected: '' },
    // moveCard: 'from -> to'（cardIds 2件以上で xN）
    { name: 'moveCard', args: { from: 'main', to: 'side' }, expected: 'main -> side' },
    { name: 'moveCard', args: { from: 'main', to: 'trash', cardIds: ['a'] }, expected: 'main -> trash' },
    { name: 'moveCard', args: { from: 'main', to: 'trash', cardIds: ['a', 'b', 'c'] }, expected: 'main -> trash x3' },
    // removeCardFromDeck: section優先（無ければfrom）+ xN
    { name: 'removeCardFromDeck', args: { section: 'side', cardIds: ['a'] }, expected: 'side' },
    { name: 'removeCardFromDeck', args: { from: 'main', cardIds: ['a', 'b'] }, expected: 'main x2' },
    // searchDeckCards: 存在する項目のみ' / '連結（typesは','連結）
    { name: 'searchDeckCards', args: { keyword: 'ドラゴン' }, expected: 'ドラゴン' },
    {
      name: 'searchDeckCards',
      args: { cardType: 'monster', race: 'dragon', attribute: 'light', types: ['effect', 'tuner'], section: 'main', keyword: 'ドラゴン' },
      expected: 'monster / dragon / light / effect,tuner / main / ドラゴン',
    },
    // 単一値ツール
    { name: 'resolveCardName', args: { name: '青眼' }, expected: '青眼' },
    { name: 'getCardDetail', args: { cardId: '1234' }, expected: '1234' },
    { name: 'addCardToDeck', args: { section: 'extra', cardId: '999' }, expected: 'extra +999' },
  ])(
    '[covers:chat-panel.tool-args-display-formats] formatToolArgs: $name → $expected',
    async (c: { name: string; args: Record<string, unknown>; expected: string }) => {
      const wrapper = await invokeTool(toolInfo(c.name, { success: true }, c.args));

      expect(wrapper.find('.chat-message.tool .tool-args').text()).toBe(c.expected);
    }
  );

  it('[covers:chat-panel.tool-message-display-and-expand-toggle] tool行のOK/NG表示とcontent展開トグル', async () => {
    makeChatPending();
    const wrapper = mountPanel();
    await sendFromInput(wrapper, 'ツール表示の確認');
    const onTool = lastChatCall()[3];
    if (!onTool) throw new Error('chatへコールバックが渡されていない');

    onTool(toolInfo('addCardToDeck', { success: true }, { section: 'main', cardId: 'c1' }));
    onTool(toolInfo('moveCard', { success: false, error: 'カードが見つかりません' }, { from: 'main', to: 'side' }));
    await flushPromises();

    let tools = wrapper.findAll('.chat-message.tool');
    expect(tools).toHaveLength(2);
    // 成功='>'とOK（successクラス）、失敗='!'とNG（errorクラス）
    expect(tools[0]?.find('.tool-icon').text()).toBe('>');
    expect(tools[0]?.find('.tool-status').text()).toBe('OK');
    expect(tools[0]?.find('.tool-status').classes()).toContain('success');
    expect(tools[1]?.find('.tool-icon').text()).toBe('!');
    expect(tools[1]?.find('.tool-status').text()).toBe('NG');
    expect(tools[1]?.find('.tool-status').classes()).toContain('error');

    // 送信中（isLoading）はcontentが表示される
    expect(tools[0]?.find('.tool-content').exists()).toBe(true);

    // 応答完了後はcontentが非表示になる
    resolveChat({ message: '完了', needsClarification: false });
    await flushPromises();
    tools = wrapper.findAll('.chat-message.tool');
    expect(tools[0]?.find('.tool-content').exists()).toBe(false);
    expect(tools[1]?.find('.tool-content').exists()).toBe(false);

    // クリックで展開→再クリックで閉じる（行単位でトグル）
    await tools[0]?.trigger('click');
    tools = wrapper.findAll('.chat-message.tool');
    expect(tools[0]?.find('.tool-content').exists()).toBe(true);
    expect(tools[1]?.find('.tool-content').exists()).toBe(false);

    await tools[0]?.trigger('click');
    tools = wrapper.findAll('.chat-message.tool');
    expect(tools[0]?.find('.tool-content').exists()).toBe(false);
  });

  // --- LLMへのデータ構築 ---

  it('[covers:chat-panel.deck-sections-pass-search-results-directly] 検索結果のカードがDeckSections.searchResultsへそのまま渡る', async () => {
    const searchStore = useSearchStore();
    const card1 = createCard('card1');
    const card2 = createCard('card2');
    searchStore.searchResults = [card1, card2];

    const wrapper = mount(ChatPanel, {
      global: {
        plugins: [pinia]
      }
    });

    // 送信経路（ChatPanel.vue template）: textarea入力 → 送信ボタンclick
    await wrapper.find('textarea.chat-input').setValue('デッキを評価して');
    await wrapper.find('button.chat-send-btn').trigger('click');
    await flushPromises();

    expect(vi.mocked(chat)).toHaveBeenCalledTimes(1);
    const request = vi.mocked(chat).mock.calls[0]?.[0];
    expect(request).toBeDefined();

    // storeのsearchResults（フラットなCardInfo[]）がそのまま渡ること。
    // 旧実装（.map(r => r.card)）の場合はundefined配列になりこの検証はfailする
    const passed = request?.deckSections.searchResults;
    expect(passed).toHaveLength(2);
    expect(passed?.[0]).toMatchObject({ cardId: 'card1', name: 'Card card1' });
    expect(passed?.[1]).toMatchObject({ cardId: 'card2', name: 'Card card2' });
  });

  it('[covers:chat-panel.deck-sections-resolve-cards-by-quantity] 各セクションはcidを解決しquantity件ずつ複製・未解決cidは除外', async () => {
    const deckStore = useDeckEditStore();
    setCardCache([createCard('c1'), createCard('c2'), createCard('c3')]);
    deckStore.deckInfo.mainDeck = [deckRef('c1', 2), deckRef('missing', 1)];
    deckStore.deckInfo.extraDeck = [deckRef('c2', 1)];
    deckStore.deckInfo.sideDeck = [];
    deckStore.trashDeck = [deckRef('c3', 3)];

    const wrapper = mountPanel();
    await sendFromInput(wrapper, 'デッキの内容は');

    const sections = lastChatCall()[0].deckSections;
    // main: c1をquantity=2件へ複製。missingはcache missで除外
    expect(sections.main).toHaveLength(2);
    expect(sections.main[0]).toMatchObject({ cardId: 'c1' });
    expect(sections.main[1]).toMatchObject({ cardId: 'c1' });
    // extra: 1件、side: 空、trash: c3を3件へ複製
    expect(sections.extra).toHaveLength(1);
    expect(sections.extra[0]).toMatchObject({ cardId: 'c2' });
    expect(sections.side).toEqual([]);
    expect(sections.trash).toHaveLength(3);
    for (const card of sections.trash) {
      expect(card).toMatchObject({ cardId: 'c3' });
    }
  });

  it('[covers:chat-panel.store-refs-delegate-to-deck-store] storeRefsは解決可否・store委譲・フォールバックとデッキ集計を返す', async () => {
    const deckStore = useDeckEditStore();
    deckStore.deckInfo.mainDeck = [deckRef('c1', 2), deckRef('cx', 3)];
    deckStore.deckInfo.extraDeck = [deckRef('c2', 1)];
    deckStore.deckInfo.sideDeck = [deckRef('c3', 4), deckRef('c4', 1)];
    deckStore.trashDeck = [deckRef('c5', 2)];

    const wrapper = mountPanel();
    await sendFromInput(wrapper, 'デッキ操作して');
    const storeRefs = lastChatCall()[2];

    // addCard: getCardInfoで解決できない場合はstoreを呼ばずカードが見つかりません
    const addCardSpy = vi.spyOn(deckStore, 'addCard');
    expect(storeRefs.addCard('ghost', 'main')).toEqual({ success: false, error: 'カードが見つかりません' });
    expect(addCardSpy).not.toHaveBeenCalled();

    // addCard: 解決できる場合はdeckStore.addCard(card, section)へ委譲し戻り値を返す
    // （※戻り値undefined時の{success:true}フォールバックはstore側が全経路で
    // {success}を返すため経路として非到達。同型のフォールバックはremoveCardで検証）
    const c1 = createCard('c1');
    setCardCache([c1]);
    addCardSpy.mockReturnValue({ success: false, error: 'max_copies_reached' });
    expect(storeRefs.addCard('c1', 'extra')).toEqual({ success: false, error: 'max_copies_reached' });
    expect(addCardSpy).toHaveBeenCalledWith(c1, 'extra');

    // removeCard: deckStore.removeCard(cardId, section)へ委譲。store側はvoid返しのため
    // ラッパーは常に{success:true}へフォールバックする（失敗オブジェクトのパススルー経路は無い）
    const removeCardSpy = vi.spyOn(deckStore, 'removeCard').mockReturnValue(undefined);
    expect(storeRefs.removeCard('c1', 'trash')).toEqual({ success: true });
    expect(removeCardSpy).toHaveBeenCalledWith('c1', 'trash');

    // moveCard: deckStore.moveCard(cardId, from, to)の戻り値をフォールバックなしで返す
    const moveCardSpy = vi.spyOn(deckStore, 'moveCard').mockReturnValue({ success: true });
    expect(storeRefs.moveCard('c1', 'main', 'side')).toEqual({ success: true });
    expect(moveCardSpy).toHaveBeenCalledWith('c1', 'main', 'side');

    // getDeckState: main/extra/side各デッキのquantity合計
    expect(storeRefs.getDeckState()).toEqual({ mainCount: 5, extraCount: 1, sideCount: 5 });

    // getCardsBySection: sectionごとに{cid, quantity}へ写す（trashはtrashDeck）
    expect(storeRefs.getCardsBySection('main')).toEqual([
      { cid: 'c1', quantity: 2 },
      { cid: 'cx', quantity: 3 },
    ]);
    expect(storeRefs.getCardsBySection('extra')).toEqual([{ cid: 'c2', quantity: 1 }]);
    expect(storeRefs.getCardsBySection('side')).toEqual([
      { cid: 'c3', quantity: 4 },
      { cid: 'c4', quantity: 1 },
    ]);
    expect(storeRefs.getCardsBySection('trash')).toEqual([{ cid: 'c5', quantity: 2 }]);

    // getCardInfoById: getCardInfoの結果。未解決はundefined
    expect(storeRefs.getCardInfoById('c1')).toMatchObject({ cardId: 'c1' });
    expect(storeRefs.getCardInfoById('ghost')).toBeUndefined();
  });

  // --- カードリンク・表示 ---

  it('[covers:chat-panel.card-links-resolved-from-tool-results] {{名前}}はツール結果3形状から補完されcardId付きは保持・未知はプレーン化', async () => {
    makeChatPending();
    const wrapper = mountPanel();
    await sendFromInput(wrapper, 'リンクの確認');
    const onTool = lastChatCall()[3];
    if (!onTool) throw new Error('chatへコールバックが渡されていない');

    // ツール結果の3形状: {cards:[...]}・配列自体・単体オブジェクト
    onTool(toolInfo('searchDeckCards', {
      success: true,
      data: { cards: [{ name: 'カードA', cardId: '111', quantity: 1 }], totalCount: 1 },
    }));
    onTool(toolInfo('searchCards', { success: true, data: [{ name: 'カードB', cardId: '222' }] }));
    onTool(toolInfo('resolveCardName', { success: true, data: { name: 'カードC', cardId: '333' } }, { name: 'カードC' }));

    resolveChat({
      message: '{{カードA}}/{{カードB}}/{{カードC}}/{{カードC|999}}/{{未知カード}}',
      needsClarification: false,
    });
    await flushPromises();

    // 3形状で確認した名前はcardId補完され、cardId付きは保持されて、すべてリンク表示
    expect(wrapper.findAll('.card-link').map((l) => l.text())).toEqual([
      'カードA', 'カードB', 'カードC', 'カードC',
    ]);
    // 未知の名前は{{...}}が外れてプレーンテキスト化
    const assistantText = wrapper.find('.chat-message.assistant .chat-message-content').text();
    expect(assistantText).toContain('未知カード');
    expect(assistantText).not.toContain('{{');
  });

  it('[covers:chat-panel.loading-state-disables-input-and-shows-thinking] 送信中は入力無効化とThinking表示、完了後に解除', async () => {
    makeChatPending();
    const wrapper = mountPanel();

    // 送信前は有効
    expect(wrapper.find('textarea.chat-input').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('button.chat-send-btn').attributes('disabled')).toBeDefined(); // 未入力のため

    await wrapper.find('textarea.chat-input').setValue('長い質問');
    await wrapper.find('button.chat-send-btn').trigger('click');
    await flushPromises();

    // 送信中: textarea・送信ボタンdisabled + Thinking表示
    expect(wrapper.find('textarea.chat-input').attributes('disabled')).toBeDefined();
    expect(wrapper.find('button.chat-send-btn').attributes('disabled')).toBeDefined();
    expect(wrapper.find('.chat-loading').text()).toContain('Thinking');

    resolveChat({ message: '完了', needsClarification: false });
    await flushPromises();

    // 完了後: 解除・消去
    expect(wrapper.find('textarea.chat-input').attributes('disabled')).toBeUndefined();
    expect(wrapper.find('button.chat-send-btn').attributes('disabled')).toBeDefined(); // 入力クリアのため
    expect(wrapper.find('.chat-loading').exists()).toBe(false);
  });

  it('[covers:chat-panel.message-time-format] user/assistantメッセージにHH:MM形式の時刻が表示される', async () => {
    const fixedTs = new Date(2026, 10, 22, 9, 5, 0).getTime();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(fixedTs);
    try {
      const wrapper = mountPanel();
      await sendFromInput(wrapper, '時刻の確認');

      expect(wrapper.find('.chat-message.user .chat-message-time').text()).toBe('09:05');
      expect(wrapper.find('.chat-message.assistant .chat-message-time').text()).toBe('09:05');
    } finally {
      nowSpy.mockRestore();
    }
  });
});
