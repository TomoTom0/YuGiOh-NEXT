import type { LlmRequest, LlmResponse, ToolCall, ToolResult } from './types';
import { buildSystemPrompt } from './context-builder';
import { isGeminiNanoAvailable, promptGeminiNano } from './gemini-nano';
import { promptZaiMulti } from './zai-api';
import { executeTool, recordToolCall } from './tool-executor';
import type { StoreRefs } from './tool-executor';
import { runNanoPipeline } from './nano-pipeline';

export interface ToolCallInfo {
  name: string;
  args: Record<string, unknown>;
  result: ToolResult;
  nanoReasoning?: string;
}

export class ChatAbortError extends Error {
  constructor() { super('Chat aborted'); }
}

function parseToolCall(response: string): ToolCall | null {
  let text = response.trim();
  const codeBlockMatch = text.match(/```(?:tool|json)?\s*\n?([\s\S]*?)```/);
  if (codeBlockMatch) {
    text = codeBlockMatch[1].trim();
  }
  if (!text.startsWith('{')) return null;
  try {
    const parsed = JSON.parse(text) as { tool?: string; args?: Record<string, unknown> };
    if (parsed.tool && parsed.args !== undefined) {
      return { name: parsed.tool, arguments: parsed.args };
    }
  } catch {
    // not JSON
  }
  return null;
}

const ROUTING_PROMPT = `ユーザーのメッセージを分析してください。
単純な質問（カード基本情報・枚数確認・単純なデッキ操作）なら "NANO"、
複雑な質問（展開ルート・シナジー分析・構築アドバイス）なら "CLOUD" とだけ返してください。`;

const MAX_TOOL_ITERATIONS = 5;

export async function chat(
  request: LlmRequest,
  apiKey: string,
  storeRefs: StoreRefs,
  onToolCall?: (info: ToolCallInfo) => void,
  signal?: AbortSignal
): Promise<LlmResponse> {
  const systemPrompt = buildSystemPrompt(request.deckSections, request.focusedCard);
  const nanoAvailable = await isGeminiNanoAvailable();

  // ルーティング判断
  if (signal?.aborted) throw new ChatAbortError();
  let useCloud = false;
  if (nanoAvailable) {
    try {
      const routing = await promptGeminiNano(ROUTING_PROMPT, request.userMessage);
      useCloud = routing.trim().toUpperCase().includes('CLOUD');
      // CLOUD判定でもAPIキーが無効ならNanoにフォールバック
      if (useCloud && !apiKey) useCloud = false;
    } catch {
      useCloud = !!apiKey;
    }
  } else {
    useCloud = !!apiKey;
  }

  if (!useCloud && !nanoAvailable) {
    return {
      message: 'Gemini NanoもZ.ai APIキーも利用できません。設定からAPIキーを入力するか、ChromeのAI機能を有効にしてください。',
      needsClarification: false,
    };
  }

  // Gemini Nano: 多段階パイプライン（指示parse → 情報取得 → 処理構成 → tool構成 → 実行 → 報告）
  if (!useCloud && nanoAvailable) {
    try {
      const message = await runNanoPipeline(request.userMessage, request.history, storeRefs, onToolCall, signal);
      return { message, needsClarification: false };
    } catch (err) {
      if (err instanceof Error && err.message === 'aborted') throw new ChatAbortError();
      throw err;
    }
  }

  // Cloud (Z.ai): 多ターン対話でツール実行ループ
  console.debug('[LLM Chat] systemPrompt:', systemPrompt);
  console.debug('[LLM Chat] userMessage:', request.userMessage);

  const zaiConversation: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // 過去の会話履歴を引き継ぎ
  for (const msg of request.history) {
    if (msg.role === 'user') {
      zaiConversation.push({ role: 'user', content: msg.content });
    } else if (msg.role === 'assistant') {
      zaiConversation.push({ role: 'assistant', content: msg.content });
    } else if (msg.role === 'tool') {
      const status = msg.toolSuccess ? 'OK' : 'NG';
      const detail = msg.toolResultData
        ? JSON.stringify(msg.toolResultData)
        : msg.content;
      zaiConversation.push({ role: 'user', content: `[ツール ${msg.toolName} ${status}] ${detail}` });
    }
  }

  let rawResponse = await promptZaiMulti(systemPrompt, [
    ...zaiConversation,
    { role: 'user', content: request.userMessage },
  ]);

  const allToolCalls: ToolCall[] = [];

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    if (signal?.aborted) throw new ChatAbortError();
    const toolCall = parseToolCall(rawResponse);
    if (!toolCall) break;

    console.debug('[LLM Chat] toolCall:', toolCall.name, toolCall.arguments);
    const toolResult = await executeTool(toolCall, storeRefs);
    console.debug('[LLM Chat] toolResult:', toolResult);
    allToolCalls.push(toolCall);
    recordToolCall(toolCall.name, toolCall.arguments, toolResult.data);

    onToolCall?.({ name: toolCall.name, args: toolCall.arguments, result: toolResult });

    const resultText = toolResult.success
      ? `ツール ${toolCall.name} の実行結果: ${JSON.stringify(toolResult.data ?? '成功')}`
      : `ツール ${toolCall.name} のエラー: ${toolResult.error}`;

    zaiConversation.push({ role: 'assistant', content: rawResponse });
    zaiConversation.push({ role: 'user', content: resultText });
    rawResponse = await promptZaiMulti(systemPrompt, zaiConversation);
  }

  return {
    message: rawResponse,
    toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
    needsClarification: rawResponse.includes('？') || rawResponse.includes('?'),
  };
}
