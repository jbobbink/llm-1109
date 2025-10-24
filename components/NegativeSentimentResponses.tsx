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

const ProviderResponseContent: React.FC<{ providerResponse: ProviderResponse, searchTerm: string }> = ({ providerResponse, searchTerm }) => {
    
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
      <div className="space-y-4">
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
                      <div key={analysis.brandName} className={`p-3 rounded-md ${analysis.sentiment === 'Negative' ? 'bg-red-900/30 border border-red-800 shadow-sm' : 'bg-gray-900/70'}`}>
                          <p className="font-semibold text-gray-200">{analysis.brandName}</p>
                          <p className="text-sm text-gray-400">Mentions: {analysis.mentions}</p>
                          <SentimentBadge sentiment={analysis.sentiment} />
                      </div>
                  ))}
              </div>
          </div>
      </div>
    );
}


const NegativeResponseCard: React.FC<{ result: AnalysisResult; promptIndex: number; config: AppConfig; searchTerm: string }> = ({ result, promptIndex, config, searchTerm }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden shadow-sm">
            <button
                className="w-full text-left p-4 flex justify-between items-center bg-gray-800/50 hover:bg-gray-700/50 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
                aria-expanded={isOpen}
            >
                <h4 className="font-semibold text-gray-300">
                    <span className="text-green-400 mr-2">Original Prompt {promptIndex + 1}:</span> 
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
                <div className="p-6 space-y-6">
                    {result.providerResponses.map((pResponse, pIndex) => (
                        <div key={pIndex} className="border-t border-gray-700 pt-6 first:border-t-0 first:pt-0">
                             <h5 className="font-semibold text-gray-200 mb-2">{getProviderDisplayName(pResponse.provider, config)}</h5>
                             <ProviderResponseContent providerResponse={pResponse} searchTerm={searchTerm} />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const NegativeSentimentResponses: React.FC<{ results: (AnalysisResult & { originalIndex: number })[], config: AppConfig, searchTerm: string }> = ({ results, config, searchTerm }) => {
    if (results.length === 0) {
        return null;
    }

    return (
        <div className="bg-red-900/20 border border-red-800 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-1 text-red-300">Negative Sentiment Highlights</h3>
            <p className="text-sm text-red-400 mb-4">The following prompts generated responses with negative sentiment towards one or more brands.</p>
            <div className="space-y-4">
                {results.map((result, index) => (
                    <NegativeResponseCard key={index} result={result} promptIndex={result.originalIndex} config={config} searchTerm={searchTerm} />
                ))}
            </div>
        </div>
    );
};