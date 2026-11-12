import type {
  ActionPlanItem,
  AnalysisRequest,
  AnalysisResponse,
  CategoryScore,
  ParsedGitHubRepo,
} from '../types/analysis.ts';

const RESERVED_GITHUB_PATHS = new Set([
  'settings',
  'explore',
  'marketplace',
  'pulls',
  'issues',
  'notifications',
  'new',
  'organizations',
  'login',
  'signup',
  'pricing',
  'features',
  'topics',
  'trending',
  'collections',
  'events',
  'sponsors',
  'about',
  'security',
  'search',
]);

/**
 * Parses and validates a public GitHub repository URL.
 * Accepts full URLs (https://github.com/owner/repo) or shorthand (github.com/owner/repo).
 */
export function parseGitHubRepoUrl(rawInput: string): {
  valid: boolean;
  data?: ParsedGitHubRepo;
  error?: string;
} {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return {
      valid: false,
      error: 'GitHub repository URL is required. Example: https://github.com/abdulhayykhan/Rishta-Aunty',
    };
  }

  let candidate = trimmed;
  if (/^github\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  } else if (/^www\.github\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  } else if (
    !/^https?:\/\//i.test(candidate) &&
    /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9._-]{1,100}(?:\/.*)?$/.test(
      candidate
    ) &&
    !candidate.includes('.')
  ) {
    candidate = `https://github.com/${candidate}`;
  } else if (
    !/^https?:\/\//i.test(candidate) &&
    /^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(candidate) &&
    !candidate.split('/')[0].includes('.')
  ) {
    candidate = `https://github.com/${candidate}`;
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    return {
      valid: false,
      error:
        'Please enter a complete GitHub repository URL (e.g., https://github.com/owner/repository).',
    };
  }

  const host = parsedUrl.hostname.toLowerCase();
  if (host !== 'github.com' && host !== 'www.github.com') {
    return {
      valid: false,
      error: 'Only public github.com repository URLs are supported.',
    };
  }

  const segments = parsedUrl.pathname
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length < 2) {
    return {
      valid: false,
      error:
        'This looks like a GitHub profile or root URL, not a repository. Include both owner and repository name (e.g., https://github.com/owner/repo).',
    };
  }

  const owner = segments[0];
  const rawRepo = segments[1].replace(/\.git$/i, '');

  if (RESERVED_GITHUB_PATHS.has(owner.toLowerCase())) {
    return {
      valid: false,
      error: `"${owner}" is a reserved GitHub page, not a repository owner.`,
    };
  }

  const ownerPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  const repoPattern = /^[a-zA-Z0-9._-]{1,100}$/;

  if (!ownerPattern.test(owner)) {
    return {
      valid: false,
      error: `Invalid GitHub username or organization "${owner}".`,
    };
  }

  if (!repoPattern.test(rawRepo) || rawRepo === '.' || rawRepo === '..') {
    return {
      valid: false,
      error: `Invalid GitHub repository name "${rawRepo}".`,
    };
  }

  return {
    valid: true,
    data: {
      owner,
      repo: rawRepo,
      normalizedUrl: `https://github.com/${owner}/${rawRepo}`,
    },
  };
}

/**
 * Validates user submission for either GitHub repository mode or Project Description mode.
 */
export function validateAnalysisInput(req: AnalysisRequest): {
  valid: boolean;
  error?: string;
  parsedRepo?: ParsedGitHubRepo;
} {
  if (!req || (req.mode !== 'github' && req.mode !== 'description')) {
    return {
      valid: false,
      error: 'Please select a valid analysis input mode (GitHub Repository or Project Description).',
    };
  }

  if (req.mode === 'github') {
    const parsed = parseGitHubRepoUrl(req.githubUrl || '');
    if (!parsed.valid || !parsed.data) {
      return {
        valid: false,
        error: parsed.error || 'Invalid GitHub repository URL.',
      };
    }
    return {
      valid: true,
      parsedRepo: parsed.data,
    };
  }

  // Description mode validation
  const desc = (req.projectDescription || '').trim();
  if (!desc) {
    return {
      valid: false,
      error:
        'Project description is required when analyzing without a GitHub URL. Tell Ustaad what your project does, its stack, and how it is built.',
    };
  }

  if (desc.length < 30) {
    return {
      valid: false,
      error:
        'Itna chhota description? Write at least 30 characters explaining your project purpose, features, architecture, and tech stack so Ustaad can give a fair reality check.',
    };
  }

  if (desc.length > 8000) {
    return {
      valid: false,
      error: 'Project description is too long (maximum 8,000 characters).',
    };
  }

  return { valid: true };
}

/**
 * Detects Urdu/Arabic script or Devanagari script in roast text.
 * Requirement: "The application should generate roast content in English, Roman Urdu, or natural Hinglish.
 * Do not allow Urdu-script or Devanagari output in the roast text."
 */
export function containsForbiddenScript(text: string): {
  hasForbiddenScript: boolean;
  detectedScripts: string[];
} {
  if (!text) {
    return { hasForbiddenScript: false, detectedScripts: [] };
  }

  const urduArabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const devanagariRegex = /[\u0900-\u097F\uA8E0-\uA8FF]/;

  const detectedScripts: string[] = [];
  if (urduArabicRegex.test(text)) {
    detectedScripts.push('Urdu/Arabic script');
  }
  if (devanagariRegex.test(text)) {
    detectedScripts.push('Devanagari script');
  }

  return {
    hasForbiddenScript: detectedScripts.length > 0,
    detectedScripts,
  };
}

function clampScore(val: unknown): number {
  const num = typeof val === 'number' ? val : Number(val);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(20, Math.round(num)));
}

function normalizeCategoryScore(raw: unknown, fallbackReason: string): CategoryScore {
  if (!raw || typeof raw !== 'object') {
    return {
      score: 0,
      max: 20,
      reason: fallbackReason,
      insufficient_evidence: true,
    };
  }
  const obj = raw as Record<string, unknown>;
  const score = clampScore(obj.score);
  const reason =
    typeof obj.reason === 'string' && obj.reason.trim().length > 0
      ? obj.reason.trim()
      : fallbackReason;
  const insufficient =
    Boolean(obj.insufficient_evidence) ||
    /insufficient evidence|not available in description|unverified/i.test(reason);

  return {
    score,
    max: 20,
    reason,
    insufficient_evidence: insufficient,
  };
}

function normalizeActionItem(raw: unknown, index: number): ActionPlanItem | null {
  if (typeof raw === 'string' && raw.trim()) {
    return {
      title: `Action Item #${index + 1}`,
      what_to_change: raw.trim(),
      why_it_matters: 'Improves engineering quality, maintainability, and technical credibility.',
      how_to_approach: 'Implement incrementally and verify with automated or manual checks.',
    };
  }
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const whatToChange =
    typeof obj.what_to_change === 'string' && obj.what_to_change.trim()
      ? obj.what_to_change.trim()
      : typeof obj.what === 'string' && obj.what.trim()
        ? obj.what.trim()
        : '';
  const title =
    typeof obj.title === 'string' && obj.title.trim()
      ? obj.title.trim()
      : whatToChange
        ? whatToChange.slice(0, 65)
        : `Priority Step #${index + 1}`;
  const whyItMatters =
    typeof obj.why_it_matters === 'string' && obj.why_it_matters.trim()
      ? obj.why_it_matters.trim()
      : typeof obj.why === 'string' && obj.why.trim()
        ? obj.why.trim()
        : 'Directly impacts maintainability, reliability, and developer onboarding.';
  const howToApproach =
    typeof obj.how_to_approach === 'string' && obj.how_to_approach.trim()
      ? obj.how_to_approach.trim()
      : typeof obj.how === 'string' && obj.how.trim()
        ? obj.how.trim()
        : 'Break into small commits and test each change locally.';

  if (!whatToChange && !title) return null;

  return {
    title,
    what_to_change: whatToChange || title,
    why_it_matters: whyItMatters,
    how_to_approach: howToApproach,
  };
}

function normalizeStringArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0);
}

/**
 * Validates and normalizes the structured JSON response from Gemini.
 * Ensures all required sections exist, scores sum accurately out of 100,
 * and roast text adheres to the English / Roman Urdu / Hinglish script constraint.
 */
export function validateAndNormalizeAnalysisResponse(rawInput: unknown): {
  valid: boolean;
  data?: AnalysisResponse;
  error?: string;
  scriptViolation?: boolean;
} {
  let parsed: unknown = rawInput;
  if (typeof rawInput === 'string') {
    const cleaned = rawInput
      .trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf('{');
      const lastBrace = cleaned.lastIndexOf('}');
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch {
          return {
            valid: false,
            error: 'Model returned malformed JSON that could not be parsed.',
          };
        }
      } else {
        return {
          valid: false,
          error: 'Model returned malformed JSON that could not be parsed.',
        };
      }
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      valid: false,
      error: 'Model response is not a valid JSON object.',
    };
  }

  const obj = parsed as Record<string, unknown>;
  const project_title =
    typeof obj.project_title === 'string' && obj.project_title.trim()
      ? obj.project_title.trim()
      : '';
  const project_summary =
    typeof obj.project_summary === 'string' && obj.project_summary.trim()
      ? obj.project_summary.trim()
      : '';

  const roastObj =
    obj.roast && typeof obj.roast === 'object' ? (obj.roast as Record<string, unknown>) : null;
  const realityObj =
    obj.reality_check && typeof obj.reality_check === 'object'
      ? (obj.reality_check as Record<string, unknown>)
      : null;
  const scoresObj =
    obj.scores && typeof obj.scores === 'object' ? (obj.scores as Record<string, unknown>) : null;
  const actionObj =
    obj.action_plan && typeof obj.action_plan === 'object'
      ? (obj.action_plan as Record<string, unknown>)
      : null;

  if (!project_title || !project_summary || !roastObj || !realityObj || !scoresObj || !actionObj) {
    return {
      valid: false,
      error: 'Model response is missing required top-level analysis sections.',
    };
  }

  const roastHeadline =
    typeof roastObj.headline === 'string' ? roastObj.headline.trim() : '';
  const roastContent =
    typeof roastObj.content === 'string' ? roastObj.content.trim() : '';
  const roastHighlights = normalizeStringArray(roastObj.highlights);

  if (!roastHeadline || !roastContent || roastHighlights.length === 0) {
    return {
      valid: false,
      error: 'Roast section is incomplete (missing headline, content, or highlights).',
    };
  }

  // Script validation on roast fields
  const combinedRoastText = `${roastHeadline}\n${roastContent}\n${roastHighlights.join('\n')}`;
  const scriptCheck = containsForbiddenScript(combinedRoastText);
  if (scriptCheck.hasForbiddenScript) {
    return {
      valid: false,
      scriptViolation: true,
      error: `Roast contains forbidden script (${scriptCheck.detectedScripts.join(', ')}). Only English, Roman Urdu, and Hinglish in Latin script are permitted.`,
    };
  }

  const verdict =
    typeof realityObj.verdict === 'string' ? realityObj.verdict.trim() : '';
  const strengths = normalizeStringArray(realityObj.strengths);
  const weaknesses = normalizeStringArray(realityObj.weaknesses);
  const architecture_assessment =
    typeof realityObj.architecture_assessment === 'string'
      ? realityObj.architecture_assessment.trim()
      : '';
  const code_quality_assessment =
    typeof realityObj.code_quality_assessment === 'string'
      ? realityObj.code_quality_assessment.trim()
      : '';
  const documentation_assessment =
    typeof realityObj.documentation_assessment === 'string'
      ? realityObj.documentation_assessment.trim()
      : '';
  const testing_assessment =
    typeof realityObj.testing_assessment === 'string'
      ? realityObj.testing_assessment.trim()
      : '';

  if (
    !verdict ||
    !architecture_assessment ||
    !code_quality_assessment ||
    !documentation_assessment ||
    !testing_assessment
  ) {
    return {
      valid: false,
      error: 'Engineering reality check is missing required assessment fields.',
    };
  }

  const code_quality = normalizeCategoryScore(
    scoresObj.code_quality,
    'Evaluated based on available source structure and implementation patterns.'
  );
  const architecture = normalizeCategoryScore(
    scoresObj.architecture,
    'Evaluated based on project structure and separation of concerns.'
  );
  const functionality = normalizeCategoryScore(
    scoresObj.functionality,
    'Evaluated based on feature completeness and implementation evidence.'
  );
  const documentation = normalizeCategoryScore(
    scoresObj.documentation,
    'Evaluated based on README clarity, setup guide, and architecture docs.'
  );
  const testing = normalizeCategoryScore(
    scoresObj.testing,
    'Evaluated based on automated test files, validation, and error handling.'
  );

  // Enforce deterministic sum of the 5 20-point categories
  const total =
    code_quality.score +
    architecture.score +
    functionality.score +
    documentation.score +
    testing.score;

  const fix_immediately = Array.isArray(actionObj.fix_immediately)
    ? (actionObj.fix_immediately
        .map((item, i) => normalizeActionItem(item, i))
        .filter(Boolean) as ActionPlanItem[])
    : [];
  const improve_next = Array.isArray(actionObj.improve_next)
    ? (actionObj.improve_next
        .map((item, i) => normalizeActionItem(item, i))
        .filter(Boolean) as ActionPlanItem[])
    : [];
  const future_improvements = Array.isArray(actionObj.future_improvements)
    ? (actionObj.future_improvements
        .map((item, i) => normalizeActionItem(item, i))
        .filter(Boolean) as ActionPlanItem[])
    : [];

  const evidence_limitations = normalizeStringArray(obj.evidence_limitations);
  const final_message =
    typeof obj.final_message === 'string' && obj.final_message.trim()
      ? obj.final_message.trim()
      : 'Chalo shabash, ab chai piyo aur priority fixes pe kaam shuru karo!';

  return {
    valid: true,
    data: {
      project_title,
      project_summary,
      roast: {
        headline: roastHeadline,
        content: roastContent,
        highlights: roastHighlights,
      },
      reality_check: {
        verdict,
        strengths: strengths.length > 0 ? strengths : ['Clear initial project intent'],
        weaknesses: weaknesses.length > 0 ? weaknesses : ['Requires stronger engineering rigor'],
        architecture_assessment,
        code_quality_assessment,
        documentation_assessment,
        testing_assessment,
      },
      scores: {
        code_quality,
        architecture,
        functionality,
        documentation,
        testing,
        total,
      },
      action_plan: {
        fix_immediately,
        improve_next,
        future_improvements,
      },
      evidence_limitations:
        evidence_limitations.length > 0
          ? evidence_limitations
          : ['Static analysis performed without executing runtime code.'],
      final_message,
    },
  };
}

export interface ScoreVerdictInfo {
  label: string;
  urduTag: string;
  tier: 'critical' | 'weak' | 'decent' | 'strong' | 'elite';
  bgColor: string;
  summary: string;
}

/**
 * Maps a 0-100 project score to a transparent, evidence-based TechUstaad verdict badge.
 */
export function getScoreVerdict(totalScore: number): ScoreVerdictInfo {
  if (totalScore >= 85) {
    return {
      label: 'Production Ready — Asli Engineering',
      urduTag: 'SCENE FULL ON HAI — MITHAAI BAANTO!',
      tier: 'elite',
      bgColor: '#6EE7B7',
      summary:
        'Solid architecture, clean code separation, proper documentation, and verifiable reliability practices.',
    };
  }
  if (totalScore >= 70) {
    return {
      label: 'Solid Craft — Thora Polish Baqi Hai',
      urduTag: 'USTAAD APPROVED (WITH NOTES)',
      tier: 'strong',
      bgColor: '#7DD3FC',
      summary:
        'Genuinely functional and well-structured project that needs targeted testing or documentation hardening.',
    };
  }
  if (totalScore >= 50) {
    return {
      label: 'Jugaad Driven — Chal Raha Hai Magar Risk Hai',
      urduTag: 'CHALNE DO MAGAR PROD MEIN MAT DALNA',
      tier: 'decent',
      bgColor: '#FFE600',
      summary:
        'Core features exist, but technical debt, missing tests, or fragile architecture will bite as soon as scale hits.',
    };
  }
  if (totalScore >= 30) {
    return {
      label: 'Fragile Prototype — Topi Drama Zyada Hai',
      urduTag: 'VIVA PASS HO JAYEGA, CODE REVIEW NAHI',
      tier: 'weak',
      bgColor: '#FDBA74',
      summary:
        'Heavy reliance on happy-path code, weak documentation, or incomplete implementation relative to claims.',
    };
  }
  return {
    label: 'Folder Banaya Hai — Emergency Refactor Needed',
    urduTag: 'SCENE OFF HAI — DOOBARA SHURU KARO',
    tier: 'critical',
    bgColor: '#FF5C93',
    summary:
      'Critically incomplete implementation, missing fundamentals, or severe mismatch between claims and actual code.',
  };
}

/**
 * Formats an AnalysisResponse into a clean, readable Markdown report for Copy / Download actions.
 */
export function formatReportAsMarkdown(report: AnalysisResponse): string {
  const verdictInfo = getScoreVerdict(report.scores.total);
  const lines: string[] = [
    `# TECHUSTAAD ENGINEERING REALITY CHECK: ${report.project_title}`,
    ``,
    `> **Summary:** ${report.project_summary}`,
    `> **Overall Score:** ${report.scores.total} / 100 — ${verdictInfo.label} (${verdictInfo.urduTag})`,
    report.repository_telemetry
      ? `> **Inspected Repository:** ${report.repository_telemetry.htmlUrl} (${report.repository_telemetry.inspectedFiles.length} key files inspected out of ${report.repository_telemetry.totalFilesCount} total files)`
      : `> **Analysis Mode:** User-Provided Project Description`,
    ``,
    `---`,
    ``,
    `## STAGE 1: THE ROAST`,
    `### "${report.roast.headline}"`,
    ``,
    report.roast.content,
    ``,
    `### Savage Highlights:`,
    ...report.roast.highlights.map((h) => `- ${h}`),
    ``,
    `---`,
    ``,
    `## STAGE 2: THE ENGINEERING REALITY CHECK`,
    ``,
    `### 1. Project Verdict`,
    report.reality_check.verdict,
    ``,
    `### 2. 100-Point Scoring Breakdown`,
    `- **Code Quality:** ${report.scores.code_quality.score}/${report.scores.code_quality.max} — ${report.scores.code_quality.reason}`,
    `- **Architecture & Design:** ${report.scores.architecture.score}/${report.scores.architecture.max} — ${report.scores.architecture.reason}`,
    `- **Functionality & Implementation:** ${report.scores.functionality.score}/${report.scores.functionality.max} — ${report.scores.functionality.reason}`,
    `- **Documentation & Presentation:** ${report.scores.documentation.score}/${report.scores.documentation.max} — ${report.scores.documentation.reason}`,
    `- **Testing & Reliability:** ${report.scores.testing.score}/${report.scores.testing.max} — ${report.scores.testing.reason}`,
    `- **TOTAL SCORE:** **${report.scores.total}/100**`,
    ``,
    `### 3. Strengths & Weaknesses`,
    `**What Is Genuinely Good:**`,
    ...report.reality_check.strengths.map((s) => `- [+] ${s}`),
    ``,
    `**What Is Weak / Risky:**`,
    ...report.reality_check.weaknesses.map((w) => `- [-] ${w}`),
    ``,
    `### 4. Deep-Dive Technical Assessments`,
    `#### Architecture Assessment`,
    report.reality_check.architecture_assessment,
    ``,
    `#### Code & Implementation Quality`,
    report.reality_check.code_quality_assessment,
    ``,
    `#### Documentation & Presentation`,
    report.reality_check.documentation_assessment,
    ``,
    `#### Testing & Reliability`,
    report.reality_check.testing_assessment,
    ``,
    `---`,
    ``,
    `## ACTIONABLE IMPROVEMENT PLAN`,
    ``,
    `### Fix Immediately`,
    ...report.action_plan.fix_immediately.flatMap((item, idx) => [
      `${idx + 1}. **${item.title}**`,
      `   - **What needs to change:** ${item.what_to_change}`,
      `   - **Why it matters:** ${item.why_it_matters}`,
      `   - **How to approach:** ${item.how_to_approach}`,
    ]),
    ``,
    `### Improve Next`,
    ...report.action_plan.improve_next.flatMap((item, idx) => [
      `${idx + 1}. **${item.title}**`,
      `   - **What needs to change:** ${item.what_to_change}`,
      `   - **Why it matters:** ${item.why_it_matters}`,
      `   - **How to approach:** ${item.how_to_approach}`,
    ]),
    ``,
    `### Future Improvements`,
    ...report.action_plan.future_improvements.flatMap((item, idx) => [
      `${idx + 1}. **${item.title}**`,
      `   - **What needs to change:** ${item.what_to_change}`,
      `   - **Why it matters:** ${item.why_it_matters}`,
      `   - **How to approach:** ${item.how_to_approach}`,
    ]),
    ``,
    `---`,
    ``,
    `## EVIDENCE LIMITATIONS`,
    ...report.evidence_limitations.map((e) => `- ${e}`),
    ``,
    `## TECHUSTAAD'S CLOSING MESSAGE`,
    `"${report.final_message}"`,
    ``,
    `---`,
    `*Generated by TechUstaad — Your project deserves a reality check.*`,
  ];

  return lines.join('\n');
}

export function formatActionPlanAsText(report: AnalysisResponse): string {
  const formatGroup = (heading: string, items: ActionPlanItem[]) => {
    if (!items.length) return `${heading}\n- None listed.\n`;
    return (
      `${heading}\n` +
      items
        .map(
          (item, i) =>
            `${i + 1}. ${item.title}\n   • What: ${item.what_to_change}\n   • Why: ${item.why_it_matters}\n   • How: ${item.how_to_approach}`
        )
        .join('\n\n') +
      '\n'
    );
  };

  return [
    `TECHUSTAAD ACTIONABLE IMPROVEMENT PLAN — ${report.project_title} (${report.scores.total}/100)`,
    `====================================================================`,
    ``,
    formatGroup('1. FIX IMMEDIATELY (HIGH PRIORITY)', report.action_plan.fix_immediately),
    formatGroup('2. IMPROVE NEXT (MEDIUM PRIORITY)', report.action_plan.improve_next),
    formatGroup('3. FUTURE IMPROVEMENTS (LONG TERM)', report.action_plan.future_improvements),
  ].join('\n');
}
