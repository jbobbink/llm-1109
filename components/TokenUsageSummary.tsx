
import React, { useState } from 'react';
import type { AnalysisResult, AppConfig, Provider } from '../types';

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    'openai-websearch': 'OpenAI Web Search',
    perplexity: 'Perplexity',
};

interface TokenUsageSummaryProps {
    results: AnalysisResult[];
    config: AppConfig;
}

export const TokenUsageSummary: React.FC<TokenUsageSummaryProps> = ({ results, config }) => {
    const [isOpen, setIsOpen] = useState(false);

    const hasTokenData = results.some(r => r.providerResponses.some(pr => (pr.tokenUsage || pr.analysisTokenUsage)));

    if (!hasTokenData) {
        return null;
    }

    return (
        <div className="bg-gray-50 border border-gray-200 rounded-xl">
            <button
                className="w-full text-left p-4 flex justify-between items-center hover:bg-gray-100 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <div className="flex items-center space-x-3">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h3m-3-10h.01M9 10h.01M12 10h.01M12 7h.01M15 7h.01M15 10h.01M9 13h.01M12 13h.01M15 13h.01M9 16h.01M12 16h.01M15 16h.01" />
                    </svg>
                    <h3 className="text-xl font-semibold">Token Usage Summary</h3>
                </div>
                <svg
                    className={`w-6 h-6 text-gray-500 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            {isOpen && (
                <div className="p-6 border-t border-gray-200">
                    <p className="text-gray-500 mb-4 text-sm">
                        This table shows the input (prompt) and output (completion) tokens used by each provider for each prompt, including all analysis steps.
                    </p>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="p-3 text-sm font-semibold text-gray-500 bg-gray-100 rounded-tl-lg align-bottom">Prompt</th>
                                    {config.providers.map((p) => (
                                        <th key={p} colSpan={2} className="p-3 text-sm font-semibold text-gray-500 bg-gray-100 text-center border-l border-gray-200" title={providerBaseNames[p]}>
                                            {config.models[p] || 'N/A'}
                                        </th>
                                    ))}
                                </tr>
                                <tr>
                                    {config.providers.map(p => (
                                        <React.Fragment key={`${p}-sub`}>
                                            <th className="p-2 text-xs font-medium text-gray-500 bg-gray-100 text-right border-l border-gray-200">Input</th>
                                            <th className="p-2 text-xs font-semibold text-gray-600 bg-gray-100 text-right">Output</th>
                                        </React.Fragment>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {results.map((result, index) => (
                                    <tr key={index} className="border-b last:border-b-0">
                                        <td className="p-3 text-sm text-gray-800 max-w-sm truncate" title={result.prompt}>
                                            {result.prompt}
                                        </td>
                                        {config.providers.map(p => {
                                            const pResponse = result.providerResponses.find(pr => pr.provider === p);
                                            const totalInput = (pResponse?.tokenUsage?.inputTokens || 0) + (pResponse?.analysisTokenUsage?.inputTokens || 0);
                                            const totalOutput = (pResponse?.tokenUsage?.outputTokens || 0) + (pResponse?.analysisTokenUsage?.outputTokens || 0);
                                            const hasData = totalInput > 0 || totalOutput > 0;

                                            return (
                                                <React.Fragment key={`${p}-${index}`}>
                                                    <td className="p-3 text-right text-gray-700 font-mono text-sm border-l border-gray-200">
                                                        {hasData ? totalInput.toLocaleString() : 'N/A'}
                                                    </td>
                                                    <td className="p-3 text-right text-gray-800 font-mono text-sm">
                                                        {hasData ? totalOutput.toLocaleString() : 'N/A'}
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
};
