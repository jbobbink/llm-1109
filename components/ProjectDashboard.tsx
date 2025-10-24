

import React, { useState, useEffect, useCallback } from 'react';
import type { Project, ProjectRun, RunSummary, AnalysisResult, Task } from '../types';
// FIX: Corrected import path for supabaseService.
import { getProjectRuns, createProjectRun } from '../services/supabaseService';
import { runAnalysis } from '../services/geminiService';
import { MentionsTrendChart } from './MentionsTrendChart';
import { SentimentTrendChart } from './SentimentTrendChart';
import { LoadingStatus } from './LoadingSpinner';
import { ResultsDashboard } from './ResultsDashboard';

interface ProjectDashboardProps {
  project: Project;
  supabaseConfig: { url: string; key: string };
  onBack: () => void;
}

const calculateRunSummary = (results: AnalysisResult[], clientName: string): RunSummary => {
  let clientMentions = 0;
  const sentimentCounts = { positive: 0, neutral: 0, negative: 0 };

  results.forEach(result => {
    result.providerResponses.forEach(pResponse => {
      pResponse.brandAnalyses.forEach(analysis => {
        if (analysis.brandName && typeof analysis.brandName === 'string' && analysis.brandName.toLowerCase() === clientName.toLowerCase()) {
          clientMentions += analysis.mentions;
        }
        if (analysis.sentiment === 'Positive') sentimentCounts.positive++;
        else if (analysis.sentiment === 'Neutral') sentimentCounts.neutral++;
        else if (analysis.sentiment === 'Negative') sentimentCounts.negative++;
      });
    });
  });

  return { clientMentions, sentimentCounts };
};

export const ProjectDashboard: React.FC<ProjectDashboardProps> = ({ project, supabaseConfig, onBack }) => {
  const [runs, setRuns] = useState<ProjectRun[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [viewingRun, setViewingRun] = useState<ProjectRun | null>(null);

  const fetchRuns = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedRuns = await getProjectRuns(supabaseConfig.url, supabaseConfig.key, project.id);
      setRuns(fetchedRuns);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load project runs.');
    } finally {
      setIsLoading(false);
    }
  }, [supabaseConfig, project.id]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    setTasks([]);
    try {
      const analysisResults = await runAnalysis(project.config, setTasks);
      const summary = calculateRunSummary(analysisResults, project.config.clientName);
      await createProjectRun(supabaseConfig.url, supabaseConfig.key, {
        projectId: project.id,
        results: analysisResults,
        summary,
      });
      await fetchRuns(); // Refresh data
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An error occurred during analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  const handleExportJson = (run: ProjectRun) => {
    const jsonContent = JSON.stringify(run.results, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const safeProjectName = project.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const safeClientName = project.config.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    const timestamp = new Date(run.createdAt).toISOString().replace(/[:.]/g, '-');
    a.download = `${safeProjectName}_${safeClientName}_run_${timestamp}.json`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  if (viewingRun) {
      return (
          <div>
              <button onClick={() => setViewingRun(null)} className="mb-4 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold py-2 px-4 rounded-lg transition-colors">
                  &larr; Back to Project Dashboard
              </button>
              <ResultsDashboard 
                results={viewingRun.results} 
                config={project.config} 
                saveStatus='idle'
             />
          </div>
      )
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-3xl font-bold text-green-400">{project.name}</h2>
          <p className="text-gray-400 mt-1">{project.description || 'Project Dashboard'}</p>
        </div>
        <button 
          onClick={handleRunAnalysis} 
          disabled={isAnalyzing} 
          className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:text-gray-400"
        >
          {isAnalyzing ? 'Analyzing...' : 'Run Analysis Now'}
        </button>
      </div>

      {error && <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg" role="alert">{error}</div>}
      
      {isAnalyzing && <LoadingStatus tasks={tasks} />}
      
      {isLoading ? (
        <p className="text-gray-400">Loading historical data...</p>
      ) : runs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <MentionsTrendChart runs={runs} clientName={project.config.clientName} />
            <SentimentTrendChart runs={runs} />
          </div>
          <div className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700">
            <h3 className="text-xl font-semibold mb-4 text-gray-100">Run History</h3>
            <div className="space-y-3">
              {runs.slice().reverse().map(run => (
                <div key={run.id} className="bg-gray-900/70 p-3 rounded-lg border border-gray-700 flex justify-between items-center">
                  <div>
                    <p className="font-medium text-gray-200">Run completed on {new Date(run.createdAt).toLocaleString()}</p>
                    <p className="text-sm text-gray-400">
                      Client Mentions: {run.summary.clientMentions}
                      <span className="ml-2 pl-2 border-l border-gray-600">
                        {run.results.length} {run.results.length === 1 ? 'Prompt' : 'Prompts'}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button onClick={() => setViewingRun(run)} className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-3 rounded-md transition-colors border border-gray-600">
                        View Report
                    </button>
                    <button
                      onClick={() => handleExportJson(run)}
                      className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-3 rounded-md transition-colors border border-gray-600"
                      title="Export raw JSON results for this run"
                    >
                      Export JSON
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <div className="text-center py-8 border-2 border-dashed border-gray-700 rounded-lg">
          <h3 className="text-lg font-medium text-gray-200">No Data Yet</h3>
          <p className="text-gray-500 mt-1">Click "Run Analysis Now" to generate the first data point for this project.</p>
        </div>
      )}
    </div>
  );
};