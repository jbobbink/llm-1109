import React from 'react';
import type { Provider, AppConfig } from '../types';

interface BrandMentionData {
  brandName: string;
  mentions: Record<Provider, number>;
}

interface BrandMentionsTableProps {
  data: BrandMentionData[];
  clientName: string;
  knownBrands: Set<string>;
  config: AppConfig;
}

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Gemini',
    openai: 'OpenAI',
    perplexity: 'Pplx',
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

export const BrandMentionsTable: React.FC<BrandMentionsTableProps> = ({ data, clientName, knownBrands, config }) => {
  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg h-full">
      <h3 className="text-xl font-semibold mb-4 text-gray-100">Comparative Brand Mentions</h3>
      <div className="overflow-y-auto max-h-[300px] pr-2">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800 z-10">
            <tr>
              <th className="text-sm font-semibold text-gray-400 pb-2 border-b border-gray-600">Brand</th>
              {config.providers.map(p => (
                <th key={p} className="text-sm font-semibold text-gray-400 pb-2 border-b border-gray-600 text-right" title={config.models[p]}>{getProviderShortName(p, config)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map(({ brandName, mentions }) => {
                const lowerCaseBrandName = brandName.toLowerCase();
                const isClient = lowerCaseBrandName === clientName.toLowerCase();
                const isKnown = knownBrands.has(lowerCaseBrandName);

                return (
                  <tr key={brandName} className={`border-b border-gray-700 last:border-b-0 ${isClient ? 'bg-green-900/30' : ''}`}>
                    <td className={`py-3 font-medium ${isClient ? 'text-green-400' : 'text-gray-200'}`}>
                      {brandName}
                      {!isKnown && <span className="ml-2 text-xs font-semibold text-yellow-500 tracking-wider" title="This brand was discovered during analysis and was not in your initial list.">(Discovered)</span>}
                    </td>
                    {config.providers.map(p => (
                       <td key={p} className="py-3 text-right text-gray-300 font-mono">{mentions[p] || 0}</td>
                    ))}
                  </tr>
                )
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};