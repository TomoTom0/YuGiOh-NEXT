interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface AiChatResponse {
  success: boolean;
  content?: string;
  error?: string;
}

export async function promptZai(
  systemPrompt: string,
  userMessage: string,
): Promise<string> {
  return promptZaiMulti(systemPrompt, [{ role: 'user', content: userMessage }]);
}

export async function promptZaiMulti(
  systemPrompt: string,
  conversation: ChatMessage[],
): Promise<string> {
  const response = await new Promise<AiChatResponse>((resolve, reject) => {
    chrome.runtime.sendMessage(
      { type: 'AI_CHAT', systemPrompt, conversation },
      (res: AiChatResponse) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Z.ai API エラー: ${chrome.runtime.lastError.message}`));
          return;
        }
        resolve(res);
      },
    );
  });

  if (!response.success || !response.content) {
    throw new Error(response.error ?? 'Z.ai APIから空の応答が返りました');
  }
  return response.content;
}
