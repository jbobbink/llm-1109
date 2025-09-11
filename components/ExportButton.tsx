
import React from 'react';
import { generateHtmlReport } from '../utils/exportUtils';
import type { AnalysisResult, AppConfig } from '../types';

interface ExportButtonProps {
    results: AnalysisResult[];
    config: AppConfig;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ results, config }) => {
    
    const handleExport = () => {
        const htmlContent = generateHtmlReport(results, config);
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const safeClientName = config.clientName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        a.download = `${safeClientName}_llm_visibility_report.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <button 
            onClick={handleExport}
            className="bg-gray-700 hover:bg-gray-600 text-green-400 font-bold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            <span>Export Report</span>
        </button>
    );
};
