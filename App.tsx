import React, { useState, useCallback, useEffect } from 'react';
import { SetupForm } from './components/SetupForm';
import { ResultsDashboard } from './components/ResultsDashboard';
import { runAnalysis } from './services/geminiService';
import type { AnalysisResult, AppConfig, SavedReport, Task } from './types';
import { LoadingStatus } from './components/LoadingSpinner';
import { SavedReportsList } from './components/SavedReportsList';
import { ReportViewer } from './components/ReportViewer';
import { generateHtmlReport, createHostedReport } from './utils/exportUtils';

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
    sharingState: {
        isSharing: boolean;
        link: string | null;
        error: string | null;
    };
    onClose: () => void;
}

const ShareLinkModal: React.FC<ShareLinkModalProps> = ({ sharingState, onClose }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (sharingState.link) {
            navigator.clipboard.writeText(sharingState.link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-lg text-left" onClick={(e) => e.stopPropagation()}>
                <div className="p-6 border-b border-gray-700">
                    <h3 className="text-xl font-bold text-green-400">Share Report</h3>
                </div>
                <div className="p-6 space-y-4">
                    {sharingState.isSharing && (
                        <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-green-500"></div>
                            <p className="text-gray-300">Creating a secure, shareable link...</p>
                        </div>
                    )}
                    {sharingState.error && (
                        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                            <p><strong className="font-bold">Error:</strong> {sharingState.error}</p>
                        </div>
                    )}
                    {sharingState.link && (
                        <div>
                            <p className="text-gray-400 mb-2">Your report is hosted and can be shared with this public link:</p>
                            <div className="flex space-x-2">
                                <input 
                                    type="text" 
                                    readOnly 
                                    value={sharingState.link} 
                                    className="w-full bg-gray-900 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none" 
                                />
                                <button
                                    onClick={handleCopy}
                                    className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors w-28"
                                >
                                    {copied ? 'Copied!' : 'Copy'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-900/50 rounded-b-xl text-right">
                     <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};


const App: React.FC = () => {
  const [appConfig, setAppConfig] = useState<AppConfig | null>(null);
  const [results, setResults] = useState<AnalysisResult[] | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);

  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [viewingReportHtml, setViewingReportHtml] = useState<string | null>(null);
  const [sharingReport, setSharingReport] = useState<{ reportId: string, isSharing: boolean, link: string | null, error: string | null } | null>(null);

  useEffect(() => {
    try {
      const storedReports = localStorage.getItem('llm_visibility_reports');
      if (storedReports) {
        setSavedReports(JSON.parse(storedReports));
      }
    } catch (e) {
      console.error("Failed to load saved reports:", e);
      localStorage.removeItem('llm_visibility_reports');
    }
  }, []);

  const handleProgressUpdate = useCallback((updatedTasks: Task[]) => {
    setTasks(updatedTasks);
  }, []);

  const handleStartAnalysis = useCallback(async (config: AppConfig) => {
    setIsLoading(true);
    setError(null);
    setResults(null);
    setAppConfig(config);
    setTasks([]);
    try {
      const analysisResults = await runAnalysis(config, handleProgressUpdate);
      setResults(analysisResults);
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'An unknown error occurred during analysis.');
    } finally {
      setIsLoading(false);
    }
  }, [handleProgressUpdate]);

  const handleReset = () => {
    setAppConfig(null);
    setResults(null);
    setIsLoading(false);
    setError(null);
    setTasks([]);
    setViewingReportHtml(null);
  };
  
  const handleSaveReport = useCallback(() => {
    if (!results || !appConfig) return;

    const htmlContent = generateHtmlReport(results, appConfig);
    const newReport: SavedReport = {
        id: `report-${Date.now()}`,
        createdAt: new Date().toISOString(),
        clientName: appConfig.clientName,
        htmlContent: htmlContent,
    };

    const updatedReports = [...savedReports, newReport];
    setSavedReports(updatedReports);
    localStorage.setItem('llm_visibility_reports', JSON.stringify(updatedReports));
    alert('Report saved successfully!');
  }, [results, appConfig, savedReports]);

  const handleShareSavedReport = useCallback(async (reportId: string) => {
    const reportToShare = savedReports.find(r => r.id === reportId);
    if (!reportToShare) return;

    if (reportToShare.shareableLink) {
        setSharingReport({ reportId, isSharing: false, link: reportToShare.shareableLink, error: null });
        return;
    }

    setSharingReport({ reportId, isSharing: true, link: null, error: null });
    try {
        const newLink = await createHostedReport(reportToShare.htmlContent, reportToShare.clientName);
        const updatedReports = savedReports.map(r =>
            r.id === reportId ? { ...r, shareableLink: newLink } : r
        );
        setSavedReports(updatedReports);
        localStorage.setItem('llm_visibility_reports', JSON.stringify(updatedReports));
        setSharingReport({ reportId, isSharing: false, link: newLink, error: null });
    } catch (e) {
        const errorMsg = e instanceof Error ? e.message : 'An unknown error occurred.';
        setSharingReport({ reportId: reportId, isSharing: false, link: null, error: errorMsg });
    }
  }, [savedReports]);

  const handleDeleteReport = useCallback((reportId: string) => {
    if (confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
        const updatedReports = savedReports.filter(report => report.id !== reportId);
        setSavedReports(updatedReports);
        localStorage.setItem('llm_visibility_reports', JSON.stringify(updatedReports));
    }
  }, [savedReports]);

  const handleViewReport = (htmlContent: string) => {
    setViewingReportHtml(htmlContent);
  };

  const mainContent = () => {
    if (viewingReportHtml) {
      return <ReportViewer htmlContent={viewingReportHtml} onClose={handleReset} />;
    }
    if (isLoading) {
      return <LoadingStatus tasks={tasks} />;
    }
    if (error) {
       return (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg relative" role="alert">
                <strong className="font-bold">Error: </strong>
                <span className="block sm:inline">{error}</span>
            </div>
        );
    }
    if (results && appConfig) {
      return <ResultsDashboard results={results} config={appConfig} onSaveReport={handleSaveReport} />;
    }
    return (
      <div className="space-y-12">
        <SetupForm onStartAnalysis={handleStartAnalysis} />
        <SavedReportsList 
            reports={savedReports} 
            onView={handleViewReport} 
            onDelete={handleDeleteReport} 
            onShare={handleShareSavedReport}
            sharingReportId={sharingReport?.isSharing ? sharingReport.reportId : null}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 font-sans">
      <header className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 p-4 sticky top-0 z-10">
        <div className="container mx-auto flex justify-between items-center">
          <TravykLogo />
           {(results || viewingReportHtml) && <button onClick={handleReset} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">Start New Analysis</button>}
        </div>
      </header>
      
      <main className="container mx-auto p-4 md:p-8">
        {mainContent()}
      </main>
      <footer className="text-center p-4 text-gray-500 text-sm border-t border-gray-800 mt-8">
        Powered by Travyk | LLM Visibility Analysis Tool
      </footer>
      {sharingReport && <ShareLinkModal sharingState={sharingReport} onClose={() => setSharingReport(null)} />}
    </div>
  );
};

export default App;