import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { SavedReport, StoredConfiguration, AnalysisResult, AppConfig, Project, ProjectRun } from '../types';

// Cache clients to avoid creating a new one for every call
const clients: Record<string, SupabaseClient> = {};

function getSupabaseClient(url: string, key: string): SupabaseClient {
    const clientKey = `${url}:${key}`;
    if (!clients[clientKey]) {
        clients[clientKey] = createClient(url, key, {
             auth: {
                persistSession: false
            }
        });
    }
    return clients[clientKey];
}

// Reports
export async function getReports(url: string, key: string): Promise<SavedReport[]> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client.from('reports').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
        id: r.id,
        createdAt: r.created_at,
        clientName: r.client_name,
        htmlContent: r.html_content,
        promptCount: r.prompt_count,
    }));
}

export async function getReportById(url: string, key: string, id: string): Promise<SavedReport | null> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client.from('reports').select('*').eq('id', id).single();
    if (error) {
        if (error.code === 'PGRST116') return null; // Standard "not found" error, not a throw case.
        console.error('Supabase Error:', error);
        throw new Error(error.message);
    }
    if (!data) return null;
    return {
        id: data.id,
        createdAt: data.created_at,
        clientName: data.client_name,
        htmlContent: data.html_content,
        promptCount: data.prompt_count,
    };
}

export async function saveReport(url: string, key: string, reportData: Omit<SavedReport, 'id' | 'createdAt'>): Promise<SavedReport> {
    const client = getSupabaseClient(url, key);
    const insertData = {
        client_name: reportData.clientName,
        html_content: reportData.htmlContent,
        prompt_count: reportData.promptCount,
    };
    const { data, error } = await client.from('reports').insert(insertData).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to save report: no data returned.");
    return {
        id: data.id,
        createdAt: data.created_at,
        clientName: data.client_name,
        htmlContent: data.html_content,
        promptCount: data.prompt_count,
    };
}

export async function deleteReport(url: string, key: string, reportId: string): Promise<void> {
    const client = getSupabaseClient(url, key);
    const { error } = await client.from('reports').delete().eq('id', reportId);
    if (error) throw new Error(error.message);
}

// Raw Responses
export async function saveRawResponses(url: string, key: string, reportId: string, results: AnalysisResult[], config: AppConfig): Promise<void> {
    const client = getSupabaseClient(url, key);
    
    const insertData = results.flatMap(result => 
        result.providerResponses.map(providerResponse => {
            const model = config.models[providerResponse.provider];

            return {
                report_id: reportId,
                prompt: result.prompt,
                provider: providerResponse.provider,
                model: model,
                results: providerResponse,
                other_input_tokens: providerResponse.tokenUsage?.inputTokens,
                other_output_tokens: providerResponse.tokenUsage?.outputTokens,
                analysis_input_tokens: providerResponse.analysisTokenUsage?.inputTokens,
                analysis_output_tokens: providerResponse.analysisTokenUsage?.outputTokens,
            };
        })
    );

    if (insertData.length === 0) {
        return;
    }

    const { error } = await client.from('raw_responses').insert(insertData);
    if (error) throw new Error(error.message);
}


export async function getRawResponsesByReportId(url: string, key: string, reportId: string): Promise<any[]> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client.from('raw_responses').select('*').eq('report_id', reportId);
    if (error) throw new Error(error.message);
    return data || [];
}

export async function getTotalTokenUsage(url: string, key: string): Promise<Array<{ model: string; inputTokens: number; outputTokens: number }>> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client
        .from('raw_responses')
        .select('model, other_input_tokens, other_output_tokens, analysis_input_tokens, analysis_output_tokens');

    if (error) throw new Error(error.message);
    if (!data) return [];

    const usageMap = new Map<string, { inputTokens: number; outputTokens: number }>();

    for (const row of data) {
        if (row.model) {
            const current = usageMap.get(row.model) || { inputTokens: 0, outputTokens: 0 };
            
            const newTotalInput = current.inputTokens + (row.other_input_tokens || 0) + (row.analysis_input_tokens || 0);
            const newTotalOutput = current.outputTokens + (row.other_output_tokens || 0) + (row.analysis_output_tokens || 0);
            
            usageMap.set(row.model, { inputTokens: newTotalInput, outputTokens: newTotalOutput });
        }
    }

    return Array.from(usageMap.entries()).map(([model, tokens]) => ({
        model,
        inputTokens: tokens.inputTokens,
        outputTokens: tokens.outputTokens,
    })).sort((a, b) => (b.inputTokens + b.outputTokens) - (a.inputTokens + a.outputTokens));
}

// Configurations
export async function getConfigurations(url: string, key: string): Promise<StoredConfiguration[]> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client.from('configurations').select('*').order('name');
    if (error) throw new Error(error.message);
    return (data || []).map(c => ({
        id: c.id,
        name: c.name,
        clientName: c.client_name,
        description: c.description,
        competitors: c.competitors,
        prompts: c.prompts,
        additionalQuestions: c.additional_questions,
        selectedProviders: c.selected_providers,
        apiKeys: c.api_keys,
        models: c.models,
        broadMatch: c.broad_match,
    }));
}

export async function saveConfiguration(url: string, key: string, configData: Omit<StoredConfiguration, 'id'>): Promise<StoredConfiguration> {
    const client = getSupabaseClient(url, key);
    const insertData = {
        name: configData.name,
        client_name: configData.clientName,
        description: configData.description,
        competitors: configData.competitors,
        prompts: configData.prompts,
        additional_questions: configData.additionalQuestions,
        selected_providers: configData.selectedProviders,
        api_keys: configData.apiKeys,
        models: configData.models,
        broad_match: configData.broadMatch,
    };
    const { data, error } = await client.from('configurations').insert(insertData).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to save configuration.");
    return {
        id: data.id,
        name: data.name,
        clientName: data.client_name,
        description: data.description,
        competitors: data.competitors,
        prompts: data.prompts,
        additionalQuestions: data.additional_questions,
        selectedProviders: data.selected_providers,
        apiKeys: data.api_keys,
        models: data.models,
        broadMatch: data.broad_match,
    };
}

export async function updateConfiguration(url: string, key: string, id: string, configData: Omit<StoredConfiguration, 'id'>): Promise<StoredConfiguration> {
    const client = getSupabaseClient(url, key);
    const updateData = {
        name: configData.name,
        client_name: configData.clientName,
        description: configData.description,
        competitors: configData.competitors,
        prompts: configData.prompts,
        additional_questions: configData.additionalQuestions,
        selected_providers: configData.selectedProviders,
        api_keys: configData.apiKeys,
        models: configData.models,
        broad_match: configData.broadMatch,
    };
    const { data, error } = await client.from('configurations').update(updateData).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to update configuration.");
    return {
        id: data.id,
        name: data.name,
        clientName: data.client_name,
        description: data.description,
        competitors: data.competitors,
        prompts: data.prompts,
        additionalQuestions: data.additional_questions,
        selectedProviders: data.selected_providers,
        apiKeys: data.api_keys,
        models: data.models,
        broadMatch: data.broad_match,
    };
}

export async function deleteConfiguration(url: string, key: string, id: string): Promise<void> {
    const client = getSupabaseClient(url, key);
    const { error } = await client.from('configurations').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// Projects
export async function getProjects(url: string, key: string): Promise<Project[]> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client.from('projects').select('*').order('created_at', { ascending: false });
    if (error) throw new Error(error.message);
    return (data || []).map(p => ({
        id: p.id,
        createdAt: p.created_at,
        name: p.name,
        description: p.description,
        config: p.config,
    }));
}

export async function createProject(url: string, key: string, projectData: Omit<Project, 'id' | 'createdAt'>): Promise<Project> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client.from('projects').insert(projectData).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to create project.");
    return {
        id: data.id,
        createdAt: data.created_at,
        name: data.name,
        description: data.description,
        config: data.config,
    };
}

export async function updateProject(url: string, key: string, id: string, projectData: Partial<Omit<Project, 'id' | 'createdAt'>>): Promise<Project> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client.from('projects').update(projectData).eq('id', id).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to update project.");
    return {
        id: data.id,
        createdAt: data.created_at,
        name: data.name,
        description: data.description,
        config: data.config,
    };
}

export async function deleteProject(url: string, key: string, id: string): Promise<void> {
    const client = getSupabaseClient(url, key);
    const { error } = await client.from('projects').delete().eq('id', id);
    if (error) throw new Error(error.message);
}

// Project Runs
export async function getProjectRuns(url: string, key: string, projectId: string): Promise<ProjectRun[]> {
    const client = getSupabaseClient(url, key);
    const { data, error } = await client.from('project_runs').select('*').eq('project_id', projectId).order('created_at', { ascending: true });
    if (error) throw new Error(error.message);
    return (data || []).map(r => ({
        id: r.id,
        projectId: r.project_id,
        createdAt: r.created_at,
        results: r.results,
        summary: r.summary,
    }));
}

export async function createProjectRun(url: string, key: string, runData: Omit<ProjectRun, 'id' | 'createdAt'>): Promise<ProjectRun> {
    const client = getSupabaseClient(url, key);
    // Map from camelCase (JS) to snake_case (DB) for insertion
    const insertData = {
        project_id: runData.projectId,
        results: runData.results,
        summary: runData.summary,
    };
    const { data, error } = await client.from('project_runs').insert(insertData).select().single();
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Failed to create project run.");
    // Map the response from snake_case (DB) back to camelCase (JS)
    return {
        id: data.id,
        projectId: data.project_id,
        createdAt: data.created_at,
        results: data.results,
        summary: data.summary,
    };
}