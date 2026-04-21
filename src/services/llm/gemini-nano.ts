export async function isGeminiNanoAvailable(): Promise<boolean> {
  if (!window.LanguageModel) return false;
  try {
    const status = await window.LanguageModel.availability();
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
  if (!window.LanguageModel) throw new Error('Gemini Nanoが利用できません');
  return await window.LanguageModel.create({
    initialPrompts: [{ role: 'system', content: systemPrompt }],
  });
}
