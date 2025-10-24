import React, { useRef } from 'react';

interface ReportViewerProps {
  htmlContent: string;
  onClose: () => void;
  isSharedView?: boolean;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({ htmlContent, onClose, isSharedView = false }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const handleIframeLoad = () => {
    const iframe = iframeRef.current;
    if (iframe && iframe.contentWindow) {
      // Set a minimum height to avoid collapsing while measuring
      iframe.style.height = '100px';
      const body = iframe.contentWindow.document.body;
      const html = iframe.contentWindow.document.documentElement;
      // Use the max of different height properties for robustness across browsers
      const newHeight = Math.max( body.scrollHeight, body.offsetHeight,
                                 html.clientHeight, html.scrollHeight, html.offsetHeight );
      iframe.style.height = `${newHeight + 20}px`; // Add a small buffer
    }
  };

  // For the non-shared view (full page modal), we need a scrollable container.
  // For the shared view, it's just part of the page flow.
  const containerClasses = isSharedView
    ? "" // No special container classes, it will flow in the main page layout
    : "fixed inset-0 bg-gray-900 z-50 overflow-y-auto"; // A full-screen, scrollable overlay

  return (
    <div className={containerClasses}>
       {!isSharedView && (
         <div className="bg-gray-800 border-b border-gray-700 p-4 flex justify-between items-center sticky top-0 z-10">
            <h2 className="text-xl font-bold text-green-400">Viewing Saved Report</h2>
            <button
              onClick={onClose}
              className="bg-green-500 hover:bg-green-600 text-gray-900 font-bold py-2 px-4 rounded-lg transition-colors"
            >
              &larr; Back to App
            </button>
         </div>
       )}
       <iframe
        ref={iframeRef}
        srcDoc={htmlContent}
        title="Saved Report"
        className="w-full border-0"
        onLoad={handleIframeLoad}
        sandbox="allow-scripts allow-same-origin"
       />
    </div>
  );
};