import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { ProjectRun } from '../types';

interface MentionsTrendChartProps {
  runs: ProjectRun[];
  clientName: string;
}

export const MentionsTrendChart: React.FC<MentionsTrendChartProps> = ({ runs, clientName }) => {
  const chartData = runs.map(run => ({
    date: new Date(run.createdAt).toLocaleDateString(),
    mentions: run.summary.clientMentions,
  }));

  return (
    <div className="bg-gray-800 p-6 rounded-xl border border-gray-700 shadow-lg">
      <h3 className="text-xl font-semibold mb-4 text-gray-100">{clientName} Mentions Over Time</h3>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis dataKey="date" stroke="#9ca3af" />
            <YAxis stroke="#9ca3af" allowDecimals={false} />
            <Tooltip
              contentStyle={{ backgroundColor: '#1f2937', border: '1px solid #374151', borderRadius: '0.5rem' }} 
              labelStyle={{ color: '#f3f4f6', fontWeight: 'bold' }}
              itemStyle={{ color: '#d1d5db' }}
            />
            <Legend wrapperStyle={{ color: '#d1d5db' }} />
            <Line type="monotone" dataKey="mentions" name="Mentions" stroke="#a3e635" strokeWidth={2} activeDot={{ r: 8 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};