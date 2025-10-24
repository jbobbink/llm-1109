

import React, { useState } from 'react';
import type { SavedReport } from '../types';
// FIX: Corrected import path for supabaseService.
import { getRawResponsesByReportId } from '../services/supabaseService';

interface SavedReportsListProps {
  reports: SavedReport[];
  isLoading: boolean;
  onView: (htmlContent: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  supabaseConfig: { url: string, key: string } | null;
}

export const SavedReportsList: React.FC<SavedReportsListProps> = ({ reports, isLoading, onView, onDelete, onShare, supabaseConfig }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const handleDownloadRawResponses = async (reportId: string, clientName: string) => {
      if (!supabaseConfig) {
          alert("Supabase is not configured. Raw responses are only available when using Supabase.");
          return;
      }
      setDownloadingId(reportId);
      try {
          const rawResponses = await getRawResponsesByReportId(supabaseConfig.url, supabaseConfig.key, reportId);
          
          if (!rawResponses || rawResponses.length === 0) {
              alert("No raw responses found for this report.");
              return;
          }

          const jsonContent = JSON.stringify(rawResponses, null, 2);
          const blob = new Blob([jsonContent], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;

          const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          a.download = `${safeClientName}_report_raw_responses_${timestamp}.json`;
          
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);

      } catch (e) {
          console.error("Failed to download raw responses:", e);
          alert(`Failed to download raw responses: ${e instanceof Error ? e.message : 'Unknown error'}`);
      } finally {
          setDownloadingId(null);
      }
  };

  const handleExportReport = (htmlContent: string, clientName: string) => {
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const now = new Date();
    const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;

    const safeClientName = clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    a.download = `${safeClientName}_llm_visibility_report_${timestamp}.html`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };


  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700 text-center">
        <div className="flex justify-center items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500"></div>
          <h2 className="text-2xl font-bold text-green-400">Loading Saved Reports...</h2>
        </div>
      </div>
    );
  }

  if (reports.length === 0) {
    return (
        <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
            <h2 className="text-2xl font-bold mb-2 text-green-400">Saved Reports</h2>
            <p className="text-gray-400">No reports found. Run an analysis to save your first report or login to Supabase.</p>
        </div>
    );
  }
  
  const filteredReports = reports.filter(report =>
    // FIX: Added check for report.clientName to prevent crash on null value from Supabase.
    report.clientName && report.clientName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-700">
      <h2 className="text-3xl font-bold mb-2 text-green-400">Saved Reports</h2>
      <p className="text-gray-400 mb-6">These reports are stored in your configured data source. Share a report to get a link for others to view.</p>
      
      <div className="mb-6">
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by client name..."
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100"
            aria-label="Search saved reports"
          />
      </div>

      {filteredReports.length > 0 ? (
        <div className="space-y-3">
          {filteredReports.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((report) => (
            <div key={report.id} className="bg-gray-900/70 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
              <div>
                <p className="font-semibold text-gray-200">{report.clientName}</p>
                <p className="text-sm text-gray-400">
                  Saved on: {new Date(report.createdAt).toLocaleString()}
                  {report.promptCount !== undefined && (
                    <span className="ml-2 pl-2 border-l border-gray-600">
                      {report.promptCount} {report.promptCount === 1 ? 'Prompt' : 'Prompts'}
                    </span>
                  )}
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button 
                  onClick={() => onView(report.htmlContent)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-3 rounded-md transition-colors border border-gray-600"
                  title="View Report"
                >
                  View
                </button>
                <button
                  onClick={() => handleExportReport(report.htmlContent, report.clientName)}
                  className="bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold py-2 px-3 rounded-md transition-colors border border-gray-600"
                  title="Export HTML Report"
                >
                  Export
                </button>
                <button 
                  onClick={() => onShare(report.id)}
                  className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-3 rounded-md transition-colors"
                  title="Get a shareable link"
                >
                  Share
                </button>
                <button 
                  onClick={() => handleDownloadRawResponses(report.id, report.clientName)}
                  disabled={downloadingId === report.id || !supabaseConfig}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-3 rounded-md transition-colors disabled:bg-gray-600 disabled:text-gray-400 disabled:cursor-not-allowed"
                  title={!supabaseConfig ? "Supabase not configured" : "Download raw JSON responses"}
                >
                  {downloadingId === report.id ? (
                      <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                  )}
                </button>
                <button 
                  onClick={() => onDelete(report.id)}
                  className="bg-red-900/50 hover:bg-red-900/80 text-red-300 font-bold py-2 px-3 rounded-md transition-colors"
                  title="Delete Report"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4">
          <p className="text-gray-500">No reports match your search for "{searchQuery}".</p>
        </div>
      )}
    </div>
  );
};