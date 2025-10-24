import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProjectRun } from '../types';

interface SentimentTrendChartProps {
  runs: ProjectRun[];
}

export const SentimentTrendChart: React.FC<SentimentTrendChartProps> = ({ runs }) => {
  const chartData = runs.map(run => ({
    date: new Date(run.createdAt).toLocaleDateString(),
    Positive: run.summary.sentimentCounts.positive,
    Neutral: run.summary.sentimentCounts.neutral,
    Negative: run.summary.sentimentCounts.negative,
  }));

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-100">Sentiment Over Time</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <AreaChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" allowDecimals={false} />
            <Tooltip
                contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} 
                labelStyle={{ color: '#f3f4f6', fontWeight: 'bold' }}
                itemStyle={{ color: '#d1d5db' }}
            />
            <Legend wrapperStyle={{ color: '#d1d5db' }} />
            <Area type="monotone" dataKey="Positive" stackId="1" stroke="#84cc16" fill="#84cc16" fillOpacity={0.6} />
            <Area type="monotone" dataKey="Neutral" stackId="1" stroke="#6b7280" fill="#6b7280" fillOpacity={0.6} />
            <Area type="monotone" dataKey="Negative" stackId="1" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};