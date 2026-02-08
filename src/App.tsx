import { useState } from 'react';
import { AnalysisForm, type SeoFormData } from './components/AnalysisForm';
import { AnalysisOutput, type AnalysisResult } from './components/AnalysisOutput';
import './App.css';

interface ApiResponse {
  success: boolean;
  analysis?: string;
  error?: string;
  details?: string;
}

function App() {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [generatedContent, setGeneratedContent] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingStage, setLoadingStage] = useState<string>('');

  const handleFormSubmit = async (data: SeoFormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setGeneratedContent(null);

    try {
      // Step 1: Generate Analysis
      setLoadingStage('Analyzing competitor pages...');
      
      const analysisResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ...data, mode: 'analysis' }),
      });

      const analysisData: ApiResponse = await analysisResponse.json();

      if (!analysisResponse.ok || !analysisData.success) {
        throw new Error(analysisData.error || 'Analysis failed');
      }

      if (!analysisData.analysis) {
        throw new Error('No analysis returned from server');
      }

      const sections = parseAnalysisOutput(analysisData.analysis);
      
      setResult({
        sectionA: sections.sectionA,
        sectionB: sections.sectionB,
        sectionC: sections.sectionC,
        rawOutput: analysisData.analysis,
      });

      // Step 2: Generate Content
      setLoadingStage('Generating full content based on analysis...');

      const contentResponse = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          mode: 'content',
          analysis: analysisData.analysis,
        }),
      });

      const contentData: ApiResponse = await contentResponse.json();

      if (!contentResponse.ok || !contentData.success) {
        throw new Error(contentData.error || 'Content generation failed');
      }

      if (!contentData.analysis) {
        throw new Error('No content returned from server');
      }

      setGeneratedContent(contentData.analysis);
      setLoadingStage('');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error:', err);
      setLoadingStage('');
    } finally {
      setIsLoading(false);
    }
  };

  const parseAnalysisOutput = (text: string): Omit<AnalysisResult, 'rawOutput'> => {
    const sectionAMatch = text.match(/##\s*A\)\s*Algorithmically Important Content[^\n]*\n([\s\S]*?)(?=##\s*B\)|$)/i);
    const sectionBMatch = text.match(/##\s*B\)\s*Missing or Weak Content Signals[^\n]*\n([\s\S]*?)(?=##\s*C\)|$)/i);
    const sectionCMatch = text.match(/##\s*C\)\s*Search-Engine-Optimized Content Additions[^\n]*\n([\s\S]*?)$/i);

    return {
      sectionA: sectionAMatch ? sectionAMatch[1].trim() : 'No content found for Section A',
      sectionB: sectionBMatch ? sectionBMatch[1].trim() : 'No content found for Section B',
      sectionC: sectionCMatch ? sectionCMatch[1].trim() : 'No content found for Section C',
    };
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert('Content copied to clipboard!');
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>SEO Analysis & Content Generator</h1>
        <p>Algorithm-Focused Local Car Accident Lawyer Page Comparison</p>
      </header>

      <main className="app-main">
        <AnalysisForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        
        {isLoading && loadingStage && (
          <div className="loading-stage">
            <div className="spinner"></div>
            <p>{loadingStage}</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <AnalysisOutput result={result} />

        {generatedContent && (
          <div className="generated-content-section">
            <div className="content-header">
              <h2 className="content-title">📝 Generated Content</h2>
              <button
                className="copy-btn"
                onClick={() => copyToClipboard(generatedContent)}
              >
                📋 Copy to Clipboard
              </button>
            </div>
            <div className="content-display">
              <pre>{generatedContent}</pre>
            </div>
          </div>
        )}
      </main>

      <footer className="app-footer">
        <p>Algorithmically-focused SEO analysis & content generation for local search optimization</p>
      </footer>
    </div>
  );
}

export default App;
