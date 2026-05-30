interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function promptZai(
  systemPrompt: string,
  userMessage: string,
  apiKey: string
): Promise<string> {
  return promptZaiMulti(systemPrompt, [{ role: 'user', content: userMessage }], apiKey);
}

export async function promptZaiMulti(
  systemPrompt: string,
  conversation: ChatMessage[],
  apiKey: string
): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    ...conversation,
  ];

  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'AI_CHAT',
        messages,
        apiKey,
      },
      (response) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else if (response && response.success) {
          resolve(response.content);
        } else {
          reject(new Error(response?.error || 'Unknown error from background script'));
        }
      }
    );
  });
}
