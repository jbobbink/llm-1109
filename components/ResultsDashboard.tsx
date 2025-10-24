import React, { useRef, useState, useMemo } from 'react';
import type { AnalysisResult, AppConfig, Provider, SentimentData } from '../types';
import { SummaryCards } from './SummaryCards';
import { SentimentChart } from './SentimentChart';
import { IndividualResponses, RawResponses } from './IndividualResponses';
import { ExportButton } from './ExportButton';
import { AdditionalQuestionsSummary } from './AdditionalQuestionsSummary';
import { BrandMentionsTable } from './BrandMentionsTable';
import { SentimentScoresTable } from './SentimentScoresTable';
import { AllCitationsTable } from './AllCitationsTable';
import { NegativeSentimentResponses } from './NegativeSentimentResponses';
import { TokenUsageSummary } from './TokenUsageSummary';

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    'openai-websearch': 'OpenAI Web Search',
    perplexity: 'Perplexity',
};

interface ResultsDashboardProps {
  results: AnalysisResult[];
  config: AppConfig;
  saveStatus: 'idle' | 'success' | 'error';
  error?: string | null;
}

const SaveStatusIndicator: React.FC<{ status: 'idle' | 'success' | 'error' }> = ({ status }) => {
    if (status === 'success') {
        return (
            <div className="flex items-center space-x-2 text-green-300 bg-green-900/50 px-3 py-2 rounded-lg text-sm border border-green-800">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span>Report saved</span>
            </div>
        );
    }
    if (status === 'error') {
        return (
            <div className="flex items-center space-x-2 text-red-300 bg-red-900/50 px-3 py-2 rounded-lg text-sm border border-red-700" title="Failed to save the report. View console for details.">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>Save failed</span>
            </div>
        );
    }
    return null;
};

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ results, config, saveStatus, error }) => {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlyUnmentioned, setShowOnlyUnmentioned] = useState(false);

  const knownBrandsLower = new Set([config.clientName, ...config.competitors].map(b => b.toLowerCase()));
  const allKnownBrands = [config.clientName, ...config.competitors];
  
  // --- Data Aggregation for Comparative Views ---
  
  // 1. Aggregate Brand Mentions
  const mentionsMap = new Map<string, { brandName: string, mentions: Partial<Record<Provider, number>> }>();
  
  results.forEach(result => {
    result.providerResponses.forEach(pResponse => {
      pResponse.brandAnalyses.forEach(analysis => {
        if (typeof analysis.brandName === 'string') {
          const lowerCaseBrand = analysis.brandName.toLowerCase();
          if (!mentionsMap.has(lowerCaseBrand)) {
            mentionsMap.set(lowerCaseBrand, { brandName: analysis.brandName, mentions: {} });
          }
          const entry = mentionsMap.get(lowerCaseBrand)!;
          entry.mentions[pResponse.provider] = (entry.mentions[pResponse.provider] || 0) + analysis.mentions;
        }
      });
    });
  });

  allKnownBrands.forEach(brand => {
    const lowerCaseBrand = brand.toLowerCase();
    if (!mentionsMap.has(lowerCaseBrand)) {
       mentionsMap.set(lowerCaseBrand, { brandName: brand, mentions: {} });
    }
  });

  const brandMentionsData = Array.from(mentionsMap.values()).sort((a, b) => {
    const totalA = Object.values(a.mentions).reduce((s, c) => s + c, 0);
    const totalB = Object.values(b.mentions).reduce((s, c) => s + c, 0);
    return totalB - totalA;
  });

  // 2. Aggregate Sentiment Scores
  const sentimentMap = new Map<string, { brandName: string, sentiments: Partial<Record<Provider, { P: number, N: number, Nl: number }>> }>();

  results.forEach(result => {
      result.providerResponses.forEach(pResponse => {
          pResponse.brandAnalyses.forEach(analysis => {
              if (typeof analysis.brandName === 'string' && analysis.sentiment !== 'Not Mentioned') {
                  const lowerCaseBrand = analysis.brandName.toLowerCase();
                  if (!sentimentMap.has(lowerCaseBrand)) {
                      sentimentMap.set(lowerCaseBrand, { brandName: analysis.brandName, sentiments: {} });
                  }
                  const entry = sentimentMap.get(lowerCaseBrand)!;
                  if (!entry.sentiments[pResponse.provider]) {
                      entry.sentiments[pResponse.provider] = { P: 0, N: 0, Nl: 0 };
                  }
                  const sentimentProviderEntry = entry.sentiments[pResponse.provider]!;
                  if (analysis.sentiment === 'Positive') sentimentProviderEntry.P++;
                  if (analysis.sentiment === 'Negative') sentimentProviderEntry.N++;
                  if (analysis.sentiment === 'Neutral') sentimentProviderEntry.Nl++;
              }
          });
      });
  });

   allKnownBrands.forEach(brand => {
    const lowerCaseBrand = brand.toLowerCase();
    if (!sentimentMap.has(lowerCaseBrand)) {
       sentimentMap.set(lowerCaseBrand, { brandName: brand, sentiments: {} });
    }
  });
  
  const sentimentScoresData = Array.from(sentimentMap.values());

  // 3. Prepare data for Sentiment Chart (only known brands)
  const chartSentimentData = allKnownBrands.map(brand => {
      const lowerCaseBrand = brand.toLowerCase();
      const sentimentEntry = sentimentMap.get(lowerCaseBrand);
      const dataPoint: SentimentData = { name: brand };

      config.providers.forEach(provider => {
          const sentiments = sentimentEntry?.sentiments[provider] || { P: 0, N: 0, Nl: 0 };
          dataPoint[`Positive-${provider}`] = sentiments.P;
          dataPoint[`Neutral-${provider}`] = sentiments.Nl;
          dataPoint[`Negative-${provider}`] = sentiments.N;
      });
      return dataPoint;
  });
  
  const selectedProviderNames = config.providers.map(p => `${providerBaseNames[p]} (${config.models[p]})`).join(', ');

  // 4. Filter for Negative Sentiment Highlights
  const negativeSentimentResults = useMemo(() => {
    return results.map((result, index) => {
        const negativeProviderResponses = result.providerResponses.filter(pr => 
            !pr.error && pr.brandAnalyses.some(ba => ba.sentiment === 'Negative')
        );

        if (negativeProviderResponses.length > 0) {
            return {
                ...result,
                providerResponses: negativeProviderResponses,
                originalIndex: index
            };
        }
        return null;
    }).filter((result): result is (AnalysisResult & { originalIndex: number }) => result !== null);
  }, [results]);
  
  // --- Filtering Logic for Search and "Unmentioned Only" toggle ---
  const filteredResults = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();

    return results.filter(result => {
        // "Unmentioned Only" filter
        if (showOnlyUnmentioned) {
            const wasMentioned = result.providerResponses.some(pResponse =>
                pResponse.brandAnalyses.some(analysis =>
                    analysis.brandName?.toLowerCase() === config.clientName.toLowerCase() && analysis.mentions > 0
                )
            );
            if (wasMentioned) return false;
        }

        // Search filter
        if (searchTerm.trim()) {
            const hasSearchMatch = 
                result.prompt.toLowerCase().includes(lowerCaseSearch) ||
                result.providerResponses.some(pResponse => {
                    if (pResponse.response && pResponse.response.toLowerCase().includes(lowerCaseSearch)) return true;
                    if (pResponse.rawResponse && pResponse.rawResponse.toLowerCase().includes(lowerCaseSearch)) return true;
                    return pResponse.additionalAnswers.some(answer => 
                        answer.answer && answer.answer.toLowerCase().includes(lowerCaseSearch)
                    );
                });
            if (!hasSearchMatch) return false;
        }
        
        return true;
    });
  }, [results, searchTerm, showOnlyUnmentioned, config.clientName]);

  const filteredNegativeResults = useMemo(() => {
    const lowerCaseSearch = searchTerm.toLowerCase();

    return negativeSentimentResults.filter(result => {
        // "Unmentioned Only" filter
        if (showOnlyUnmentioned) {
            const wasMentioned = result.providerResponses.some(pResponse =>
                pResponse.brandAnalyses.some(analysis =>
                    analysis.brandName?.toLowerCase() === config.clientName.toLowerCase() && analysis.mentions > 0
                )
            );
            if (wasMentioned) return false;
        }

        // Search filter
        if (searchTerm.trim()) {
            const hasSearchMatch = result.prompt.toLowerCase().includes(lowerCaseSearch) ||
                result.providerResponses.some(pResponse => 
                    (pResponse.response && pResponse.response.toLowerCase().includes(lowerCaseSearch))
                );
            if (!hasSearchMatch) return false;
        }

        return true;
    });
  }, [negativeSentimentResults, searchTerm, showOnlyUnmentioned, config.clientName]);


  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-900/50 border border-red-700 text-red-300 px-4 py-3 rounded-lg -mb-2" role="alert">
            <strong className="font-bold">An error occurred: </strong>
            <span className="block sm:inline">{error}</span>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div>
            <h2 className="text-3xl font-bold text-green-400">Analysis complete for "{config.clientName}"</h2>
            <p className="text-gray-400 mt-1">
              Showing results for {results.length} prompts using <span className="font-semibold text-gray-200">{selectedProviderNames}</span>.
              <span className="ml-2 pl-2 border-l border-gray-600">Brand Matching: <span className="font-semibold text-gray-200">{config.broadMatch ? 'Broad' : 'Exact'}</span></span>
            </p>
            {config.description && <p className="text-gray-300 mt-2 bg-gray-800 border border-gray-700 p-3 rounded-md text-sm">{config.description}</p>}
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <SaveStatusIndicator status={saveStatus} />
          <ExportButton results={results} config={config} />
        </div>
      </div>
        
      <SummaryCards results={results} clientName={config.clientName} providers={config.providers} />
        
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2">
            <BrandMentionsTable data={brandMentionsData} clientName={config.clientName} knownBrands={knownBrandsLower} config={config} />
        </div>
        <div className="lg:col-span-3">
            <SentimentScoresTable data={sentimentScoresData} clientName={config.clientName} config={config} />
        </div>
      </div>
      
      <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
          <h3 className="text-xl font-semibold mb-4">Comparative Sentiment Analysis (Tracked Brands)</h3>
          <div ref={chartContainerRef}>
            <SentimentChart data={chartSentimentData} providers={config.providers} />
          </div>
      </div>
        
      {config.additionalQuestions.length > 0 && <AdditionalQuestionsSummary results={filteredResults} config={config} searchTerm={searchTerm}/>}
      
      <NegativeSentimentResponses results={filteredNegativeResults} config={config} searchTerm={searchTerm} />

      <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
        <div className="flex items-center space-x-4">
            <input
                type="search"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search prompts and responses..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 focus:outline-none transition text-gray-100"
                aria-label="Search report content"
            />
            <button
                onClick={() => setShowOnlyUnmentioned(!showOnlyUnmentioned)}
                title="Toggle to show only prompts where the client brand was not mentioned by any provider"
                className={`flex-shrink-0 px-4 py-2 rounded-lg font-semibold text-sm transition-colors flex items-center space-x-2 ${
                    showOnlyUnmentioned
                        ? 'bg-green-500 text-gray-900 shadow'
                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                </svg>
                <span>Unmentioned Only</span>
            </button>
        </div>
      </div>

      <IndividualResponses results={filteredResults} config={config} searchTerm={searchTerm} />

      <TokenUsageSummary results={filteredResults} config={config} />

      <RawResponses results={filteredResults} config={config} searchTerm={searchTerm} />

      <AllCitationsTable results={results} config={config} />
    </div>
  );
};