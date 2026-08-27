function getLanguageModelApi(): LanguageModelConstructor | undefined {
  return window.LanguageModel ?? window.ai?.languageModel;
}

export async function isGeminiNanoAvailable(): Promise<boolean> {
  const api = getLanguageModelApi();
  if (!api) return false;
  try {
    const status = await api.availability();
    return status !== 'unavailable';
  } catch {
    return false;
  }
}

export async function promptGeminiNano(systemPrompt: string, userMessage: string): Promise<string> {
  const session = await createNanoSession(systemPrompt);
  try {
    return await session.prompt(userMessage);
  } finally {
    session.destroy();
  }
}

export async function createNanoSession(systemPrompt: string) {
  const api = getLanguageModelApi();
  if (!api) throw new Error('Gemini Nanoが利用できません');
  return await api.create({
    initialPrompts: [{ role: 'system', content: systemPrompt }],
  });
}
