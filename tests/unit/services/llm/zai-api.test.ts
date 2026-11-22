import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { promptZai, promptZaiMulti } from '@/services/llm/zai-api';

type SendResponse = {
  success: boolean;
  content?: string;
  error?: string;
} | undefined;

function setRuntimeLastError(message?: string): void {
  Object.defineProperty(chrome.runtime, 'lastError', {
    configurable: true,
    value: message ? { message } : undefined,
  });
}

function mockAiChatResponse(response: SendResponse): void {
  vi.mocked(chrome.runtime.sendMessage).mockImplementation(((
    _message: unknown,
    callback: (response: SendResponse) => void,
  ) => {
    setRuntimeLastError();
    callback(response);
  }) as typeof chrome.runtime.sendMessage);
}

describe('zai-api', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setRuntimeLastError();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    setRuntimeLastError();
  });

  it('promptZai は単一user messageに包んでpromptZaiMulti相当の結果を返す [covers:prompt-zai.delegates-single-user-message]', async () => {
    mockAiChatResponse({ success: true, content: 'ok' });

    await expect(promptZai('sys', 'hello')).resolves.toBe('ok');

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'AI_CHAT',
        systemPrompt: 'sys',
        conversation: [{ role: 'user', content: 'hello' }],
      },
      expect.any(Function),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('promptZaiMulti はAI_CHAT payloadをsendMessageへ渡す [covers:prompt-zai-multi.send-message-payload] [covers:prompt-zai-multi.success-content-returns]', async () => {
    const conversation = [
      { role: 'system' as const, content: 'context' },
      { role: 'user' as const, content: 'hello' },
      { role: 'assistant' as const, content: 'previous' },
    ];
    mockAiChatResponse({ success: true, content: 'answer' });

    await expect(promptZaiMulti('sys', conversation)).resolves.toBe('answer');

    expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
      {
        type: 'AI_CHAT',
        systemPrompt: 'sys',
        conversation,
      },
      expect.any(Function),
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('lastErrorがある場合はresを見ずにZ.ai APIエラーでrejectする [covers:prompt-zai-multi.last-error-rejects]', async () => {
    vi.mocked(chrome.runtime.sendMessage).mockImplementation(((
      _message: unknown,
      callback: (response: SendResponse) => void,
    ) => {
      setRuntimeLastError('port closed');
      callback({ success: true, content: 'ignored' });
    }) as typeof chrome.runtime.sendMessage);

    await expect(promptZaiMulti('sys', [])).rejects.toThrow('Z.ai API エラー: port closed');
  });

  it('success=falseかつerrorありならerror文字列でthrowする [covers:prompt-zai-multi.failure-with-error-throws-error]', async () => {
    mockAiChatResponse({ success: false, error: 'upstream failed' });

    await expect(promptZaiMulti('sys', [])).rejects.toThrow('upstream failed');
  });

  it('success=falseかつerrorなしなら既定メッセージでthrowする [covers:prompt-zai-multi.failure-without-error-throws-default]', async () => {
    mockAiChatResponse({ success: false });

    await expect(promptZaiMulti('sys', [])).rejects.toThrow('Z.ai APIから空の応答が返りました');
  });

  it('success=trueでもcontentが空文字なら既定メッセージでthrowする [covers:prompt-zai-multi.success-empty-content-throws-default]', async () => {
    mockAiChatResponse({ success: true, content: '' });

    await expect(promptZaiMulti('sys', [])).rejects.toThrow('Z.ai APIから空の応答が返りました');
  });

  it('responseがundefinedならTypeErrorをthrowする [covers:prompt-zai-multi.undefined-response-type-error]', async () => {
    mockAiChatResponse(undefined);

    await expect(promptZaiMulti('sys', [])).rejects.toThrow(TypeError);
  });
});
