import { GoogleGenAI, Type } from "@google/genai";
import type { AppConfig, AnalysisResult, BrandAnalysis, AdditionalQuestionAnswer, Provider, LlmClients, ProviderResponse, Task } from '../types';

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
    copilot: 'Copilot / Azure'
};

// --- Client Initializer ---
function initializeClients(config: AppConfig): LlmClients {
    const { providers, apiKeys } = config;
    const clients: LlmClients = {
        gemini: null,
        openai: undefined,
        perplexity: undefined,
        copilot: undefined,
    };
    if (providers.includes('gemini')) {
        const apiKey = apiKeys.gemini;
        if (!apiKey) throw new Error("Google Gemini API Key is missing.");
        clients.gemini = new GoogleGenAI({ apiKey });
    }
    if (providers.includes('openai') && apiKeys.openai) {
        clients.openai = apiKeys.openai;
    }
    if (providers.includes('perplexity') && apiKeys.perplexity) {
        clients.perplexity = apiKeys.perplexity;
    }
    if (providers.includes('copilot') && apiKeys.copilotKey && apiKeys.copilotEndpoint) {
        clients.copilot = { key: apiKeys.copilotKey, endpoint: apiKeys.copilotEndpoint };
    }
    return clients;
}


// --- Generic Fetch for OpenAI-Compatible APIs ---
async function genericAIFetch(url: string, apiKey: string, body: object, headers: Record<string, string> = {}) {
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
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }
    return response.json();
}

async function azureAIFetch(url: string, apiKey: string, body: object) {
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'api-key': apiKey,
        },
        body: JSON.stringify(body)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: { message: response.statusText } }));
        throw new Error(`API Error (${response.status}): ${errorData.error?.message || response.statusText}`);
    }
    return response.json();
}


// --- Analysis Logic per Provider ---

// GEMINI
const analysisSchema = { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { brandName: { type: Type.STRING }, mentions: { type: Type.INTEGER }, sentiment: { type: Type.STRING, enum: ['Positive', 'Neutral', 'Negative', 'Not Mentioned'] } }, required: ['brandName', 'mentions', 'sentiment'] } };
async function runGeminiAnalysisForPrompt(prompt: string, config: AppConfig, client: GoogleGenAI, model: string): Promise<ProviderResponse> {
    const { clientName, competitors, additionalQuestions } = config;
    const allBrands = [clientName, ...competitors];
    try {
        // 1. Get raw response
        const rawResult = await client.models.generateContent({ model, contents: prompt });
        const response = rawResult.text;

        // 2. Analyze response
        const analysisPrompt = `Analyze the following text. Identify ALL brand names mentioned. For each, count mentions and determine sentiment ('Positive', 'Neutral', 'Negative'). If a brand from my list (${allBrands.join(', ')}) isn't mentioned, report it as 'Not Mentioned' with 0 mentions. Ensure all brands from my list are in your JSON response. Text: --- ${response} ---`;
        const analysisResult = await client.models.generateContent({ model, contents: analysisPrompt, config: { responseMimeType: "application/json", responseSchema: analysisSchema } });
        const brandAnalyses: BrandAnalysis[] = JSON.parse(analysisResult.text);

        // 3. Answer additional questions
        const additionalAnswers: AdditionalQuestionAnswer[] = await Promise.all(
            additionalQuestions.map(async (question) => {
                const qPrompt = `Based ONLY on the text provided below, answer the question: "${question}". If the information is not in the text, state that. Text: --- ${response} ---`;
                const answerResult = await client.models.generateContent({ model, contents: qPrompt });
                return { question, answer: answerResult.text };
            })
        );
        
        return { provider: 'gemini', response, brandAnalyses, additionalAnswers };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown Gemini error occurred.';
        console.error("Gemini Analysis Error:", e);
        return { provider: 'gemini', response: '', brandAnalyses: [], additionalAnswers: [], error };
    }
}

// OPENAI
async function runOpenAIAnalysisForPrompt(prompt: string, config: AppConfig, apiKey: string, model: string): Promise<ProviderResponse> {
    const { clientName, competitors, additionalQuestions } = config;
    const allBrands = [clientName, ...competitors];
     try {
        // 1. Get raw response
        const rawData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, { model, messages: [{ role: 'user', content: prompt }] });
        const response = rawData.choices[0].message.content;

        // 2. Analyze response
        const analysisPrompt = `Analyze the following text. Identify ALL brand names mentioned. For each, count mentions and determine sentiment ('Positive', 'Neutral', 'Negative'). If a brand from my list (${allBrands.join(', ')}) isn't mentioned, report it as 'Not Mentioned' with 0 mentions. Respond with a single JSON object with one key, "brands", which is an array of objects with keys "brandName", "mentions", and "sentiment". Text: --- ${response} ---`;
        const analysisData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, { model, messages: [{ role: 'user', content: analysisPrompt }], response_format: { type: "json_object" } });
        const brandAnalyses: BrandAnalysis[] = JSON.parse(analysisData.choices[0].message.content).brands || [];

        // 3. Answer additional questions
        const additionalAnswers: AdditionalQuestionAnswer[] = await Promise.all(
            additionalQuestions.map(async (question) => {
                const qPrompt = `Based ONLY on the text provided below, answer the question: "${question}". If the information is not in the text, state that. Text: --- ${response} ---`;
                const answerData = await genericAIFetch('https://api.openai.com/v1/chat/completions', apiKey, { model, messages: [{ role: 'user', content: qPrompt }] });
                return { question, answer: answerData.choices[0].message.content };
            })
        );
        
        return { provider: 'openai', response, brandAnalyses, additionalAnswers };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown OpenAI error occurred.';
        console.error("OpenAI Analysis Error:", e);
        return { provider: 'openai', response: '', brandAnalyses: [], additionalAnswers: [], error };
    }
}

// PERPLEXITY
async function runPerplexityAnalysisForPrompt(prompt: string, config: AppConfig, apiKey: string, model: string): Promise<ProviderResponse> {
    const { clientName, competitors, additionalQuestions } = config;
    const allBrands = [clientName, ...competitors];
     try {
        const rawData = await genericAIFetch('https://api.perplexity.ai/chat/completions', apiKey, { model, messages: [{ role: 'user', content: prompt }] });
        const pResponse = rawData.choices[0].message.content;

        const analysisPrompt = `Analyze the following text. Identify ALL brand names mentioned. For each, count mentions and determine sentiment ('Positive', 'Neutral', 'Negative'). If a brand from my list (${allBrands.join(', ')}) isn't mentioned, report it as 'Not Mentioned' with 0 mentions. Respond with a valid JSON object inside a \`\`\`json code block. The JSON object should have one key, "brands", which is an array of objects with keys "brandName", "mentions", and "sentiment". Text: --- ${pResponse} ---`;
        const analysisData = await genericAIFetch('https://api.perplexity.ai/chat/completions', apiKey, { model, messages: [{ role: 'user', content: analysisPrompt }]});
        
        const jsonMatch = analysisData.choices[0].message.content.match(/```json\n([\s\S]*?)\n```/);
        const brandAnalyses: BrandAnalysis[] = jsonMatch ? JSON.parse(jsonMatch[1]).brands : [];

        const additionalAnswers: AdditionalQuestionAnswer[] = await Promise.all(
            additionalQuestions.map(async (question) => {
                const qPrompt = `Based ONLY on the text provided below, answer the question: "${question}". If the information is not in the text, state that. Text: --- ${pResponse} ---`;
                const answerData = await genericAIFetch('https://api.perplexity.ai/chat/completions', apiKey, { model, messages: [{ role: 'user', content: qPrompt }] });
                return { question, answer: answerData.choices[0].message.content };
            })
        );

        return { provider: 'perplexity', response: pResponse, brandAnalyses, additionalAnswers };

    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown Perplexity error occurred.';
        console.error("Perplexity Analysis Error:", e);
        return { provider: 'perplexity', response: '', brandAnalyses: [], additionalAnswers: [], error };
    }
}

// COPILOT / AZURE
async function runCopilotAnalysisForPrompt(prompt: string, config: AppConfig, client: { key: string; endpoint: string }, model: string): Promise<ProviderResponse> {
    const { clientName, competitors, additionalQuestions } = config;
    const allBrands = [clientName, ...competitors];
    const API_VERSION = '2024-02-01';
    const url = `${client.endpoint}/openai/deployments/${model}/chat/completions?api-version=${API_VERSION}`;

    try {
        // 1. Get raw response
        const rawData = await azureAIFetch(url, client.key, { messages: [{ role: 'user', content: prompt }] });
        const response = rawData.choices[0].message.content;

        // 2. Analyze response
        const analysisPrompt = `Analyze the following text. Identify ALL brand names mentioned. For each, count mentions and determine sentiment ('Positive', 'Neutral', 'Negative'). If a brand from my list (${allBrands.join(', ')}) isn't mentioned, report it as 'Not Mentioned' with 0 mentions. Respond with a single JSON object with one key, "brands", which is an array of objects with keys "brandName", "mentions", and "sentiment". Text: --- ${response} ---`;
        const analysisData = await azureAIFetch(url, client.key, { messages: [{ role: 'user', content: analysisPrompt }], response_format: { type: "json_object" } });
        const brandAnalyses: BrandAnalysis[] = JSON.parse(analysisData.choices[0].message.content).brands || [];
        
        // 3. Answer additional questions
        const additionalAnswers: AdditionalQuestionAnswer[] = await Promise.all(
            additionalQuestions.map(async (question) => {
                const qPrompt = `Based ONLY on the text provided below, answer the question: "${question}". If the information is not in the text, state that. Text: --- ${response} ---`;
                const answerData = await azureAIFetch(url, client.key, { messages: [{ role: 'user', content: qPrompt }] });
                return { question, answer: answerData.choices[0].message.content };
            })
        );
        
        return { provider: 'copilot', response, brandAnalyses, additionalAnswers };
    } catch (e) {
        const error = e instanceof Error ? e.message : 'An unknown Copilot/Azure error occurred.';
        console.error("Copilot Analysis Error:", e);
        return { provider: 'copilot', response: '', brandAnalyses: [], additionalAnswers: [], error };
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

    const updateTaskStatus = (taskId: string, status: Task['status'], error?: string) => {
        const taskIndex = tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          tasks[taskIndex].status = status;
          if (error) tasks[taskIndex].error = error;
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
                case 'perplexity':
                    if (!clients.perplexity || !config.models.perplexity) throw new Error('Perplexity client not initialized properly.');
                    providerFunction = () => runPerplexityAnalysisForPrompt(prompt, config, clients.perplexity!, config.models.perplexity!);
                    break;
                case 'copilot':
                    if (!clients.copilot || !config.models.copilot) throw new Error('Copilot client not initialized properly.');
                    providerFunction = () => runCopilotAnalysisForPrompt(prompt, config, clients.copilot!, config.models.copilot!);
                    break;
                default:
                    const exhaustiveCheck: never = provider;
                    throw new Error(`Unhandled provider: ${exhaustiveCheck}`);
            }

            try {
                const response = await providerFunction();
                if (response.error) {
                    updateTaskStatus(taskId, 'error', response.error);
                } else {
                    updateTaskStatus(taskId, 'completed');
                }
                return response;
            } catch (e) {
                const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
                updateTaskStatus(taskId, 'error', errorMsg);
                return { provider, response: '', brandAnalyses: [], additionalAnswers: [], error: errorMsg };
            }
        });

        const providerResponses = await Promise.all(providerPromises);
        resultsByPrompt.push({ prompt, providerResponses });
    }

    return resultsByPrompt;
}