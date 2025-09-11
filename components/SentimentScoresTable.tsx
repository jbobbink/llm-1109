import React from 'react';
import type { Provider, AppConfig } from '../types';

interface SentimentScoresData {
    brandName: string;
    sentiments: Record<Provider, { P: number, N: number, Nl: number }>;
}

interface SentimentScoresTableProps {
  data: SentimentScoresData[];
  clientName: string;
  config: AppConfig;
}

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Gemini',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
    copilot: 'Copilot'
};

const getProviderShortName = (provider: Provider, config: AppConfig) => {
    const model = config.models[provider];
    const baseName = providerBaseNames[provider];
    if (model && model.length > 10) {
        return `${baseName} (${model.substring(0,10)}...)`;
    }
    return model ? `${baseName} (${model})` : baseName;
}


export const SentimentScoresTable: React.FC<SentimentScoresTableProps> = ({ data, clientName, config }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-full">
      <h3 className="text-xl font-semibold mb-4 text-gray-100">Comparative Sentiment Scores</h3>
      <div className="overflow-x-auto max-h-[300px] pr-2">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr>
              <th rowSpan={2} className="text-sm font-semibold text-gray-400 pb-2 border-b-2 border-gray-600 align-bottom">Brand</th>
              {config.providers.map(p => (
                  <th key={p} colSpan={3} className="text-sm font-semibold text-gray-400 pb-2 border-b-2 border-gray-600 text-center" title={config.models[p]}>{getProviderShortName(p, config)}</th>
              ))}
            </tr>
            <tr>
              {config.providers.map(p => (
                <React.Fragment key={p}>
                  <th className="text-xs font-medium text-green-400/80 pb-2 border-b border-gray-600 text-center" title="Positive">P</th>
                  <th className="text-xs font-medium text-gray-300/80 pb-2 border-b border-gray-600 text-center" title="Neutral">N</th>
                  <th className="text-xs font-medium text-red-400/80 pb-2 border-b border-gray-600 text-center" title="Negative">N</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(({ brandName, sentiments }) => {
                const isClient = brandName.toLowerCase() === clientName.toLowerCase();
                return (
                  <tr key={brandName} className={`border-b border-gray-700 last:border-b-0 ${isClient ? 'bg-green-900/30' : ''}`}>
                    <td className={`py-3 font-medium ${isClient ? 'text-green-400' : 'text-gray-200'}`}>
                      {brandName}
                    </td>
                    {config.providers.map(p => {
                        const score = sentiments[p] || { P: 0, Nl: 0, N: 0 };
                        return (
                            <React.Fragment key={p}>
                                <td className="py-3 text-center text-green-400 font-mono">{score.P}</td>
                                <td className="py-3 text-center text-gray-300 font-mono">{score.Nl}</td>
                                <td className="py-3 text-center text-red-400 font-mono">{score.N}</td>
                            </React.Fragment>
                        )
                    })}
                  </tr>
                )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};