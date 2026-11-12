import React, { useState } from 'react';
import {
  AlertCircle,
  Award,
  BookOpen,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Code2,
  Cpu,
  Download,
  ExternalLink,
  Flame,
  FolderGit2,
  GitFork,
  Layers,
  RefreshCw,
  Share2,
  ShieldCheck,
  Star,
  Wrench,
  XCircle,
} from 'lucide-react';
import type { ActionPlanItem, AnalysisResponse, CategoryScore } from '../types/analysis';
import {
  formatActionPlanAsText,
  formatReportAsMarkdown,
  getScoreVerdict,
} from '../utils/validation';

interface ResultsSectionProps {
  result: AnalysisResponse;
  onResetAnalysis: () => void;
}

export const ResultsSection: React.FC<ResultsSectionProps> = ({
  result,
  onResetAnalysis,
}) => {
  const [feedbackToast, setFeedbackToast] = useState<string | null>(null);
  const [activePriorityFilter, setActivePriorityFilter] = useState<
    'all' | 'immediate' | 'next' | 'future'
  >('all');

  const showToast = (msg: string) => {
    setFeedbackToast(msg);
    setTimeout(() => {
      setFeedbackToast((prev) => (prev === msg ? null : prev));
    }, 3200);
  };

  const copyTextToClipboard = async (text: string, successLabel: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        showToast(successLabel);
        return;
      }
    } catch {
      // Fallback for restricted clipboard contexts
    }
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(successLabel);
    } catch {
      showToast('Could not copy automatically — please use Download Report.');
    }
  };

  const handleCopyRoast = () => {
    const roastText = [
      `TECHUSTAAD ROAST: ${result.project_title} (${result.scores.total}/100)`,
      `"${result.roast.headline}"`,
      ``,
      result.roast.content,
      ``,
      `Highlights:`,
      ...result.roast.highlights.map((h) => `• ${h}`),
      ``,
      `— Roasted by TechUstaad`,
    ].join('\n');
    copyTextToClipboard(roastText, 'Roast copied to clipboard!');
  };

  const handleCopyFullReport = () => {
    const md = formatReportAsMarkdown(result);
    copyTextToClipboard(md, 'Complete engineering report copied to clipboard!');
  };

  const handleCopyActionPlan = () => {
    const planText = formatActionPlanAsText(result);
    copyTextToClipboard(planText, 'Prioritized improvement plan copied to clipboard!');
  };

  const handleDownloadReport = () => {
    try {
      const md = formatReportAsMarkdown(result);
      const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const slug = result.project_title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
      a.href = url;
      a.download = `techustaad-report-${slug || 'project'}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Report downloaded as Markdown (.md)!');
    } catch {
      showToast('Download failed in this browser.');
    }
  };

  const handleShareResult = async () => {
    const verdictInfo = getScoreVerdict(result.scores.total);
    const shareTitle = `TechUstaad Verdict: ${result.project_title} (${result.scores.total}/100)`;
    const shareText = `TechUstaad gave "${result.project_title}" a ${result.scores.total}/100 (${verdictInfo.urduTag})!\n\nRoast: "${result.roast.headline}"`;

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: window.location.href,
        });
        showToast('Shared via system share sheet!');
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    await copyTextToClipboard(
      `${shareText}\n\n${window.location.href}`,
      'Share summary copied to clipboard!'
    );
  };

  const verdictInfo = getScoreVerdict(result.scores.total);

  const categoryEntries: Array<{
    key: string;
    label: string;
    subtitle: string;
    data: CategoryScore;
    accentBg: string;
  }> = [
    {
      key: 'code_quality',
      label: 'Code Quality',
      subtitle: 'Readability · Organization · Modularity',
      data: result.scores.code_quality,
      accentBg: '#CCF2FF',
    },
    {
      key: 'architecture',
      label: 'Architecture & Design',
      subtitle: 'Structure · Separation of Concerns · Stack',
      data: result.scores.architecture,
      accentBg: '#E5DEFF',
    },
    {
      key: 'functionality',
      label: 'Functionality & Implementation',
      subtitle: 'Completeness · Claims vs Reality',
      data: result.scores.functionality,
      accentBg: '#FFF3B0',
    },
    {
      key: 'documentation',
      label: 'Documentation & Presentation',
      subtitle: 'README · Setup Guide · Clarity',
      data: result.scores.documentation,
      accentBg: '#B8F3D8',
    },
    {
      key: 'testing',
      label: 'Testing & Reliability',
      subtitle: 'Test Suite · Validation · Error Handling',
      data: result.scores.testing,
      accentBg: '#FFD6E8',
    },
  ];

  const renderActionGroup = (
    heading: string,
    urduSub: string,
    badgeBg: string,
    items: ActionPlanItem[]
  ) => (
    <div className="neo-card bg-[#FFFDF7] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2 pb-4 mb-5 border-b-2 border-[#111111]">
        <div>
          <span
            className="inline-block font-mono text-xs font-bold border-2 border-[#111111] px-2.5 py-0.5 mb-1"
            style={{ backgroundColor: badgeBg }}
          >
            {urduSub}
          </span>
          <h4 className="font-display font-extrabold text-xl text-[#111111]">{heading}</h4>
        </div>
        <span className="font-mono text-xs font-bold tabular-nums text-[#333333]">
          {items.length} {items.length === 1 ? 'Recommendation' : 'Recommendations'}
        </span>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[#444444] font-mono">
          No specific items in this priority bucket.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#F6F3EC] border-2 border-[#111111] p-4 sm:p-5 transition-colors"
            >
              <div className="flex items-start gap-3 mb-3">
                <span
                  className="w-7 h-7 shrink-0 border-2 border-[#111111] font-mono font-bold text-xs flex items-center justify-center tabular-nums"
                  style={{ backgroundColor: badgeBg }}
                >
                  0{idx + 1}
                </span>
                <h5 className="font-display font-extrabold text-base sm:text-lg text-[#111111]">
                  {item.title}
                </h5>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs sm:text-sm">
                <div className="bg-[#FFFDF7] border border-[#111111] p-3">
                  <div className="font-mono text-[11px] font-bold text-[#111111] uppercase mb-1">
                    1. What Needs To Change
                  </div>
                  <p className="text-[#222222] leading-relaxed">{item.what_to_change}</p>
                </div>

                <div className="bg-[#FFFDF7] border border-[#111111] p-3">
                  <div className="font-mono text-[11px] font-bold text-[#111111] uppercase mb-1">
                    2. Why It Matters
                  </div>
                  <p className="text-[#222222] leading-relaxed">{item.why_it_matters}</p>
                </div>

                <div className="bg-[#FFFDF7] border border-[#111111] p-3">
                  <div className="font-mono text-[11px] font-bold text-[#111111] uppercase mb-1">
                    3. How To Approach It
                  </div>
                  <p className="text-[#222222] leading-relaxed">{item.how_to_approach}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <section
      id="results-dossier"
      aria-label="TechUstaad Analysis Results"
      className="py-10 sm:py-14 border-t-3 border-[#111111] bg-gradient-to-b from-[#FFF3B0]/35 via-[#FFFDF7] to-[#E5DEFF]/35 scroll-mt-16"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Sticky / Floating Feedback Toast */}
        {feedbackToast && (
          <div
            role="status"
            aria-live="polite"
            className="fixed bottom-6 right-6 z-50 neo-card bg-[#FFE600] text-[#111111] px-5 py-3.5 flex items-center gap-2.5 font-display font-extrabold text-sm sm:text-base"
          >
            <Check className="w-5 h-5 shrink-0" aria-hidden="true" />
            <span>{feedbackToast}</span>
          </div>
        )}

        {/* Top Action Bar & Sample Notice */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-[#111111] text-[#FFFDF7] p-4 border-3 border-[#111111] shadow-[6px_6px_0px_#FF5C93]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-xs font-bold bg-[#FFE600] text-[#111111] px-2.5 py-1">
              OFFICIAL TECHUSTAAD DOSSIER
            </span>
            {result.is_sample_preview && (
              <span className="font-mono text-xs font-bold bg-[#7DD3FC] text-[#111111] px-2.5 py-1">
                REFERENCE PREVIEW REPORT
              </span>
            )}
            <span className="font-mono text-xs text-[#E5DEFF]">
              Model: {result.model_used || 'gemini-3.5-flash-lite'}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyRoast}
              className="neo-btn bg-[#FF5C93] text-[#111111] font-mono font-bold text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <ClipboardCopy className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Copy Roast</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadReport}
              className="neo-btn bg-[#6EE7B7] text-[#111111] font-mono font-bold text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>Download Report (.md)</span>
            </button>
            <button
              type="button"
              onClick={onResetAnalysis}
              className="neo-btn bg-[#FFFDF7] text-[#111111] font-mono font-bold text-xs px-3 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
              <span>New Analysis</span>
            </button>
          </div>
        </div>

        {/* 1. PROJECT IDENTITY & SUMMARY */}
        <div className="neo-card-lg bg-[#FFFDF7] p-6 sm:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b-2 border-[#111111]">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#333333] mb-2">
                <span>SECTION 01 · PROJECT IDENTITY</span>
                <span aria-hidden="true">·</span>
                <span>
                  {result.repository_telemetry
                    ? `GitHub Repository Inspection (${result.repository_telemetry.owner}/${result.repository_telemetry.repo})`
                    : 'Project Description Analysis'}
                </span>
              </div>
              <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-[#111111] tracking-tight mb-2">
                {result.project_title}
              </h2>
              <p className="text-base sm:text-lg text-[#222222] leading-relaxed max-w-3xl">
                {result.project_summary}
              </p>
            </div>

            {/* Compact Score Badge in Header */}
            <div
              className="neo-card p-4 sm:p-5 shrink-0 flex flex-col items-center justify-center text-center min-w-[160px]"
              style={{ backgroundColor: verdictInfo.bgColor }}
            >
              <span className="font-mono text-xs font-bold text-[#111111] uppercase">
                USTAAD SCORE
              </span>
              <div className="font-display font-extrabold text-4xl sm:text-5xl text-[#111111] tabular-nums my-1">
                {result.scores.total}
                <span className="text-xl font-mono">/100</span>
              </div>
              <span className="font-mono text-[11px] font-bold bg-[#111111] text-[#FFFDF7] px-2 py-0.5">
                {verdictInfo.tier.toUpperCase()} TIER
              </span>
            </div>
          </div>

          {/* GitHub Repository Telemetry Strip (when repo was inspected) */}
          {result.repository_telemetry && (
            <div className="pt-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <div className="bg-[#FFF3B0] border-2 border-[#111111] p-3">
                  <div className="font-mono text-[11px] font-bold text-[#333333] flex items-center gap-1">
                    <FolderGit2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>PRIMARY STACK</span>
                  </div>
                  <div className="font-display font-extrabold text-base text-[#111111] truncate mt-0.5">
                    {result.repository_telemetry.primaryLanguage || 'Multi-lang'}
                  </div>
                </div>

                <div className="bg-[#FFD6E8] border-2 border-[#111111] p-3">
                  <div className="font-mono text-[11px] font-bold text-[#333333] flex items-center gap-1">
                    <Star className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>STARS</span>
                  </div>
                  <div className="font-display font-extrabold text-base text-[#111111] tabular-nums mt-0.5">
                    {result.repository_telemetry.stars}
                  </div>
                </div>

                <div className="bg-[#CCF2FF] border-2 border-[#111111] p-3">
                  <div className="font-mono text-[11px] font-bold text-[#333333] flex items-center gap-1">
                    <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>FORKS</span>
                  </div>
                  <div className="font-display font-extrabold text-base text-[#111111] tabular-nums mt-0.5">
                    {result.repository_telemetry.forks}
                  </div>
                </div>

                <div className="bg-[#B8F3D8] border-2 border-[#111111] p-3">
                  <div className="font-mono text-[11px] font-bold text-[#333333]">
                    FILES INSPECTED
                  </div>
                  <div className="font-display font-extrabold text-base text-[#111111] tabular-nums mt-0.5">
                    {result.repository_telemetry.inspectedFiles.length} /{' '}
                    {result.repository_telemetry.totalFilesCount}
                  </div>
                </div>

                <div className="bg-[#E5DEFF] border-2 border-[#111111] p-3">
                  <div className="font-mono text-[11px] font-bold text-[#333333]">TEST FILES</div>
                  <div className="font-display font-extrabold text-base text-[#111111] tabular-nums mt-0.5">
                    {result.repository_telemetry.detectedTestFiles.length} Found
                  </div>
                </div>

                <div className="bg-[#F6F3EC] border-2 border-[#111111] p-3 flex flex-col justify-between">
                  <div className="font-mono text-[11px] font-bold text-[#333333]">SOURCE LINK</div>
                  <a
                    href={result.repository_telemetry.htmlUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs font-bold text-[#111111] underline flex items-center gap-1 truncate mt-0.5"
                  >
                    <span>Open on GitHub</span>
                    <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 2 & 3. STAGE 1 — THE ROAST & ROAST HIGHLIGHTS */}
        <div className="neo-card-lg bg-[#FFD6E8] p-6 sm:p-8 lg:p-10 relative">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b-3 border-[#111111]">
            <div className="flex items-center gap-2.5">
              <span className="bg-[#FF5C93] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] px-3 py-1 font-mono text-xs sm:text-sm font-bold text-[#111111] flex items-center gap-1.5">
                <Flame className="w-4 h-4" aria-hidden="true" />
                <span>STAGE 01 · THE ROAST (UNFILTERED USTAAD)</span>
              </span>
            </div>
            <span className="font-mono text-xs font-bold bg-[#111111] text-[#FFE600] px-2.5 py-1">
              100% EVIDENCE-BASED KHICHAI
            </span>
          </div>

          {/* 2. Roast Headline & Content */}
          <div className="bg-[#FFFDF7] border-3 border-[#111111] shadow-[6px_6px_0px_#111111] p-5 sm:p-7 mb-6">
            <h3 className="font-display font-extrabold text-xl sm:text-3xl text-[#111111] leading-snug mb-4">
              “{result.roast.headline}”
            </h3>
            <p className="text-base sm:text-lg text-[#111111] leading-relaxed whitespace-pre-line font-medium">
              {result.roast.content}
            </p>
          </div>

          {/* 3. Roast Highlights */}
          <div>
            <h4 className="font-mono text-xs sm:text-sm font-bold text-[#111111] uppercase tracking-wider mb-3">
              Ustaad Ke Savage Observations (Roast Highlights):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {result.roast.highlights.map((highlight, idx) => (
                <div
                  key={idx}
                  className="bg-[#FFF3B0] border-2 border-[#111111] shadow-[4px_4px_0px_#111111] p-4 flex items-start gap-3"
                >
                  <span className="bg-[#111111] text-[#FFE600] font-mono text-xs font-bold px-2 py-0.5 shrink-0 tabular-nums">
                    #{idx + 1}
                  </span>
                  <p className="text-sm sm:text-base font-semibold text-[#111111] leading-snug">
                    {highlight}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4, 5 & 6. STAGE 2 — OVERALL ENGINEERING VERDICT & 100-POINT SCORING SYSTEM */}
        <div className="neo-card-lg bg-[#CCF2FF] p-6 sm:p-8 lg:p-10">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-6 border-b-3 border-[#111111]">
            <span className="bg-[#7DD3FC] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] px-3 py-1 font-mono text-xs sm:text-sm font-bold text-[#111111] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" aria-hidden="true" />
              <span>STAGE 02 · SERIOUS ENGINEERING REALITY CHECK</span>
            </span>
            <span className="font-mono text-xs font-bold bg-[#111111] text-[#7DD3FC] px-2.5 py-1">
              SENIOR ARCHITECT MENTOR MODE
            </span>
          </div>

          {/* 4. Overall Engineering Verdict */}
          <div className="bg-[#FFFDF7] border-3 border-[#111111] shadow-[6px_6px_0px_#111111] p-5 sm:p-7 mb-7">
            <div className="font-mono text-xs font-bold text-[#444444] uppercase mb-1.5">
              EXECUTIVE ENGINEERING VERDICT
            </div>
            <p className="text-base sm:text-lg text-[#111111] font-semibold leading-relaxed">
              {result.reality_check.verdict}
            </p>
          </div>

          {/* 5. Total Score & Verdict Bar */}
          <div className="bg-[#FFFDF7] border-3 border-[#111111] shadow-[6px_6px_0px_#111111] p-5 sm:p-6 mb-7">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
              <div>
                <div className="font-mono text-xs font-bold text-[#444444]">
                  TRANSPARENT 100-POINT SCOREBOARD
                </div>
                <h3 className="font-display font-extrabold text-xl sm:text-2xl text-[#111111]">
                  {verdictInfo.label}
                </h3>
                <p className="text-xs sm:text-sm text-[#333333] mt-0.5">{verdictInfo.summary}</p>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <span
                  className="font-mono text-xs font-bold border-2 border-[#111111] px-3 py-1.5 shadow-[3px_3px_0px_#111111]"
                  style={{ backgroundColor: verdictInfo.bgColor }}
                >
                  {verdictInfo.urduTag}
                </span>
                <div className="bg-[#111111] text-[#FFE600] font-display font-extrabold text-2xl sm:text-3xl px-4 py-2 tabular-nums">
                  {result.scores.total}/100
                </div>
              </div>
            </div>

            {/* 100-Point Progress Bar */}
            <div className="w-full h-5 bg-[#F3EFE6] border-2 border-[#111111] p-0.5">
              <div
                className="h-full transition-all duration-500"
                style={{
                  width: `${Math.max(4, Math.min(100, result.scores.total))}%`,
                  backgroundColor: verdictInfo.bgColor,
                }}
              />
            </div>
          </div>

          {/* 6. Five Category Scores (20 points each) */}
          <div>
            <h4 className="font-mono text-xs sm:text-sm font-bold text-[#111111] uppercase tracking-wider mb-3.5">
              Category Breakdown (5 Equally Weighted Categories × 20 Points):
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {categoryEntries.map((cat) => {
                const pct = Math.round((cat.data.score / 20) * 100);
                return (
                  <div
                    key={cat.key}
                    className="bg-[#FFFDF7] border-3 border-[#111111] shadow-[4px_4px_0px_#111111] p-4 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span
                          className="font-mono text-xs font-bold border border-[#111111] px-2 py-0.5 tabular-nums"
                          style={{ backgroundColor: cat.accentBg }}
                        >
                          {cat.data.score} / {cat.data.max} PTS
                        </span>
                        {cat.data.insufficient_evidence && (
                          <span
                            title="Limited evidence available in submission"
                            className="font-mono text-[10px] font-bold bg-[#FFF3B0] border border-[#111111] px-1.5 py-0.5"
                          >
                            LIMITED EVIDENCE
                          </span>
                        )}
                      </div>

                      <h5 className="font-display font-extrabold text-base text-[#111111] mb-0.5">
                        {cat.label}
                      </h5>
                      <div className="font-mono text-[11px] text-[#444444] mb-3">
                        {cat.subtitle}
                      </div>

                      <div className="w-full h-2.5 bg-[#F3EFE6] border border-[#111111] mb-3">
                        <div
                          className="h-full bg-[#111111]"
                          style={{ width: `${Math.max(5, pct)}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-[#222222] leading-relaxed">{cat.data.reason}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* 7. STRENGTHS & WEAKNESSES */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Genuine Strengths */}
          <div className="neo-card bg-[#B8F3D8] p-6">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b-2 border-[#111111]">
              <CheckCircle2 className="w-5 h-5 text-[#111111] shrink-0" aria-hidden="true" />
              <h3 className="font-display font-extrabold text-xl text-[#111111]">
                What Is Genuinely Good (Strengths)
              </h3>
            </div>
            <ul className="space-y-3">
              {result.reality_check.strengths.map((s, i) => (
                <li
                  key={i}
                  className="bg-[#FFFDF7] border-2 border-[#111111] p-3.5 text-sm sm:text-base font-medium text-[#111111] flex items-start gap-2.5"
                >
                  <span className="font-mono text-xs font-bold bg-[#6EE7B7] border border-[#111111] px-1.5 py-0.5 shrink-0 tabular-nums">
                    +{i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Engineering Weaknesses / Red Flags */}
          <div className="neo-card bg-[#FFD6E8] p-6">
            <div className="flex items-center gap-2.5 pb-3 mb-4 border-b-2 border-[#111111]">
              <XCircle className="w-5 h-5 text-[#111111] shrink-0" aria-hidden="true" />
              <h3 className="font-display font-extrabold text-xl text-[#111111]">
                What Is Weak / Risky (Engineering Red Flags)
              </h3>
            </div>
            <ul className="space-y-3">
              {result.reality_check.weaknesses.map((w, i) => (
                <li
                  key={i}
                  className="bg-[#FFFDF7] border-2 border-[#111111] p-3.5 text-sm sm:text-base font-medium text-[#111111] flex items-start gap-2.5"
                >
                  <span className="font-mono text-xs font-bold bg-[#FF5C93] border border-[#111111] px-1.5 py-0.5 shrink-0 tabular-nums">
                    !{i + 1}
                  </span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 8. DEEP-DIVE TECHNICAL ASSESSMENTS (Architecture, Code, Documentation, Testing) */}
        <div>
          <div className="mb-4">
            <span className="font-mono text-xs font-bold bg-[#E5DEFF] border-2 border-[#111111] px-2.5 py-0.5">
              DEEP-DIVE TECHNICAL AUDIT
            </span>
            <h3 className="font-display font-extrabold text-2xl text-[#111111] mt-1">
              Architecture, Code Quality, Documentation & Testing Breakdown
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="neo-card bg-[#FFFDF7] p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="p-2 bg-[#E5DEFF] border-2 border-[#111111]">
                  <Layers className="w-5 h-5 text-[#111111]" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-mono text-xs text-[#444444]">PILLAR 01</div>
                  <h4 className="font-display font-extrabold text-lg text-[#111111]">
                    Architecture Assessment
                  </h4>
                </div>
              </div>
              <p className="text-sm sm:text-base text-[#222222] leading-relaxed">
                {result.reality_check.architecture_assessment}
              </p>
            </div>

            <div className="neo-card bg-[#FFFDF7] p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="p-2 bg-[#CCF2FF] border-2 border-[#111111]">
                  <Code2 className="w-5 h-5 text-[#111111]" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-mono text-xs text-[#444444]">PILLAR 02</div>
                  <h4 className="font-display font-extrabold text-lg text-[#111111]">
                    Code & Implementation Quality
                  </h4>
                </div>
              </div>
              <p className="text-sm sm:text-base text-[#222222] leading-relaxed">
                {result.reality_check.code_quality_assessment}
              </p>
            </div>

            <div className="neo-card bg-[#FFFDF7] p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="p-2 bg-[#B8F3D8] border-2 border-[#111111]">
                  <BookOpen className="w-5 h-5 text-[#111111]" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-mono text-xs text-[#444444]">PILLAR 03</div>
                  <h4 className="font-display font-extrabold text-lg text-[#111111]">
                    Documentation & Presentation
                  </h4>
                </div>
              </div>
              <p className="text-sm sm:text-base text-[#222222] leading-relaxed">
                {result.reality_check.documentation_assessment}
              </p>
            </div>

            <div className="neo-card bg-[#FFFDF7] p-6">
              <div className="flex items-center gap-2.5 mb-3">
                <span className="p-2 bg-[#FFF3B0] border-2 border-[#111111]">
                  <Cpu className="w-5 h-5 text-[#111111]" aria-hidden="true" />
                </span>
                <div>
                  <div className="font-mono text-xs text-[#444444]">PILLAR 04</div>
                  <h4 className="font-display font-extrabold text-lg text-[#111111]">
                    Testing & Reliability
                  </h4>
                </div>
              </div>
              <p className="text-sm sm:text-base text-[#222222] leading-relaxed">
                {result.reality_check.testing_assessment}
              </p>
            </div>
          </div>
        </div>

        {/* 9. PRIORITIZED ACTIONABLE IMPROVEMENT PLAN */}
        <div>
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-5">
            <div>
              <span className="font-mono text-xs font-bold bg-[#FFE600] border-2 border-[#111111] px-2.5 py-0.5">
                ACTIONABLE ROADMAP
              </span>
              <h3 className="font-display font-extrabold text-2xl sm:text-3xl text-[#111111] mt-1">
                Prioritized Engineering Improvement Plan
              </h3>
            </div>

            {/* Interactive Priority Filter Controls */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  { id: 'all', label: 'All Priorities' },
                  { id: 'immediate', label: 'Fix Immediately' },
                  { id: 'next', label: 'Improve Next' },
                  { id: 'future', label: 'Future Polish' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActivePriorityFilter(tab.id)}
                  className={`font-mono text-xs font-bold px-3 py-1.5 border-2 border-[#111111] cursor-pointer whitespace-nowrap ${
                    activePriorityFilter === tab.id
                      ? 'bg-[#111111] text-[#FFE600]'
                      : 'bg-[#FFFDF7] text-[#111111] hover:bg-[#F3EFE6]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {(activePriorityFilter === 'all' || activePriorityFilter === 'immediate') &&
              renderActionGroup(
                'Fix Immediately — Critical Blockers & Quick Wins',
                'PRIORITY 01 · AAJ HI THEEK KARO',
                '#FF5C93',
                result.action_plan.fix_immediately
              )}

            {(activePriorityFilter === 'all' || activePriorityFilter === 'next') &&
              renderActionGroup(
                'Improve Next — Architecture, Modularity & Test Coverage',
                'PRIORITY 02 · AGLE HAFTE KA KAAM',
                '#FFE600',
                result.action_plan.improve_next
              )}

            {(activePriorityFilter === 'all' || activePriorityFilter === 'future') &&
              renderActionGroup(
                'Future Improvements — Scalability & Production Polish',
                'PRIORITY 03 · LONG-TERM LEVEL UP',
                '#6EE7B7',
                result.action_plan.future_improvements
              )}
          </div>
        </div>

        {/* 10. EVIDENCE LIMITATIONS & TECHUSTAAD FINAL MESSAGE */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-5 neo-card bg-[#F6F3EC] p-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-[#111111]" aria-hidden="true" />
              <h4 className="font-display font-extrabold text-lg text-[#111111]">
                Evidence Scope & Limitations
              </h4>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm text-[#333333] font-mono">
              {result.evidence_limitations.map((lim, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="font-bold text-[#111111]">·</span>
                  <span>{lim}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-7 neo-card bg-[#FFE600] p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Award className="w-5 h-5 text-[#111111]" aria-hidden="true" />
                <span className="font-mono text-xs font-bold uppercase text-[#111111]">
                  TECHUSTAAD’S FINAL HUKUMNAMA (CLOSING ADVICE)
                </span>
              </div>
              <p className="font-display font-extrabold text-lg sm:text-2xl text-[#111111] leading-snug">
                “{result.final_message}”
              </p>
            </div>

            {/* Complete Share & Export Controls Footer */}
            <div className="pt-5 mt-5 border-t-2 border-[#111111] flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={handleCopyRoast}
                className="neo-btn bg-[#FF5C93] text-[#111111] font-display font-bold text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ClipboardCopy className="w-4 h-4" aria-hidden="true" />
                <span>Copy Roast</span>
              </button>

              <button
                type="button"
                onClick={handleCopyFullReport}
                className="neo-btn bg-[#FFFDF7] text-[#111111] font-display font-bold text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <ClipboardCopy className="w-4 h-4" aria-hidden="true" />
                <span>Copy Complete Report</span>
              </button>

              <button
                type="button"
                onClick={handleCopyActionPlan}
                className="neo-btn bg-[#7DD3FC] text-[#111111] font-display font-bold text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Wrench className="w-4 h-4" aria-hidden="true" />
                <span>Copy Improvement Plan</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadReport}
                className="neo-btn bg-[#6EE7B7] text-[#111111] font-display font-bold text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" aria-hidden="true" />
                <span>Download Report (.md)</span>
              </button>

              <button
                type="button"
                onClick={handleShareResult}
                className="neo-btn bg-[#E5DEFF] text-[#111111] font-display font-bold text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Share2 className="w-4 h-4" aria-hidden="true" />
                <span>Share Result</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
