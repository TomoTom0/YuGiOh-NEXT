import { beforeEach, describe, expect, it, vi } from 'vitest';
import { chat, ChatAbortError } from '@/services/llm/llm-chat-service';
import { buildSystemPrompt } from '@/services/llm/context-builder';
import { isGeminiNanoAvailable, promptGeminiNano } from '@/services/llm/gemini-nano';
import { promptZaiMulti } from '@/services/llm/zai-api';
import { executeTool, recordToolCall } from '@/services/llm/tool-executor';
import { runNanoPipeline } from '@/services/llm/nano-pipeline';
import type { StoreRefs } from '@/services/llm/tool-executor';
import type { LlmRequest, ToolResult } from '@/services/llm/types';

vi.mock('@/services/llm/context-builder', () => ({
  buildSystemPrompt: vi.fn(),
}));

vi.mock('@/services/llm/gemini-nano', () => ({
  isGeminiNanoAvailable: vi.fn(),
  promptGeminiNano: vi.fn(),
}));

vi.mock('@/services/llm/zai-api', () => ({
  promptZaiMulti: vi.fn(),
}));

vi.mock('@/services/llm/tool-executor', () => ({
  executeTool: vi.fn(),
  recordToolCall: vi.fn(),
}));

vi.mock('@/services/llm/nano-pipeline', () => ({
  runNanoPipeline: vi.fn(),
}));

const buildSystemPromptMock = vi.mocked(buildSystemPrompt);
const isGeminiNanoAvailableMock = vi.mocked(isGeminiNanoAvailable);
const promptGeminiNanoMock = vi.mocked(promptGeminiNano);
const promptZaiMultiMock = vi.mocked(promptZaiMulti);
const executeToolMock = vi.mocked(executeTool);
const recordToolCallMock = vi.mocked(recordToolCall);
const runNanoPipelineMock = vi.mocked(runNanoPipeline);

const storeRefs = {
  getDeckSections: vi.fn(),
  addCard: vi.fn(),
  removeCard: vi.fn(),
  moveCard: vi.fn(),
  getDeckState: vi.fn(),
  getCardInfoById: vi.fn(),
  getCardsBySection: vi.fn(),
} satisfies StoreRefs;

function makeRequest(overrides: Partial<LlmRequest> = {}): LlmRequest {
  return {
    userMessage: '現在のデッキを確認して',
    deckSections: {
      main: [],
      extra: [],
      side: [],
      trash: [],
      searchResults: [],
    },
    history: [],
    ...overrides,
  };
}

describe('services/llm/llm-chat-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buildSystemPromptMock.mockReturnValue('SYSTEM');
    isGeminiNanoAvailableMock.mockResolvedValue(false);
    promptGeminiNanoMock.mockResolvedValue('NANO');
    promptZaiMultiMock.mockResolvedValue('最終回答');
    executeToolMock.mockResolvedValue({ success: true, data: { ok: true } });
    runNanoPipelineMock.mockResolvedValue('nano reply');
  });

  it('aborts after building context and checking availability [covers:chat.abort_before_routing_throws]', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(chat(makeRequest(), 'key', storeRefs, undefined, controller.signal))
      .rejects.toBeInstanceOf(ChatAbortError);

    expect(buildSystemPromptMock).toHaveBeenCalledTimes(1);
    expect(isGeminiNanoAvailableMock).toHaveBeenCalledTimes(1);
    expect(promptGeminiNanoMock).not.toHaveBeenCalled();
    expect(promptZaiMultiMock).not.toHaveBeenCalled();
    expect(runNanoPipelineMock).not.toHaveBeenCalled();
  });

  it('routes to Cloud when Nano routing says CLOUD and an API key exists [covers:chat.nano_available_routing_cloud_with_api_uses_cloud] [covers:chat.cloud_no_tool_returns_raw_response] [covers:parse_tool.non_brace_returns_null]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(true);
    promptGeminiNanoMock.mockResolvedValue(' cloud ');
    promptZaiMultiMock.mockResolvedValue('回答です？');

    const result = await chat(makeRequest(), 'key', storeRefs);

    expect(result).toEqual({
      message: '回答です？',
      toolCalls: undefined,
      needsClarification: true,
    });
    expect(promptGeminiNanoMock).toHaveBeenCalledWith(expect.stringContaining('ユーザーのメッセージ'), '現在のデッキを確認して');
    expect(promptZaiMultiMock).toHaveBeenCalledWith('SYSTEM', [
      { role: 'user', content: '現在のデッキを確認して' },
    ]);
    expect(runNanoPipelineMock).not.toHaveBeenCalled();
  });

  it('falls back to Nano when routing says CLOUD but no API key exists [covers:chat.nano_available_routing_cloud_without_api_falls_back_to_nano] [covers:chat.nano_pipeline_success_returns_false_clarification]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(true);
    promptGeminiNanoMock.mockResolvedValue('CLOUD');
    runNanoPipelineMock.mockResolvedValue('nano final');

    await expect(chat(makeRequest(), '', storeRefs)).resolves.toEqual({
      message: 'nano final',
      needsClarification: false,
    });

    expect(runNanoPipelineMock).toHaveBeenCalledWith('現在のデッキを確認して', [], storeRefs, undefined, undefined);
    expect(promptZaiMultiMock).not.toHaveBeenCalled();
  });

  it('uses Nano when routing does not include CLOUD even if an API key exists [covers:chat.nano_available_routing_not_cloud_uses_nano]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(true);
    promptGeminiNanoMock.mockResolvedValue('NANO');

    await chat(makeRequest(), 'key', storeRefs);

    expect(runNanoPipelineMock).toHaveBeenCalledTimes(1);
    expect(promptZaiMultiMock).not.toHaveBeenCalled();
  });

  it('uses Cloud or Nano after routing errors based on API key truthiness [covers:chat.routing_error_with_api_uses_cloud] [covers:chat.routing_error_without_api_uses_nano]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(true);
    promptGeminiNanoMock.mockRejectedValue(new Error('routing failed'));

    await chat(makeRequest(), 'key', storeRefs);
    expect(promptZaiMultiMock).toHaveBeenCalledTimes(1);
    expect(runNanoPipelineMock).not.toHaveBeenCalled();

    vi.clearAllMocks();
    buildSystemPromptMock.mockReturnValue('SYSTEM');
    isGeminiNanoAvailableMock.mockResolvedValue(true);
    promptGeminiNanoMock.mockRejectedValue(new Error('routing failed'));
    promptZaiMultiMock.mockResolvedValue('cloud');
    runNanoPipelineMock.mockResolvedValue('nano');

    await chat(makeRequest(), '', storeRefs);
    expect(runNanoPipelineMock).toHaveBeenCalledTimes(1);
    expect(promptZaiMultiMock).not.toHaveBeenCalled();
  });

  it('uses Cloud directly when Nano is unavailable and an API key exists [covers:chat.nano_unavailable_with_api_uses_cloud]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);

    await chat(makeRequest(), 'key', storeRefs);

    expect(promptGeminiNanoMock).not.toHaveBeenCalled();
    expect(promptZaiMultiMock).toHaveBeenCalledTimes(1);
    expect(runNanoPipelineMock).not.toHaveBeenCalled();
  });

  it('returns the no-provider message without calling either model [covers:chat.no_provider_returns_message]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);

    await expect(chat(makeRequest(), '', storeRefs)).resolves.toEqual({
      message: 'Gemini NanoもZ.ai APIキーも利用できません。設定からAPIキーを入力するか、ChromeのAI機能を有効にしてください。',
      needsClarification: false,
    });

    expect(promptGeminiNanoMock).not.toHaveBeenCalled();
    expect(promptZaiMultiMock).not.toHaveBeenCalled();
    expect(runNanoPipelineMock).not.toHaveBeenCalled();
  });

  it('translates Nano aborted errors and propagates other Nano errors [covers:chat.nano_pipeline_aborted_error_translated] [covers:chat.nano_pipeline_other_error_propagates]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(true);
    promptGeminiNanoMock.mockResolvedValue('NANO');
    runNanoPipelineMock.mockRejectedValueOnce(new Error('aborted'));

    await expect(chat(makeRequest(), '', storeRefs)).rejects.toBeInstanceOf(ChatAbortError);

    const error = new Error('nano failed');
    runNanoPipelineMock.mockRejectedValueOnce(error);
    await expect(chat(makeRequest(), '', storeRefs)).rejects.toBe(error);
  });

  it('converts Cloud history before adding the current user message [covers:chat.cloud_history_user_assistant_and_tool_converted]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);
    const request = makeRequest({
      history: [
        { role: 'user', content: '前の質問', timestamp: 1 },
        { role: 'assistant', content: '前の回答', timestamp: 2 },
        {
          role: 'tool',
          content: 'unused',
          timestamp: 3,
          toolName: 'getDeckState',
          toolSuccess: true,
          toolResultData: { count: 1 },
        },
        {
          role: 'tool',
          content: 'fallback detail',
          timestamp: 4,
          toolName: 'addCardToDeck',
          toolSuccess: false,
        },
      ],
    });

    await chat(request, 'key', storeRefs);

    expect(promptZaiMultiMock).toHaveBeenCalledWith('SYSTEM', [
      { role: 'user', content: '前の質問' },
      { role: 'assistant', content: '前の回答' },
      { role: 'user', content: '[ツール getDeckState OK] {"count":1}' },
      { role: 'user', content: '[ツール addCardToDeck NG] fallback detail' },
      { role: 'user', content: '現在のデッキを確認して' },
    ]);
  });

  it('parses fenced tool JSON, executes it, records it, calls back, and reprompts with success data [covers:parse_tool.code_block_content_is_parsed] [covers:parse_tool.valid_tool_and_args_returns_call] [covers:chat.cloud_tool_success_records_callback_and_reprompts]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);
    promptZaiMultiMock
      .mockResolvedValueOnce('```json\n{"tool":"getDeckState","args":{"a":1}}\n```')
      .mockResolvedValueOnce('ツール後の回答');
    executeToolMock.mockResolvedValue({ success: true, data: { ok: true } });
    const onToolCall = vi.fn();

    const result = await chat(makeRequest(), 'key', storeRefs, onToolCall);

    expect(result).toEqual({
      message: 'ツール後の回答',
      toolCalls: [{ name: 'getDeckState', arguments: { a: 1 } }],
      needsClarification: false,
    });
    expect(executeToolMock).toHaveBeenCalledWith({ name: 'getDeckState', arguments: { a: 1 } }, storeRefs);
    expect(recordToolCallMock).toHaveBeenCalledWith('getDeckState', { a: 1 }, { ok: true });
    expect(onToolCall).toHaveBeenCalledWith({
      name: 'getDeckState',
      args: { a: 1 },
      result: { success: true, data: { ok: true } },
    });
    expect(promptZaiMultiMock.mock.calls[1]![1]).toEqual([
      { role: 'assistant', content: '```json\n{"tool":"getDeckState","args":{"a":1}}\n```' },
      { role: 'user', content: 'ツール getDeckState の実行結果: {"ok":true}' },
    ]);
  });

  it('accepts null args as a tool call at runtime [covers:parse_tool.null_args_are_accepted]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);
    promptZaiMultiMock
      .mockResolvedValueOnce('{"tool":"getDeckState","args":null}')
      .mockResolvedValueOnce('完了');

    await chat(makeRequest(), 'key', storeRefs);

    expect(executeToolMock).toHaveBeenCalledWith({ name: 'getDeckState', arguments: null }, storeRefs);
  });

  it('does not execute JSON that lacks args, has invalid JSON, or has a falsy tool [covers:parse_tool.missing_args_returns_null] [covers:parse_tool.invalid_json_returns_null] [covers:parse_tool.falsy_tool_returns_null]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);

    promptZaiMultiMock.mockResolvedValueOnce('{"tool":"getDeckState"}');
    await expect(chat(makeRequest(), 'key', storeRefs)).resolves.toMatchObject({ message: '{"tool":"getDeckState"}' });

    promptZaiMultiMock.mockResolvedValueOnce('{invalid json');
    await expect(chat(makeRequest(), 'key', storeRefs)).resolves.toMatchObject({ message: '{invalid json' });

    promptZaiMultiMock.mockResolvedValueOnce('{"tool":"","args":{}}');
    await expect(chat(makeRequest(), 'key', storeRefs)).resolves.toMatchObject({ message: '{"tool":"","args":{}}' });

    expect(executeToolMock).not.toHaveBeenCalled();
  });

  it('aborts at the start of the Cloud tool loop [covers:chat.cloud_abort_inside_tool_loop_throws]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);
    const controller = new AbortController();
    promptZaiMultiMock.mockImplementationOnce(async () => {
      controller.abort();
      return '{"tool":"getDeckState","args":{}}';
    });

    await expect(chat(makeRequest(), 'key', storeRefs, undefined, controller.signal))
      .rejects.toBeInstanceOf(ChatAbortError);

    expect(executeToolMock).not.toHaveBeenCalled();
  });

  it('uses the success literal when successful tool data is nullish [covers:chat.cloud_tool_success_undefined_data_uses_success_literal]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);
    promptZaiMultiMock
      .mockResolvedValueOnce('{"tool":"getDeckState","args":{}}')
      .mockResolvedValueOnce('完了');
    executeToolMock.mockResolvedValue({ success: true });

    await chat(makeRequest(), 'key', storeRefs);

    expect(promptZaiMultiMock.mock.calls[1]![1].at(-1)).toEqual({
      role: 'user',
      content: 'ツール getDeckState の実行結果: "成功"',
    });
  });

  it('uses error text for failed tool results [covers:chat.cloud_tool_failure_uses_error_text]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);
    promptZaiMultiMock
      .mockResolvedValueOnce('{"tool":"getDeckState","args":{}}')
      .mockResolvedValueOnce('完了');
    executeToolMock.mockResolvedValue({ success: false, error: '失敗' } satisfies ToolResult);

    await chat(makeRequest(), 'key', storeRefs);

    expect(promptZaiMultiMock.mock.calls[1]![1].at(-1)).toEqual({
      role: 'user',
      content: 'ツール getDeckState のエラー: 失敗',
    });
  });

  it('runs at most five Cloud tool iterations [covers:chat.cloud_max_tool_iterations_is_five]', async () => {
    isGeminiNanoAvailableMock.mockResolvedValue(false);
    promptZaiMultiMock.mockResolvedValue('{"tool":"getDeckState","args":{}}');

    const result = await chat(makeRequest(), 'key', storeRefs);

    expect(executeToolMock).toHaveBeenCalledTimes(5);
    expect(result).toEqual({
      message: '{"tool":"getDeckState","args":{}}',
      toolCalls: Array.from({ length: 5 }, () => ({ name: 'getDeckState', arguments: {} })),
      needsClarification: false,
    });
  });
});
