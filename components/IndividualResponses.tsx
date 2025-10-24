import React, { useState, useMemo } from 'react';
import type { AnalysisResult, BrandAnalysis, Provider, ProviderResponse, AppConfig } from '../types';
import { marked } from 'marked';

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    'openai-websearch': 'OpenAI Web Search',
    perplexity: 'Perplexity',
};

const getProviderDisplayName = (provider: Provider, config: AppConfig): string => {
    const model = config.models[provider];
    return model ? `${providerBaseNames[provider]} (${model})` : providerBaseNames[provider];
}

const Highlighted: React.FC<{ text: string; highlight: string }> = ({ text, highlight }) => {
    if (!highlight.trim() || !text) {
        return <>{text}</>;
    }
    const regex = new RegExp(`(${highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === highlight.toLowerCase() 
                    ? <mark key={i} className="bg-green-400 text-gray-900 px-1 rounded-sm">{part}</mark> 
                    : <React.Fragment key={i}>{part}</React.Fragment>
            )}
        </>
    );
};


const SentimentBadge: React.FC<{ sentiment: BrandAnalysis['sentiment'] }> = ({ sentiment }) => {
    const sentimentClasses = {
        Positive: 'bg-green-900/50 text-green-300 border-green-700',
        Neutral: 'bg-gray-700 text-gray-300 border-gray-600',
        Negative: 'bg-red-900/50 text-red-300 border-red-700',
        'Not Mentioned': 'bg-gray-600/50 text-gray-400 border-gray-500'
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${sentimentClasses[sentiment]}`}>
            {sentiment}
        </span>
    );
};

const ProviderResponseContent: React.FC<{ providerResponse: ProviderResponse; searchTerm: string }> = ({ providerResponse, searchTerm }) => {
    if (providerResponse.error) {
        return (
            <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                <strong className="font-bold">An error occurred with this provider:</strong>
                <p className="mt-1 text-sm">{providerResponse.error}</p>
            </div>
        );
    }
    
    const highlightedResponse = useMemo(() => {
        let response = providerResponse.response || '';
        if (searchTerm.trim()) {
            const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
            response = response.replace(regex, '<mark class="bg-green-400 text-gray-900 px-1 rounded-sm">$1</mark>');
        }
        return response;
    }, [providerResponse.response, searchTerm]);
    
    const htmlResponse = useMemo(() => marked.parse(highlightedResponse), [highlightedResponse]);

    return (
      <div className="space-y-6">
          <div>
              <h5 className="font-semibold text-green-400 mb-2">LLM Response</h5>
              <div
                  className="prose prose-sm prose-invert max-w-none bg-gray-900 p-4 rounded-md text-gray-300"
                  dangerouslySetInnerHTML={{ __html: htmlResponse }}
              />
          </div>
           <div>
              <h5 className="font-semibold text-green-400 mb-2">Brand Analysis</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {providerResponse.brandAnalyses.map(analysis => (
                      <div key={analysis.brandName} className="bg-gray-900/70 p-3 rounded-md border border-gray-700">
                          <p className="font-semibold text-gray-200">{analysis.brandName}</p>
                          <p className="text-sm text-gray-400">Mentions: {analysis.mentions}</p>
                          <SentimentBadge sentiment={analysis.sentiment} />
                      </div>
                  ))}
              </div>
          </div>
          {providerResponse.citations && providerResponse.citations.length > 0 && (
            <div>
                <h5 className="font-semibold text-green-400 mb-2">Citations</h5>
                <div className="bg-gray-900/70 p-4 rounded-md text-gray-200 border border-gray-700">
                    {providerResponse.provider === 'perplexity' ? (
                        <ol className="list-decimal list-inside space-y-2 text-sm">
                            {providerResponse.citations.sort((a,b) => a.index - b.index).map(citation => (
                                <li key={citation.index}>
                                    <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-400 underline break-all">
                                        {citation.url}
                                    </a>
                                </li>
                            ))}
                        </ol>
                    ) : (
                        <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="border-b border-gray-600">
                                    <th className="py-2 pr-4 font-semibold">Title</th>
                                    <th className="py-2 font-semibold">URL</th>
                                </tr>
                            </thead>
                            <tbody>
                                {providerResponse.citations.sort((a,b) => a.index - b.index).map(citation => (
                                    <tr key={citation.index} className="border-b border-gray-700 last:border-b-0">
                                        <td className="py-2 pr-4 align-top">
                                            {citation.title && citation.title.trim() ? citation.title : 'N/A'}
                                        </td>
                                        <td className="py-2 align-top">
                                            <a href={citation.url} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-green-400 underline break-all" title={citation.url}>
                                                {citation.url}
                                            </a>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
          )}
      </div>
    );
}


const ResponseCard: React.FC<{ result: AnalysisResult; index: number; config: AppConfig; searchTerm: string }> = ({ result, index, config, searchTerm }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Provider>(config.providers[0]);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <button
                className="w-full text-left p-4 flex justify-between items-center bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-semibold text-gray-300">
                    <span className="text-green-400 mr-2">Prompt {index + 1}:</span> 
                    <Highlighted text={result.prompt} highlight={searchTerm} />
                </h4>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            {isOpen && (
                <div className="p-1 md:p-2 bg-gray-800">
                    <div className="border-b border-gray-700">
                       <nav className="flex -mb-px space-x-1 md:space-x-4" aria-label="Tabs">
                         {config.providers.map(provider => {
                           const pResponse = result.providerResponses.find(pr => pr.provider === provider);
                           const hasError = !!pResponse?.error;
                           return (
                             <button
                               key={provider}
                               onClick={() => setActiveTab(provider)}
                               className={`whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm transition-colors
                                 ${activeTab === provider ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'}
                                 ${hasError ? 'text-red-400' : ''}`}
                             >
                               {getProviderDisplayName(provider, config)}
                             </button>
                           );
                         })}
                       </nav>
                    </div>
                    <div className="pt-6 pb-2 px-4">
                       {result.providerResponses.find(pr => pr.provider === activeTab) ? (
                            <ProviderResponseContent providerResponse={result.providerResponses.find(pr => pr.provider === activeTab)!} searchTerm={searchTerm} />
                       ) : (
                           <p className="text-gray-500">No response available for this provider.</p>
                       )}
                    </div>
                </div>
            )}
        </div>
    );
}

export const IndividualResponses: React.FC<{ results: AnalysisResult[], config: AppConfig, searchTerm: string }> = ({ results, config, searchTerm }) => {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Individual Prompt Responses</h3>
            <div className="space-y-4">
                {results.map((result, index) => (
                    <ResponseCard key={index} result={result} index={index} config={config} searchTerm={searchTerm} />
                ))}
            </div>
        </div>
    );
};

// --- Raw API Responses ---

const RawResponseCard: React.FC<{ result: AnalysisResult; index: number; config: AppConfig; searchTerm: string }> = ({ result, index, config, searchTerm }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Provider>(config.providers[0]);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <button
                className="w-full text-left p-4 flex justify-between items-center bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <h4 className="font-semibold text-gray-300">
                    <span className="text-green-400 mr-2">Prompt {index + 1}:</span> 
                    <Highlighted text={result.prompt} highlight={searchTerm} />
                </h4>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            {isOpen && (
                <div className="p-1 md:p-2 bg-gray-800">
                    <div className="border-b border-gray-700">
                       <nav className="flex -mb-px space-x-1 md:space-x-4" aria-label="Tabs">
                         {config.providers.map(provider => {
                           const pResponse = result.providerResponses.find(pr => pr.provider === provider);
                           const hasError = !!pResponse?.error;
                           return (
                             <button
                               key={provider}
                               onClick={() => setActiveTab(provider)}
                               className={`whitespace-nowrap py-3 px-2 md:px-4 border-b-2 font-medium text-sm transition-colors
                                 ${activeTab === provider ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-600'}
                                 ${hasError ? 'text-red-400' : ''}`}
                             >
                               {getProviderDisplayName(provider, config)}
                             </button>
                           );
                         })}
                       </nav>
                    </div>
                    <RawResponseContent result={result} activeTab={activeTab} searchTerm={searchTerm} />
                </div>
            )}
        </div>
    );
}

const RawResponseContent: React.FC<{result: AnalysisResult, activeTab: Provider, searchTerm: string}> = ({result, activeTab, searchTerm}) => {
    const [copied, setCopied] = useState(false);
    const providerResponse = result.providerResponses.find(pr => pr.provider === activeTab);

    if (!providerResponse) {
        return <p className="text-gray-500 p-4">No response available for this provider.</p>;
    }

    const handleCopy = () => {
        if (providerResponse?.rawResponse) {
            navigator.clipboard.writeText(providerResponse.rawResponse);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };
    
    const highlightedRawResponse = useMemo(() => {
        let raw = providerResponse?.rawResponse || 'No raw response available.';
        if (searchTerm.trim()) {
            const regex = new RegExp(`(${searchTerm.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')})`, 'gi');
            // Must escape HTML characters in the raw response first to avoid breaking the DOM
            const escapedRaw = raw.replace(/</g, '&lt;').replace(/>/g, '&gt;');
            raw = escapedRaw.replace(regex, '<mark class="bg-green-400 text-gray-900 px-1 rounded-sm">$1</mark>');
        }
        return raw;
    }, [providerResponse, searchTerm]);

    return (
        <div className="pt-6 pb-2 px-4 relative">
             <button
                onClick={handleCopy}
                className="absolute top-4 right-4 bg-gray-600 hover:bg-gray-500 text-gray-200 text-xs font-semibold py-1 px-3 rounded-md transition-colors z-10"
                >
                {copied ? 'Copied!' : 'Copy JSON'}
            </button>
            <div className="bg-black p-4 rounded-md max-h-96 overflow-y-auto">
                <pre className="text-xs text-gray-300 whitespace-pre-wrap break-all">
                    <code dangerouslySetInnerHTML={{ __html: highlightedRawResponse }} />
                </pre>
            </div>
        </div>
    );
};

export const RawResponses: React.FC<{ results: AnalysisResult[], config: AppConfig, searchTerm: string }> = ({ results, config, searchTerm }) => {
    return (
        <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Raw API Responses</h3>
            <p className="text-gray-400 mb-4 text-sm">This section contains the complete, unparsed JSON responses from each LLM provider for debugging and verification purposes.</p>
            <div className="space-y-4">
                {results.map((result, index) => (
                    <RawResponseCard key={index} result={result} index={index} config={config} searchTerm={searchTerm} />
                ))}
            </div>
        </div>
    );
};