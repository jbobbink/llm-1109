import React, { useState, useCallback, useEffect } from 'react';
import { SetupForm } from './components/SetupForm';
import { ResultsDashboard } from './components/ResultsDashboard';
import { runAnalysis } from './services/geminiService';
// FIX: Corrected import path for supabaseService.
import { getReports, saveReport, deleteReport, getConfigurations, saveConfiguration, updateConfiguration, deleteConfiguration, saveRawResponses } from './services/supabaseService';
import type { AnalysisResult, AppConfig, SavedReport, StoredConfiguration, Task, Project } from './types';
import { LoadingStatus } from './components/LoadingSpinner';
import { SavedReportsList } from './components/SavedReportsList';
import { ReportViewer } from './components/ReportViewer';
import { SharePage } from './components/SharePage';
import { generateHtmlReport } from './utils/exportUtils';
// FIX: Corrected import path for ProjectsList.
import { ProjectsList } from './components/ProjectsList';
import { ProjectDashboard } from './components/ProjectDashboard';
import { TotalTokenUsageDashboard } from './components/TotalTokenUsageDashboard';

const TravykLogo: React.FC = () => (
    <svg aria-label="TRAVYK Logo" height="28" viewBox="0 0 180 32" xmlns="http://www.w3.org/2000/svg">
        <text
            x="0"
            y="26"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif"
            fontSize="32"
            fontWeight="800"
            letterSpacing="-2"
            fill="#f3f4f6"
        >
            TRAVY
        </text>
        <text
            x="98"
            y="26"
            fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif"
            fontSize="32"
            fontWeight="800"
            letterSpacing="-2"
            fill="#4ade80"
        >
            K
        </text>
    </svg>
);

interface ShareLinkModalProps {
    link: string;
    onClose: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ link, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg text-left" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-green-400">Share Report Link</h3>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <p className="text-gray-400 mb-2">Anyone with access to this tool and the Supabase project can use this link to view the report:</p>
                        <div className="flex space-x-2">
                            <input 
                                type="text" 
                                readOnly 
                                value={link} 
                                className="w-full bg-gray-700 border border-gray-600 text-gray-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none" 
                            />
                            <button
                                onClick={handleCopy}
                                className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors w-28"
                            >
                                {copied ? 'Copied!' : 'Copy'}
                            </button>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-gray-900/50 rounded-b-xl flex justify-between items-center">
                     <a
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-green-400 hover:text-green-300 font-semibold inline-flex items-center space-x-1"
                     >
                        <span>Open in new tab</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                     </a>
                     <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-2 px-4 rounded-lg transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};

const CONFIG_STORAGE_KEY = 'llm_visibility_configs';

const getSupabaseErrorMessage = (err: unknown): string => {
    const defaultMessage = 'An unknown error occurred.';
    let message = err instanceof Error ? err.message : defaultMessage;
    
    const lowerCaseMessage = message.toLowerCase();

    if (lowerCaseMessage.includes('invalid api key') || lowerCaseMessage.includes('invalid jwt')) {
        return 'Supabase connection failed: Invalid API Key. Please check your credentials and try again.';
    }
    if (lowerCaseMessage.includes('failed to fetch')) {
        return 'Supabase connection failed: Network error. Check the URL and your internet connection.';
    }
    return `Supabase Error: ${message}`;
};

const App: React.FC = () => {
  // App-wide state
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [supabaseConfig, setSupabaseConfig] = useState<{ url: string, key: string } | null>(null);
  
  // View management state
  const [mode, setMode] = useState<'oneOff' | 'projects'>('oneOff');
  const [viewingProject, setViewingProject] = useState<Project | null>(null);
  const [viewingReportHtml, setViewingReportHtml] = useState<string | null>(null);
  const [shareModalLink, setShareModalLink] = useState<string | null>(null);
  const [currentHash, setCurrentHash] = useState(() => window.location.hash);
  const [formKey, setFormKey] = useState(0);

  // One-off analysis state
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(true);
  const [savedConfigs, setSavedConfigs] = useState<StoredConfiguration[]>([]);
  const [isLoadingConfigs, setIsLoadingConfigs] = useState<boolean>(true);
  const [loadedConfigId, setLoadedConfigId] = useState<string | null>(null);

  const fetchReports = useCallback(async (config: { url: string, key: string }) => {
    setIsLoadingReports(true);
    setError(null);
    try {
        const reports = await getReports(config.url, config.key);
        setSavedReports(reports);
    } catch (err) {
        console.error("Failed to fetch reports from Supabase:", err);
        setError(getSupabaseErrorMessage(err));
        setSavedReports([]);
    } finally {
        setIsLoadingReports(false);
    }
  }, []);

  const fetchConfigs = useCallback(async (config: { url: string, key: string }) => {
    setIsLoadingConfigs(true);
    try {
        const configs = await getConfigurations(config.url, config.key);
        setSavedConfigs(configs);
    } catch (err) {
        console.error("Failed to fetch configs from Supabase:", err);
        setError(getSupabaseErrorMessage(err));
        setSavedConfigs([]);
    } finally {
        setIsLoadingConfigs(false);
    }
  }, []);
  
  const fetchAllData = useCallback(async (config: { url: string; key: string; }) => {
    await Promise.all([
        fetchReports(config), 
        fetchConfigs(config),
    ]);
  }, [fetchReports, fetchConfigs]);

  const updateSupabaseConfig = useCallback(async (newConfig: { url: string; key: string } | null) => {
      if (JSON.stringify(newConfig) === JSON.stringify(supabaseConfig)) {
          return;
      }

      setLoadedConfigId(null);
      setViewingProject(null);

      if (newConfig && newConfig.url && newConfig.key) {
          setSupabaseConfig(newConfig);
          localStorage.setItem('supabase_config', JSON.stringify(newConfig));
          await fetchAllData(newConfig);
      } else {
          setSupabaseConfig(null);
          localStorage.removeItem('supabase_config');
          setError(null);
          setIsLoadingReports(true);
          setIsLoadingConfigs(true);
          try {
              setSavedReports(JSON.parse(localStorage.getItem('llm_visibility_reports') || '[]'));
              setSavedConfigs(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || '[]'));
          } catch (e) {
              console.error("Failed to load local data:", e);
              setError("Failed to load local reports or configs.");
              setSavedReports([]);
              setSavedConfigs([]);
          } finally {
              setIsLoadingReports(false);
              setIsLoadingConfigs(false);
          }
      }
  }, [supabaseConfig, fetchAllData]);
  
  const handleClearSupabaseAndResetForm = () => {
    updateSupabaseConfig(null);
    setFormKey(prevKey => prevKey + 1); 
  };


  useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash);
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    try {
        const storedConfig = localStorage.getItem('supabase_config');
        if (storedConfig) {
            updateSupabaseConfig(JSON.parse(storedConfig));
        } else {
            setSavedReports(JSON.parse(localStorage.getItem('llm_visibility_reports') || '[]'));
            setSavedConfigs(JSON.parse(localStorage.getItem(CONFIG_STORAGE_KEY) || '[]'));
            setIsLoadingReports(false);
            setIsLoadingConfigs(false);
        }
    } catch (e) {
        console.error("Failed to load initial data:", e);
        setError("Failed to load initial data.");
        setIsLoadingReports(false);
        setIsLoadingConfigs(false);
    }
  }, [updateSupabaseConfig]);

  const handleProgressUpdate = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  }, []);
  
  const saveGeneratedReport = useCallback(async (resultsToSave: AnalysisResult[], configForSave: AppConfig) => {
    const htmlContent = generateHtmlReport(resultsToSave, configForSave);
    const reportData = {
        clientName: configForSave.clientName,
        htmlContent,
        promptCount: configForSave.prompts.length,
    };

    try {
        if (supabaseConfig) {
            const savedReport = await saveReport(supabaseConfig.url, supabaseConfig.key, reportData);
            if (savedReport && savedReport.id) {
                await saveRawResponses(supabaseConfig.url, supabaseConfig.key, savedReport.id, resultsToSave, configForSave);
            }
            await fetchReports(supabaseConfig);
        } else {
            const newReport: SavedReport = { id: `report-${Date.now()}`, createdAt: new Date().toISOString(), ...reportData };
            const updatedReports = [...savedReports, newReport];
            setSavedReports(updatedReports);
            localStorage.setItem('llm_visibility_reports', JSON.stringify(updatedReports));
        }
        setSaveStatus('success');
    } catch (e) {
        console.error('Failed to auto-save report:', e);
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred while saving.';
        setError(`Failed to auto-save report: ${errorMessage}`);
        setSaveStatus('error');
    }
  }, [savedReports, supabaseConfig, fetchReports]);


  const handleStartAnalysis = useCallback(async (config: AppConfig) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setAppConfig(config);
    setTasks([]);
    setSaveStatus('idle');

    try {
      const analysisResults = await runAnalysis(config, handleProgressUpdate);
      setResults(analysisResults);
      await saveGeneratedReport(analysisResults, config);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [handleProgressUpdate, saveGeneratedReport]);

  const handleReset = () => {
    setAppConfig(null);
    setResults(null);
    setIsLoading(false);
    setError(null);
    setTasks([]);
    setViewingReportHtml(null);
    setLoadedConfigId(null);
    setViewingProject(null);
    if (window.location.hash) {
        window.location.hash = '';
    }
  };

  const handleShareSavedReport = useCallback((reportId: string) => {
    const reportToShare = savedReports.find(r => r.id === reportId);
    if (!reportToShare) return;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}#/share/${reportId}`;
    setShareModalLink(shareUrl);
  }, [savedReports]);

  const handleDeleteReport = useCallback(async (reportId: string) => {
    if (confirm('Are you sure you want to delete this report?')) {
        if (supabaseConfig) {
            try {
                await deleteReport(supabaseConfig.url, supabaseConfig.key, reportId);
                await fetchReports(supabaseConfig);
            } catch (e) {
                alert(`Failed to delete report from Supabase: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
        } else {
            const updatedReports = savedReports.filter(report => report.id !== reportId);
            setSavedReports(updatedReports);
            localStorage.setItem('llm_visibility_reports', JSON.stringify(updatedReports));
        }
    }
  }, [savedReports, supabaseConfig, fetchReports]);

  const handleSaveConfiguration = useCallback(async (configData: Omit<StoredConfiguration, 'id'>) => {
      // FIX: Added a check for c.name to prevent crash on null value from Supabase.
      const existingConfig = savedConfigs.find(c => c.name && c.name.toLowerCase() === configData.name.toLowerCase());

      if (existingConfig) {
          if (confirm(`A configuration named "${configData.name}" already exists. Do you want to overwrite it?`)) {
              if (supabaseConfig) {
                  try {
                      await updateConfiguration(supabaseConfig.url, supabaseConfig.key, existingConfig.id, configData);
                      await fetchConfigs(supabaseConfig);
                      setLoadedConfigId(existingConfig.id);
                      alert(`Configuration "${configData.name}" updated in Supabase!`);
                  } catch (e) {
                      alert(`Failed to update configuration in Supabase: ${e instanceof Error ? e.message : 'Unknown error'}`);
                  }
              } else {
                  const updatedConfigs = savedConfigs.map(c => 
                      c.id === existingConfig.id ? { ...configData, id: existingConfig.id } : c
                  ).sort((a,b) => a.name.localeCompare(b.name));
                  setSavedConfigs(updatedConfigs);
                  localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updatedConfigs));
                  setLoadedConfigId(existingConfig.id);
                  alert(`Configuration "${configData.name}" updated!`);
              }
          }
      } else {
          if (supabaseConfig) {
              try {
                  const newConfig = await saveConfiguration(supabaseConfig.url, supabaseConfig.key, configData);
                  await fetchConfigs(supabaseConfig);
                  setLoadedConfigId(newConfig.id);
                  alert(`Configuration "${configData.name}" saved to Supabase!`);
              } catch (e) {
                  alert(`Failed to save configuration to Supabase: ${e instanceof Error ? e.message : 'Unknown error'}`);
              }
          } else {
              const newConfig: StoredConfiguration = { ...configData, id: `config-${Date.now()}` };
              const updatedConfigs = [...savedConfigs, newConfig].sort((a,b) => a.name.localeCompare(b.name));
              setSavedConfigs(updatedConfigs);
              localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updatedConfigs));
              setLoadedConfigId(newConfig.id);
              alert(`Configuration "${configData.name}" saved!`);
          }
      }
  }, [savedConfigs, supabaseConfig, fetchConfigs]);

  const handleDeleteConfiguration = useCallback(async (configId: string, configName: string) => {
      if (confirm(`Are you sure you want to delete the "${configName}" configuration?`)) {
          if (configId === loadedConfigId) {
            setLoadedConfigId(null);
          }
          if (supabaseConfig) {
              try {
                  await deleteConfiguration(supabaseConfig.url, supabaseConfig.key, configId);
                  await fetchConfigs(supabaseConfig);
              } catch (e) {
                  alert(`Failed to delete configuration from Supabase: ${e instanceof Error ? e.message : 'Unknown error'}`);
              }
          } else {
              const updatedConfigs = savedConfigs.filter(c => c.id !== configId);
              setSavedConfigs(updatedConfigs);
              localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(updatedConfigs));
          }
      }
  }, [savedConfigs, supabaseConfig, fetchConfigs, loadedConfigId]);


  const getRoute = () => {
    if (currentHash.startsWith('#/share/')) {
        const id = currentHash.substring('#/share/'.length);
        if (id) return { page: 'share', id };
    }
    return { page: 'home', id: null };
  };
  
  const route = getRoute();

  if (route.page === 'share') {
      return (
        <div className="min-h-screen bg-gray-900 text-gray-200">
            <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-4 sticky top-0 z-10">
                <div className="container mx-auto flex justify-between items-center">
                    <TravykLogo />
                </div>
            </header>
            <main className="container mx-auto p-4 md:p-8">
                <SharePage reportId={route.id!} supabaseConfig={supabaseConfig} onGoBack={handleReset} />
            </main>
        </div>
    );
  }

  const renderError = (err: string | null) => (
      <div className="max-w-3xl mx-auto bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">
          <div className="flex justify-between items-center">
            <div>
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{err}</span>
            </div>
             {err && err.includes("Supabase") &&
              <button onClick={handleClearSupabaseAndResetForm} className="ml-4 flex-shrink-0 bg-red-600 hover:bg-red-700 text-white font-bold py-1 px-3 rounded-md transition-colors text-sm">
                  Clear Config
              </button>
             }
          </div>
      </div>
  );

  const mainContent = () => {
    if (viewingReportHtml) {
      return <ReportViewer htmlContent={viewingReportHtml} onClose={handleReset} />;
    }
    if (isLoading) {
      return <LoadingStatus tasks={tasks} />;
    }
    if (error && !results) {
       return renderError(error);
    }
    if (results && appConfig) {
      return <ResultsDashboard results={results} config={appConfig} saveStatus={saveStatus} error={error} />;
    }
    if (viewingProject && supabaseConfig) {
      return <ProjectDashboard project={viewingProject} supabaseConfig={supabaseConfig} onBack={() => setViewingProject(null)} />;
    }

    return (
      <div className="space-y-8">
        <div className="flex justify-center">
          <div className="bg-gray-800 p-1 rounded-lg flex space-x-1 border border-gray-700">
            <button
              onClick={() => setMode('oneOff')}
              className={`px-6 py-2 rounded-md font-semibold transition-colors text-sm ${mode === 'oneOff' ? 'bg-gray-700 text-green-400 shadow-md' : 'bg-transparent text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'}`}
            >
              One-off Analysis
            </button>
            <button
              onClick={() => setMode('projects')}
              disabled={!supabaseConfig}
              className={`px-6 py-2 rounded-md font-semibold transition-colors text-sm ${mode === 'projects' ? 'bg-gray-700 text-green-400 shadow-md' : 'bg-transparent text-gray-400 hover:bg-gray-700/50 hover:text-gray-200'} disabled:text-gray-600 disabled:cursor-not-allowed`}
              title={!supabaseConfig ? "Supabase connection is required for Projects" : ""}
            >
              Projects
            </button>
          </div>
        </div>

        {mode === 'oneOff' ? (
          <>
            <SetupForm 
                key={formKey}
                onStartAnalysis={handleStartAnalysis} 
                onSupabaseConfigChange={updateSupabaseConfig}
                savedConfigs={savedConfigs}
                isLoadingConfigs={isLoadingConfigs}
                onSaveConfiguration={handleSaveConfiguration}
                onDeleteConfiguration={handleDeleteConfiguration}
                loadedConfigId={loadedConfigId}
                onSetConfigLoaded={setLoadedConfigId}
            />
            {error && renderError(error)}
            {supabaseConfig && <TotalTokenUsageDashboard supabaseConfig={supabaseConfig} />}
            <SavedReportsList 
                reports={savedReports} 
                isLoading={isLoadingReports}
                onView={(html) => setViewingReportHtml(html)} 
                onDelete={handleDeleteReport} 
                onShare={handleShareSavedReport}
                supabaseConfig={supabaseConfig}
            />
          </>
        ) : (
          <ProjectsList 
            supabaseConfig={supabaseConfig!}
            onViewProject={setViewingProject}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200">
      <header className="bg-gray-900/80 backdrop-blur-sm border-b border-gray-800 p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <TravykLogo />
           {(results || viewingReportHtml || viewingProject) && <button onClick={handleReset} className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors">Back to the app</button>}
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-8">
        {mainContent()}
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm border-t border-gray-800 mt-8">
        Powered by Travyk | LLM Visibility Analysis Tool
      </footer>
      {shareModalLink && <ShareLinkModal link={shareModalLink} onClose={() => setShareModalLink(null)} />}
    </div>
  );
};

export default App;