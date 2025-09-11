import type { AnalysisResult, AppConfig, Provider } from '../types';

const PASTE_API_URL = 'https://dpaste.com/api/';

/**
 * Creates a hosted, shareable report by creating an anonymous dpaste.
 * @param htmlContent The full HTML content of the report.
 * @param clientName The name of the client for the report title.
 * @returns A promise that resolves with the URL of the created paste.
 */
export async function createHostedReport(htmlContent: string, clientName: string): Promise<string> {
    try {
        const formData = new URLSearchParams();
        formData.append('content', htmlContent);
        formData.append('syntax', 'html');
        formData.append('title', `LLM Visibility Report for ${clientName}`);

        const response = await fetch(PASTE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formData.toString(),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`dpaste.com API Error (${response.status}): ${errorText || 'Failed to create paste'}`);
        }

        const pasteUrl = await response.text();
        return pasteUrl.trim();
    } catch (error) {
        console.error('Failed to create shareable link:', error);
        throw new Error('Could not create a shareable link. This might be due to network issues or API rate limiting.');
    }
}


const providerBaseNames: Record<Provider, string> = {
    gemini: 'Google Gemini',
    openai: 'OpenAI',
    perplexity: 'Perplexity',
    copilot: 'Copilot / Azure'
};

const getProviderNameWithModel = (provider: Provider, config: AppConfig): string => {
    const model = config.models[provider];
    return model ? `${providerBaseNames[provider]} (${model})` : providerBaseNames[provider];
};

function getStyles(): string {
    return `
<style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #111827; color: #e5e7eb; margin: 0; padding: 2rem; }
    .container { max-width: 1200px; margin: auto; }
    h1, h2, h3 { color: #4ade80; }
    h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
    h2 { font-size: 2rem; border-bottom: 2px solid #374151; padding-bottom: 0.5rem; margin-top: 3rem; }
    h3 { font-size: 1.5rem; }
    .card { background-color: #1f2937; border: 1px solid #374151; border-radius: 0.75rem; padding: 1.5rem; margin-bottom: 1.5rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; }
    th, td { padding: 0.75rem 1rem; text-align: left; border-bottom: 1px solid #374151; }
    th { background-color: #374151; color: #d1d5db; }
    .client-row { background-color: rgba(74, 222, 128, 0.1); }
    .client-name { color: #4ade80; font-weight: bold; }
    .prompt { font-style: italic; color: #9ca3af; margin-bottom: 1rem; }
    .response-container { display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 1.5rem; }
    .provider-response { background-color: #374151; padding: 1rem; border-radius: 0.5rem; }
    .provider-response h4 { margin-top: 0; color: #6ee7b7; }
    .response-content { background-color: #111827; padding: 1rem; border-radius: 0.25rem; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word; }
    .sentiment-Positive { color: #34d399; }
    .sentiment-Negative { color: #f87171; }
    .sentiment-Neutral { color: #9ca3af; }
    .sentiment-Not-Mentioned { color: #6b7280; }
    .discovered-label { margin-left: 8px; font-size: 0.75rem; font-weight: 600; color: #facc15; letter-spacing: 0.025em; vertical-align: middle; }
    .error { color: #f87171; font-weight: bold; }

    /* Accordion Styles */
    .card.accordion-wrapper {
        padding: 0;
    }
    .accordion-header {
        cursor: pointer;
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 1.5rem;
        transition: background-color 0.2s ease-in-out;
    }
    .accordion-header:hover {
        background-color: #374151;
    }
    .accordion-content {
        display: none; /* Hidden by default */
        padding: 1.5rem;
        border-top: 1px solid #374151;
    }
    .indicator {
        font-family: monospace;
        font-size: 1.2rem;
        color: #9ca3af;
        margin-left: 1rem;
    }
    mark { background-color: #facc15; color: #1f2937; padding: 0.1em 0.2em; border-radius: 0.2em; }
</style>
`;
}

function escapeHtml(unsafe: string): string {
    if (!unsafe) return '';
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function generateSummary(results: AnalysisResult[], config: AppConfig): string {
    const totalMentions = results.flatMap(r => r.providerResponses)
        .flatMap(pr => pr.brandAnalyses)
        .filter(ba => ba.brandName.toLowerCase() === config.clientName.toLowerCase())
        .reduce((sum, ba) => sum + ba.mentions, 0);

    return `
<h2>Executive Summary</h2>
<div class="card">
    <p>This report details the visibility of the brand "<strong>${escapeHtml(config.clientName)}</strong>" across various Large Language Models (LLMs).</p>
    <ul>
        <li><strong>Client Brand:</strong> ${escapeHtml(config.clientName)}</li>
        <li><strong>Competitors Tracked:</strong> ${escapeHtml(config.competitors.join(', ')) || 'None'}</li>
        <li><strong>LLM Providers Analyzed:</strong> ${config.providers.map(p => escapeHtml(getProviderNameWithModel(p, config))).join(', ')}</li>
        <li><strong>Total Prompts:</strong> ${config.prompts.length}</li>
        <li><strong>Total Client Mentions:</strong> ${totalMentions}</li>
    </ul>
</div>
`;
}

function generateComparativeTables(results: AnalysisResult[], config: AppConfig): string {
    const allKnownBrands = [config.clientName, ...config.competitors];
    const knownBrandsLower = new Set(allKnownBrands.map(b => b.toLowerCase()));
    
    const mentionsMap = new Map<string, { brandName: string, mentions: Record<string, number> }>();
    const sentimentMap = new Map<string, { brandName: string, sentiments: Record<string, { P: number, N: number, Nl: number }> }>();

    results.forEach(result => {
        result.providerResponses.forEach(pResponse => {
            pResponse.brandAnalyses.forEach(analysis => {
                if (typeof analysis.brandName === 'string') {
                    const lowerCaseBrand = analysis.brandName.toLowerCase();
                    if (!mentionsMap.has(lowerCaseBrand)) {
                        mentionsMap.set(lowerCaseBrand, { brandName: analysis.brandName, mentions: {} });
                    }
                    if (!sentimentMap.has(lowerCaseBrand)) {
                        sentimentMap.set(lowerCaseBrand, { brandName: analysis.brandName, sentiments: {} });
                    }
                    
                    const mentionEntry = mentionsMap.get(lowerCaseBrand)!;
                    mentionEntry.mentions[pResponse.provider] = (mentionEntry.mentions[pResponse.provider] || 0) + analysis.mentions;

                    if (analysis.sentiment !== 'Not Mentioned') {
                        const sentimentEntry = sentimentMap.get(lowerCaseBrand)!;
                        if (!sentimentEntry.sentiments[pResponse.provider]) {
                           sentimentEntry.sentiments[pResponse.provider] = { P: 0, N: 0, Nl: 0 };
                        }
                        if (analysis.sentiment === 'Positive') sentimentEntry.sentiments[pResponse.provider].P++;
                        if (analysis.sentiment === 'Negative') sentimentEntry.sentiments[pResponse.provider].N++;
                        if (analysis.sentiment === 'Neutral') sentimentEntry.sentiments[pResponse.provider].Nl++;
                    }
                }
            });
        });
    });

    // Ensure all known brands are in the maps, even if not mentioned
    allKnownBrands.forEach(brand => {
        const lowerCaseBrand = brand.toLowerCase();
        if (!mentionsMap.has(lowerCaseBrand)) {
           mentionsMap.set(lowerCaseBrand, { brandName: brand, mentions: {} });
        }
        if (!sentimentMap.has(lowerCaseBrand)) {
            sentimentMap.set(lowerCaseBrand, { brandName: brand, sentiments: {} });
        }
    });


    const brandMentionsData = Array.from(mentionsMap.values()).sort((a, b) => {
        const totalA = Object.values(a.mentions).reduce((s, c) => s + c, 0);
        const totalB = Object.values(b.mentions).reduce((s, c) => s + c, 0);
        return totalB - totalA;
    });

    let mentionsTable = `
<h2>Comparative Brand Mentions</h2>
<div class="card">
    <table>
        <thead>
            <tr>
                <th>Brand</th>
                ${config.providers.map(p => `<th style="text-align: right;">${escapeHtml(getProviderNameWithModel(p, config))}</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${brandMentionsData.map(d => {
                const isKnown = knownBrandsLower.has(d.brandName.toLowerCase());
                return `
                <tr class="${d.brandName.toLowerCase() === config.clientName.toLowerCase() ? 'client-row' : ''}">
                    <td class="${d.brandName.toLowerCase() === config.clientName.toLowerCase() ? 'client-name' : ''}">
                        ${escapeHtml(d.brandName)}
                        ${!isKnown ? `<span class="discovered-label">(Discovered)</span>` : ''}
                    </td>
                    ${config.providers.map(p => `<td style="text-align: right;">${d.mentions[p] || 0}</td>`).join('')}
                </tr>
            `}).join('')}
        </tbody>
    </table>
</div>`;

    let sentimentTable = `
<h2>Comparative Sentiment Scores</h2>
<div class="card">
    <table>
        <thead>
            <tr>
                <th rowspan="2">Brand</th>
                ${config.providers.map(p => `<th colspan="3" style="text-align: center;">${escapeHtml(getProviderNameWithModel(p, config))}</th>`).join('')}
            </tr>
            <tr>
                ${config.providers.map(() => `<th style="text-align: center;">Pos</th><th style="text-align: center;">Neu</th><th style="text-align: center;">Neg</th>`).join('')}
            </tr>
        </thead>
        <tbody>
            ${brandMentionsData.map(brandData => {
                const lowerCaseBrand = brandData.brandName.toLowerCase();
                const sentimentData = sentimentMap.get(lowerCaseBrand);
                const isKnown = knownBrandsLower.has(lowerCaseBrand);

                return `
                <tr class="${lowerCaseBrand === config.clientName.toLowerCase() ? 'client-row' : ''}">
                    <td class="${lowerCaseBrand === config.clientName.toLowerCase() ? 'client-name' : ''}">
                        ${escapeHtml(brandData.brandName)}
                        ${!isKnown ? `<span class="discovered-label">(Discovered)</span>` : ''}
                    </td>
                    ${config.providers.map(p => {
                        const s = sentimentData?.sentiments[p] || { P: 0, Nl: 0, N: 0 };
                        return `
                            <td class="sentiment-Positive" style="text-align: center;">${s.P}</td>
                            <td class="sentiment-Neutral" style="text-align: center;">${s.Nl}</td>
                            <td class="sentiment-Negative" style="text-align: center;">${s.N}</td>
                        `;
                    }).join('')}
                </tr>
                `;
            }).join('')}
        </tbody>
    </table>
</div>`;

    return mentionsTable + sentimentTable;
}

function generateIndividualResponses(results: AnalysisResult[], config: AppConfig): string {
    return `
<h2>Individual Prompt Responses</h2>
<div class="card">
    <input type="search" id="responseSearch" placeholder="Search prompts and responses..." style="width: 100%; padding: 0.75rem; border-radius: 0.5rem; border: 1px solid #4a5568; background-color: #374151; color: #e5e7eb; font-size: 1rem;">
</div>
${results.map((result, index) => `
<div class="card accordion-wrapper prompt-card-wrapper">
    <div class="accordion-header">
        <h4 class="prompt-header-text" style="margin: 0; flex-grow: 1; color: #e5e7eb; font-size: 1.1rem;">Prompt ${index + 1}: <span style="font-weight: normal; font-style: italic; color: #d1d5db;">${escapeHtml(result.prompt)}</span></h4>
        <span class="indicator">[+]</span>
    </div>
    <div class="accordion-content">
        <div class="response-container">
            ${result.providerResponses.map(pResponse => `
            <div class="provider-response">
                <h4>${escapeHtml(getProviderNameWithModel(pResponse.provider, config))}</h4>
                ${pResponse.error ? `<p class="error">Error: ${escapeHtml(pResponse.error)}</p>` : `
                <h5>LLM Response</h5>
                <div class="response-content"><pre style="white-space: pre-wrap; word-wrap: break-word;">${escapeHtml(pResponse.response)}</pre></div>
                <h5>Brand Analysis</h5>
                <table>
                    <thead><tr><th>Brand</th><th>Mentions</th><th>Sentiment</th></tr></thead>
                    <tbody>
                    ${pResponse.brandAnalyses.map(ba => `
                        <tr>
                            <td>${escapeHtml(ba.brandName)}</td>
                            <td>${ba.mentions}</td>
                            <td class="sentiment-${ba.sentiment.replace(' ', '-')}">${ba.sentiment}</td>
                        </tr>
                    `).join('')}
                    </tbody>
                </table>
                `}
            </div>
            `).join('')}
        </div>
    </div>
</div>
`).join('')}
`;
}

function generateAdditionalQuestions(results: AnalysisResult[], config: AppConfig): string {
    if (config.additionalQuestions.length === 0) return '';
    
    return `
<h2>Additional Questions Analysis</h2>
${config.additionalQuestions.map((question, qIndex) => `
<div class="card accordion-wrapper">
     <div class="accordion-header">
        <h4 style="margin: 0; flex-grow: 1; color: #e5e7eb; font-size: 1.1rem;">Question ${qIndex + 1}: <span style="font-weight: normal; font-style: italic; color: #d1d5db;">${escapeHtml(question)}</span></h4>
        <span class="indicator">[+]</span>
    </div>
    <div class="accordion-content">
    ${results.map((result, i) => `
    <div style="margin-top: ${i === 0 ? '0' : '1.5rem'}; border-top: ${i === 0 ? 'none' : `1px solid #4a5568`}; padding-top: ${i === 0 ? '0' : '1.5rem'};">
        <p><strong>Regarding Prompt:</strong> <span class="prompt">"${escapeHtml(result.prompt)}"</span></p>
        <div class="response-container">
            ${result.providerResponses.map(pResponse => {
                const answer = pResponse.additionalAnswers.find(a => a.question === question);
                return `
                <div class="provider-response">
                    <h4>${escapeHtml(getProviderNameWithModel(pResponse.provider, config))}</h4>
                    <div class="response-content"><pre style="white-space: pre-wrap; word-wrap: break-word;">${answer ? escapeHtml(answer.answer) : 'No answer available.'}</pre></div>
                </div>
                `;
            }).join('')}
        </div>
    </div>
    `).join('')}
    </div>
</div>
`).join('')}
`;
}

export function generateHtmlReport(results: AnalysisResult[], config: AppConfig): string {
    const script = `
<script>
document.addEventListener('DOMContentLoaded', function() {
    // Accordion functionality
    const accordions = document.querySelectorAll('.accordion-header');
    accordions.forEach(header => {
        header.addEventListener('click', function() {
            const content = this.nextElementSibling;
            if (content.style.display === 'block') {
                content.style.display = 'none';
                this.classList.remove('active');
            } else {
                content.style.display = 'block';
                this.classList.add('active');
            }
            const indicator = this.querySelector('.indicator');
            if (indicator) {
                indicator.textContent = content.style.display === 'block' ? '[-]' : '[+]';
            }
        });
    });

    // Search functionality
    const searchInput = document.getElementById('responseSearch');
    if (searchInput) {
        const responseCards = document.querySelectorAll('.prompt-card-wrapper');

        const searchableElements = document.querySelectorAll('.prompt-header-text, .response-content pre');
        searchableElements.forEach(el => {
            if (el) el.dataset.originalContent = el.innerHTML;
        });

        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();

            responseCards.forEach(card => {
                let hasMatch = false;
                const header = card.querySelector('.prompt-header-text');
                const responses = card.querySelectorAll('.response-content pre');
                const accordionHeader = card.querySelector('.accordion-header');
                const accordionContent = card.querySelector('.accordion-content');
                const indicator = card.querySelector('.indicator');

                const elementsToSearch = [header, ...responses].filter(Boolean);

                elementsToSearch.forEach(el => {
                    const originalContent = el.dataset.originalContent;
                    if (!originalContent) return;
                    
                    el.innerHTML = originalContent;

                    if (searchTerm && originalContent.toLowerCase().includes(searchTerm)) {
                        hasMatch = true;
                        const regex = new RegExp(searchTerm.replace(/[-\\/\\\\^$*+?.()|[\]{}]/g, '\\\\$&'), 'gi');
                        el.innerHTML = originalContent.replace(regex, match => \`<mark>\${match}</mark>\`);
                    }
                });

                if (searchTerm === '') {
                    card.style.display = '';
                } else if (hasMatch) {
                    card.style.display = '';
                    if (accordionContent && accordionContent.style.display !== 'block') {
                        accordionContent.style.display = 'block';
                        if (accordionHeader) accordionHeader.classList.add('active');
                        if (indicator) indicator.textContent = '[-]';
                    }
                } else {
                    card.style.display = 'none';
                }
            });
        });
    }
});
</script>
`;
    const logoSvg = `
    <svg aria-label="TRAVYK Logo" height="36" viewBox="0 0 180 32" xmlns="http://www.w3.org/2000/svg" style="margin-bottom: 1rem;">
        <text x="0" y="26" font-family="system-ui, sans-serif" font-size="32" font-weight="800" letter-spacing="-2" fill="#e5e7eb">
            TRAVY
        </text>
        <text x="98" y="26" font-family="system-ui, sans-serif" font-size="32" font-weight="800" letter-spacing="-2" fill="#4ade80">
            K
        </text>
    </svg>`;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>LLM Visibility Report for ${escapeHtml(config.clientName)}</title>
    ${getStyles()}
</head>
<body>
    <div class="container">
        ${logoSvg}
        <h1>LLM Visibility Report</h1>
        <p>Client: <strong>${escapeHtml(config.clientName)}</strong> | Date: ${new Date().toLocaleDateString()}</p>
        
        ${generateSummary(results, config)}
        ${generateComparativeTables(results, config)}
        ${generateIndividualResponses(results, config)}
        ${generateAdditionalQuestions(results, config)}
        
    </div>
    ${script}
</body>
</html>
    `;
    return html;
}