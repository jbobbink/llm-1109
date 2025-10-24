

import React, { useRef, useEffect } from 'react';

interface ModelDetail {
  name: string;
  context: string;
  cost: string;
  description: string;
}

const modelData: Record<string, { title: string; models: ModelDetail[] }> = {
  openai: {
    title: 'Available OpenAI Models',
    models: [
      { name: 'gpt-4o-mini', context: '128k', cost: '$0.15 / $0.60 per 1M', description: 'Cheap, fast general use' },
      { name: 'gpt-4o', context: '128k', cost: '$5.00 / $15.00 per 1M', description: 'Balanced reasoning & speed' },
      { name: 'gpt-4.1', context: '200k', cost: '$5.00 / $15.00 per 1M', description: 'Advanced reasoning, big context' },
      { name: 'gpt-4.1-mini', context: '128k', cost: '$0.25 / $1.00 per 1M', description: 'Lightweight, cheaper' },
      { name: 'o1', context: '200k', cost: '$15.00 / $60.00 per 1M', description: 'Reasoning-heavy tasks' },
      { name: 'o1-mini', context: '128k', cost: '$1.00 / $4.00 per 1M', description: 'Cheaper reasoning' },
      { name: 'o3-mini', context: '128k', cost: '$1.10 / $4.40 per 1M', description: 'Optimized structured reasoning' },
      { name: 'gpt-5', context: '400k tokens (128k max output)', cost: 'Input $1.25 / 1M, Output $10.00 / 1M', description: 'Flagship, full-feature, high reasoning & multimodal' },
      { name: 'gpt-5-mini', context: '400k tokens', cost: 'Input $0.25 / 1M, Output $2.00 / 1M', description: 'Lightweight tasks, fast & cheaper' },
      { name: 'gpt-5-nano', context: '400k tokens', cost: 'Input $0.05 / 1M, Output $0.40 / 1M', description: 'Summarization/classification, cost-sensitive workflows' },
      { name: 'gpt-4o-search-preview', context: '128k tokens', cost: 'same as gpt-4o (approx) + cost of search tool: US$ 25,00 / 1000 searches', description: 'Access to internet sources; up-to-date info with citations' },
      { name: 'gpt-4o-mini-search-preview', context: '128k tokens', cost: 'cheaper than full-size preview', description: 'Lightweight web-infused QA' },
    ]
  },
  perplexity: {
    title: 'Available Perplexity Models',
    models: [
      { name: 'sonar', context: '128k', cost: '$0.20 / $0.40 per 1M', description: 'Lightweight, grounded search' },
      { name: 'sonar-pro', context: '128k', cost: '$1.00 / $2.00 per 1M', description: 'Advanced search reasoning' },
      { name: 'sonar-reasoning', context: '128k', cost: '$1.00 / $2.00 per 1M', description: 'Reasoning + search' },
      { name: 'sonar-reasoning-pro', context: '128k', cost: '$2.00 / $4.00 per 1M', description: 'High precision reasoning' },
      { name: 'sonar-deep-research', context: '200k', cost: '$4.00 / $8.00 per 1M', description: 'Deep multi-source analysis' },
    ]
  },
  gemini: {
    title: 'Available Gemini Models',
    models: [
      // FIX: Removed prohibited models 'gemini-1.5-flash' and 'gemini-1.5-pro'.
      { name: 'gemini-2.0-flash', context: '1M', cost: '$0.35 / $0.70 per 1M', description: 'Latest flash, better than 1.5' },
      { name: 'gemini-2.0-pro', context: '2M', cost: '$3.50 / $10.50 per 1M', description: 'Advanced reasoning, multimodal' },
      { name: 'gemini-2.0-flash-exp', context: '1M', cost: 'Experimental', description: 'Next-gen flash preview' },
      { name: 'gemini-2.5-pro', context: '1M', cost: '$1.25 in / $10 out per 1M (<=200k prompt)', description: 'Advanced reasoning' },
      { name: 'gemini-2.5-flash', context: '1M', cost: 'Lower than Pro', description: 'Throughput / cheaper' },
      { name: 'gemini-2.5-flash-lite', context: '1M', cost: 'Lowest', description: 'Realtime / massive scale' },
    ]
  }
};

const ModelInfoTable: React.FC<{ title: string; models: ModelDetail[] }> = ({ title, models }) => (
  <div className="mb-8">
    <h3 className="text-xl font-bold text-green-400 mb-4">{title}</h3>
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
            <thead className="bg-gray-700">
                <tr>
                    <th className="p-3 text-gray-300">Model</th>
                    <th className="p-3 text-gray-300">Context</th>
                    <th className="p-3 text-gray-300">Cost (Input/Output)</th>
                    <th className="p-3 text-gray-300">Description</th>
                </tr>
            </thead>
            <tbody>
                {models.map((model, index) => (
                    <tr key={index} className="border-b border-gray-700">
                        <td className="p-3 font-mono font-semibold text-gray-200">{model.name}</td>
                        <td className="p-3 text-gray-300">{model.context}</td>
                        <td className="p-3 text-gray-300">{model.cost}</td>
                        <td className="p-3 text-gray-400">{model.description}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
  </div>
);


export const ModelInfoPopover: React.FC<{onClose: () => void}> = ({ onClose }) => {
    const popoverRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    return (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
            <div 
                ref={popoverRef}
                className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-5xl h-full max-h-[90vh] text-left flex flex-col" 
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-4 border-b border-gray-700 flex justify-between items-center sticky top-0 bg-gray-800 z-10">
                    <h2 className="text-2xl font-bold text-gray-200">Model Information & Pricing</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-gray-200 transition-colors" aria-label="Close">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
                <div className="p-6 overflow-y-auto">
                    <p className="text-gray-400 mb-6 text-sm">
                        Costs are per 1 million tokens (1M). Prices are indicative and may change.
                        <br />
                        Check out the latest pricing via the official provider websites:
                        <span className="block mt-2">
                            <a href="https://ai.google.dev/gemini-api/docs/pricing" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">Google Gemini</a>,{' '}
                            <a href="https://openai.com/api/pricing/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">OpenAI</a>, and{' '}
                            <a href="https://docs.perplexity.ai/getting-started/pricing" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:underline">Perplexity</a>.
                        </span>
                    </p>
                    <ModelInfoTable title={modelData.openai.title} models={modelData.openai.models} />
                    <ModelInfoTable title={modelData.perplexity.title} models={modelData.perplexity.models} />
                    <ModelInfoTable title={modelData.gemini.title} models={modelData.gemini.models} />
                </div>
                 <div className="p-4 bg-gray-900/50 rounded-b-xl flex justify-end">
                     <button onClick={onClose} className="bg-gray-600 hover:bg-gray-500 text-gray-100 font-bold py-2 px-4 rounded-lg transition-colors">Close</button>
                </div>
            </div>
        </div>
    );
};