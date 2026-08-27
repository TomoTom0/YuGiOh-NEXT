import { beforeEach, describe, expect, it, vi } from 'vitest';
import { runNanoPipeline } from '@/services/llm/nano-pipeline';
import { createNanoSession } from '@/services/llm/gemini-nano';
import { executeTool } from '@/services/llm/tool-executor';
import type { StoreRefs } from '@/services/llm/tool-executor';
import type { ToolResult } from '@/services/llm/types';

vi.mock('@/services/llm/gemini-nano', () => ({
  createNanoSession: vi.fn(),
}));

vi.mock('@/services/llm/tool-executor', () => ({
  executeTool: vi.fn(),
}));

type MockSession = {
  prompt: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
};

const createNanoSessionMock = vi.mocked(createNanoSession);
const executeToolMock = vi.mocked(executeTool);

const storeRefs = {
  getDeckSections: vi.fn(),
  addCard: vi.fn(),
  removeCard: vi.fn(),
  moveCard: vi.fn(),
  getDeckState: vi.fn(),
  getCardInfoById: vi.fn(),
  getCardsBySection: vi.fn(),
} satisfies StoreRefs;

function makeSession(
  replies: Array<string | ((message: string, index: number) => string | Promise<string>)>
): MockSession {
  let index = 0;
  return {
    prompt: vi.fn(async (message: string) => {
      const reply = replies[index++];
      if (typeof reply === 'function') {
        return await reply(message, index - 1);
      }
      return reply ?? '';
    }),
    destroy: vi.fn(),
  };
}

function useSession(session: MockSession) {
  createNanoSessionMock.mockResolvedValue(session as Awaited<ReturnType<typeof createNanoSession>>);
}

describe('services/llm/nano-pipeline', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    executeToolMock.mockResolvedValue({ success: true, data: { ok: true } });
  });

  it('returns a plain final response, sends the user message directly, and destroys the session [covers:parse_tool.no_json_returns_null] [covers:history_context.empty_returns_empty_string] [covers:run.first_message_without_history_is_user_message] [covers:run.no_tool_returns_final_response] [covers:run.session_destroyed_after_success]', async () => {
    const session = makeSession(['最終回答です']);
    useSession(session);

    await expect(runNanoPipeline('今のデッキは？', [], storeRefs)).resolves.toBe('最終回答です');

    expect(session.prompt).toHaveBeenCalledTimes(1);
    expect(session.prompt).toHaveBeenCalledWith('今のデッキは？');
    expect(executeToolMock).not.toHaveBeenCalled();
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it('formats history into the first prompt and truncates long tool data [covers:truncate_result.within_limit_returns_json] [covers:truncate_result.over_limit_cuts_and_appends_ellipsis] [covers:history_context.formats_roles_and_tool_data] [covers:run.first_message_with_history_prefixes_context]', async () => {
    const session = makeSession(['履歴を踏まえた回答']);
    useSession(session);
    const longText = 'x'.repeat(1600);

    await runNanoPipeline('続けて', [
      { role: 'user', content: '前の質問', timestamp: 1 },
      { role: 'assistant', content: '前の回答', timestamp: 2 },
      { role: 'tool', content: 'unused', timestamp: 3, toolName: 'shortTool', toolResultData: { ok: true } },
      { role: 'tool', content: 'fallback content', timestamp: 4, toolName: 'contentTool' },
      { role: 'tool', content: 'unused long', timestamp: 5, toolName: 'longTool', toolResultData: { text: longText } },
    ], storeRefs);

    const firstPrompt = session.prompt.mock.calls[0]![0] as string;
    expect(firstPrompt).toContain('[直前の会話履歴]');
    expect(firstPrompt).toContain('ユーザー: 前の質問');
    expect(firstPrompt).toContain('アシスタント: 前の回答');
    expect(firstPrompt).toContain('[ツール shortTool 実行済み]: {"ok":true}');
    expect(firstPrompt).toContain('[ツール contentTool 実行済み]: fallback content');
    expect(firstPrompt).toContain('[ツール longTool 実行済み]: ');
    expect(firstPrompt).toContain('...');
    expect(firstPrompt).toContain('\n\nユーザーの指示: 続けて');
  });

  it('parses fenced no-args tool calls, executes them, reports reasoning, records object card names, and prompts with result data [covers:parse_tool.code_block_content_is_parsed] [covers:parse_tool.valid_tool_without_args_defaults_empty] [covers:collect_names.object_cards_array_names] [covers:collect_names.object_name] [covers:unverified_names.must_be_in_verified_set] [covers:run.tool_call_executes_callback_and_success_data_is_recorded]', async () => {
    const session = makeSession([
      '```json\n{"tool":"getDeckState"}\n```',
      '確認済みは {{確認済みA}} と {{確認済みC|123}} です',
    ]);
    useSession(session);
    executeToolMock.mockResolvedValue({
      success: true,
      data: {
        cards: [{ name: '確認済みA' }, { name: 123 }],
        name: '確認済みC',
      },
    });
    const onToolCall = vi.fn();

    const result = await runNanoPipeline('確認して', [], storeRefs, onToolCall);

    expect(result).toBe('確認済みは {{確認済みA}} と {{確認済みC|123}} です');
    expect(executeToolMock).toHaveBeenCalledWith({ name: 'getDeckState', arguments: {} }, storeRefs);
    expect(onToolCall).toHaveBeenCalledWith({
      name: 'getDeckState',
      args: {},
      result: {
        success: true,
        data: {
          cards: [{ name: '確認済みA' }, { name: 123 }],
          name: '確認済みC',
        },
      },
      nanoReasoning: '```json\n\n```',
    });
    expect(session.prompt.mock.calls[1]![0]).toContain('ツール getDeckState の実行結果:\n{"cards"');
    expect(session.prompt).toHaveBeenCalledTimes(2);
  });

  it('extracts text before tool JSON as nanoReasoning [covers:run.tool_call_executes_callback_and_success_data_is_recorded]', async () => {
    const session = makeSession([
      '確認します。\n{"tool":"getDeckState"}',
      '完了',
    ]);
    useSession(session);
    const onToolCall = vi.fn();

    await runNanoPipeline('確認して', [], storeRefs, onToolCall);

    expect(onToolCall).toHaveBeenCalledWith(expect.objectContaining({
      name: 'getDeckState',
      nanoReasoning: '確認します。',
    }));
  });

  it('returns nested args JSON as final text because parseToolCall cannot parse it [covers:parse_tool.invalid_or_nested_json_returns_null]', async () => {
    const nestedToolJson = '{"tool":"getCardDetail","args":{"cardId":"1"}}';
    const session = makeSession([nestedToolJson]);
    useSession(session);

    await expect(runNanoPipeline('カードを確認して', [], storeRefs)).resolves.toBe(nestedToolJson);
    expect(executeToolMock).not.toHaveBeenCalled();
  });

  it('ignores parsed JSON whose tool is not a truthy string [covers:parse_tool.tool_not_truthy_string_returns_null]', async () => {
    const session = makeSession(['{"tool":""}']);
    useSession(session);

    await expect(runNanoPipeline('確認して', [], storeRefs)).resolves.toBe('{"tool":""}');
    expect(executeToolMock).not.toHaveBeenCalled();
  });

  it('collects verified names from array tool data [covers:collect_names.array_names] [covers:unverified_names.must_be_in_verified_set]', async () => {
    const session = makeSession([
      '{"tool":"getDeckState"}',
      '配列由来の {{確認済みB}} です',
    ]);
    useSession(session);
    executeToolMock.mockResolvedValue({ success: true, data: [{ name: '確認済みB' }, { name: null }] });

    await expect(runNanoPipeline('確認して', [], storeRefs)).resolves.toBe('配列由来の {{確認済みB}} です');
    expect(session.prompt).toHaveBeenCalledTimes(2);
  });

  it('reprompts for unverified names up to three times and returns the last response [covers:unverified_names.must_be_in_verified_set] [covers:run.unverified_names_reprompt_up_to_three]', async () => {
    const session = makeSession([
      '初回 {{未確認}}',
      '修正1 {{未確認}}',
      '修正2 {{未確認}}',
      '修正3 {{未確認}}',
    ]);
    useSession(session);

    await expect(runNanoPipeline('答えて', [], storeRefs)).resolves.toBe('修正3 {{未確認}}');

    expect(session.prompt).toHaveBeenCalledTimes(4);
    expect(session.prompt.mock.calls[1]![0]).toContain('ツールで確認していないカード名が含まれています: 未確認');
  });

  it('does not inspect malformed card markup whose id part is nonnumeric [covers:unverified_names.verified_or_non_matching_markup_ignored]', async () => {
    const session = makeSession([
      '{"tool":"getDeckState"}',
      '{{確認済み}} {{未確認|abc}}',
    ]);
    useSession(session);
    executeToolMock.mockResolvedValue({ success: true, data: { name: '確認済み' } });

    await expect(runNanoPipeline('答えて', [], storeRefs)).resolves.toBe('{{確認済み}} {{未確認|abc}}');
    expect(session.prompt).toHaveBeenCalledTimes(2);
  });

  it('continues the main loop when validation returns a parseable tool call [covers:run.validation_tool_call_continues_main_loop]', async () => {
    const session = makeSession([
      '未確認の {{カード}} です',
      '{"tool":"getDeckState"}',
      'ツール後の最終回答',
    ]);
    useSession(session);

    await expect(runNanoPipeline('答えて', [], storeRefs)).resolves.toBe('ツール後の最終回答');
    expect(executeToolMock).toHaveBeenCalledTimes(1);
    expect(session.prompt.mock.calls[2]![0]).toContain('ツール getDeckState の実行結果:');
  });

  it('uses the success literal when a successful tool returns undefined data, and that data is not collected [covers:collect_names.skips_falsy_data] [covers:run.success_result_prompt_uses_data_or_success_literal]', async () => {
    const session = makeSession([
      '{"tool":"getDeckState"}',
      '未確認 {{成功カード}}',
      '修正済み',
    ]);
    useSession(session);
    executeToolMock.mockResolvedValue({ success: true });

    await expect(runNanoPipeline('確認して', [], storeRefs)).resolves.toBe('修正済み');
    expect(session.prompt.mock.calls[1]![0]).toBe('ツール getDeckState の実行結果:\n"成功"');
    expect(session.prompt.mock.calls[2]![0]).toContain('成功カード');
  });

  it('does not collect null tool data [covers:collect_names.skips_falsy_data]', async () => {
    const session = makeSession([
      '{"tool":"getDeckState"}',
      '未確認 {{Null由来}}',
      '修正済み',
    ]);
    useSession(session);
    executeToolMock.mockResolvedValue({ success: true, data: null });

    await expect(runNanoPipeline('確認して', [], storeRefs)).resolves.toBe('修正済み');
    expect(session.prompt.mock.calls[2]![0]).toContain('Null由来');
  });

  it('prompts with tool errors and does not collect failed result data [covers:run.error_result_prompt_uses_error]', async () => {
    const session = makeSession([
      '{"tool":"getDeckState"}',
      '未確認 {{未収集}}',
      '修正済み',
    ]);
    useSession(session);
    executeToolMock.mockResolvedValue({ success: false, error: '失敗', data: { name: '未収集' } } as ToolResult);

    await expect(runNanoPipeline('確認して', [], storeRefs)).resolves.toBe('修正済み');
    expect(session.prompt.mock.calls[1]![0]).toBe('ツール getDeckState のエラー: 失敗');
    expect(session.prompt.mock.calls[2]![0]).toContain('未収集');
  });

  it('throws before creating a session when the signal is already aborted [covers:run.abort_before_session_throws_without_create]', async () => {
    const controller = new AbortController();
    controller.abort();

    await expect(runNanoPipeline('中断', [], storeRefs, undefined, controller.signal)).rejects.toThrow('aborted');
    expect(createNanoSessionMock).not.toHaveBeenCalled();
  });

  it('throws and destroys the session when aborted after the initial prompt [covers:run.abort_after_initial_prompt_throws_and_destroys]', async () => {
    const controller = new AbortController();
    const session = makeSession([
      () => {
        controller.abort();
        return '最終回答';
      },
    ]);
    useSession(session);

    await expect(runNanoPipeline('中断', [], storeRefs, undefined, controller.signal)).rejects.toThrow('aborted');
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it('throws and destroys the session when aborted after the validation prompt [covers:run.abort_after_validation_prompt_throws_and_destroys]', async () => {
    const controller = new AbortController();
    const session = makeSession([
      '未確認 {{カード}}',
      () => {
        controller.abort();
        return '修正';
      },
    ]);
    useSession(session);

    await expect(runNanoPipeline('中断', [], storeRefs, undefined, controller.signal)).rejects.toThrow('aborted');
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it('throws and destroys the session when aborted after tool execution [covers:run.abort_after_tool_execution_throws_and_destroys]', async () => {
    const controller = new AbortController();
    const session = makeSession(['{"tool":"getDeckState"}']);
    useSession(session);
    executeToolMock.mockImplementation(async () => {
      controller.abort();
      return { success: true, data: { ok: true } };
    });

    await expect(runNanoPipeline('中断', [], storeRefs, undefined, controller.signal)).rejects.toThrow('aborted');
    expect(session.prompt).toHaveBeenCalledTimes(1);
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it('throws and destroys the session when aborted after the follow-up prompt [covers:run.abort_after_followup_prompt_throws_and_destroys]', async () => {
    const controller = new AbortController();
    const session = makeSession([
      '{"tool":"getDeckState"}',
      () => {
        controller.abort();
        return '最終回答';
      },
    ]);
    useSession(session);

    await expect(runNanoPipeline('中断', [], storeRefs, undefined, controller.signal)).rejects.toThrow('aborted');
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });

  it('stops after ten tool iterations and returns the eleventh tool-looking response without executing it [covers:run.max_tool_iterations_returns_last_response]', async () => {
    const session = makeSession(Array.from({ length: 11 }, () => '{"tool":"getDeckState"}'));
    useSession(session);

    await expect(runNanoPipeline('繰り返して', [], storeRefs)).resolves.toBe('{"tool":"getDeckState"}');

    expect(executeToolMock).toHaveBeenCalledTimes(10);
    expect(session.prompt).toHaveBeenCalledTimes(11);
    expect(session.destroy).toHaveBeenCalledTimes(1);
  });
});
