import React, { useState } from 'react';
import type { AnalysisResult, Provider, AppConfig } from '../types';
import { marked } from 'marked';

const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
    copilot: 'Copilot / Azure'
};

const getProviderDisplayName = (provider: Provider, config: AppConfig): string => {
    const model = config.models[provider];
    return model ? `${providerBaseNames[provider]} (${model})` : providerBaseNames[provider];
}


const QuestionCard: React.FC<{ question: string; results: AnalysisResult[]; index: number, config: AppConfig }> = ({ question, results, index, config }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="bg-gray-800 border border-gray-700 rounded-lg overflow-hidden">
            <button
                className="w-full text-left p-4 flex justify-between items-center bg-gray-700/50 hover:bg-gray-700 transition-colors"
                onClick={() => setIsOpen(!isOpen)}
            >
                <h4 className="font-semibold text-gray-200">
                    <span className="text-green-400 mr-2">Question {index + 1}:</span>
                    {question}
                </h4>
                <svg
                    className={`w-5 h-5 text-gray-400 transition-transform transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" stroke="currentColor" viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                </svg>
            </button>
            {isOpen && (
                <div className="p-6 space-y-6">
                    {results.map((result, resultIndex) => (
                        <div key={resultIndex} className="border-b border-gray-700 pb-4 last:border-b-0">
                            <p className="text-sm font-semibold text-gray-400 mb-2">
                                For prompt: <span className="text-gray-300 italic">"{result.prompt}"</span>
                            </p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {config.providers.map(provider => {
                                    const pResponse = result.providerResponses.find(pr => pr.provider === provider);
                                    if (!pResponse) return null;
                                    const answer = pResponse.additionalAnswers.find(a => a.question === question);
                                    if (!answer || !answer.answer.trim()) return null;

                                    const answerHtml = marked.parse(answer.answer || '');

                                    return (
                                        <div key={provider}>
                                            <h6 className="font-semibold text-gray-200 mb-1">{getProviderDisplayName(provider, config)}</h6>
                                            <div 
                                                className="prose prose-invert prose-sm max-w-none bg-gray-900 p-3 rounded-md text-gray-300"
                                                dangerouslySetInnerHTML={{ __html: answerHtml }}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export const AdditionalQuestionsSummary: React.FC<{ results: AnalysisResult[], config: AppConfig }> = ({ results, config }) => {
    if (!results[0]?.providerResponses[0]?.additionalAnswers) {
        return null;
    }
    const questions = results[0].providerResponses[0].additionalAnswers.map(a => a.question);
    
    if (questions.length === 0) {
        return null;
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6">
            <h3 className="text-xl font-semibold mb-4">Additional Analysis</h3>
            <div className="space-y-4">
                {questions.map((question, index) => (
                    <QuestionCard key={index} question={question} results={results} index={index} config={config} />
                ))}
            </div>
        </div>
    );
};