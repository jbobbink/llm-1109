import React, { useState } from 'react';
import type { SavedReport } from '../types';

interface SavedReportsListProps {
  reports: SavedReport[];
  onView: (htmlContent: string) => void;
  onDelete: (id: string) => void;
  onShare: (id: string) => void;
  sharingReportId: string | null;
}

export const SavedReportsList: React.FC<SavedReportsListProps> = ({ reports, onView, onDelete, onShare, sharingReportId }) => {
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  if (reports.length === 0) {
    return null;
  }
  
  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopiedLink(link);
    setTimeout(() => setCopiedLink(null), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
      <h2 className="text-3xl font-bold mb-2 text-green-400">Saved Reports</h2>
      <p className="text-gray-400 mb-6">These reports are stored in your browser. Share a report to create a permanent, shareable link.</p>
      
      <div className="space-y-3">
        {reports.sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((report) => (
          <div key={report.id} className="bg-gray-900/50 p-4 rounded-lg border border-gray-700 flex justify-between items-center">
            <div>
              <p className="font-semibold text-gray-200">{report.clientName}</p>
              <p className="text-sm text-gray-400">
                Saved on: {new Date(report.createdAt).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => onView(report.htmlContent)}
                className="bg-gray-700 hover:bg-gray-600 text-green-400 font-bold py-2 px-3 rounded-md transition-colors"
                title="View Report"
              >
                View
              </button>
               {report.shareableLink ? (
                  <button 
                    onClick={() => handleCopyLink(report.shareableLink!)}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors w-24 text-center"
                    title="Copy shareable link"
                  >
                   {copiedLink === report.shareableLink ? 'Copied!' : 'Copy Link'}
                  </button>
               ) : (
                  <button 
                    onClick={() => onShare(report.id)}
                    disabled={sharingReportId === report.id}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-3 rounded-md transition-colors w-24 text-center disabled:bg-gray-600 disabled:cursor-wait"
                    title="Create a shareable link"
                  >
                    {sharingReportId === report.id ? 'Creating...' : 'Share'}
                  </button>
               )}
              <button 
                onClick={() => onDelete(report.id)}
                className="bg-red-800/50 hover:bg-red-800 text-red-300 font-bold py-2 px-3 rounded-md transition-colors"
                title="Delete Report"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
