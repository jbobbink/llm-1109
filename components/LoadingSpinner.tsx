import React from 'react';
import type { Task } from '../types';

const StatusIcon: React.FC<{ status: Task['status'] }> = ({ status }) => {
    switch (status) {
        case 'pending':
            return <div className="h-5 w-5 rounded-full border-2 border-gray-500" title="Pending"></div>;
        case 'in_progress':
            return <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-green-500" title="In Progress"></div>;
        case 'completed':
            return (
                // FIX: Replaced title prop with <title> element for SVG accessibility and to fix the TypeScript error.
                <svg className="h-5 w-5 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <title>Completed</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
            );
        case 'error':
             return (
                // FIX: Replaced title prop with <title> element for SVG accessibility and to fix the TypeScript error.
                <svg className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <title>Error</title>
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                </svg>
            );
        default:
            return null;
    }
};

interface LoadingStatusProps {
  tasks: Task[];
}

export const LoadingStatus: React.FC<LoadingStatusProps> = ({ tasks }) => {
    const completedCount = tasks.filter(t => t.status === 'completed' || t.status === 'error').length;
    const totalCount = tasks.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    return (
        <div className="max-w-2xl mx-auto bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700">
            <h3 className="text-xl font-semibold text-gray-200 text-center">Analyzing Responses...</h3>
            <p className="text-gray-400 text-center mt-2 mb-6">Please wait while we perform the analysis. You can see the progress below.</p>
            
            <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress}%`, transition: 'width 0.5s ease-in-out' }}></div>
            </div>
            <p className="text-center text-sm text-gray-400 mb-6" aria-live="polite">{completedCount} of {totalCount} tasks completed</p>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {tasks.map(task => (
                    <div key={task.id} className={`p-3 rounded-lg flex items-center space-x-4 transition-colors ${task.status === 'completed' ? 'bg-green-900/20' : 'bg-gray-900/50'}`}>
                        <div className="flex-shrink-0">
                            <StatusIcon status={task.status} />
                        </div>
                        <div className="flex-grow">
                            <p className={`text-sm font-medium ${task.status === 'error' ? 'text-red-400' : 'text-gray-300'}`}>
                                {task.description}
                            </p>
                            {task.error && <p className="text-xs text-red-500 mt-1">{task.error}</p>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};