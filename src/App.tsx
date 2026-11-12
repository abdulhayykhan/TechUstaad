import { useState } from 'react';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { AnalyzerSection } from './components/AnalyzerSection';
import { ResultsSection } from './components/ResultsSection';
import { MethodologyAndFooter } from './components/MethodologyAndFooter';
import type { AnalysisRequest, AnalysisResponse, ApiErrorPayload } from './types/analysis';
import { validateAndNormalizeAnalysisResponse } from './utils/validation';
import { SAMPLE_REFERENCE_REPORTS } from './data/sampleReports';

export default function App() {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<ApiErrorPayload | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResponse | null>(null);

  const scrollToElement = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 60);
  };

  const handleScrollToAnalyzer = () => {
    scrollToElement('analyzer');
  };

  const handleLoadPresetSample = (sampleId: string) => {
    const sample =
      SAMPLE_REFERENCE_REPORTS[sampleId] || SAMPLE_REFERENCE_REPORTS['rishta-aunty'];
    setIsLoading(false);
    setApiError(null);
    setAnalysisResult(sample);
    scrollToElement('results-dossier');
  };

  const handleResetAnalysis = () => {
    setAnalysisResult(null);
    setApiError(null);
    scrollToElement('analyzer');
  };

  const handleSubmitAnalysis = async (request: AnalysisRequest) => {
    if (isLoading) return;
    setIsLoading(true);
    setApiError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      const contentType = response.headers.get('content-type') || '';
      const rawText = await response.text();

      let data: Record<string, unknown> | null = null;
      try {
        data = JSON.parse(rawText);
      } catch {
        const isWarmupPage = /warmup|starting|loading|502|503|504/i.test(rawText);
        setApiError({
          error: isWarmupPage
            ? 'The upstream AI service or container proxy timed out while waiting for Gemini 3.5 Flash-Lite.'
            : `The server returned a non-JSON response (HTTP ${response.status}, ${contentType || 'unknown content-type'}).`,
          code: 'SERVER_ERROR',
          suggestion:
            'Spikes in demand on gemini-3.5-flash-lite are temporary. Please click "Roast My Project" to try again, or click "Load Pre-Inspected Reference Report" below.',
        });
        return;
      }

      if (!response.ok || (data && 'error' in data && !('roast' in data))) {
        const errPayload = (data || {}) as unknown as ApiErrorPayload;
        setApiError({
          error: errPayload.error || 'Failed to complete project analysis.',
          code: errPayload.code || 'SERVER_ERROR',
          suggestion: errPayload.suggestion,
          canFallbackToDescription: errPayload.canFallbackToDescription,
          repositoryTelemetry: errPayload.repositoryTelemetry,
        });
        return;
      }

      // Client-side validation of the structured JSON before rendering
      const check = validateAndNormalizeAnalysisResponse(data);
      if (!check.valid || !check.data) {
        setApiError({
          error: check.error || 'Received an invalid analysis response structure.',
          code: 'GEMINI_INVALID_OUTPUT',
          suggestion: 'Please click "Roast My Project" again to generate a valid report.',
        });
        return;
      }

      const rawResponse = (data || {}) as Partial<AnalysisResponse>;
      const enriched: AnalysisResponse = {
        ...check.data,
        source_mode: rawResponse.source_mode || request.mode,
        is_sample_preview: Boolean(rawResponse.is_sample_preview),
        model_used: rawResponse.model_used || 'gemini-3.5-flash-lite',
        repository_telemetry: rawResponse.repository_telemetry,
      };

      setAnalysisResult(enriched);
      scrollToElement('results-dossier');
    } catch {
      setApiError({
        error: 'Network error while connecting to the TechUstaad analysis server.',
        code: 'SERVER_ERROR',
        suggestion: 'Check your connection and try again.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-ustaad-mesh text-[#111111]">
      <Navbar
        onScrollToAnalyzer={handleScrollToAnalyzer}
        onLoadSampleReport={() => handleLoadPresetSample('rishta-aunty')}
      />

      <main className="flex-1">
        <HeroSection
          onScrollToAnalyzer={handleScrollToAnalyzer}
          onLoadSampleReport={() => handleLoadPresetSample('rishta-aunty')}
        />

        <AnalyzerSection
          onSubmitAnalysis={handleSubmitAnalysis}
          onLoadPresetSample={handleLoadPresetSample}
          isLoading={isLoading}
          apiError={apiError}
          onClearError={() => setApiError(null)}
        />

        {analysisResult && (
          <ResultsSection
            result={analysisResult}
            onResetAnalysis={handleResetAnalysis}
          />
        )}

        <MethodologyAndFooter />
      </main>
    </div>
  );
}
