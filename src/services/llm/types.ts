import type { CardInfo } from '@/types/card';

export interface CardResolution {
  cardId: string;
  ciid: string;
  name: string;
  isAmbiguous: boolean;
  alternatives?: Array<{ cardId: string; ciid: string; name: string }>;
}

export interface ToolCall {
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  success: boolean;
  data?: unknown;
  error?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'tool';
  content: string;
  timestamp: number;
  toolName?: string;
  toolSuccess?: boolean;
  toolArgs?: Record<string, unknown>;
  toolResultData?: unknown;
}

export interface DeckSections {
  main: CardInfo[];
  extra: CardInfo[];
  side: CardInfo[];
  trash: CardInfo[];
  searchResults: CardInfo[];
}

export interface LlmRequest {
  userMessage: string;
  deckSections: DeckSections;
  focusedCard?: CardInfo;
  history: ChatMessage[];
}

export interface LlmResponse {
  message: string;
  toolCalls?: ToolCall[];
  needsClarification: boolean;
}

export type Section = 'main' | 'extra' | 'side' | 'trash';
