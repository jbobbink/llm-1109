import type { GoogleGenAI } from "@google/genai";

export type Provider = 'gemini' | 'openai' | 'perplexity' | 'openai-websearch';

export type VerificationStatus = 'idle' | 'verifying' | 'valid' | 'invalid';

export interface ApiKeys {
  gemini?: string;
  openai?: string;
  perplexity?: string;
  supabaseUrl?: string;
  supabaseKey?: string;
}

export interface AppConfig {
  providers: Provider[];
  apiKeys: ApiKeys;
  models: Partial<Record<Provider, string>>;
  clientName: string;
  description?: string;
  competitors: string[];
  prompts: string[];
  additionalQuestions: string[];
  broadMatch?: boolean;
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

export interface Citation {
  index: number;
  url: string;
  title?: string;
}

export interface ProviderResponse {
    provider: Provider;
    response: string;
    brandAnalyses: BrandAnalysis[];
    additionalAnswers: AdditionalQuestionAnswer[];
    rawResponse?: string;
    error?: string;
    citations?: Citation[];
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
    };
    analysisTokenUsage?: {
      inputTokens: number;
      outputTokens: number;
    };
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
}

export interface SavedReport {
  id: string;
  createdAt: string;
  clientName: string;
  htmlContent: string;
  promptCount?: number;
}

export interface Task {
  id: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  error?: string;
  retries?: number;
}

export interface StoredConfiguration {
  id: string;
  name: string;
  clientName: string;
  description?: string;
  competitors: string;
  prompts: string;
  additionalQuestions: string;
  selectedProviders: Provider[];
  apiKeys: ApiKeys;
  models: Partial<Record<Provider, string>>;
  broadMatch?: boolean;
}

// --- Project Mode Types ---
export interface RunSummary {
  clientMentions: number;
  sentimentCounts: {
    positive: number;
    neutral: number;
    negative: number;
  };
}

export interface ProjectRun {
  id: string;
  projectId: string;
  createdAt: string;
  results: AnalysisResult[];
  summary: RunSummary;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  config: AppConfig;
}