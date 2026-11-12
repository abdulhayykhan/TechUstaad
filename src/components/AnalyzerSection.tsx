import React, { useEffect, useState } from 'react';
import {
  AlertTriangle,
  Code2,
  FileText,
  Flame,
  Github,
  Sparkles,
  SlidersHorizontal,
  ArrowRight,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import type {
  AnalysisRequest,
  ApiErrorPayload,
  AvailableTime,
  DeveloperExperience,
  InputMode,
  ProjectType,
  TeamSize,
} from '../types/analysis';
import { parseGitHubRepoUrl, validateAnalysisInput } from '../utils/validation';
import { QUICK_PRESETS, type QuickPreset } from '../data/sampleReports';

interface AnalyzerSectionProps {
  onSubmitAnalysis: (request: AnalysisRequest) => void;
  onLoadPresetSample: (sampleId: string) => void;
  isLoading: boolean;
  apiError: ApiErrorPayload | null;
  onClearError: () => void;
}

const GITHUB_LOADING_MESSAGES = [
  'Ustaad is opening your repository...',
  'README ki talaash jaari hai...',
  'Architecture ka post-mortem ho raha hai...',
  'Dependencies ka hisaab liya ja raha hai...',
  'Ustaad verdict likh raha hai...',
];

const DESCRIPTION_LOADING_MESSAGES = [
  'Ustaad tumhara project description parh raha hai...',
  'Tech stack aur claims ki chhaan-been ho rahi hai...',
  'Architecture ka post-mortem ho raha hai...',
  'Engineering reality check tayyar ho raha hai...',
  'Ustaad verdict likh raha hai...',
];

const PROJECT_TYPES: ProjectType[] = [
  'FYP (Final Year Project)',
  'Hackathon Project',
  'Personal Project',
  'Internship Project',
  'Course Assignment',
  'Startup / MVP',
];

const EXPERIENCE_LEVELS: DeveloperExperience[] = ['Beginner', 'Intermediate', 'Advanced'];

const AVAILABLE_TIMES: AvailableTime[] = ['One Day', 'One Week', 'Two Weeks', 'One Month'];

const TEAM_SIZES: TeamSize[] = ['Solo', '2–3 Members', '4+ Members'];

export const AnalyzerSection: React.FC<AnalyzerSectionProps> = ({
  onSubmitAnalysis,
  onLoadPresetSample,
  isLoading,
  apiError,
  onClearError,
}) => {
  const [mode, setMode] = useState<InputMode>('github');
  const [githubUrl, setGithubUrl] = useState<string>(
    'https://github.com/abdulhayykhan/Rishta-Aunty'
  );
  const [projectName, setProjectName] = useState<string>('');
  const [techStack, setTechStack] = useState<string>('');
  const [projectDescription, setProjectDescription] = useState<string>('');

  const [projectType, setProjectType] = useState<ProjectType | ''>('Hackathon Project');
  const [experienceLevel, setExperienceLevel] = useState<DeveloperExperience | ''>('Intermediate');
  const [availableTime, setAvailableTime] = useState<AvailableTime | ''>('One Week');
  const [teamSize, setTeamSize] = useState<TeamSize | ''>('Solo');

  const [validationError, setValidationError] = useState<string | null>(null);
  const [loadingStepIndex, setLoadingStepIndex] = useState<number>(0);

  const loadingMessages =
    mode === 'github' ? GITHUB_LOADING_MESSAGES : DESCRIPTION_LOADING_MESSAGES;

  useEffect(() => {
    if (!isLoading) {
      setLoadingStepIndex(0);
      return;
    }
    const interval = setInterval(() => {
      setLoadingStepIndex((prev) => (prev + 1) % loadingMessages.length);
    }, 2100);
    return () => clearInterval(interval);
  }, [isLoading, loadingMessages.length]);

  const parsedPreview = mode === 'github' ? parseGitHubRepoUrl(githubUrl) : null;

  const handleApplyPreset = (preset: QuickPreset) => {
    setValidationError(null);
    onClearError();
    setMode(preset.request.mode);
    if (preset.request.mode === 'github') {
      setGithubUrl(preset.request.githubUrl || '');
    } else {
      setProjectName(preset.request.projectName || '');
      setTechStack(preset.request.techStack || '');
      setProjectDescription(preset.request.projectDescription || '');
    }
    setProjectType(preset.request.context?.projectType || '');
    setExperienceLevel(preset.request.context?.experienceLevel || '');
    setAvailableTime(preset.request.context?.availableTime || '');
    setTeamSize(preset.request.context?.teamSize || '');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setValidationError(null);
    onClearError();

    const payload: AnalysisRequest = {
      mode,
      githubUrl: mode === 'github' ? githubUrl.trim() : undefined,
      projectName: mode === 'description' ? projectName.trim() : undefined,
      techStack: mode === 'description' ? techStack.trim() : undefined,
      projectDescription: mode === 'description' ? projectDescription.trim() : undefined,
      context: {
        projectType,
        experienceLevel,
        availableTime,
        teamSize,
      },
    };

    const check = validateAnalysisInput(payload);
    if (!check.valid) {
      setValidationError(check.error || 'Please check your project input.');
      return;
    }

    onSubmitAnalysis(payload);
  };

  const handleSwitchToDescriptionFallback = () => {
    setValidationError(null);
    onClearError();
    setMode('description');
    if (!projectDescription.trim() && parsedPreview?.data) {
      setProjectName(`${parsedPreview.data.owner}/${parsedPreview.data.repo}`);
    }
  };

  return (
    <section id="analyzer" className="py-12 sm:py-16 scroll-mt-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="mb-8 text-center">
          <span className="inline-block font-mono text-xs font-bold bg-[#CCF2FF] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] px-3 py-1 mb-3">
            01. PROJECT ANALYZER & ROAST TERMINAL
          </span>
          <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-[#111111] tracking-tight mb-2">
            Submit Your Codebase or Idea for Post-Mortem
          </h2>
          <p className="text-sm sm:text-base text-[#333333] max-w-2xl mx-auto">
            Paste a public GitHub repository URL or describe your project architecture below.
            Configure optional context so Ustaad calibrates recommendations to your timeline.
          </p>
        </div>

        {/* Main Neo-Brutalist Dossier Window */}
        <div className="neo-card-lg bg-[#FFFDF7] overflow-hidden">
          {/* Window Title Bar */}
          <div className="bg-[#FFE600] border-b-3 border-[#111111] px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="w-3.5 h-3.5 rounded-full bg-[#FF5C93] border-2 border-[#111111]" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#FFFDF7] border-2 border-[#111111]" />
              <span className="w-3.5 h-3.5 rounded-full bg-[#6EE7B7] border-2 border-[#111111]" />
              <span className="ml-2 font-mono text-xs sm:text-sm font-bold text-[#111111] truncate">
                TECHUSTAAD_INSPECTOR_v1.0.exe
              </span>
            </div>
            <span className="font-mono text-xs font-bold bg-[#111111] text-[#FFFDF7] px-2.5 py-0.5 whitespace-nowrap shrink-0">
              STRICT VERDICT MODE
            </span>
          </div>

          <form onSubmit={handleSubmit} noValidate className="p-5 sm:p-8">
            {/* Input Mode Segmented Control */}
            <div className="mb-6">
              <label className="block font-display font-bold text-sm text-[#111111] mb-2">
                Choose Input Method
              </label>
              <div
                role="tablist"
                aria-label="Analysis Input Mode"
                className="grid grid-cols-1 sm:grid-cols-2 gap-3"
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'github'}
                  onClick={() => {
                    setMode('github');
                    setValidationError(null);
                  }}
                  className={`neo-btn px-4 py-3 font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer ${
                    mode === 'github'
                      ? 'bg-[#7DD3FC] text-[#111111]'
                      : 'bg-[#FFFDF7] text-[#333333] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <Github className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">Public GitHub Repository</span>
                </button>

                <button
                  type="button"
                  role="tab"
                  aria-selected={mode === 'description'}
                  onClick={() => {
                    setMode('description');
                    setValidationError(null);
                  }}
                  className={`neo-btn px-4 py-3 font-display font-bold text-sm sm:text-base flex items-center justify-center gap-2.5 cursor-pointer ${
                    mode === 'description'
                      ? 'bg-[#FF5C93] text-[#111111]'
                      : 'bg-[#FFFDF7] text-[#333333] hover:bg-[#F3EFE6]'
                  }`}
                >
                  <FileText className="w-5 h-5 shrink-0" aria-hidden="true" />
                  <span className="whitespace-nowrap">Project Description (No Repo Needed)</span>
                </button>
              </div>
            </div>

            {/* Quick-Fill Examples Bar */}
            <div className="mb-6 bg-[#F6F3EC] border-2 border-[#111111] p-3.5">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#111111] flex items-center gap-1.5 mr-1">
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>QUICK TEST EXAMPLES:</span>
                </span>
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleApplyPreset(preset)}
                    className="text-xs font-mono font-bold bg-[#FFFDF7] hover:bg-[#FFE600] text-[#111111] border-2 border-[#111111] shadow-[2px_2px_0px_#111111] px-2.5 py-1 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode 1: GitHub Repository URL Input */}
            {mode === 'github' ? (
              <div className="mb-6">
                <label
                  htmlFor="github-url-input"
                  className="block font-display font-bold text-base text-[#111111] mb-2"
                >
                  Public GitHub Repository URL
                </label>
                <div className="flex flex-col sm:flex-row items-stretch neo-input bg-[#FFFDF7]">
                  <div className="bg-[#FFE600] border-b-3 sm:border-b-0 sm:border-r-3 border-[#111111] px-4 py-3 flex items-center gap-2 font-mono text-xs sm:text-sm font-bold text-[#111111] shrink-0">
                    <Github className="w-4 h-4" aria-hidden="true" />
                    <span>GITHUB REPO</span>
                  </div>
                  <input
                    id="github-url-input"
                    type="text"
                    value={githubUrl}
                    onChange={(e) => {
                      setGithubUrl(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="https://github.com/owner/repository or owner/repository"
                    className="w-full px-4 py-3.5 font-mono text-sm sm:text-base text-[#111111] bg-transparent focus:outline-none"
                    disabled={isLoading}
                  />
                </div>

                {/* Live Parsed Repository Indicator */}
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
                  {githubUrl.trim() ? (
                    parsedPreview?.valid && parsedPreview.data ? (
                      <div className="flex items-center gap-1.5 text-[#065F46] font-bold">
                        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                        <span>
                          Detected Owner:{' '}
                          <strong className="underline">{parsedPreview.data.owner}</strong> ·
                          Repository:{' '}
                          <strong className="underline">{parsedPreview.data.repo}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-[#991B1B] font-bold">
                        {parsedPreview?.error || 'Enter a valid GitHub repository URL.'}
                      </span>
                    )
                  ) : (
                    <span className="text-[#444444]">
                      Example: https://github.com/abdulhayykhan/Rishta-Aunty
                    </span>
                  )}
                  <span className="text-[#444444]">
                    Inspects README, file tree, commits & key source files
                  </span>
                </div>
              </div>
            ) : (
              /* Mode 2: Project Description Inputs */
              <div className="space-y-4 mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="project-name-input"
                      className="block font-display font-bold text-sm text-[#111111] mb-1.5"
                    >
                      Project Title (Optional)
                    </label>
                    <input
                      id="project-name-input"
                      type="text"
                      value={projectName}
                      onChange={(e) => setProjectName(e.target.value)}
                      placeholder="e.g., Smart Attendance & Chai ERP"
                      className="neo-input w-full px-3.5 py-2.5 text-sm bg-[#FFFDF7] text-[#111111]"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="tech-stack-input"
                      className="block font-display font-bold text-sm text-[#111111] mb-1.5"
                    >
                      Technology Stack (Optional)
                    </label>
                    <input
                      id="tech-stack-input"
                      type="text"
                      value={techStack}
                      onChange={(e) => setTechStack(e.target.value)}
                      placeholder="e.g., React, Express, MongoDB, Tailwind"
                      className="neo-input w-full px-3.5 py-2.5 text-sm bg-[#FFFDF7] text-[#111111]"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label
                      htmlFor="project-description-input"
                      className="block font-display font-bold text-base text-[#111111]"
                    >
                      Project Purpose, Features & Architecture
                    </label>
                    <span className="font-mono text-xs text-[#444444] tabular-nums">
                      {projectDescription.trim().length} / 8000 chars (min 30)
                    </span>
                  </div>
                  <textarea
                    id="project-description-input"
                    rows={5}
                    value={projectDescription}
                    onChange={(e) => {
                      setProjectDescription(e.target.value);
                      if (validationError) setValidationError(null);
                    }}
                    placeholder="Explain what your project does, how the frontend/backend/database are structured, how authentication or AI calls work, and whether you have tests or documentation..."
                    className="neo-input w-full p-4 text-sm sm:text-base bg-[#FFFDF7] text-[#111111] leading-relaxed"
                    disabled={isLoading}
                  />
                </div>
              </div>
            )}

            {/* Optional Project Context Controls */}
            <div className="mb-7 bg-[#E5DEFF]/55 border-2 border-[#111111] p-4 sm:p-5">
              <div className="flex items-center justify-between gap-2 mb-3.5">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-[#111111]" aria-hidden="true" />
                  <h3 className="font-display font-bold text-sm sm:text-base text-[#111111]">
                    Optional Project Context (Calibrates Action Plan)
                  </h3>
                </div>
                <span className="font-mono text-xs text-[#333333]">Tailors priority advice</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                <div>
                  <label
                    htmlFor="context-project-type"
                    className="block font-mono text-xs font-bold text-[#111111] mb-1"
                  >
                    Project Type
                  </label>
                  <select
                    id="context-project-type"
                    value={projectType}
                    onChange={(e) => setProjectType(e.target.value as ProjectType | '')}
                    disabled={isLoading}
                    className="w-full bg-[#FFFDF7] border-2 border-[#111111] px-3 py-2 text-xs sm:text-sm font-semibold text-[#111111] focus:outline-none"
                  >
                    <option value="">Any / Unspecified</option>
                    {PROJECT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="context-experience"
                    className="block font-mono text-xs font-bold text-[#111111] mb-1"
                  >
                    Developer Experience
                  </label>
                  <select
                    id="context-experience"
                    value={experienceLevel}
                    onChange={(e) =>
                      setExperienceLevel(e.target.value as DeveloperExperience | '')
                    }
                    disabled={isLoading}
                    className="w-full bg-[#FFFDF7] border-2 border-[#111111] px-3 py-2 text-xs sm:text-sm font-semibold text-[#111111] focus:outline-none"
                  >
                    <option value="">Any / Unspecified</option>
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <option key={lvl} value={lvl}>
                        {lvl}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="context-time"
                    className="block font-mono text-xs font-bold text-[#111111] mb-1"
                  >
                    Available Fix Time
                  </label>
                  <select
                    id="context-time"
                    value={availableTime}
                    onChange={(e) => setAvailableTime(e.target.value as AvailableTime | '')}
                    disabled={isLoading}
                    className="w-full bg-[#FFFDF7] border-2 border-[#111111] px-3 py-2 text-xs sm:text-sm font-semibold text-[#111111] focus:outline-none"
                  >
                    <option value="">Any / Unspecified</option>
                    {AVAILABLE_TIMES.map((time) => (
                      <option key={time} value={time}>
                        {time}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="context-team-size"
                    className="block font-mono text-xs font-bold text-[#111111] mb-1"
                  >
                    Team Size
                  </label>
                  <select
                    id="context-team-size"
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value as TeamSize | '')}
                    disabled={isLoading}
                    className="w-full bg-[#FFFDF7] border-2 border-[#111111] px-3 py-2 text-xs sm:text-sm font-semibold text-[#111111] focus:outline-none"
                  >
                    <option value="">Any / Unspecified</option>
                    {TEAM_SIZES.map((sz) => (
                      <option key={sz} value={sz}>
                        {sz}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Client-Side Form Validation Alert */}
            {validationError && (
              <div
                role="alert"
                className="mb-6 bg-[#FFD6E8] border-3 border-[#111111] shadow-[4px_4px_0px_#111111] p-4 flex items-start gap-3"
              >
                <AlertTriangle className="w-5 h-5 text-[#111111] shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-sm font-bold text-[#111111]">{validationError}</div>
              </div>
            )}

            {/* Server / API Error & Setup Instructions Alert */}
            {apiError && (
              <div
                role="alert"
                className="mb-6 bg-[#FFF3B0] border-3 border-[#111111] shadow-[6px_6px_0px_#111111] p-5"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-6 h-6 text-[#111111] shrink-0 mt-0.5" aria-hidden="true" />
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold bg-[#FF5C93] text-[#111111] border border-[#111111] px-2 py-0.5">
                        {apiError.code}
                      </span>
                      <h4 className="font-display font-extrabold text-base text-[#111111]">
                        {apiError.error}
                      </h4>
                    </div>

                    {apiError.suggestion && (
                      <p className="text-sm text-[#222222] mb-3">{apiError.suggestion}</p>
                    )}

                    {/* Show live GitHub telemetry if the repo WAS successfully inspected before the API key check */}
                    {apiError.repositoryTelemetry && (
                      <div className="bg-[#FFFDF7] border-2 border-[#111111] p-3 mb-3 text-xs font-mono">
                        <div className="font-bold text-[#111111] mb-1">
                          ✓ GitHub Repository Inspected Successfully:{' '}
                          {apiError.repositoryTelemetry.owner}/{apiError.repositoryTelemetry.repo}
                        </div>
                        <div className="text-[#333333]">
                          Primary Language: {apiError.repositoryTelemetry.primaryLanguage || 'N/A'} ·
                          Files Found: {apiError.repositoryTelemetry.totalFilesCount} · Inspected
                          Snippets: {apiError.repositoryTelemetry.inspectedFiles.length} · Stars:{' '}
                          {apiError.repositoryTelemetry.stars}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      {apiError.canFallbackToDescription && (
                        <button
                          type="button"
                          onClick={handleSwitchToDescriptionFallback}
                          className="neo-btn bg-[#7DD3FC] text-[#111111] font-display font-bold text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
                        >
                          <FileText className="w-4 h-4" aria-hidden="true" />
                          <span>Switch to Project Description Route</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() =>
                          onLoadPresetSample(
                            mode === 'description' ? 'ai-pdf-wrapper' : 'rishta-aunty'
                          )
                        }
                        className="neo-btn bg-[#6EE7B7] text-[#111111] font-display font-bold text-xs sm:text-sm px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-4 h-4" aria-hidden="true" />
                        <span>
                          Load Pre-Inspected Reference Report (
                          {mode === 'description' ? 'Smart FYP ERP' : 'Rishta-Aunty'})
                        </span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Playful Rotating Loading State */}
            {isLoading && (
              <div
                aria-live="polite"
                className="mb-6 bg-[#CCF2FF] border-3 border-[#111111] shadow-[6px_6px_0px_#111111] p-5"
              >
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#FFE600] border-2 border-[#111111] flex items-center justify-center font-mono font-bold text-sm animate-bounce">
                      ☕
                    </div>
                    <div>
                      <div className="font-mono text-xs font-bold text-[#333333]">
                        USTAAD ANALYSIS IN PROGRESS (STEP {loadingStepIndex + 1}/
                        {loadingMessages.length})
                      </div>
                      <div className="font-display font-extrabold text-base sm:text-lg text-[#111111]">
                        {loadingMessages[loadingStepIndex]}
                      </div>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-[#111111] text-[#FFE600] px-2.5 py-1 shrink-0">
                    gemini-3.5-flash-lite
                  </span>
                </div>

                {/* Stepped Progress Bar */}
                <div className="w-full h-4 bg-[#FFFDF7] border-2 border-[#111111] overflow-hidden p-0.5">
                  <div
                    className="h-full bg-[#FF5C93] transition-all duration-300"
                    style={{
                      width: `${Math.min(100, ((loadingStepIndex + 1) / loadingMessages.length) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Primary Submit & Sample Actions */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <button
                type="submit"
                disabled={isLoading}
                className="neo-btn bg-[#FFE600] hover:bg-[#ffed4a] text-[#111111] font-display font-extrabold text-base sm:text-lg px-8 py-4 flex items-center justify-center gap-3 cursor-pointer"
              >
                <Flame className="w-5 h-5 shrink-0" aria-hidden="true" />
                <span>{isLoading ? 'Ustaad Inspecting...' : 'Roast My Project'}</span>
                <ArrowRight className="w-5 h-5 shrink-0" aria-hidden="true" />
              </button>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => onLoadPresetSample('rishta-aunty')}
                  className="neo-btn bg-[#FFFDF7] hover:bg-[#B8F3D8] text-[#111111] font-mono font-bold text-xs px-3.5 py-2.5 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Code2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Demo: Rishta-Aunty Repo (76/100)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onLoadPresetSample('ai-pdf-wrapper')}
                  className="neo-btn bg-[#FFFDF7] hover:bg-[#FFD6E8] text-[#111111] font-mono font-bold text-xs px-3.5 py-2.5 flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Eye className="w-4 h-4 shrink-0" aria-hidden="true" />
                  <span>Demo: FYP Wrapper (37/100)</span>
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
};
