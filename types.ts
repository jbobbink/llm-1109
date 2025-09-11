import type { GoogleGenAI } from "@google/genai";

export type Provider = 'gemini' | 'openai' | 'perplexity' | 'copilot';

export interface ApiKeys {
  gemini?: string;
  openai?: string;
  perplexity?: string;
  copilotKey?: string;
  copilotEndpoint?: string;
}

export interface AppConfig {
  providers: Provider[];
  apiKeys: ApiKeys;
  models: Partial<Record<Provider, string>>;
  clientName: string;
  competitors: string[];
  prompts: string[];
  additionalQuestions: string[];
}

export interface BrandAnalysis {
  brandName: string;
  mentions: number;
  sentiment: 'Positive' | 'Neutral' | 'Negative' | 'Not Mentioned';
}

export interface AdditionalQuestionAnswer {
  question: string;
  answer: string;
}

export interface ProviderResponse {
    provider: Provider;
    response: string;
    brandAnalyses: BrandAnalysis[];
    additionalAnswers: AdditionalQuestionAnswer[];
    error?: string;
}

export interface AnalysisResult {
  prompt: string;
  providerResponses: ProviderResponse[];
}

export interface SentimentData {
  name: string;
  [key: string]: number | string; // e.g., Positive-gemini: 5
}

// Add a new interface for the analysis service clients
export interface LlmClients {
    gemini: GoogleGenAI | null;
    openai: string | undefined;
    perplexity: string | undefined;
    copilot: { key: string; endpoint: string } | undefined;
}

export interface SavedReport {
  id: string;
  createdAt: string;
  clientName: string;
  htmlContent: string;
  shareableLink?: string;
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  error?: string;
}