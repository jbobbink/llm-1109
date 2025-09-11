import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SentimentData, Provider } from '../types';

interface SentimentChartProps {
  data: SentimentData[];
  providers: Provider[];
}

const providerColors: Record<Provider, { positive: string, neutral: string, negative: string }> = {
    gemini: { positive: '#48bb78', neutral: '#a0aec0', negative: '#f56565' },
    openai: { positive: '#34d399', neutral: '#9ca3af', negative: '#f87171' },
    perplexity: { positive: '#2dd4bf', neutral: '#6b7280', negative: '#fb7185' },
    copilot: { positive: '#60a5fa', neutral: '#a1a1aa', negative: '#f472b6' },
};

const providerNames: Record<Provider, string> = {
    gemini: 'Gemini',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
    copilot: 'Copilot'
};

export const SentimentChart: React.FC<SentimentChartProps> = ({ data, providers }) => {
  return (
    <div style={{ width: '100%', height: 400 }}>
        <ResponsiveContainer>
            <BarChart
                data={data}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#4a5568" />
                <XAxis dataKey="name" stroke="#a0aec0" />
                <YAxis stroke="#a0aec0" allowDecimals={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#2d3748', border: '1px solid #4a5568' }} 
                  labelStyle={{ color: '#e2e8f0' }}
                />
                <Legend wrapperStyle={{ color: '#e2e8f0' }} />
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