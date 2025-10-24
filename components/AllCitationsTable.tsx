import React from 'react';
import type { AnalysisResult, AppConfig } from '../types';

interface CitationSummary {
  url: string;
  title?: string;
  count: number;
}

interface AllCitationsTableProps {
  results: AnalysisResult[];
  config: AppConfig;
}

export const AllCitationsTable: React.FC<AllCitationsTableProps> = ({ results, config }) => {
  const citationMap = new Map<string, CitationSummary>();

  results.forEach(result => {
    result.providerResponses.forEach(pResponse => {
      if (pResponse.citations && pResponse.citations.length > 0) {
        pResponse.citations.forEach(citation => {
          const baseUrl = citation.url.split('?')[0];
          if (citationMap.has(baseUrl)) {
            const existing = citationMap.get(baseUrl)!;
            existing.count += 1;
          } else {
            citationMap.set(baseUrl, {
              url: baseUrl,
              title: citation.title,
              count: 1,
            });
          }
        });
      }
    });
  });

  if (citationMap.size === 0) {
    return null;
  }

  const aggregatedCitations = Array.from(citationMap.values()).sort((a, b) => b.count - a.count);

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-xl p-6">
      <h3 className="text-xl font-semibold mb-4">Citation Summary</h3>
      <p className="text-gray-400 mb-4 text-sm">A summary of all unique sources cited by web-enabled providers, sorted by frequency.</p>
      <div className="overflow-x-auto max-h-96 pr-2">
        <table className="w-full text-left">
          <thead className="sticky top-0 bg-gray-800/80 backdrop-blur-sm z-10">
            <tr>
              <th className="text-sm font-semibold text-gray-400 p-3 border-b border-gray-700">URL</th>
              <th className="text-sm font-semibold text-gray-400 p-3 border-b border-gray-700 text-right">Count</th>
            </tr>
          </thead>
          <tbody>
            {aggregatedCitations.map((citation, index) => (
              <tr key={index} className="border-b border-gray-700 last:border-b-0 hover:bg-gray-700/50">
                <td className="p-3 text-sm text-gray-300 max-w-sm truncate">
                  <a 
                    href={citation.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-gray-300 hover:text-green-400 hover:underline"
                    title={citation.url}
                  >
                    {citation.url}
                  </a>
                </td>
                <td className="p-3 text-sm text-gray-300 whitespace-nowrap text-right font-mono">
                  {citation.count}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};