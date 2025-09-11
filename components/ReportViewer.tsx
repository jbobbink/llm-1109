import React from 'react';

interface ReportViewerProps {
  htmlContent: string;
  onClose: () => void;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ htmlContent, onClose }) => {
  return (
    <div className="fixed inset-0 bg-gray-900 z-50 flex flex-col">
       <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-green-400">Viewing Saved Report</h2>
          <button 
            onClick={onClose} 
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
          >
            &larr; Back to App
          </button>
       </div>
       <iframe
        srcDoc={htmlContent}
        title="Saved Report"
        className="w-full h-full border-0"
        sandbox="allow-scripts allow-same-origin" // allow scripts for interactivity like search, but restrict other capabilities for security
       />
    </div>
  );
};
