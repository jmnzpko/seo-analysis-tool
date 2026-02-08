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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFormSubmit = async (formData: SeoFormData) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Analysis failed');
      }

      if (!data.analysis) {
        throw new Error('No analysis returned from server');
      }

      const sections = parseAnalysisOutput(data.analysis);
      
      setResult({
        sectionA: sections.sectionA,
        sectionB: sections.sectionB,
        sectionC: sections.sectionC,
        rawOutput: data.analysis,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Analysis error:', err);
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

  return (
    <div className="app">
      <header className="app-header">
        <h1>SEO Analysis Tool</h1>
        <p>Algorithm-Focused Local Car Accident Lawyer Page Comparison</p>
      </header>

      <main className="app-main">
        <AnalysisForm onSubmit={handleFormSubmit} isLoading={isLoading} />
        
        {error && (
          <div className="error-message">
            <strong>Error:</strong> {error}
          </div>
        )}

        <AnalysisOutput result={result} />
      </main>

      <footer className="app-footer">
        <p>Algorithmically-focused SEO analysis for local search optimization</p>
      </footer>
    </div>
  );
}

export default App;
