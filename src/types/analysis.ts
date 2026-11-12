export type InputMode = 'github' | 'description';

export type ProjectType =
  | 'FYP (Final Year Project)'
  | 'Hackathon Project'
  | 'Personal Project'
  | 'Internship Project'
  | 'Course Assignment'
  | 'Startup / MVP';

export type DeveloperExperience = 'Beginner' | 'Intermediate' | 'Advanced';

export type AvailableTime = 'One Day' | 'One Week' | 'Two Weeks' | 'One Month';

export type TeamSize = 'Solo' | '2–3 Members' | '4+ Members';

export interface ProjectContext {
  projectType?: ProjectType | '';
  experienceLevel?: DeveloperExperience | '';
  availableTime?: AvailableTime | '';
  teamSize?: TeamSize | '';
}

export interface AnalysisRequest {
  mode: InputMode;
  githubUrl?: string;
  projectDescription?: string;
  projectName?: string;
  techStack?: string;
  context?: ProjectContext;
}

export interface ParsedGitHubRepo {
  owner: string;
  repo: string;
  normalizedUrl: string;
}

export interface CategoryScore {
  score: number;
  max: 20;
  reason: string;
  insufficient_evidence?: boolean;
}

export interface ActionPlanItem {
  title: string;
  what_to_change: string;
  why_it_matters: string;
  how_to_approach: string;
}

export interface RepositoryTelemetry {
  owner: string;
  repo: string;
  htmlUrl: string;
  description: string | null;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  createdAt: string;
  pushedAt: string;
  hasReadme: boolean;
  readmeLength: number;
  totalFilesCount: number;
  inspectedFiles: string[];
  detectedTestFiles: string[];
  detectedConfigFiles: string[];
  recentCommitMessages: string[];
}

export interface AnalysisResponse {
  project_title: string;
  project_summary: string;
  roast: {
    headline: string;
    content: string;
    highlights: string[];
  };
  reality_check: {
    verdict: string;
    strengths: string[];
    weaknesses: string[];
    architecture_assessment: string;
    code_quality_assessment: string;
    documentation_assessment: string;
    testing_assessment: string;
  };
  scores: {
    code_quality: CategoryScore;
    architecture: CategoryScore;
    functionality: CategoryScore;
    documentation: CategoryScore;
    testing: CategoryScore;
    total: number;
  };
  action_plan: {
    fix_immediately: ActionPlanItem[];
    improve_next: ActionPlanItem[];
    future_improvements: ActionPlanItem[];
  };
  evidence_limitations: string[];
  final_message: string;
  // Metadata attached by backend or sample preview
  source_mode?: InputMode;
  is_sample_preview?: boolean;
  model_used?: string;
  repository_telemetry?: RepositoryTelemetry;
}

export interface ApiErrorPayload {
  error: string;
  code:
    | 'VALIDATION_ERROR'
    | 'GITHUB_NOT_FOUND'
    | 'GITHUB_RATE_LIMIT'
    | 'GITHUB_EMPTY_OR_INACCESSIBLE'
    | 'MISSING_API_KEY'
    | 'GEMINI_AUTH_ERROR'
    | 'GEMINI_QUOTA_ERROR'
    | 'GEMINI_INVALID_OUTPUT'
    | 'GEMINI_SCRIPT_VIOLATION'
    | 'SERVER_ERROR';
  suggestion?: string;
  canFallbackToDescription?: boolean;
  repositoryTelemetry?: RepositoryTelemetry;
}
