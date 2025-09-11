import React from 'react';
import type { AnalysisResult, Provider } from '../types';

const providerNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
    copilot: 'Copilot / Azure'
};

interface SummaryCardsProps {
    results: AnalysisResult[];
    clientName: string;
    providers: Provider[];
}

const StatCard: React.FC<{ title: string; value: string | number; description: string; icon: React.ReactNode }> = ({ title, value, description, icon }) => (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 flex items-start space-x-4">
        <div className="bg-gray-700 p-3 rounded-lg text-green-400">{icon}</div>
        <div>
            <p className="text-sm text-gray-400">{title}</p>
            <p className="text-3xl font-bold">{value}</p>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
    </div>
);

const MentionIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
    </svg>
);

const LeaderIcon = () => (
     <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
    </svg>
);

const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);


export const SummaryCards: React.FC<SummaryCardsProps> = ({ results, clientName, providers }) => {
    
    const clientMentionsByProvider: Record<Provider, number> = { gemini: 0, openai: 0, perplexity: 0, copilot: 0 };
    let totalClientMentions = 0;

    results.forEach(result => {
        result.providerResponses.forEach(pResponse => {
            pResponse.brandAnalyses.forEach(analysis => {
                if (analysis.brandName.toLowerCase() === clientName.toLowerCase()) {
                    clientMentionsByProvider[pResponse.provider] += analysis.mentions;
                }
            });
        });
    });

    totalClientMentions = Object.values(clientMentionsByProvider).reduce((sum, count) => sum + count, 0);
    
    let topProvider: Provider | null = null;
    let maxMentions = -1;

    if (providers.length > 0) {
        for (const provider of providers) {
            if (clientMentionsByProvider[provider] > maxMentions) {
                maxMentions = clientMentionsByProvider[provider];
                topProvider = provider;
            }
        }
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard 
                title={`${clientName} Mentions`}
                value={totalClientMentions}
                description="Total mentions across all selected LLMs"
                icon={<MentionIcon />}
            />
            <StatCard 
                title="Prompts Analyzed"
                value={results.length}
                description={`Across ${providers.length} LLM provider(s)`}
                icon={<SearchIcon />}
            />
             <StatCard 
                title="Top Visibility On"
                value={topProvider ? providerNames[topProvider] : 'N/A'}
                description={topProvider ? `With ${maxMentions} mentions of ${clientName}` : 'No mentions found'}
                icon={<LeaderIcon />}
            />
        </div>
    );
};