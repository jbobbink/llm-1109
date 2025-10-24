import React, { useState, useEffect } from 'react';
import { getTotalTokenUsage } from '../services/supabaseService';

interface TotalTokenUsageDashboardProps {
  supabaseConfig: { url: string; key: string };
}

interface TokenData {
    model: string;
    inputTokens: number;
    outputTokens: number;
}

export const TotalTokenUsageDashboard: React.FC<TotalTokenUsageDashboardProps> = ({ supabaseConfig }) => {
    const [tokenData, setTokenData] = useState<TokenData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchTokenData = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const data = await getTotalTokenUsage(supabaseConfig.url, supabaseConfig.key);
                setTokenData(data);
            } catch (e) {
                setError(e instanceof Error ? e.message : 'Failed to load token usage data.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchTokenData();
    }, [supabaseConfig]);

    const renderContent = () => {
        if (isLoading) {
            return <p className="text-gray-400 text-sm">Loading token usage data...</p>;
        }
        if (error) {
            return <p className="text-red-400 text-sm">Error: {error}</p>;
        }
        if (tokenData.length === 0) {
            return <p className="text-gray-400 text-sm">No token usage data found. Run and save a report to begin tracking.</p>;
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead>
                        <tr>
                            <th className="text-sm font-semibold text-gray-400 p-2 border-b border-gray-700">Model</th>
                            <th className="text-sm font-semibold text-gray-400 p-2 border-b border-gray-700 text-right">Total Input Tokens</th>
                            <th className="text-sm font-semibold text-gray-400 p-2 border-b border-gray-700 text-right">Total Output Tokens</th>
                        </tr>
                    </thead>
                    <tbody>
                        {tokenData.map(({ model, inputTokens, outputTokens }) => (
                            <tr key={model} className="border-b border-gray-700 last:border-b-0">
                                <td className="p-2 font-mono text-gray-200 text-sm">{model}</td>
                                <td className="p-2 text-right text-gray-300 font-mono text-sm">{inputTokens.toLocaleString()}</td>
                               