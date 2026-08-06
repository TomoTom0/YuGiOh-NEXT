import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createNanoSession, isGeminiNanoAvailable, promptGeminiNano } from '@/services/llm/gemini-nano';

type MockLanguageModelApi = {
  availability: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
  params: ReturnType<typeof vi.fn>;
};

function makeApi(overrides: Partial<MockLanguageModelApi> = {}): MockLanguageModelApi {
  return {
    availability: vi.fn(),
    create: vi.fn(),
    params: vi.fn(),
    ...overrides,
  };
}

function setLanguageModel(api: MockLanguageModelApi | undefined) {
  (window as unknown as { LanguageModel?: MockLanguageModelApi }).LanguageModel = api;
}

function setAiLanguageModel(api: MockLanguageModelApi | undefined) {
  (window as unknown as { ai?: { languageModel?: MockLanguageModelApi } }).ai = api
    ? { languageModel: api }
    : undefined;
}

describe('services/llm/gemini-nano', () => {
  beforeEach(() => {
    setLanguageModel(undefined);
    setAiLanguageModel(undefined);
  });

  afterEach(() => {
    setLanguageModel(undefined);
    setAiLanguageModel(undefined);
    vi.clearAllMocks();
  });

  describe('isGeminiNanoAvailable', () => {
    it('returns false without the browser built-in AI API [covers:get_api.absent_returns_undefined] [covers:is_available.no_api_false]', async () => {
      await expect(isGeminiNanoAvailable()).resolves.toBe(false);
    });

    it('uses window.LanguageModel before window.ai.languageModel [covers:get_api.prefers_window_language_model] [covers:is_available.status_not_unavailable_true]', async () => {
      const preferredApi = makeApi({ availability: vi.fn().mockResolvedValue('readily') });
      const fallbackApi = makeApi({ availability: vi.fn().mockResolvedValue('unavailable') });
      setLanguageModel(preferredApi);
      setAiLanguageModel(fallbackApi);

      await expect(isGeminiNanoAvailable()).resolves.toBe(true);
      expect(preferredApi.availability).toHaveBeenCalledTimes(1);
      expect(fallbackApi.availability).not.toHaveBeenCalled();
    });

    it('falls back to window.ai.languageModel [covers:get_api.falls_back_to_window_ai_language_model] [covers:is_available.status_not_unavailable_true]', async () => {
      const fallbackApi = makeApi({ availability: vi.fn().mockResolvedValue('after-download') });
      setAiLanguageModel(fallbackApi);

      await expect(isGeminiNanoAvailable()).resolves.toBe(true);
      expect(fallbackApi.availability).toHaveBeenCalledTimes(1);
    });

    it('returns false when availability is unavailable [covers:is_available.status_unavailable_false]', async () => {
      const api = makeApi({ availability: vi.fn().mockResolvedValue('unavailable') });
      setLanguageModel(api);

      await expect(isGeminiNanoAvailable()).resolves.toBe(false);
    });

    it('returns false when availability rejects [covers:is_available.availability_rejects_false]', async () => {
      const api = makeApi({ availability: vi.fn().mockRejectedValue(new Error('availability failed')) });
      setLanguageModel(api);

      await expect(isGeminiNanoAvailable()).resolves.toBe(false);
    });
  });

  describe('createNanoSession', () => {
    it('throws when the browser built-in AI API is absent [covers:create_session.no_api_throws]', async () => {
      await expect(createNanoSession('system')).rejects.toThrow('Gemini Nanoが利用できません');
    });

    it('calls create with a system initial prompt and returns the session [covers:create_session.calls_create_with_system_prompt]', async () => {
      const session = { prompt: vi.fn(), destroy: vi.fn() };
      const api = makeApi({ create: vi.fn().mockResolvedValue(session) });
      setLanguageModel(api);

      await expect(createNanoSession('system prompt')).resolves.toBe(session);
      expect(api.create).toHaveBeenCalledWith({
        initialPrompts: [{ role: 'system', content: 'system prompt' }],
      });
    });

    it('propagates create rejection [covers:create_session.create_rejects_propagates]', async () => {
      const error = new Error('create failed');
      const api = makeApi({ create: vi.fn().mockRejectedValue(error) });
      setLanguageModel(api);

      await expect(createNanoSession('system')).rejects.toBe(error);
    });
  });

  describe('promptGeminiNano', () => {
    it('prompts with the user message, returns the reply, and destroys the session [covers:prompt.create_then_prompts_user_message] [covers:prompt.destroy_after_success]', async () => {
      const session = {
        prompt: vi.fn().mockResolvedValue('reply'),
        destroy: vi.fn(),
      };
      const api = makeApi({ create: vi.fn().mockResolvedValue(session) });
      setLanguageModel(api);

      await expect(promptGeminiNano('system prompt', 'user message')).resolves.toBe('reply');
      expect(api.create).toHaveBeenCalledWith({
        initialPrompts: [{ role: 'system', content: 'system prompt' }],
      });
      expect(session.prompt).toHaveBeenCalledWith('user message');
      expect(session.destroy).toHaveBeenCalledTimes(1);
    });

    it('destroys the session and propagates prompt rejection [covers:prompt.destroy_after_prompt_reject]', async () => {
      const error = new Error('prompt failed');
      const session = {
        prompt: vi.fn().mockRejectedValue(error),
        destroy: vi.fn(),
      };
      const api = makeApi({ create: vi.fn().mockResolvedValue(session) });
      setLanguageModel(api);

      await expect(promptGeminiNano('system', 'user')).rejects.toBe(error);
      expect(session.destroy).toHaveBeenCalledTimes(1);
    });

    it('propagates createNanoSession rejection before a session exists [covers:prompt.create_session_rejects_without_destroy]', async () => {
      await expect(promptGeminiNano('system', 'user')).rejects.toThrow('Gemini Nanoが利用できません');
    });
  });
});
