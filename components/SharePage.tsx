

import React, { useState, useEffect } from 'react';
// FIX: Corrected import path for supabaseService.
import { getReportById } from '../services/supabaseService';
import type { SavedReport } from '../types';
import { ReportViewer } from './ReportViewer';

interface SharePageProps {
  reportId: string;
  supabaseConfig: { url: string, key: string } | null;
  onGoBack: () => void;
}

export const SharePage: React.FC<SharePageProps> = ({ reportId, supabaseConfig, onGoBack }) => {
  const [report, setReport] = useState<SavedReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supabaseConfig) {
      setError("This application has not been configured with Supabase credentials. Cannot fetch shared reports or configurations.");
      setIsLoading(false);
      return;
    }

    const fetchReport = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedReport = await getReportById(supabaseConfig.url, supabaseConfig.key, reportId);
        if (fetchedReport) {
          setReport(fetchedReport);
        } else {
          setError(`Report with ID "${reportId}" not found.`);
        }
      } catch (e) {
        const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
        console.error("Failed to fetch report:", e);
        setError(`Failed to fetch report: ${errorMessage}`);
      } finally {
        setIsLoading(false);
      }
    };

    fetchReport();
  }, [reportId, supabaseConfig]);

  if (isLoading) {
    return (
      <div className="text-center p-8">
        <div className="flex justify-center items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <h2 className="text-2xl font-bold text-green-400">Loading Report...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-900/50 border border-red-700 text-red-300 px-6 py-8 rounded-lg text-center" role="alert">
        <strong className="font-bold text-lg">Error Loading Report</strong>
        <p className="mt-2 mb-6">{error}</p>
        <button onClick={onGoBack} className="bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-2 px-6 rounded-lg transition-colors">
            Go Back
        </button>
      </div>
    );
  }

  if (report) {
    return <ReportViewer htmlContent={report.htmlContent} onClose={() => {}} isSharedView={true} />;
  }

  return null;
};