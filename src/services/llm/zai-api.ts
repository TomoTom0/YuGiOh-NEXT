const ZAI_ENDPOINT = 'https://api.z.ai/api/coding/paas/v4';

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

  const response = await fetch(`${ZAI_ENDPOINT}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      messages,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Z.ai API エラー: ${response.status} ${text}`);
  }

  const data = await response.json() as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Z.ai APIから空の応答が返りました');
  return content;
}
