

import React, { useState } from 'react';
import type { Project, AppConfig, Provider, ApiKeys } from '../types';

interface ProjectFormProps {
  initialData?: Project;
  onSave: (projectData: Omit<Project, 'id' | 'createdAt'>) => void;
  isSaving: boolean;
}

const FormField: React.FC<{ label: string; description: string; children: React.ReactNode }> = ({ label, description, children }) => (
    <div>
        <label className="block text-lg font-medium text-gray-200">{label}</label>
        {description && <p className="text-sm text-gray-400 mb-2">{description}</p>}
        {children}
    </div>
);

const providerDetails: Record<Provider, { name: string, requiresKey: boolean }> = {
    gemini: { name: 'Google Gemini', requiresKey: true },
    openai: { name: 'OpenAI', requiresKey: true },
    'openai-websearch': { name: 'OpenAI Web Search', requiresKey: true },
    perplexity: { name: 'Perplexity', requiresKey: true },
};

const modelOptions: Partial<Record<Provider, string[]>> = {
    gemini: ['gemini-2.5-flash','gemini-2.5-flash-lite','gemini-2.5-pro','gemini-2.0-flash-exp','gemini-2.0-pro','gemini-2.0-flash'],
    openai: ['gpt-4o-mini','gpt-4o','gpt-4.1','gpt-4.1-mini','o1','o1-mini','o3-mini','gpt-5','gpt-5-mini','gpt-5-nano'],
    'openai-websearch': ['gpt-4o-search-preview', 'gpt-4o-mini-search-preview'],
    perplexity: ['sonar','sonar-pro','sonar-reasoning','sonar-reasoning-pro','sonar-deep-research'],
};

const defaultModels: Partial<Record<Provider, string>> = {
    gemini: 'gemini-2.5-flash',
    openai: 'gpt-4o-mini',
    'openai-websearch': 'gpt-4o-search-preview',
    perplexity: 'sonar',
};

const defaultAppConfig: AppConfig = {
    providers: ['gemini'],
    apiKeys: {},
    models: { gemini: defaultModels.gemini },
    clientName: '',
    competitors: [],
    prompts: [],
    additionalQuestions: [],
    broadMatch: false,
};

export const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSave, isSaving }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [description, setDescription] = useState(initialData?.description || '');
    
    // AppConfig state
    const [clientName, setClientName] = useState(initialData?.config.clientName || '');
    const [competitors, setCompetitors] = useState(initialData?.config.competitors.join('\n') || '');
    const [prompts, setPrompts] = useState(initialData?.config.prompts.join('\n') || '');
    const [additionalQuestions, setAdditionalQuestions] = useState(initialData?.config.additionalQuestions.join('\n') || '');
    const [selectedProviders, setSelectedProviders] = useState<Provider[]>(initialData?.config.providers || ['gemini']);
    const [apiKeys, setApiKeys] = useState<ApiKeys>(initialData?.config.apiKeys || {});
    const [models, setModels] = useState<Partial<Record<Provider, string>>>(initialData?.config.models || { gemini: defaultModels.gemini });
    const [broadMatch, setBroadMatch] = useState<boolean>(initialData?.config.broadMatch || false);


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const config: AppConfig = {
            providers: selectedProviders,
            apiKeys,
            models,
            clientName: clientName.trim(),
            competitors: competitors.split('\n').map(c => c.trim()).filter(Boolean),
            prompts: prompts.split('\n').map(p => p.trim()).filter(Boolean),
            additionalQuestions: additionalQuestions.split('\n').map(q => q.trim()).filter(Boolean),
            broadMatch,
        };
        onSave({ name: name.trim(), description: description.trim(), config });
    };

    const handleProviderToggle = (provider: Provider) => {
        const newSelection = selectedProviders.includes(provider) 
            ? selectedProviders.filter(p => p !== provider)
            : [...selectedProviders, provider];
        
        setSelectedProviders(newSelection);

        if (newSelection.includes(provider) && !models[provider]) {
            setModels(prev => ({ ...prev, [provider]: defaultModels[provider] }));
        }
    };

    const handleApiKeyChange = (key: keyof ApiKeys, value: string) => {
        setApiKeys(prev => ({ ...prev, [key]: value }));
    };

    const handleModelChange = (provider: Provider, value: string) => {
        setModels(prev => ({ ...prev, [provider]: value }));
    };
    
    return (
        <form id="project-form" onSubmit={handleSubmit} className="space-y-6">
            <FormField label="Project Name" description="A unique name for this project (e.g., 'Q3 2024 Brand Visibility').">
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" required />
            </FormField>

            <FormField label="Project Description" description="Optional. A brief description of what this project tracks.">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-20 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" />
            </FormField>

            <div className="border-t border-gray-700 pt-6 space-y-6">
                <h3 className="text-xl font-semibold text-gray-100">Project Configuration</h3>
                <p className="text-gray-400 -mt-4 text-sm">This configuration will be used for every analysis run within this project.</p>
                
                 <div className="bg-gray-900/70 p-6 rounded-lg border border-gray-700">
                    <h4 className="text-lg font-semibold mb-4 text-gray-100">LLM Providers & Models</h4>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        {(Object.keys(providerDetails) as Provider[]).map(p => (
                            <label key={p} className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${selectedProviders.includes(p) ? 'border-green-500 bg-green-900/30' : 'border-gray-600 bg-gray-900 hover:bg-gray-800'}`}>
                                <input type="checkbox" checked={selectedProviders.includes(p)} onChange={() => handleProviderToggle(p)} className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-green-500 focus:ring-green-500" />
                                <span className="font-medium text-gray-200">{providerDetails[p].name}</span>
                            </label>
                        ))}
                    </div>
                    <div className="space-y-4">
                        {selectedProviders.includes('gemini') && (
                            <>
                                <FormField label="Google Gemini API Key" description="">
                                    <input type="password" placeholder="Enter Gemini API key" value={apiKeys.gemini || ''} onChange={e => handleApiKeyChange('gemini', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-100" required />
                                </FormField>
                                <FormField label="Gemini Model" description="">
                                    <select value={models.gemini || ''} onChange={(e) => handleModelChange('gemini', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                                        {modelOptions.gemini?.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </FormField>
                            </>
                        )}
                        {(selectedProviders.includes('openai') || selectedProviders.includes('openai-websearch')) && (
                            <FormField label="OpenAI API Key" description="">
                                <input type="password" placeholder="Enter OpenAI API key" value={apiKeys.openai || ''} onChange={e => handleApiKeyChange('openai', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-100" required />
                            </FormField>
                        )}
                        {selectedProviders.includes('openai') && (
                             <FormField label="OpenAI Model" description="">
                                <select value={models.openai || ''} onChange={(e) => handleModelChange('openai', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                                    {modelOptions.openai?.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </FormField>
                        )}
                        {selectedProviders.includes('openai-websearch') && (
                             <FormField label="OpenAI Web Search Model" description="">
                                <select value={models['openai-websearch'] || ''} onChange={(e) => handleModelChange('openai-websearch', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                                    {modelOptions['openai-websearch']?.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                            </FormField>
                        )}
                         {selectedProviders.includes('perplexity') && (
                            <>
                                <FormField label="Perplexity API Key" description="">
                                    <input type="password" placeholder="Enter Perplexity API key" value={apiKeys.perplexity || ''} onChange={e => handleApiKeyChange('perplexity', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-100" required />
                                </FormField>
                                 <FormField label="Perplexity Model" description="">
                                    <select value={models.perplexity || ''} onChange={(e) => handleModelChange('perplexity', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2">
                                        {modelOptions.perplexity?.map(m => <option key={m} value={m}>{m}</option>)}
                                    </select>
                                </FormField>
                            </>
                        )}
                    </div>
                </div>

                <FormField label="Client Brand Name" description="The primary brand to track.">
                  <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-100" required />
                </FormField>
                
                <FormField label="Competitor Brands" description="List each competitor on a new line.">
                  <textarea value={competitors} onChange={(e) => setCompetitors(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-24 text-gray-100" required />
                </FormField>
                 
                <div className="bg-gray-900/70 p-4 rounded-lg border border-gray-700">
                    <label className="flex items-center space-x-3 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={broadMatch} 
                            onChange={(e) => setBroadMatch(e.target.checked)} 
                            className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-green-500 focus:ring-green-500"
                        />
                        <div>
                            <span className="font-medium text-gray-200">Use Broad Match for Brand Names</span>
                            <p className="text-xs text-gray-400">When enabled, the analysis will count variations. E.g., a search for "Social Hub" will also match "The Social Hub".</p>
                        </div>
                    </label>
                </div>

                <FormField label="Prompts" description="List each search prompt on a new line.">
                  <textarea value={prompts} onChange={(e) => setPrompts(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-32 text-gray-100" required />
                </FormField>
                
                <FormField label="Additional Analysis Questions" description="Optional. List each question on a new line.">
                  <textarea value={additionalQuestions} onChange={(e) => setAdditionalQuestions(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-24 text-gray-100" />
                </FormField>
            </div>
        </form>
    );
};