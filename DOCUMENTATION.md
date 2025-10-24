# LLM Visibility Tracker Documentation

Welcome to the LLM Visibility Tracker! This tool is designed to help you track and analyze your brand's visibility within the responses of various Large Language Models (LLMs). This guide will walk you through setting up the tool, running analyses, and understanding the results.

---

### 1. Initial Setup: Data Storage & API Keys

Before you can run an analysis, you need to configure two key areas: where to store your data and the API keys for the LLM providers you want to use.

#### Data Storage (Supabase)

While the tool can be used for one-off analyses without external storage, connecting to a [Supabase](https://supabase.com/) project is highly recommended. It enables several key features:
- **Saving & Loading Configurations:** Store your analysis setups as presets so you don't have to re-enter them every time.
- **Saving Reports:** Automatically save a history of all your analysis reports.
- **Sharing Reports:** Generate unique links to share reports with colleagues.
- **Project Mode:** Track the same analysis over time to see trends.
- **Token Usage Tracking:** Monitor your token consumption across all runs.

To connect, you will need:
- **Supabase Project URL:** Found in your Supabase project settings (`Settings` > `API`).
- **Supabase Anon Key:** The public, anonymous key for your project, also found in `Settings` > `API`.

**Note:** If you don't provide Supabase credentials, reports and configurations will be stored temporarily in your browser's local storage and will be lost if you clear your cache.

#### LLM Providers & API Keys

You must provide an API key for each LLM provider you wish to include in your analysis.
- **Google Gemini:** Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey).
- **OpenAI:** Get your key from the [OpenAI Platform](https://platform.openai.com/api-keys). This single key works for both standard OpenAI models and the Web Search models.
- **Perplexity:** Get your key from your [Perplexity Account Settings](https://www.perplexity.ai/settings/api).

Use the **"Verify"** button next to each key input to confirm that your key is valid and working before starting a lengthy analysis.

---

### 2. Configuring Your Analysis

The main form contains all the inputs needed for a single analysis run.

- **Client Brand Name:** The primary brand you are tracking.
- **Competitor Brands:** A list of competitors, with each brand on a new line. The tool will also track mentions and sentiment for these brands.
- **Use Broad Match for Brand Names:** A powerful option that changes how brands are detected.
    - **Unchecked (Exact Match):** The tool will only count mentions that exactly match the brand names you've entered (e.g., "Travyk").
    - **Checked (Broad Match):** The tool will count mentions that *contain* the brand name you've entered. This is useful for capturing variations like "Travyk PIM" or "Travyk Print" all under the core brand "Travyk".
- **Prompts:** The questions or search queries you want to pose to the LLMs. Each prompt should be on a new line.
- **Additional Analysis Questions:** Optional questions you can ask about *each* LLM response. This is useful for extracting specific information, like "What unique selling propositions were mentioned for [Client Brand]?". Each question goes on a new line.
- **Providers & Models:** Select the LLM providers you want to query and choose a specific model for each. You can view model details and pricing by clicking the info icon.

---

### 3. Managing Presets

(Requires Supabase connection)

Presets allow you to save and load entire form configurations.

- **Save Current:** After filling out the form, click "Save Current". You'll be prompted to give the preset a name. This is useful for saving common analysis types (e.g., "Weekly Competitor Check," "New Feature Prompts").
- **Load a Preset:** In the "Configuration Presets" section, click "Load" next to any saved preset to instantly populate the entire form with its data.
- **Delete a Preset:** Click "Delete" to permanently remove a saved preset.

If you load a preset and then change any field, the "Current Preset Loaded" indicator will disappear, signifying that your current configuration is a modified version.

---

### 4. Running an Analysis

Once your form is configured, click **"Start Analysis"**.
A loading screen will appear, showing you the real-time progress of the analysis. The tool breaks down the work into individual tasks (e.g., "Analyzing 'prompt A' with Gemini"). You can see which tasks are pending, in progress, completed, or have encountered an error. The tool will automatically retry tasks that fail due to temporary network issues or rate limits.

---

### 5. Understanding the Results Dashboard

After the analysis is complete, you'll be presented with a comprehensive dashboard.

- **Summary Cards:** High-level metrics showing total client mentions, prompts analyzed, and which LLM provided the most visibility.
- **Comparative Tables:**
    - **Brand Mentions:** A table comparing the total number of mentions for your client and competitors across each provider. It also highlights "Discovered" brands that were mentioned but not in your initial competitor list.
    - **Sentiment Scores:** A breakdown of how many responses were Positive, Neutral, or Negative for each brand, per provider.
- **Sentiment Chart:** A visual, stacked bar chart that helps you quickly compare the sentiment landscape across all tracked brands and providers.
- **Negative Sentiment Highlights:** A dedicated section that isolates any prompts that resulted in a negative sentiment for any brand, making it easy to review potential issues.
- **Individual Prompt Responses:** An accordion list of every prompt. Click on a prompt to expand it and view the detailed response from each LLM provider, including the raw text, brand analysis, and any citations.
- **Additional Sections:** At the bottom, you'll find accordions for **Additional Questions Summary**, **Token Usage Summary**, **Raw API Responses** (for debugging), and a **Citation Summary** table.

---

### 6. Managing Saved Reports

(Supabase recommended for full functionality)

Below the main setup form, you'll find a list of all your past analysis reports. For each report, you can:
- **View:** Open the report in a full-screen viewer within the app.
- **Export:** Download the report as a self-contained HTML file that can be easily shared or archived.
- **Share:** (Supabase only) Generate a unique URL that you can send to others. Anyone with the link can view the report without needing access to the main tool.
- **Download Raw JSON:** (Supabase only) Download the complete, raw data for the report, which can be useful for further, custom analysis.
- **Delete:** Permanently remove the report.

---

### 7. Projects: How Do They Work?

(Requires Supabase connection)

While the "One-off Analysis" mode is great for ad-hoc queries, the **"Projects"** mode is designed for longitudinal tracking.

A project is essentially a saved configuration that you intend to run repeatedly over time.

- **Creating a Project:** You give the project a name and description, then define a fixed configuration (prompts, competitors, models, etc.) that will be used for every run.
- **The Project Dashboard:** Each project has its own dashboard. Instead of showing a single report, it shows trends over time. You'll see charts for **Mentions Over Time** and **Sentiment Over Time**.
- **Running an Analysis:** From the dashboard, click "Run Analysis Now". The tool will execute the project's saved configuration and store the results as a new "run" in its history.
- **Run History:** The dashboard lists every historical run. You can view the full results dashboard for any specific run, allowing you to see a snapshot of visibility on that particular day.

Projects are ideal for tracking key metrics monthly or quarterly to measure the impact of marketing campaigns, PR efforts, or changes in the LLM landscape.

---

### 8. Tips for Effective Use

- **Be Specific with Prompts:** Vague prompts lead to vague answers. Prompts like "Compare [Client Brand] to [Competitor A] for PIM solutions" will yield better results than "PIM solutions."
- **Use Additional Questions for Deep Dives:** Don't just rely on sentiment. Ask specific questions like "Which brand was mentioned as being the most affordable?" or "Does the response mention any loyalty programs?".
- **Start with Cheaper Models:** For initial exploration, use cost-effective models like `gpt-4o-mini` or `gemini-2.5-flash`. Once you've refined your prompts, you can run a final analysis with more powerful (and expensive) models.
- **Leverage Projects for Trend Analysis:** For your core set of brand and competitor keywords, use a Project. Running it weekly or monthly will provide invaluable data on how your visibility is changing over time.
- **Review Discovered Brands:** The Brand Mentions table may show brands you weren't tracking. This can be a great way to identify new or emerging competitors.