import { GoogleGenAI, Type } from "@google/genai";
import type { AppConfig, AnalysisResult, BrandAnalysis, AdditionalQuestionAnswer, Provider, LlmClients, ProviderResponse, Task, Citation } from '../types';

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    'openai-websearch': 'OpenAI Web Search',
    perplexity: 'Perplexity',
};

// --- Custom Error for API Responses ---
class APIError extends Error {
    status: number;
    constructor(message: string, status: number) {
        super(message);
        this.name = 'APIError';
        this.status = status;
    }
}

// --- Retry Logic ---
const isRetryableError = (error: any): boolean => {
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
        return true; // Network error
    }
    if (error instanceof APIError) {
        // 429: Too Many Requests, 5xx: Server errors
        return error.status === 429 || (error.status >= 500 && error.status <= 504);
    }
    // For Gemini, some errors might be strings without a status code
    if (typeof error.message === 'string' && (error.message.includes('rate limit') || error.message.includes('503'))) {
        return true;
    }
    return false;
};

async function retryWithBackoff<T>(
    fn: () => Promise<T>,
    options: { retries: number; onRetry: (error: Error, attempt: number) => void }
): Promise<T> {
    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= options.retries + 1; attempt++) {
        try {
            return await fn();
        } catch (e) {
            lastError = e instanceof Error ? e : new Error(String(e));
            if (isRetryableError(e) && attempt <= options.retries) {
                options.onRetry(lastError, attempt);
                const delay = 1000 * Math.pow(2, attempt - 1); // Exponential backoff: 1s, 2s, 4s...
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                throw lastError; // Non-retryable error or max retries reached
            }
        }
    }
    throw lastError; // Should not be reached, but satisfies TypeScript
}


// --- Client Initializer ---
function initializeClients(config: AppConfig): LlmClients {
    const { providers, apiKeys } = config;
    const clients: LlmClients = {
        gemini: null,
        openai: undefined,
        perplexity: undefined,
    };
    if (providers.includes('gemini')) {
        const apiKey = apiKeys.gemini;
        if (!apiKey) throw new Error("Google Gemini API Key is missing.");
        clients.gemini = new GoogleGenAI({ apiKey });
    }
    if ((providers.includes('openai') || providers.includes('openai-websearch')) && apiKeys.openai) {
        clients.openai = apiKeys.openai;
    }
    if (providers.includes('perplexity') && apiKeys.perplexity) {
        clients.perplexity = apiKeys.perplexity;
    }
    return clients;
}


// --- Generic Fetch for OpenAI-Compatible APIs ---
async function genericAIFetch(url: string, apiKey: string, body: object, headers: Record<string, string> = {}) {
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                ...headers,
            },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            if (response.status === 401) {
                throw new APIError(`Authentication failed. Please check your API key.`, 401);
            }
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new APIError(errorData.error?.message || response.statusText, response.status);
        }
        return response.json();
    } catch (e) {
        if (e instanceof TypeError && e.message === 'Failed to fetch') {
            const hostname = new URL(url).hostname;
            throw new Error(`Network Error: Failed to connect to ${hostname}. Please check your internet connection and any firewalls or browser extensions (like ad-blockers) that might be blocking the request.`);
        }
        throw e; // Re-throw other errors
    }
}

async function genericAIFetchGet(url: string, apiKey: string) {
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
            },
        });
        if (!response.ok) {
            if (response.status === 401) {
                throw new APIError(`Authentication failed. Please check your API key.`, 401);
            }
            const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
            throw new APIError(errorData.error?.message || response.statusText, response.status);
        }
        return response.json();
    } catch (e) {
        if (e instanceof TypeError && e.message === 'Failed to fetch') {
            const hostname = new URL(url).hostname;
            throw new Error(`Network Error: Failed to connect to ${hostname}. Please check your internet connection and any firewalls or browser extensions (like ad-blockers) that might be blocking the request.`);
        }
        throw e;
    }
}


// --- Analysis Logic per Provider ---

// GEMINI
const analysisSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { brandName: { type: Type.STRING }, mentions: { type: Type.INTEGER }, sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative', 'Not Mentioned'] } }, required: ['brandName', 'mentions', 'sentiment'] } };
async function runGeminiAnalysisForPrompt(prompt: string, config: AppConfig, client: GoogleGenAI, model: string): Promise<ProviderResponse> {
    const { clientName, competitors, additionalQuestions, broadMatch } = config;
    const allBrands = [clientName, ...competitors];
    const allRawResponses: any[] = [];
    
    // Tokens for "other" calls (initial prompt, questions)
    let otherInputTokens = 0, otherOutputTokens = 0;
    // Tokens for the analysis call specifically
    let analysisInputTokens = 0, analysisOutputTokens = 0;

    try {
        // 1. Get raw response
        const rawResult = await client.models.generateContent({ model, contents: prompt });
        allRawResponses.push({ type: 'initial_prompt', data: rawResult });
        if (rawResult.usageMetadata) {
            otherInputTokens += rawResult.usageMetadata.promptTokenCount || 0;
            otherOutputTokens += (rawResult.usageMetadata.candidatesTokenCount || 0) + (rawResult.usageMetadata.thoughtsTokenCount || 0);
        }
        const response = rawResult.text;

        // 2. Analyze response
        let analysisPrompt: string;
        if (broadMatch) {
            analysisPrompt = `Analyze the following text with special instructions for brand matching. The primary client brand is "${clientName}". For this brand ONLY, perform a **broad match** search, counting all mentions that contain the brand name (e.g., "The Social Hub" for "Social Hub"). For all other brands, including the competitors [${competitors.join(', ')}], use **exact matching**. Additionally, identify and analyze **any other brands** mentioned in the text. For every brand found, determine the sentiment ('Positive', 'Neutral', 'Negative'). Your JSON response must include an entry for "${clientName}" and for **every competitor** from the list, even if they are not mentioned (in which case, report them as 'Not Mentioned' with 0 mentions). Text: --- ${response} ---`;
        } else {
            analysisPrompt = `Analyze the following text for brand mentions. Your task is twofold: 1. For the predefined list of brands [${allBrands.join(', ')}], use **exact, case-insensitive matching** to count their mentions and determine their sentiment ('Positive', 'Neutral', 'Negative'). You MUST include an entry for every brand in this list, reporting them as 'Not Mentioned' with 0 mentions if absent. 2. Identify and analyze **any other brands** mentioned in the text that are not on the predefined list. Text: --- ${response} ---`;
        }
        
        const analysisResult = await client.models.generateContent({ model, contents: analysisPrompt, config: { responseMimeType: "application/json", responseSchema: analysisSchema } });
        allRawResponses.push({ type: 'brand_analysis', data: analysisResult });
        if (analysisResult.usageMetadata) {
            analysisInputTokens += analysisResult.usageMetadata.promptTokenCount || 0;
            analysisOutputTokens += (analysisResult.usageMetadata.candidatesTokenCount || 0) + (analysisResult.usageMetadata.thoughtsTokenCount || 0);
        }
        const brandAnalyses: BrandAnalysis[] = JSON.parse(analysisResult.text);

        // 3. Answer additional questions
        const additionalAnswers: AdditionalQuestionAnswer[] = await Promise.all(
            additionalQuestions.map(async (question) => {
                const qPrompt = `Based ONLY on the text provided below, answer the question: "${question}". If the information is not in the text, state that. Text: --- ${response} ---`;
                const answerResult = await client.models.generateContent({ model, contents: qPrompt });
                allRawResponses.push({ type: 'additional_question', question, data: answerResult });
                if (answerResult.usageMetadata) {
                    otherInputTokens += answerResult.usageMetadata.promptTokenCount || 0;
                    otherOutputTokens += (answerResult.usageMetadata.candidatesTokenCount || 0) + (answerResult.usageMetadata.thoughtsTokenCount || 0);
                }
                return { question, answer: answerResult.text };
            })
        );
        
        const rawResponse = JSON.stringify(allRawResponses, null, 2);
        const tokenUsage = { inputTokens: otherInputTokens, outputTokens: otherOutputTokens };
        const analysisTokenUsage = { inputTokens: analysisInputTokens, outputTokens: analysisOutputTokens };
        
        return { provider: 'gemini', response, brandAnalyses, additionalAnswers, rawResponse, tokenUsage, analysisTokenUsage };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown Gemini error occurred.';
        console.error("Gemini Analysis Error:", e);
        if (error.includes('API key not valid')) {
             throw new Error('Authentication failed. Please check if the Google Gemini API key is correct and valid.');
        }
        // Rethrow to be caught by retry logic
        throw e;
    }
}

// OPENAI
async function runOpenAIAnalysisForPrompt(prompt: string, config: AppConfig, apiKey: string, model: string): Promise<ProviderResponse> {
    const { clientName, competitors, additionalQuestions, broadMatch } = config;
    const allBrands = [clientName, ...competitors];
    const allRawResponses: any[] = [];
    
    let otherInputTokens = 0, otherOutputTokens = 0;
    let analysisInputTokens = 0, analysisOutputTokens = 0;

     try {
        // 1. Get raw response
        const rawData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, { model, messages: [{ role: 'user', content: prompt }] });
        allRawResponses.push({ type: 'initial_prompt', data: rawData });
        if (rawData.usage) {
            otherInputTokens += rawData.usage.prompt_tokens || 0;
            otherOutputTokens += rawData.usage.completion_tokens || 0;
        }
        const response = rawData.choices[0].message.content;

        // 2. Analyze response
        let analysisPrompt: string;
        if (broadMatch) {
            analysisPrompt = `Analyze the following text with special instructions for brand matching. The primary client brand is "${clientName}". For this brand ONLY, perform a **broad match** search, counting all mentions that contain its name. For all other brands, including the competitors [${competitors.join(', ')}], use **exact matching**. Also, identify and analyze any **other brands** mentioned. For every brand, determine sentiment ('Positive', 'Neutral', 'Negative'). Your JSON response must be a single JSON object with one key, "brands", containing an array. This array must include an object for "${clientName}" and for **every competitor** from the list (reporting them as 'Not Mentioned' with 0 mentions if absent), plus any other discovered brands. Each object needs keys "brandName", "mentions", and "sentiment". Text: --- ${response} ---`;
        } else {
            analysisPrompt = `Analyze the following text to identify all brand names. For brands from the predefined list [${allBrands.join(', ')}], use **exact, case-insensitive matching**. For any other brands you find, also analyze them. For every brand, count its mentions and determine the sentiment ('Positive', 'Neutral', 'Negative'). Respond with a single JSON object with one key, "brands", which is an array of objects. This array must include an object for **every brand** from the predefined list (reporting them as 'Not Mentioned' with 0 mentions if absent), plus any other brands you discovered. Each object needs the keys "brandName", "mentions", and "sentiment". Text: --- ${response} ---`;
        }

        const analysisData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, { model, messages: [{ role: 'user', content: analysisPrompt }], response_format: { type: "json_object" } });
        allRawResponses.push({ type: 'brand_analysis', data: analysisData });
        if (analysisData.usage) {
            analysisInputTokens += analysisData.usage.prompt_tokens || 0;
            analysisOutputTokens += analysisData.usage.completion_tokens || 0;
        }
        const brandAnalyses: BrandAnalysis[] = JSON.parse(analysisData.choices[0].message.content).brands || [];

        // 3. Answer additional questions
        const additionalAnswers: AdditionalQuestionAnswer[] = await Promise.all(
            additionalQuestions.map(async (question) => {
                const qPrompt = `Based ONLY on the text provided below, answer the question: "${question}". If the information is not in the text, state that. Text: --- ${response} ---`;
                const answerData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, { model, messages: [{ role: 'user', content: qPrompt }] });
                allRawResponses.push({ type: 'additional_question', question, data: answerData });
                if (answerData.usage) {
                    otherInputTokens += answerData.usage.prompt_tokens || 0;
                    otherOutputTokens += answerData.usage.completion_tokens || 0;
                }
                return { question, answer: answerData.choices[0].message.content };
            })
        );
        
        const rawResponse = JSON.stringify(allRawResponses, null, 2);
        const tokenUsage = { inputTokens: otherInputTokens, outputTokens: otherOutputTokens };
        const analysisTokenUsage = { inputTokens: analysisInputTokens, outputTokens: analysisOutputTokens };

        return { provider: 'openai', response, brandAnalyses, additionalAnswers, rawResponse, tokenUsage, analysisTokenUsage };
    } catch (e) {
        console.error("OpenAI Analysis Error:", e);
        // Rethrow to be caught by retry logic
        throw e;
    }
}

// OPENAI WEB SEARCH
async function runOpenAIWebSearchAnalysisForPrompt(prompt: string, config: AppConfig, apiKey: string, model: string): Promise<ProviderResponse> {
    const { clientName, competitors, additionalQuestions, broadMatch } = config;
    const allBrands = [clientName, ...competitors];
    const allRawResponses: any[] = [];
    
    let otherInputTokens = 0, otherOutputTokens = 0;
    let analysisInputTokens = 0, analysisOutputTokens = 0;

    try {
        // STEP 1: Get the web-searched response using the Chat Completions endpoint.
        const searchApiBody = {
            model: model,
            messages: [{ role: 'user', content: prompt }],
        };
        const rawData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, searchApiBody);
        allRawResponses.push({ type: 'initial_web_search', data: rawData });
        if (rawData.usage) {
            otherInputTokens += rawData.usage.prompt_tokens || 0;
            otherOutputTokens += rawData.usage.completion_tokens || 0;
        }
        
        const mainResponseMessage = rawData.choices?.[0]?.message;
        if (!mainResponseMessage) {
            throw new Error("Invalid response structure from OpenAI Chat Completions API.");
        }
        
        // STEP 2: Parse text and citations from the response.
        const citations: Citation[] = [];
        let responseText = '';
        let citationIndex = 1;

        if (typeof mainResponseMessage.content === 'string') {
            responseText = mainResponseMessage.content;
        }

        if (Array.isArray(mainResponseMessage.annotations)) {
            for (const annotation of mainResponseMessage.annotations) {
                if (annotation?.type === 'url_citation' && annotation.url_citation?.url) {
                    citations.push({
                        index: citationIndex++,
                        url: annotation.url_citation.url,
                        title: annotation.url_citation.title,
                    });
                }
            }
        }
        
        if (!responseText.trim()) {
            responseText = 'No text summary provided by the model.';
        }


        // STEP 3: Analyze the retrieved text for brand mentions and sentiment.
        let analysisPrompt: string;
        if (broadMatch) {
            analysisPrompt = `Analyze the following text with special instructions for brand matching. The primary client brand is "${clientName}". For this brand ONLY, perform a **broad match** search, counting all mentions that contain its name. For all other brands, including the competitors [${competitors.join(', ')}], use **exact matching**. Also, identify and analyze any **other brands** mentioned. For every brand, determine sentiment ('Positive', 'Neutral', 'Negative'). Your JSON response must be a single JSON object with one key, "brands", containing an array. This array must include an object for "${clientName}" and for **every competitor** from the list (reporting them as 'Not Mentioned' with 0 mentions if absent), plus any other discovered brands. Each object needs keys "brandName", "mentions", and "sentiment". Text: --- ${responseText} ---`;
        } else {
            analysisPrompt = `Analyze the following text to identify all brand names. For brands from the predefined list [${allBrands.join(', ')}], use **exact, case-insensitive matching**. For any other brands you find, also analyze them. For every brand, count its mentions and determine the sentiment ('Positive', 'Neutral', 'Negative'). Respond with a single JSON object with one key, "brands", which is an array of objects. This array must include an object for **every brand** from the predefined list (reporting them as 'Not Mentioned' with 0 mentions if absent), plus any other brands you discovered. Each object needs the keys "brandName", "mentions", and "sentiment". Text: --- ${responseText} ---`;
        }
        const analysisModel = 'gpt-4o-mini'; 
        const analysisData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, {
            model: analysisModel, 
            messages: [{ role: 'user', content: analysisPrompt }],
            response_format: { type: "json_object" },
        });
        allRawResponses.push({ type: 'brand_analysis', data: analysisData });
        if (analysisData.usage) {
            analysisInputTokens += analysisData.usage.prompt_tokens || 0;
            analysisOutputTokens += analysisData.usage.completion_tokens || 0;
        }
        const analysisContent = analysisData.choices?.[0]?.message?.content;
        const brandAnalyses: BrandAnalysis[] = analysisContent ? JSON.parse(analysisContent).brands || [] : [];

        // STEP 4: Answer any additional questions based on the retrieved text.
        const additionalAnswers: AdditionalQuestionAnswer[] = await Promise.all(
            additionalQuestions.map(async (question) => {
                const qPrompt = `Based ONLY on the text provided below, answer the question: "${question}". If the information is not in the text, state that. Text: --- ${responseText} ---`;
                const answerData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, {
                    model: analysisModel,
                    messages: [{ role: 'user', content: qPrompt }],
                });
                allRawResponses.push({ type: 'additional_question', question, data: answerData });
                if (answerData.usage) {
                    otherInputTokens += answerData.usage.prompt_tokens || 0;
                    otherOutputTokens += answerData.usage.completion_tokens || 0;
                }
                const answerText = answerData.choices?.[0]?.message?.content || "Could not generate an answer.";
                return { question, answer: answerText };
            })
        );
        
        const rawResponse = JSON.stringify(allRawResponses, null, 2);
        const tokenUsage = { inputTokens: otherInputTokens, outputTokens: otherOutputTokens };
        const analysisTokenUsage = { inputTokens: analysisInputTokens, outputTokens: analysisOutputTokens };

        return {
            provider: 'openai-websearch',
            response: responseText,
            brandAnalyses,
            additionalAnswers,
            rawResponse,
            citations,
            tokenUsage,
            analysisTokenUsage,
        };

    } catch (e) {
        console.error("OpenAI Web Search Analysis Error:", e);
        throw e;
    }
}


// PERPLEXITY
async function runPerplexityAnalysisForPrompt(prompt: string, config: AppConfig, apiKey: string, model: string): Promise<ProviderResponse> {
    const { clientName, competitors, additionalQuestions, broadMatch } = config;
    const allBrands = [clientName, ...competitors];
    const allRawResponses: any[] = [];
    
    let otherInputTokens = 0, otherOutputTokens = 0;
    let analysisInputTokens = 0, analysisOutputTokens = 0;

     try {
        const rawData = await genericAIFetch('https://api.perplexity.ai/chat/completions', apiKey, { model, messages: [{ role: 'user', content: prompt }] });
        allRawResponses.push({ type: 'initial_prompt', data: rawData });
        if (rawData.usage) {
            otherInputTokens += rawData.usage.prompt_tokens || 0;
            otherOutputTokens += rawData.usage.completion_tokens || 0;
        }
        const pResponse = rawData.choices[0].message.content;
        
        // --- Updated Citation Parsing for Perplexity ---
        const citations: Citation[] = [];
        const foundUrls = new Set<string>();
        let citationIndex = 1;

        if (rawData.citations && Array.isArray(rawData.citations)) {
            rawData.citations.forEach((url: string) => {
                if (typeof url === 'string' && !foundUrls.has(url)) {
                    foundUrls.add(url);
                    citations.push({ index: citationIndex++, url, title: '' });
                }
            });
        }

        if (rawData.search_results && Array.isArray(rawData.search_results)) {
            rawData.search_results.forEach((result: any) => {
                if (result && typeof result.url === 'string' && !foundUrls.has(result.url)) {
                    foundUrls.add(result.url);
                    citations.push({ index: citationIndex++, url: result.url, title: result.title || '' });
                }
            });
        }

        let analysisPrompt: string;
        if (broadMatch) {
            analysisPrompt = `Analyze the following text with special instructions. The primary client brand is "${clientName}". For this brand ONLY, perform a **broad match** search, counting all mentions containing its name. For all other brands, including competitors [${competitors.join(', ')}], use **exact matching**. Also, identify and analyze any **other brands** mentioned. For every brand, determine sentiment ('Positive', 'Neutral', 'Negative'). Respond with a valid JSON object inside a \`\`\`json code block. The JSON object must have one key, "brands", which is an array. This array must include an object for "${clientName}" and for **every competitor** from the list (reporting them as 'Not Mentioned' with 0 mentions if absent), plus any other discovered brands. Each object needs "brandName", "mentions", and "sentiment". Text: --- ${pResponse} ---`;
        } else {
            analysisPrompt = `Analyze the following text to identify all brand names. For brands from the predefined list [${allBrands.join(', ')}], use **exact, case-insensitive matching**. For any other brands you find, also analyze them. For every brand, count its mentions and determine the sentiment ('Positive', 'Neutral', 'Negative'). Respond with a valid JSON object inside a \`\`\`json code block. The JSON object must have one key, "brands", which is an array of objects. This array must include an object for **every brand** from the predefined list (reporting them as 'Not Mentioned' with 0 mentions if absent), plus any other brands you discovered. Each object needs the keys "brandName", "mentions", and "sentiment". Text: --- ${pResponse} ---`;
        }
        
        const analysisData = await genericAIFetch('https://api.perplexity.ai/chat/completions', apiKey, { model, messages: [{ role: 'user', content: analysisPrompt }]});
        allRawResponses.push({ type: 'brand_analysis', data: analysisData });
        if (analysisData.usage) {
            analysisInputTokens += analysisData.usage.prompt_tokens || 0;
            analysisOutputTokens += analysisData.usage.completion_tokens || 0;
        }
        
        const jsonMatch = analysisData.choices[0].message.content.match(/```json\n([\s\S]*?)\n```/);
        const brandAnalyses: BrandAnalysis[] = jsonMatch ? JSON.parse(jsonMatch[1]).brands : [];

        const additionalAnswers: AdditionalQuestionAnswer[] = await Promise.all(
            additionalQuestions.map(async (question) => {
                const qPrompt = `Based ONLY on the text provided below, answer the question: "${question}". If the information is not in the text, state that. Text: --- ${pResponse} ---`;
                const answerData = await genericAIFetch('https://api.perplexity.ai/chat/completions', apiKey, { model, messages: [{ role: 'user', content: qPrompt }] });
                allRawResponses.push({ type: 'additional_question', question, data: answerData });
                if (answerData.usage) {
                    otherInputTokens += answerData.usage.prompt_tokens || 0;
                    otherOutputTokens += answerData.usage.completion_tokens || 0;
                }
                return { question, answer: answerData.choices[0].message.content };
            })
        );

        const rawResponse = JSON.stringify(allRawResponses, null, 2);
        const tokenUsage = { inputTokens: otherInputTokens, outputTokens: otherOutputTokens };
        const analysisTokenUsage = { inputTokens: analysisInputTokens, outputTokens: analysisOutputTokens };
        
        return { provider: 'perplexity', response: pResponse, brandAnalyses, additionalAnswers, rawResponse, citations, tokenUsage, analysisTokenUsage };

    } catch (e) {
        console.error("Perplexity Analysis Error:", e);
        // Rethrow to be caught by retry logic
        throw e;
    }
}

// --- Main Exported Function ---
export async function runAnalysis(config: AppConfig, onProgress: (tasks: Task[]) => void): Promise<AnalysisResult[]> {
    const clients = initializeClients(config);

    const tasks: Task[] = [];
    config.prompts.forEach((prompt, pIndex) => {
      config.providers.forEach((provider) => {
        const modelName = config.models[provider] || 'default';
        const shortPrompt = prompt.length > 40 ? prompt.substring(0, 40) + '...' : prompt;
        tasks.push({
          id: `prompt-${pIndex}-${provider}`,
          description: `Analyzing "${shortPrompt}" with ${providerBaseNames[provider]} (${modelName})`,
          status: 'pending',
        });
      });
    });
    onProgress([...tasks]);

    const updateTaskStatus = (taskId: string, status: Task['status'], error?: string, retries?: number) => {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          tasks[taskIndex].status = status;
          if (error) tasks[taskIndex].error = error;
          if (retries !== undefined) tasks[taskIndex].retries = retries;
          onProgress([...tasks]);
        }
    };

    const resultsByPrompt: AnalysisResult[] = [];

    for (const [pIndex, prompt] of config.prompts.entries()) {
        const providerPromises = config.providers.map(async (provider) => {
            const taskId = `prompt-${pIndex}-${provider}`;
            updateTaskStatus(taskId, 'in_progress');

            let providerFunction: () => Promise<ProviderResponse>;

            switch(provider) {
                case 'gemini':
                    if (!clients.gemini || !config.models.gemini) throw new Error('Gemini client not initialized properly.');
                    providerFunction = () => runGeminiAnalysisForPrompt(prompt, config, clients.gemini!, config.models.gemini!);
                    break;
                case 'openai':
                    if (!clients.openai || !config.models.openai) throw new Error('OpenAI client not initialized properly.');
                    providerFunction = () => runOpenAIAnalysisForPrompt(prompt, config, clients.openai!, config.models.openai!);
                    break;
                case 'openai-websearch':
                    if (!clients.openai || !config.models['openai-websearch']) throw new Error('OpenAI Web Search client not initialized properly.');
                    providerFunction = () => runOpenAIWebSearchAnalysisForPrompt(prompt, config, clients.openai!, config.models['openai-websearch']!);
                    break;
                case 'perplexity':
                    if (!clients.perplexity || !config.models.perplexity) throw new Error('Perplexity client not initialized properly.');
                    providerFunction = () => runPerplexityAnalysisForPrompt(prompt, config, clients.perplexity!, config.models.perplexity!);
                    break;
                default:
                    const exhaustiveCheck: never = provider;
                    throw new Error(`Unhandled provider: ${exhaustiveCheck}`);
            }

            try {
                 const response = await retryWithBackoff(providerFunction, {
                    retries: 2,
                    onRetry: (error, attempt) => {
                        console.warn(`Attempt ${attempt} failed for task ${taskId}. Retrying...`, error);
                        updateTaskStatus(taskId, 'in_progress', undefined, attempt);
                    }
                });

                if (response.error) {
                    updateTaskStatus(taskId, 'error', response.error);
                } else {
                    updateTaskStatus(taskId, 'completed');
                }
                return response;
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
                updateTaskStatus(taskId, 'error', errorMsg);
                // For debugging, serialize the error object itself in the raw response.
                const rawErrorResponse = JSON.stringify(e, Object.getOwnPropertyNames(e), 2);
                return { provider, response: '', brandAnalyses: [], additionalAnswers: [], error: errorMsg, rawResponse: rawErrorResponse };
            }
        });

        const providerResponses = await Promise.all(providerPromises);
        resultsByPrompt.push({ prompt, providerResponses });
    }

    return resultsByPrompt;
}

// --- API Key Verification ---

const handleVerificationError = (e: unknown, provider: string): { isValid: false, error: string } => {
    let errorMessage = `An unknown error occurred while verifying the ${provider} key.`;
    if (e instanceof Error) {
        errorMessage = e.message;
        if (errorMessage.includes('API key not valid') || (e as APIError).status === 401) {
            errorMessage = 'Authentication failed. The API key is invalid or has been revoked.';
        } else if (errorMessage.includes('Network Error')) {
            errorMessage = `Could not connect to ${provider}'s servers. Please check your network connection.`;
        }
    }
    return { isValid: false, error: errorMessage };
};

export async function verifyGeminiApiKey(apiKey: string): Promise<{ isValid: boolean, error?: string }> {
    try {
        const ai = new GoogleGenAI({ apiKey });
        // Use a very simple, low-cost call to check for authentication
// FIX: Updated model from prohibited 'gemini-1.5-flash' to 'gemini-2.5-flash'.
        await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: 'Hi' });
        return { isValid: true };
    } catch (e) {
        return handleVerificationError(e, 'Google Gemini');
    }
}

export async function verifyOpenAIApiKey(apiKey: string): Promise<{ isValid: boolean, error?: string }> {
    try {
        // Listing models is a standard, low-cost way to validate a key
        await genericAIFetchGet('https://api.openai.com/v1/models', apiKey);
        return { isValid: true };
    } catch (e) {
        return handleVerificationError(e, 'OpenAI');
    }
}

export async function verifyPerplexityApiKey(apiKey: string): Promise<{ isValid: boolean, error?: string }> {
    try {
        // A minimal chat completion request to validate the key
        await genericAIFetch('https://api.perplexity.ai/chat/completions', apiKey, {
            model: 'sonar',
            messages: [{ role: 'user', content: 'Hi' }],
            max_tokens: 1
        });
        return { isValid: true };
    } catch (e) {
        return handleVerificationError(e, 'Perplexity');
    }
}