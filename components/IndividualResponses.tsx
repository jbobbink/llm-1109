import React, { useState, useMemo } from 'react';
import type { AnalysisResult, BrandAnalysis, Provider, ProviderResponse, AppConfig } from '../types';
import { marked } from 'marked';

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
    copilot: 'Copilot / Azure'
};

const getProviderDisplayName = (provider: Provider, config: AppConfig): string => {
    const model = config.models[provider];
    return model ? `${providerBaseNames[provider]} (${model})` : providerBaseNames[provider];
}


const SentimentBadge: React.FC<{ sentiment: BrandAnalysis['sentiment'] }> = ({ sentiment }) => {
    const sentimentClasses = {
        Positive: 'bg-green-800 text-green-300 border-green-600',
        Neutral: 'bg-gray-700 text-gray-300 border-gray-500',
        Negative: 'bg-red-800 text-red-300 border-red-600',
        'Not Mentioned': 'bg-gray-800 text-gray-500 border-gray-600'
    };
    return (
        <span className={`px-2 py-1 text-xs font-medium rounded-full border ${sentimentClasses[sentiment]}`}>
            {sentiment}
        </span>
    );
};

const ProviderResponseContent: React.FC<{ providerResponse: ProviderResponse }> = ({ providerResponse }) => {
    if (providerResponse.error) {
        return (
            <div className="bg-red-900/30 border border-red-700 text-red-300 px-4 py-3 rounded-lg">
                <strong className="font-bold">An error occurred with this provider:</strong>
                <p className="mt-1 text-sm">{providerResponse.error}</p>
            </div>
        );
    }
    
    const htmlResponse = useMemo(() => marked.parse(providerResponse.response || ''), [providerResponse.response]);

    return (
      <div className="space-y-6">
          <div>
              <h5 className="font-semibold text-green-400 mb-2">LLM Response</h5>
              <div
                  className="prose prose-invert prose-sm max-w-none bg-gray-900 p-4 rounded-md text-gray-300"
                  dangerouslySetInnerHTML={{ __html: htmlResponse }}
              />
          </div>
           <div>
              <h5 className="font-semibold text-green-400 mb-2">Brand Analysis</h5>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {providerResponse.brandAnalyses.map(analysis => (
                      <div key={analysis.brandName} className="bg-gray-700/50 p-3 rounded-md">
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


const ResponseCard: React.FC<{ result: AnalysisResult; index: number; config: AppConfig }> = ({ result, index, config }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<Provider>(config.providers[0]);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <button
                className="w-full text-left p-4 flex justify-between items-center bg-gray-700/50 hover:bg-gray-700 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-semibold text-gray-200">
                    <span className="text-green-400 mr-2">Prompt {index + 1}:</span> 
                    {result.prompt}
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
                                 ${activeTab === provider ? 'border-green-500 text-green-400' : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'}
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
                            <ProviderResponseContent providerResponse={result.providerResponses.find(pr => pr.provider === activeTab)!} />
                       ) : (
                           <p className="text-gray-400">No response available for this provider.</p>
                       )}
                    </div>
                </div>
            )}
        </div>
    );
}

export const IndividualResponses: React.FC<{ results: AnalysisResult[], config: AppConfig }> = ({ results, config }) => {
    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Individual Prompt Responses</h3>
            <div className="space-y-4">
                {results.map((result, index) => (
                    <ResponseCard key={index} result={result} index={index} config={config} />
                ))}
            </div>
        </div>
    );
};