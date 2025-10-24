
import React, { useState, useEffect, useRef } from 'react';
import type { AppConfig, Provider, ApiKeys, StoredConfiguration, VerificationStatus } from '../types';
import { verifyGeminiApiKey, verifyOpenAIApiKey, verifyPerplexityApiKey } from '../services/geminiService';
import { ModelInfoPopover } from './ModelInfoPopover';


interface SetupFormProps {
  onStartAnalysis: (config: AppConfig) => void;
  onSupabaseConfigChange: (config: { url: string; key: string } | null) => void;
  savedConfigs: StoredConfiguration[];
  isLoadingConfigs: boolean;
  onSaveConfiguration: (config: Omit<StoredConfiguration, 'id'>) => void;
  onDeleteConfiguration: (id: string, name: string) => void;
  loadedConfigId: string | null;
  onSetConfigLoaded: (id: string | null) => void;
}

const FormField: React.FC<{ label: string; description: string; children: React.ReactNode }> = ({ label, description, children }) => (
    <div>
        <label className="block text-lg font-medium text-gray-200">{label}</label>
        <p className="text-sm text-gray-400 mb-2">{description}</p>
        {children}
    </div>
);

const providerDetails: Record<Provider, { name: string, requiresKey: boolean, requiresEndpoint?: boolean }> = {
    gemini: { name: 'Google Gemini', requiresKey: true },
    openai: { name: 'OpenAI', requiresKey: true },
    'openai-websearch': { name: 'OpenAI Web Search', requiresKey: true },
    perplexity: { name: 'Perplexity', requiresKey: true },
};

const modelOptions: Partial<Record<Provider, string[]>> = {
    // FIX: Removed prohibited models 'gemini-1.5-pro' and 'gemini-1.5-flash' from the list.
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

const SaveConfigModal: React.FC<{ onSave: (name: string) => void, onClose: () => void }> = ({ onSave, onClose }) => {
    const [name, setName] = useState('');
    
    const handleSave = () => {
        if (name.trim()) {
            onSave(name.trim());
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-md text-left" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-green-400">Save Configuration</h3>
                </div>
                <div className="p-6 space-y-4">
                    <label htmlFor="configName" className="block text-sm font-medium text-gray-300">Preset Name</label>
                    <input 
                        type="text" 
                        id="configName"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none text-gray-100" 
                        placeholder="e.g., APIs only"
                        autoFocus
                    />
                </div>
                <div className="p-4 bg-gray-900/50 rounded-b-xl flex justify-end space-x-2">
                     <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-2 px-4 rounded-lg transition-colors">Cancel</button>
                     <button onClick={handleSave} disabled={!name.trim()} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed">Save</button>
                </div>
            </div>
        </div>
    );
};

const VerificationStatusIndicator: React.FC<{ status: VerificationStatus; error?: string | null }> = ({ status, error }) => {
    const renderIcon = () => {
        switch (status) {
            case 'verifying':
                return <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-500" title="Verifying..."></div>;
            case 'valid':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor"><title>Valid</title><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>;
            case 'invalid':
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor"><title>{`Invalid: ${error}`}</title><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" /></svg>;
            case 'idle':
            default:
                return <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor"><title>Not verified</title><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9 13a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1zM9 6a1 1 0 011-1h.01a1 1 0 110 2H10a1 1 0 01-1-1z" clipRule="evenodd" /></svg>;
        }
    };

    return (
        <div className="relative group flex items-center justify-center h-full">
            {renderIcon()}
            {status === 'invalid' && error && (
                 <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-max max-w-xs bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 border border-gray-700 shadow-lg z-10">
                    {error}
                </div>
            )}
        </div>
    );
};

export const SetupForm: React.FC<SetupFormProps> = ({ 
  onStartAnalysis, 
  onSupabaseConfigChange,
  savedConfigs,
  isLoadingConfigs,
  onSaveConfiguration,
  onDeleteConfiguration,
  loadedConfigId,
  onSetConfigLoaded,
}) => {
  const [clientName, setClientName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [competitors, setCompetitors] = useState<string>('');
  const [prompts, setPrompts] = useState<string>('');
  const [additionalQuestions, setAdditionalQuestions] = useState<string>('');
  const [selectedProviders, setSelectedProviders] = useState<Provider[]>(['gemini']);
  const [apiKeys, setApiKeys] = useState<ApiKeys>({});
  const [models, setModels] = useState<Partial<Record<Provider, string>>>({ gemini: defaultModels.gemini });
  const [broadMatch, setBroadMatch] = useState<boolean>(false);
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [isInfoPopoverOpen, setIsInfoPopoverOpen] = useState(false);

  const [verificationStatus, setVerificationStatus] = useState<Record<Provider, VerificationStatus>>({ gemini: 'idle', openai: 'idle', perplexity: 'idle', 'openai-websearch': 'idle' });
  const [verificationErrors, setVerificationErrors] = useState<Record<Provider, string | null>>({ gemini: null, openai: null, perplexity: null, 'openai-websearch': null });
  
  const isInitialMount = useRef(true);
  const isPresetLoading = useRef(false);

  useEffect(() => {
    // Load persisted Supabase config on component mount for user convenience
    try {
        const storedConfig = localStorage.getItem('supabase_config');
        if (storedConfig) {
            const { url, key } = JSON.parse(storedConfig);
            setApiKeys(prev => ({...prev, supabaseUrl: url, supabaseKey: key}));
        }
    } catch (e) {
        console.error("Could not load configs from local storage", e);
    }
  }, []);
  
  // Effect to automatically check for saved reports when Supabase credentials are entered
  useEffect(() => {
    // Skip initial mount to avoid firing on page load
    if (isInitialMount.current) { return; }

    const handler = setTimeout(() => {
        const { supabaseUrl, supabaseKey } = apiKeys;
        if (supabaseUrl && supabaseKey) {
            onSupabaseConfigChange({ url: supabaseUrl.trim(), key: supabaseKey.trim() });
        } else if (!supabaseUrl && !supabaseKey) {
            onSupabaseConfigChange(null);
        }
    }, 500);

    return () => clearTimeout(handler);
  }, [apiKeys.supabaseUrl, apiKeys.supabaseKey, onSupabaseConfigChange]);

  // Effect to clear the loaded preset ID if the user modifies the form,
  // indicating the configuration is now "dirty".
  useEffect(() => {
    if (isInitialMount.current) {
        isInitialMount.current = false;
        return;
    }
    if (isPresetLoading.current) {
        isPresetLoading.current = false;
        return;
    }
    if (loadedConfigId) {
        onSetConfigLoaded(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, description, competitors, prompts, additionalQuestions, selectedProviders, apiKeys, models, broadMatch]);


  const handleSaveConfiguration = (name: string) => {
    const configData: Omit<StoredConfiguration, 'id'> = {
      name,
      clientName,
      description,
      competitors,
      prompts,
      additionalQuestions,
      selectedProviders,
      apiKeys,
      models,
      broadMatch,
    };
    onSaveConfiguration(configData);
    setIsSaveModalOpen(false);
  };

  const handleLoadConfiguration = (configId: string) => {
    const configToLoad = savedConfigs.find(c => c.id === configId);
    if (configToLoad) {
      isPresetLoading.current = true; // Prevents the "dirty" check from firing
      setClientName(configToLoad.clientName);
      setDescription(configToLoad.description || '');
      setCompetitors(configToLoad.competitors);
      setPrompts(configToLoad.prompts);
      setAdditionalQuestions(configToLoad.additionalQuestions);
      setSelectedProviders(configToLoad.selectedProviders);
      setApiKeys(configToLoad.apiKeys);
      setModels(configToLoad.models);
      setBroadMatch(configToLoad.broadMatch || false);
      onSetConfigLoaded(configToLoad.id);
      // Reset verification on load
      setVerificationStatus({ gemini: 'idle', openai: 'idle', perplexity: 'idle', 'openai-websearch': 'idle' });
      setVerificationErrors({ gemini: null, openai: null, perplexity: null, 'openai-websearch': null });
    }
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
    // Reset verification status when user types
    if (key === 'openai') {
        setVerificationStatus(prev => ({ ...prev, openai: 'idle', 'openai-websearch': 'idle' }));
        setVerificationErrors(prev => ({ ...prev, openai: null, 'openai-websearch': null }));
    } else if (key === 'gemini' || key === 'perplexity') {
        setVerificationStatus(prev => ({ ...prev, [key as Provider]: 'idle' }));
        setVerificationErrors(prev => ({ ...prev, [key as Provider]: null }));
    }
  };

  const handleModelChange = (provider: Provider, value: string) => {
    setModels(prev => ({ ...prev, [provider]: value }));
  };

  const handleVerifyKey = async (provider: Provider) => {
      const key = provider === 'openai-websearch' ? apiKeys['openai'] : apiKeys[provider];
      if (!key) return;

      const providersToUpdate: Provider[] = [provider];
      if (provider === 'openai') {
        providersToUpdate.push('openai-websearch');
      }

      providersToUpdate.forEach(p => {
        if(selectedProviders.includes(p)) {
            setVerificationStatus(prev => ({ ...prev, [p]: 'verifying' }));
            setVerificationErrors(prev => ({ ...prev, [p]: null }));
        }
      });

      let result: { isValid: boolean, error?: string };
      switch (provider) {
          case 'gemini':
              result = await verifyGeminiApiKey(key);
              break;
          case 'openai':
          case 'openai-websearch':
              result = await verifyOpenAIApiKey(key);
              break;
          case 'perplexity':
              result = await verifyPerplexityApiKey(key);
              break;
          default:
              return;
      }
      
      const providerToUpdateForVerification = provider === 'openai-websearch' ? 'openai' : provider;

      const providersToSetResult: Provider[] = [providerToUpdateForVerification];
      if (providerToUpdateForVerification === 'openai') {
          providersToSetResult.push('openai-websearch');
      }

      providersToSetResult.forEach(p => {
        if(selectedProviders.includes(p)) {
          if (result.isValid) {
              setVerificationStatus(prev => ({ ...prev, [p]: 'valid' }));
          } else {
              setVerificationStatus(prev => ({ ...prev, [p]: 'invalid' }));
              setVerificationErrors(prev => ({ ...prev, [p]: result.error || 'Unknown error' }));
          }
        }
      });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartAnalysis({
      providers: selectedProviders,
      apiKeys: {
        gemini: apiKeys.gemini?.trim(),
        openai: apiKeys.openai?.trim(),
        perplexity: apiKeys.perplexity?.trim(),
        supabaseUrl: apiKeys.supabaseUrl?.trim(),
        supabaseKey: apiKeys.supabaseKey?.trim(),
      },
      models: models,
      clientName: clientName.trim(),
      description: description.trim(),
      competitors: competitors.split('\n').map(c => c.trim()).filter(Boolean),
      prompts: prompts.split('\n').map(p => p.trim()).filter(Boolean),
      additionalQuestions: additionalQuestions.split('\n').map(q => q.trim()).filter(Boolean),
      broadMatch,
    });
  };
  
  const isSubmitDisabled = !clientName || !competitors || !prompts || selectedProviders.length === 0 || 
    selectedProviders.some(p => {
        if (p === 'openai-websearch') return !apiKeys['openai'];
        return providerDetails[p].requiresKey && !apiKeys[p as 'gemini' | 'openai' | 'perplexity']
    }) ||
    selectedProviders.some(p => !models[p]) ||
    (!!apiKeys.supabaseUrl !== !!apiKeys.supabaseKey); // Both supabase fields must be filled or empty

  const loadedConfig = loadedConfigId ? savedConfigs.find(c => c.id === loadedConfigId) : null;
  
  const renderApiKeyField = (provider: 'gemini' | 'openai' | 'perplexity', label: string) => {
        let status = verificationStatus[provider];
        let error = verificationErrors[provider];

        // If rendering the shared OpenAI key field, ensure the correct status is shown
        // if only the 'openai-websearch' provider is selected. The verification logic
        // correctly updates the 'openai-websearch' status, but the UI indicator
        // was previously only looking at the 'openai' status.
        if (provider === 'openai' && !selectedProviders.includes('openai') && selectedProviders.includes('openai-websearch')) {
            status = verificationStatus['openai-websearch'];
            error = verificationErrors['openai-websearch'];
        }

        const keyStatusClass = {
            idle: 'border-gray-600 focus:ring-green-500 focus:border-green-500',
            verifying: 'border-green-500 focus:ring-green-500',
            valid: 'border-green-500 focus:ring-green-500',
            invalid: 'border-red-500 focus:ring-red-500',
        };

        return (
            <FormField label={label} description={`Required for ${providerDetails[provider].name} models.`}>
                <div className="flex items-center space-x-2">
                    <input
                        type="password"
                        value={apiKeys[provider] || ''}
                        onChange={(e) => handleApiKeyChange(provider, e.target.value)}
                        className={`w-full bg-gray-700 border rounded-lg px-4 py-2 focus:ring-2 focus:outline-none transition text-gray-100 ${keyStatusClass[status]}`}
                        placeholder={`Enter your ${providerDetails[provider].name} API key`}
                        required
                    />
                    <button
                        type="button"
                        onClick={() => handleVerifyKey(provider)}
                        disabled={!apiKeys[provider] || status === 'verifying'}
                        className="bg-gray-600 hover:bg-gray-500 text-gray-200 font-semibold py-2 px-3 rounded-lg transition-colors disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed flex-shrink-0"
                    >
                        Verify
                    </button>
                    <div className="w-5 h-5 flex-shrink-0">
                         <VerificationStatusIndicator status={status} error={error} />
                    </div>
                </div>
            </FormField>
        );
    };

  return (
    <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-2xl shadow-2xl border border-gray-700">
      {isSaveModalOpen && <SaveConfigModal onSave={handleSaveConfiguration} onClose={() => setIsSaveModalOpen(false)} />}
      {isInfoPopoverOpen && <ModelInfoPopover onClose={() => setIsInfoPopoverOpen(false)} />}
      <h2 className="text-3xl font-bold mb-2 text-green-400">LLM Visibility Tracker</h2>
      <p className="text-gray-400 mb-6"><a href="#" target="_blank" rel="noopener noreferrer" className="text-green-400 underline hover:text-green-300 transition-colors">Documentation</a> - Configure your analysis to start tracking.</p>
      
      {loadedConfig && (
        <div className="bg-green-900/50 text-green-300 p-3 rounded-lg border border-green-800 mb-6 text-center text-sm shadow-inner" role="status">
            <span className="font-semibold">Current Preset Loaded:</span> {loadedConfig.name}
        </div>
      )}

      <div className="bg-gray-900/70 p-6 rounded-lg border border-gray-700 mb-6">
        <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-semibold text-gray-100">Configuration Presets</h3>
            <button
                onClick={() => setIsSaveModalOpen(true)}
                className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-3 rounded-lg transition-colors text-sm"
            >
                Save Current
            </button>
        </div>
        {isLoadingConfigs ? (
          <p className="text-gray-500 text-sm">Loading presets...</p>
        ) : savedConfigs.length > 0 ? (
            <ul className="space-y-2">
                {savedConfigs.map(config => (
                    <li key={config.id} className="bg-gray-800 p-3 rounded-md flex justify-between items-center border border-gray-700 hover:bg-gray-700/50 transition-colors">
                        <span className="font-medium text-gray-300">{config.name}</span>
                        <div className="space-x-2">
                            <button onClick={() => handleLoadConfiguration(config.id)} className="text-sm bg-green-500 hover:bg-green-600 text-gray-900 font-semibold py-1 px-3 rounded-md transition-colors">Load</button>
                            <button onClick={() => onDeleteConfiguration(config.id, config.name)} className="text-sm bg-red-900/50 hover:bg-red-900/80 text-red-300 font-semibold py-1 px-3 rounded-md transition-colors">Delete</button>
                        </div>
                    </li>
                ))}
            </ul>
        ) : (
            <p className="text-gray-500 text-sm">No saved presets found. Connect to Supabase or fill out the form and click "Save Current" to create one.</p>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

        <div className="bg-gray-900/70 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-100">Data Storage (Supabase)</h3>
            <div className="space-y-4">
                <FormField label="Supabase Project URL" description="If provided, reports and configurations will be saved to your Supabase project.">
                    <input type="text" value={apiKeys.supabaseUrl || ''} onChange={(e) => handleApiKeyChange('supabaseUrl', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" placeholder="e.g., https://xyz.supabase.co" />
                </FormField>
                <FormField label="Supabase Anon Key" description="The public anonymous key for your Supabase project.">
                    <input type="password" value={apiKeys.supabaseKey || ''} onChange={(e) => handleApiKeyChange('supabaseKey', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" placeholder="Enter your Supabase anon key" />
                </FormField>
            </div>
        </div>
        
        <div className="bg-gray-900/70 p-6 rounded-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-100">LLM Providers & Models</h3>
            <div>
                <div className="flex items-center space-x-2">
                    <label className="block text-lg font-medium text-gray-200">Select Providers</label>
                    <button
                        type="button"
                        onClick={() => setIsInfoPopoverOpen(true)}
                        className="text-gray-500 hover:text-green-400 transition-colors"
                        aria-label="View model information and pricing"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
                <p className="text-sm text-gray-400 mb-2">Choose which AI models to use for the analysis. You can select multiple.</p>
                <div className="grid grid-cols-2 gap-3">
                  {(Object.keys(providerDetails) as Provider[]).map(p => (
                    <label key={p} className={`flex items-center space-x-3 p-3 rounded-lg border-2 transition-colors cursor-pointer ${selectedProviders.includes(p) ? 'border-green-500 bg-green-900/30' : 'border-gray-600 bg-gray-900 hover:bg-gray-800'}`}>
                      <input type="checkbox" checked={selectedProviders.includes(p)} onChange={() => handleProviderToggle(p)} className="h-5 w-5 rounded bg-gray-600 border-gray-500 text-green-500 focus:ring-green-500" />
                      <span className="font-medium text-gray-200">{providerDetails[p].name}</span>
                    </label>
                  ))}
                </div>
            </div>
            <div className="space-y-4 mt-4">
              {selectedProviders.includes('gemini') && (
                  <>
                    {renderApiKeyField('gemini', 'Google Gemini API Key')}
                    <FormField label="Gemini Model" description="Select the model for analysis.">
                        <select value={models.gemini || ''} onChange={(e) => handleModelChange('gemini', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition">
                            {modelOptions.gemini?.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </FormField>
                  </>
              )}
              {(selectedProviders.includes('openai') || selectedProviders.includes('openai-websearch')) && (
                 renderApiKeyField('openai', 'OpenAI API Key')
              )}
              {selectedProviders.includes('openai') && (
                    <FormField label="OpenAI Model" description="Select the model for analysis.">
                        <select value={models.openai || ''} onChange={(e) => handleModelChange('openai', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition">
                            {modelOptions.openai?.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </FormField>
              )}
               {selectedProviders.includes('openai-websearch') && (
                    <FormField label="OpenAI Web Search Model" description="Uses the gpt-4o-search-preview model for web-enabled responses.">
                        <select value={models['openai-websearch'] || ''} onChange={(e) => handleModelChange('openai-websearch', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition">
                            {modelOptions['openai-websearch']?.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </FormField>
              )}
              {selectedProviders.includes('perplexity') && (
                  <>
                    {renderApiKeyField('perplexity', 'Perplexity API Key')}
                     <FormField label="Perplexity Model" description="Select the model for analysis.">
                        <select value={models.perplexity || ''} onChange={(e) => handleModelChange('perplexity', e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition">
                            {modelOptions.perplexity?.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                    </FormField>
                  </>
              )}
            </div>
        </div>

        <FormField label="Client Brand Name" description="The primary brand you want to track.">
          <input type="text" value={clientName} onChange={(e) => setClientName(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" placeholder="e.g., Travyk" required />
        </FormField>
        
        <FormField label="Analysis Description" description="Optional. A brief description for this analysis, which will be included in the report.">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-20 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" placeholder="e.g., A set of prompts used by personas looking for SEO services" />
        </FormField>
        
        <FormField label="Competitor Brands" description="List each competitor on a new line.">
          <textarea value={competitors} onChange={(e) => setCompetitors(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-24 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" placeholder="e.g., Byteffekt&#x0a;Webzaait&#x0a;Online Exposure" required />
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
                    <p className="text-xs text-gray-400">When enabled, the analysis will count variations. E.g., a search for "Social Hub" will also match "The Social Hub" and "Social Hub Groningen".</p>
                </div>
            </label>
        </div>

        <FormField label="Prompts" description="List each search prompt on a new line.">
          <textarea value={prompts} onChange={(e) => setPrompts(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-32 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" placeholder="e.g., Wat is het beste SEO bureau in Friesland?&#x0a;Welk marketing bureau in Friesland kan mij helpen met SEO?" required />
        </FormField>
        
        <FormField label="Additional Analysis Questions" description="Optional. Ask specific questions about each LLM response. List each question on a new line.">
          <textarea value={additionalQuestions} onChange={(e) => setAdditionalQuestions(e.target.value)} className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 h-24 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100" placeholder="e.g., What are the mentioned USPs of Travyk in comparison to the other brands mentioned?" />
        </FormField>

        <div className="pt-4">
            <button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-gray-900 font-bold text-lg py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed disabled:scale-100" disabled={isSubmitDisabled}>
                Start Analysis
            </button>
             {isSubmitDisabled && (!!apiKeys.supabaseUrl !== !!apiKeys.supabaseKey) && 
                <p className="text-center text-red-400 text-sm mt-2">Please provide both the Supabase URL and Key, or leave both empty.</p>
            }
        </div>
      </form>
    </div>
  );
};