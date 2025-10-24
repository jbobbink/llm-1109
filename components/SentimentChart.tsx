import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SentimentData, Provider } from '../types';

interface SentimentChartProps {
  data: SentimentData[];
  providers: Provider[];
}

const providerColors: Record<Provider, { positive: string, neutral: string, negative: string }> = {
    gemini: { positive: '#84cc16', neutral: '#6b7280', negative: '#ef4444' },
    openai: { positive: '#4ade80', neutral: '#9ca3af', negative: '#f87171' },
    'openai-websearch': { positive: '#22c55e', neutral: '#a1a1aa', negative: '#fb7185' },
    perplexity: { positive: '#34d399', neutral: '#d1d5db', negative: '#fca5a5' },
};

const providerNames: Record<Provider, string> = {
    gemini: 'Gemini',
    openai: 'OpenAI',
    'openai-websearch': 'OpenAI Web',
    perplexity: 'Perplexity',
};

export const SentimentChart: React.FC<SentimentChartProps> = ({ data, providers }) => {
  return (
    <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
            <BarChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
                <XAxis dataKey="name" stroke="#9ca3af" />
                <YAxis stroke="#9ca3af" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} 
                  labelStyle={{ color: '#f3f4f6', fontWeight: 'bold' }}
                  itemStyle={{ color: '#d1d5db' }}
                />
                <Legend wrapperStyle={{ color: '#d1d5db' }} />
                {providers.map(provider => (
                    <React.Fragment key={provider}>
                        <Bar dataKey={`Positive-${provider}`} fill={providerColors[provider].positive} name={`Positive (${providerNames[provider]})`} stackId={provider} />
                        <Bar dataKey={`Neutral-${provider}`} fill={providerColors[provider].neutral} name={`Neutral (${providerNames[provider]})`} stackId={provider} />
                        <Bar dataKey={`Negative-${provider}`} fill={providerColors[provider].negative} name={`Negative (${providerNames[provider]})`} stackId={provider} />
                    </React.Fragment>
                ))}
            </BarChart>
        </ResponsiveContainer>
    </div>
  );
};