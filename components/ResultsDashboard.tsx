import React from 'react';
import type { AnalysisResult, AppConfig, Provider, SentimentData } from '../types';
import { SummaryCards } from './SummaryCards';
import { SentimentChart } from './SentimentChart';
import { IndividualResponses } from './IndividualResponses';
import { ExportButton } from './ExportButton';
import { AdditionalQuestionsSummary } from './AdditionalQuestionsSummary';
import { BrandMentionsTable } from './BrandMentionsTable';
import { SentimentScoresTable } from './SentimentScoresTable';

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
    copilot: 'Copilot / Azure'
};

interface ResultsDashboardProps {
  results: AnalysisResult[];
  config: AppConfig;
  onSaveReport: () => void;
}

export const ResultsDashboard: React.FC<ResultsDashboardProps> = ({ results, config, onSaveReport }) => {
  
  const knownBrandsLower = new Set([config.clientName, ...config.competitors].map(b => b.toLowerCase()));
  const allKnownBrands = [config.clientName, ...config.competitors];
  
  // --- Data Aggregation for Comparative Views ---
  
  // 1. Aggregate Brand Mentions
  const mentionsMap = new Map<string, { brandName: string, mentions: Record<Provider, number> }>();
  
  results.forEach(result => {
    result.providerResponses.forEach(pResponse => {
      pResponse.brandAnalyses.forEach(analysis => {
        if (typeof analysis.brandName === 'string') {
          const lowerCaseBrand = analysis.brandName.toLowerCase();
          if (!mentionsMap.has(lowerCaseBrand)) {
            mentionsMap.set(lowerCaseBrand, { brandName: analysis.brandName, mentions: { gemini: 0, openai: 0, perplexity: 0, copilot: 0 } });
          }
          const entry = mentionsMap.get(lowerCaseBrand)!;
          entry.mentions[pResponse.provider] += analysis.mentions;
        }
      });
    });
  });

  allKnownBrands.forEach(brand => {
    const lowerCaseBrand = brand.toLowerCase();
    if (!mentionsMap.has(lowerCaseBrand)) {
       mentionsMap.set(lowerCaseBrand, { brandName: brand, mentions: { gemini: 0, openai: 0, perplexity: 0, copilot: 0 } });
    }
  });

  const brandMentionsData = Array.from(mentionsMap.values()).sort((a, b) => {
    const totalA = Object.values(a.mentions).reduce((s, c) => s + c, 0);
    const totalB = Object.values(b.mentions).reduce((s, c) => s + c, 0);
    return totalB - totalA;
  });

  // 2. Aggregate Sentiment Scores
  const sentimentMap = new Map<string, { brandName: string, sentiments: Record<Provider, { P: number, N: number, Nl: number }> }>();

  results.forEach(result => {
      result.providerResponses.forEach(pResponse => {
          pResponse.brandAnalyses.forEach(analysis => {
              if (typeof analysis.brandName === 'string' && analysis.sentiment !== 'Not Mentioned') {
                  const lowerCaseBrand = analysis.brandName.toLowerCase();
                  if (!sentimentMap.has(lowerCaseBrand)) {
                      sentimentMap.set(lowerCaseBrand, { brandName: analysis.brandName, sentiments: { 
                          gemini: { P: 0, N: 0, Nl: 0 }, openai: { P: 0, N: 0, Nl: 0 }, 
                          perplexity: { P: 0, N: 0, Nl: 0 }, copilot: { P: 0, N: 0, Nl: 0 } 
                      }});
                  }
                  const entry = sentimentMap.get(lowerCaseBrand)!;
                  if (analysis.sentiment === 'Positive') entry.sentiments[pResponse.provider].P++;
                  if (analysis.sentiment === 'Negative') entry.sentiments[pResponse.provider].N++;
                  if (analysis.sentiment === 'Neutral') entry.sentiments[pResponse.provider].Nl++;
              }
          });
      });
  });

   allKnownBrands.forEach(brand => {
    const lowerCaseBrand = brand.toLowerCase();
    if (!sentimentMap.has(lowerCaseBrand)) {
       sentimentMap.set(lowerCaseBrand, { brandName: brand, sentiments: { 
          gemini: { P: 0, N: 0, Nl: 0 }, openai: { P: 0, N: 0, Nl: 0 }, 
          perplexity: { P: 0, N: 0, Nl: 0 }, copilot: { P: 0, N: 0, Nl: 0 } 
      }});
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

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h2 className="text-3xl font-bold text-green-400">Analysis complete for "{config.clientName}"</h2>
            <p className="text-gray-400 mt-1">Showing results for {results.length} prompts using <span className="font-semibold text-gray-300">{selectedProviderNames}</span>.</p>
        </div>
        <div className="flex items-center space-x-2 flex-shrink-0">
          <button 
              onClick={onSaveReport}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors flex items-center space-x-2"
              title="Save this report to your browser's local storage"
          >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v10a2 2 0 01-2 2H7a2 2 0 01-2-2V4zm3 1h4a1 1 0 00-1-1H7a1 1 0 00-1 1v1h6V5z" />
              </svg>
              <span>Save Report</span>
          </button>
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
          <SentimentChart data={chartSentimentData} providers={config.providers} />
      </div>
        
      {config.additionalQuestions.length > 0 && <AdditionalQuestionsSummary results={results} config={config}/>}
      
      <IndividualResponses results={results} config={config} />
    </div>
  );
};