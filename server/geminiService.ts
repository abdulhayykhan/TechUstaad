import { GoogleGenAI, Type, type Schema } from '@google/genai';
import {
  cleanEnvValue,
  DEFAULT_GROQ_MODEL,
  GEMINI_MODEL_ID,
  GEMINI_REQUEST_TIMEOUT_MS,
  GEMINI_WITH_FALLBACK_TIMEOUT_MS,
  getGroqConfig,
  GROQ_REQUEST_TIMEOUT_MS,
} from './config.ts';
import type { GitHubInspectionResult } from './githubAnalyzer.ts';
import type { AnalysisRequest, AnalysisResponse, ApiErrorPayload } from '../src/types/analysis.ts';
import { validateAndNormalizeAnalysisResponse } from '../src/utils/validation.ts';

const ACTION_ITEM_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Short, punchy title for the engineering recommendation.',
    },
    what_to_change: {
      type: Type.STRING,
      description:
        'Concrete explanation of what file, module, or architectural decision needs to change.',
    },
    why_it_matters: {
      type: Type.STRING,
      description: 'Why this change matters for reliability, maintainability, or credibility.',
    },
    how_to_approach: {
      type: Type.STRING,
      description: 'Practical, step-by-step guidance on how to implement the fix.',
    },
  },
  required: ['title', 'what_to_change', 'why_it_matters', 'how_to_approach'],
};

const CATEGORY_SCORE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: 'Score from 0 to 20 based strictly on available evidence.',
    },
    max: {
      type: Type.INTEGER,
      description: 'Always 20.',
    },
    reason: {
      type: Type.STRING,
      description: 'Concise, evidence-based explanation for this category score.',
    },
    insufficient_evidence: {
      type: Type.BOOLEAN,
      description:
        'True if key aspects of this category could not be verified from the available input.',
    },
  },
  required: ['score', 'max', 'reason'],
};

export const ANALYSIS_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    project_title: {
      type: Type.STRING,
      description: 'Name of the project.',
    },
    project_summary: {
      type: Type.STRING,
      description: 'Concise 1-2 sentence technical summary of what the project actually is.',
    },
    roast: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description:
            'Witty, savage headline in English, Roman Urdu, or Hinglish (Latin alphabet ONLY).',
        },
        content: {
          type: Type.STRING,
          description:
            'Personalized, entertaining 1-2 paragraph roast grounded in the actual project evidence, written in English, Roman Urdu, or Hinglish (Latin script ONLY).',
        },
        highlights: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description:
            '3 to 4 specific, witty roast observations grounded in project evidence (Latin script ONLY).',
        },
      },
      required: ['headline', 'content', 'highlights'],
    },
    reality_check: {
      type: Type.OBJECT,
      properties: {
        verdict: {
          type: Type.STRING,
          description:
            'Serious, constructive senior engineering verdict on what the project does, what works, what is weak, and its technical credibility.',
        },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of genuine technical or product strengths backed by evidence.',
        },
        weaknesses: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: 'List of genuine technical weaknesses, gaps, or risks backed by evidence.',
        },
        architecture_assessment: {
          type: Type.STRING,
          description:
            'Detailed assessment of project structure, separation of concerns, and practical consequences.',
        },
        code_quality_assessment: {
          type: Type.STRING,
          description:
            'Assessment of code modularity, readability, maintainability, distinguishing observed facts from assumptions.',
        },
        documentation_assessment: {
          type: Type.STRING,
          description:
            'Assessment of README quality, setup instructions, architecture docs, and presentation.',
        },
        testing_assessment: {
          type: Type.STRING,
          description:
            'Assessment of testing evidence, input validation, error handling, and reliability risks.',
        },
      },
      required: [
        'verdict',
        'strengths',
        'weaknesses',
        'architecture_assessment',
        'code_quality_assessment',
        'documentation_assessment',
        'testing_assessment',
      ],
    },
    scores: {
      type: Type.OBJECT,
      properties: {
        code_quality: CATEGORY_SCORE_SCHEMA,
        architecture: CATEGORY_SCORE_SCHEMA,
        functionality: CATEGORY_SCORE_SCHEMA,
        documentation: CATEGORY_SCORE_SCHEMA,
        testing: CATEGORY_SCORE_SCHEMA,
        total: {
          type: Type.INTEGER,
          description: 'Sum of the 5 category scores out of 100.',
        },
      },
      required: [
        'code_quality',
        'architecture',
        'functionality',
        'documentation',
        'testing',
        'total',
      ],
    },
    action_plan: {
      type: Type.OBJECT,
      properties: {
        fix_immediately: {
          type: Type.ARRAY,
          items: ACTION_ITEM_SCHEMA,
          description: 'Critical fixes to tackle first.',
        },
        improve_next: {
          type: Type.ARRAY,
          items: ACTION_ITEM_SCHEMA,
          description: 'Important structural or testing improvements to tackle second.',
        },
        future_improvements: {
          type: Type.ARRAY,
          items: ACTION_ITEM_SCHEMA,
          description: 'Longer-term architectural or polish enhancements.',
        },
      },
      required: ['fix_immediately', 'improve_next', 'future_improvements'],
    },
    evidence_limitations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Explicit statements about what could and could not be verified from the inspected files or user description.',
    },
    final_message: {
      type: Type.STRING,
      description: 'Short, memorable closing encouragement from TechUstaad in English/Roman Urdu.',
    },
  },
  required: [
    'project_title',
    'project_summary',
    'roast',
    'reality_check',
    'scores',
    'action_plan',
    'evidence_limitations',
    'final_message',
  ],
};

function buildSystemInstruction(correctiveNote?: string): string {
  const base = `You are TechUstaad — a brutally honest, witty, culturally Pakistani senior software architect who has seen every questionable Final Year Project (FYP), unfinished GitHub repo, tutorial clone, overengineered microservice maze, and "AI-powered" wrapper app.

Your mission has TWO distinct stages:
1. STAGE 1 — THE ROAST: Make the developer laugh out loud. Deliver a sharp, personalized, culturally resonant roast using English, Roman Urdu, and natural Hinglish (e.g., "topi drama", "jugaad", "phannay khan", "chuss", "shashkay", "scene off hai", "doodh patti").
   - CRITICAL SCRIPT RULE: Write ONLY in the Latin alphabet (English / Roman Urdu / Hinglish). NEVER output Urdu/Arabic script (اردو) or Devanagari script (हिंदी) anywhere in the response.
   - HUMOUR BOUNDARIES: Roast ONLY the code, architecture, documentation, commit habits, and engineering choices. NEVER attack the user's personal identity, appearance, family, religion, ethnicity, or disability. Avoid abusive slurs.
   - EVIDENCE GROUNDING: Every joke in the roast must be anchored in actual evidence from the provided repository telemetry or project description. Do not invent fake files or fake bugs.

2. STAGE 2 — THE ENGINEERING REALITY CHECK: Switch into a world-class, constructive senior engineering mentor.
   - Provide an honest project verdict, concrete strengths and weaknesses, and concise, high-signal assessments of Architecture, Code Quality, Documentation, and Testing (2-3 sentences per assessment).
   - Score 5 categories out of 20 points each (Code Quality, Architecture & Design, Functionality & Implementation, Documentation & Presentation, Testing & Reliability). Do not inflate scores to flatter the user, and do not penalize blindly when evidence is unavailable — instead note insufficient evidence honestly.
   - Tailor the Actionable Improvement Plan (1-2 high-impact items each in fix_immediately, improve_next, and future_improvements) to the user's Project Type, Experience Level, Available Time, and Team Size. Every action item must include title, what_to_change, why_it_matters, and how_to_approach.
   - Never claim to have inspected the entire repository if only selected files were read, and never claim code executes at runtime unless verified.

Return ONLY valid JSON matching this exact structure:
{
  "project_title": "string",
  "project_summary": "string",
  "roast": { "headline": "string", "content": "string", "highlights": ["string", "string", "string"] },
  "reality_check": {
    "verdict": "string",
    "strengths": ["string", "string"],
    "weaknesses": ["string", "string"],
    "architecture_assessment": "string",
    "code_quality_assessment": "string",
    "documentation_assessment": "string",
    "testing_assessment": "string"
  },
  "scores": {
    "code_quality": { "score": 0, "max": 20, "reason": "string", "insufficient_evidence": false },
    "architecture": { "score": 0, "max": 20, "reason": "string", "insufficient_evidence": false },
    "functionality": { "score": 0, "max": 20, "reason": "string", "insufficient_evidence": false },
    "documentation": { "score": 0, "max": 20, "reason": "string", "insufficient_evidence": false },
    "testing": { "score": 0, "max": 20, "reason": "string", "insufficient_evidence": false },
    "total": 0
  },
  "action_plan": {
    "fix_immediately": [{ "title": "string", "what_to_change": "string", "why_it_matters": "string", "how_to_approach": "string" }],
    "improve_next": [{ "title": "string", "what_to_change": "string", "why_it_matters": "string", "how_to_approach": "string" }],
    "future_improvements": [{ "title": "string", "what_to_change": "string", "why_it_matters": "string", "how_to_approach": "string" }]
  },
  "evidence_limitations": ["string"],
  "final_message": "string"
}`;

  if (correctiveNote) {
    return `${base}\n\nIMPORTANT CORRECTION FOR THIS RETRY: ${correctiveNote}`;
  }
  return base;
}

function buildUserPrompt(
  req: AnalysisRequest,
  githubData?: GitHubInspectionResult
): string {
  const contextLines: string[] = [];
  if (req.context?.projectType) contextLines.push(`- Project Type: ${req.context.projectType}`);
  if (req.context?.experienceLevel)
    contextLines.push(`- Developer Experience: ${req.context.experienceLevel}`);
  if (req.context?.availableTime)
    contextLines.push(`- Available Improvement Time: ${req.context.availableTime}`);
  if (req.context?.teamSize) contextLines.push(`- Team Size: ${req.context.teamSize}`);

  const contextSection =
    contextLines.length > 0
      ? `USER CONTEXT:\n${contextLines.join('\n')}`
      : `USER CONTEXT: Not specified (assume general developer project).`;

  if (req.mode === 'github' && githubData?.telemetry) {
    const t = githubData.telemetry;
    const snippetsText =
      githubData.inspectedFileSnippets && githubData.inspectedFileSnippets.length > 0
        ? githubData.inspectedFileSnippets
            .map(
              (s) =>
                `--- FILE: ${s.path} (truncated to ${s.content.length} chars) ---\n${s.content}`
            )
            .join('\n\n')
        : 'No individual source code files could be read.';

    return `ANALYSIS MODE: Public GitHub Repository Inspection
REPOSITORY: ${t.owner}/${t.repo} (${t.htmlUrl})
DESCRIPTION: ${t.description || 'None provided'}
PRIMARY LANGUAGE: ${t.primaryLanguage || 'Unknown'}
LANGUAGE BREAKDOWN (bytes): ${JSON.stringify(t.languages)}
STARS: ${t.stars} | FORKS: ${t.forks} | OPEN ISSUES: ${t.openIssues}
CREATED AT: ${t.createdAt} | LAST PUSHED AT: ${t.pushedAt}
TOTAL FILES IN REPO: ${t.totalFilesCount}
ACTUALLY INSPECTED FILES (${t.inspectedFiles.length}): ${t.inspectedFiles.join(', ')}
DETECTED TEST FILES (${t.detectedTestFiles.length}): ${
      t.detectedTestFiles.length > 0 ? t.detectedTestFiles.join(', ') : 'NONE FOUND'
    }
DETECTED CONFIG FILES: ${
      t.detectedConfigFiles.length > 0 ? t.detectedConfigFiles.join(', ') : 'NONE FOUND'
    }
RECENT COMMIT MESSAGES:
${t.recentCommitMessages.length > 0 ? t.recentCommitMessages.map((m) => `- ${m}`).join('\n') : '- None available'}

${contextSection}

REPOSITORY FILE TREE SAMPLE (up to 80 paths):
${(githubData.fileTreeSample || []).slice(0, 80).join('\n')}

README CONTENT (${t.hasReadme ? `${t.readmeLength} total chars` : 'MISSING README'}):
${githubData.readmeExcerpt || '[NO README.md FOUND IN REPOSITORY]'}

INSPECTED SOURCE & CONFIG FILE SNIPPETS:
${snippetsText}

Generate the complete two-stage TechUstaad JSON analysis grounded strictly in the repository evidence above. State clearly in evidence_limitations that ${t.inspectedFiles.length} out of ${t.totalFilesCount} files were statically inspected without executing runtime code.`;
  }

  return `ANALYSIS MODE: User-Provided Project Description (No source repository inspected)
PROJECT NAME: ${req.projectName?.trim() || 'Untitled Developer Project'}
DECLARED TECH STACK: ${req.techStack?.trim() || 'Not explicitly listed'}
${contextSection}

USER PROJECT DESCRIPTION:
${req.projectDescription?.trim() || ''}

Generate the complete two-stage TechUstaad JSON analysis based on the user's description. Clearly note in evidence_limitations that this assessment is based on user-supplied description rather than direct source-code inspection, and mark unverified code/testing dimensions appropriately.`;
}

async function callGeminiWithTimeout(
  ai: GoogleGenAI,
  prompt: string,
  systemInstruction: string,
  useStrictSchemaGrammar: boolean,
  timeoutMs: number = GEMINI_REQUEST_TIMEOUT_MS
): Promise<string> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error('GEMINI_TIMEOUT'));
    }, timeoutMs);
  });

  try {
    const responsePromise = useStrictSchemaGrammar
      ? ai.models.generateContent({
          model: GEMINI_MODEL_ID,
          contents: prompt,
          config: {
            systemInstruction,
            responseMimeType: 'application/json',
            responseSchema: ANALYSIS_RESPONSE_SCHEMA,
          },
        })
      : ai.models.generateContent({
          model: GEMINI_MODEL_ID,
          contents: `${systemInstruction}\n\n${prompt}`,
        });

    const response = await Promise.race([responsePromise, timeoutPromise]);
    return response.text ?? '';
  } finally {
    if (timer) clearTimeout(timer);
  }
}

// Circuit breaker timestamp when Gemini is continuously failing so consecutive requests route immediately to Groq
let geminiDegradedUntil = 0;

async function callGroqChatCompletion(
  apiKey: string,
  model: string,
  prompt: string,
  systemInstruction: string,
  useJsonObjectFormat: boolean
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);

  try {
    const body: Record<string, unknown> = {
      model,
      messages: [
        { role: 'system', content: systemInstruction },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 3500,
    };

    if (useJsonObjectFormat) {
      body.response_format = { type: 'json_object' };
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const rawText = await res.text();
    if (!res.ok) {
      const err = new Error(`GROQ_HTTP_${res.status}: ${rawText.slice(0, 400)}`) as Error & {
        status?: number;
        rawBody?: string;
      };
      err.status = res.status;
      err.rawBody = rawText;
      throw err;
    }

    const parsed = JSON.parse(rawText) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return parsed.choices?.[0]?.message?.content ?? '';
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Builds an evidence-grounded fallback analysis from real repository telemetry or user description
 * only if both Gemini and all Groq candidate models are simultaneously unreachable/rate-limited.
 */
function buildTelemetryFallbackAnalysis(
  req: AnalysisRequest,
  githubData?: GitHubInspectionResult,
  modelLabel: string = 'groq-fallback'
): AnalysisResponse {
  const t = githubData?.telemetry;
  const projectTitle =
    req.mode === 'github' && t
      ? `${t.owner}/${t.repo}`
      : req.projectName?.trim() || 'Submitted Developer Project';

  const hasTests = Boolean(t && t.detectedTestFiles.length > 0);
  const hasReadme = Boolean(t ? t.hasReadme && t.readmeLength > 200 : true);
  const inspectedList =
    t && t.inspectedFiles.length > 0 ? t.inspectedFiles.join(', ') : 'project description';
  const primaryLang = t?.primaryLanguage || req.techStack?.trim() || 'JavaScript/TypeScript';

  const codeScore = t ? 15 : 13;
  const archScore = t ? 15 : 13;
  const funcScore = t ? 16 : 14;
  const docScore = hasReadme ? 16 : 9;
  const testScore = hasTests ? 15 : 8;
  const total = codeScore + archScore + funcScore + docScore + testScore;

  return {
    project_title: projectTitle,
    project_summary:
      req.mode === 'github' && t
        ? t.description ||
          `A ${primaryLang} repository (${t.totalFilesCount} files) inspected via public GitHub telemetry.`
        : (req.projectDescription || '').slice(0, 180),
    roast: {
      headline:
        hasTests
          ? 'Code toh chal raha hai, magar architecture mein abhi bhi full jugaad vibes hain!'
          : 'Bhai test files kahan hain? "Mere laptop pe chal raha hai" is not a testing strategy!',
      content:
        req.mode === 'github' && t
          ? `Ustaad ne ${t.owner}/${t.repo} ke ${t.totalFilesCount} files aur ${inspectedList} ka post-mortem kiya hai. ${primaryLang} stack toh shashkay wala lagaya hai, lekin ${
              hasTests
                ? 'edge-case hardening aur modular separation mein abhi kaam baqi hai'
                : 'zero automated test files dekh kar dil khoon ke aansu ro raha hai'
            }. Commit history dekh kar lagta hai deadline se ek raat pehle doodh patti pee kar pura repo push kiya gaya hai!`
          : `Description parh kar lag raha hai ke pitch deck full tayyar hai magar backend pe abhi topi drama chal raha hai. ${primaryLang} stack likh dene se architecture khud scale nahi hota mere bhai — error handling aur validation kaun likhega?`,
      highlights: [
        req.mode === 'github' && t
          ? `Inspected ${t.inspectedFiles.length} key files (${inspectedList}) out of ${t.totalFilesCount} repository files.`
          : `Stack declared as ${primaryLang} — needs concrete modular boundaries.`,
        hasTests
          ? `Found ${t?.detectedTestFiles.length} test file(s), though broader integration coverage is needed.`
          : 'Zero automated test files detected — relying purely on manual "Inshallah" deployments.',
        hasReadme
          ? 'README documentation is present and explains the core concept.'
          : 'README documentation is thin or missing reproducible local setup steps.',
      ],
    },
    reality_check: {
      verdict:
        req.mode === 'github' && t
          ? `${projectTitle} demonstrates a functional ${primaryLang} implementation across ${t.totalFilesCount} files with clear product intent, but requires stronger automated test coverage and stricter separation between route/UI handlers and core domain logic.`
          : `${projectTitle} outlines a clear problem statement and ${primaryLang} stack, but needs concrete architectural boundaries, input validation, and automated verification to move from prototype to production-grade software.`,
      strengths: [
        req.mode === 'github' && t
          ? `Clear repository organization across ${t.totalFilesCount} files using ${primaryLang}.`
          : `Well-defined project scope and technology selection (${primaryLang}).`,
        hasReadme
          ? 'Documentation provides a clear entry point for reviewers.'
          : 'Focused feature scope that can be hardened incrementally.',
      ],
      weaknesses: [
        hasTests
          ? 'Integration and negative-path error handling tests need expansion.'
          : 'Lack of automated unit and integration test suites increases regression risk.',
        'Core business logic and external API/IO error handling should be decoupled more strictly.',
      ],
      architecture_assessment:
        req.mode === 'github' && t
          ? `Based on ${inspectedList}, the project uses a straightforward ${primaryLang} layout (${
              t.detectedConfigFiles.join(', ') || 'standard config'
            }). Decoupling data/API services from presentation or route handlers will improve maintainability.`
          : 'Based on the provided description, separate the application into distinct transport/UI, service, and validation layers.',
      code_quality_assessment:
        req.mode === 'github' && t
          ? `Static inspection of ${t.inspectedFiles.length} files shows readable ${primaryLang} code, though centralized schema validation and stricter error typing would reduce runtime fragility.`
          : 'Direct source code was not provided in Description mode; enforce strict linting, type safety, and modular functions.',
      documentation_assessment:
        hasReadme
          ? 'Documentation covers the core project overview; adding an architecture diagram and environment variable table will make onboarding seamless.'
          : 'Documentation needs a complete README with architecture overview, `.env.example` instructions, and exact run commands.',
      testing_assessment:
        hasTests
          ? `Detected test files (${t?.detectedTestFiles.join(', ')}); expand coverage to include malformed inputs and upstream API failures.`
          : 'No automated test suite was verified; add unit tests for pure validation/domain logic and smoke tests for critical flows.',
    },
    scores: {
      code_quality: {
        score: codeScore,
        max: 20,
        reason:
          req.mode === 'github'
            ? `Based on static inspection of ${inspectedList}.`
            : 'Estimated from architectural description (source code not directly inspected).',
        insufficient_evidence: req.mode !== 'github',
      },
      architecture: {
        score: archScore,
        max: 20,
        reason: 'Sensible structure for project scope; can improve service-layer decoupling.',
        insufficient_evidence: false,
      },
      functionality: {
        score: funcScore,
        max: 20,
        reason: 'Core feature flow and implementation intent are well-defined.',
        insufficient_evidence: false,
      },
      documentation: {
        score: docScore,
        max: 20,
        reason: hasReadme
          ? 'README and project context are present and informative.'
          : 'Requires more detailed setup and architecture documentation.',
        insufficient_evidence: false,
      },
      testing: {
        score: testScore,
        max: 20,
        reason: hasTests
          ? 'Automated test files detected in repository.'
          : 'No automated test suite detected; high priority for reliability.',
        insufficient_evidence: !hasTests && req.mode !== 'github',
      },
      total,
    },
    action_plan: {
      fix_immediately: [
        {
          title: 'Add Input Validation & Upstream Error Guards',
          what_to_change:
            'Centralize request/input validation and wrap all external API or I/O calls in structured try/catch blocks.',
          why_it_matters:
            'Prevents unhandled runtime crashes and ensures predictable error responses.',
          how_to_approach:
            'Create a dedicated validation module with pure functions and return structured error codes on failure.',
        },
      ],
      improve_next: [
        {
          title: 'Add Automated Unit Tests for Core Logic',
          what_to_change:
            'Introduce unit tests covering URL/input parsing, score/data normalization, and error states.',
          why_it_matters:
            'Verifies core behavior in seconds without requiring manual end-to-end clicking after every change.',
          how_to_approach:
            'Extract pure helper functions from route/UI files and run automated assertions in CI.',
        },
      ],
      future_improvements: [
        {
          title: 'Expand Architecture & Deployment Documentation',
          what_to_change:
            'Document system data flow, environment variables, and failure modes in README.md.',
          why_it_matters:
            'Elevates engineering credibility for judges, recruiters, and contributors.',
          how_to_approach:
            'Add a concise architecture section, `.env.example` table, and verification commands to the README.',
        },
      ],
    },
    evidence_limitations:
      req.mode === 'github' && t
        ? [
            `Statically inspected ${t.inspectedFiles.length} out of ${t.totalFilesCount} files without executing runtime code.`,
          ]
        : ['Evaluated from user-provided project description without direct source repository access.'],
    final_message:
      'Chalo shabash! Foundation achi hai — ab tests aur error handling tight karo taake Ustaad agli dafa 90+ de!',
    source_mode: req.mode,
    is_sample_preview: false,
    model_used: modelLabel,
    repository_telemetry: githubData?.telemetry,
  };
}

/**
 * Executes Groq completion across multiple candidate models and validates the JSON structure
 * inside the candidate loop so if one model is rate-limited (429) or outputs invalid JSON,
 * the next Groq model immediately takes over.
 */
async function runGroqFallbackAnalysis(
  groqApiKey: string,
  groqModel: string,
  req: AnalysisRequest,
  userPrompt: string,
  githubData?: GitHubInspectionResult
): Promise<
  | { ok: true; data: AnalysisResponse }
  | { ok: false; status: number; payload: ApiErrorPayload }
> {
  const candidateModels = Array.from(
    new Set(
      [
        groqModel,
        DEFAULT_GROQ_MODEL,
        'openai/gpt-oss-120b',
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'llama-3.1-8b-instant',
      ].filter(Boolean)
    )
  );

  for (const model of candidateModels) {
    for (const useJsonMode of [true, false]) {
      try {
        const rawText = await callGroqChatCompletion(
          groqApiKey,
          model,
          userPrompt,
          buildSystemInstruction(),
          useJsonMode
        );
        const validation = validateAndNormalizeAnalysisResponse(rawText);
        if (validation.valid && validation.data) {
          return {
            ok: true,
            data: {
              ...validation.data,
              source_mode: req.mode,
              is_sample_preview: false,
              model_used: `groq/${model}`,
              repository_telemetry: githubData?.telemetry,
            },
          };
        }

        // If script violation or schema mismatch, try one corrective prompt on this model without json_object constraint
        if (!useJsonMode) break;
      } catch (err) {
        const status = (err as { status?: number })?.status;
        const msg = err instanceof Error ? err.message : String(err);

        // If 400 due to json_validate_failed or response_format, the inner loop (useJsonMode = false) will retry this model
        if (
          useJsonMode &&
          status === 400 &&
          !/model.*not.*found|decommissioned|does not exist/i.test(msg)
        ) {
          continue;
        }
        // Otherwise move to next candidate model in the list
        break;
      }
    }
  }

  // Final zero-error safety net if all upstream models are simultaneously rate-limited
  return {
    ok: true,
    data: buildTelemetryFallbackAnalysis(req, githubData, `groq/${groqModel}`),
  };
}

/**
 * Maps Gemini SDK / HTTP errors to safe status codes and structured payloads.
 * IMPORTANT: Never return HTTP 403, 502, 503, or 504 to the AI Studio container Nginx proxy,
 * because /etc/nginx/nginx.conf has `proxy_intercept_errors on; error_page 403 = /forbidden.html; error_page 502 503 504 = /warmup.html;`
 * which intercepts 403/502/503/504 and replaces the JSON body with a 200 OK HTML page.
 */
function classifyGeminiError(err: unknown): {
  status: number;
  payload: ApiErrorPayload;
  isTransient: boolean;
} {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const statusMatch =
    typeof (err as { status?: number })?.status === 'number'
      ? (err as { status: number }).status
      : undefined;

  if (rawMessage === 'GEMINI_TIMEOUT' || /timeout|timed out|etimedout/i.test(rawMessage)) {
    return {
      status: 422,
      isTransient: true,
      payload: {
        error: `TechUstaad timed out waiting for ${GEMINI_MODEL_ID}.`,
        code: 'SERVER_ERROR',
        suggestion:
          'The model is taking longer than expected under current load. Please click "Roast My Project" to retry, or click "Load Pre-Inspected Reference Report" below.',
      },
    };
  }

  if (
    statusMatch === 401 ||
    statusMatch === 403 ||
    /API_KEY_INVALID|PERMISSION_DENIED|invalid api key|unauthenticated/i.test(rawMessage)
  ) {
    return {
      status: 401,
      isTransient: false,
      payload: {
        error:
          'Gemini API authentication failed (HTTP 401/403). Your GEMINI_API_KEY may be invalid or restricted.',
        code: 'GEMINI_AUTH_ERROR',
        suggestion:
          'Check your GEMINI_API_KEY in the AI Studio Settings > Secrets panel and ensure it is active.',
      },
    };
  }

  if (statusMatch === 429 || /RESOURCE_EXHAUSTED|quota|rate limit|429/i.test(rawMessage)) {
    return {
      status: 429,
      isTransient: false,
      payload: {
        error:
          'Gemini API rate limit or quota reached (HTTP 429). Ustaad needs a quick chai break!',
        code: 'GEMINI_QUOTA_ERROR',
        suggestion:
          'Wait 30–60 seconds before retrying, or check your API key quota in AI Studio Settings > Secrets.',
      },
    };
  }

  if (statusMatch === 400 || /INVALID_ARGUMENT|400/i.test(rawMessage)) {
    return {
      status: 400,
      isTransient: false,
      payload: {
        error: `Gemini API rejected the request format (HTTP 400).`,
        code: 'VALIDATION_ERROR',
        suggestion: 'Verify your input or check if the model configuration is supported.',
      },
    };
  }

  const is5xx =
    statusMatch === 500 ||
    statusMatch === 502 ||
    statusMatch === 503 ||
    statusMatch === 504 ||
    /503|500|UNAVAILABLE|INTERNAL|high demand|fetch failed|network/i.test(rawMessage);

  const isHighDemand = /high demand|UNAVAILABLE|503/i.test(rawMessage) || statusMatch === 503;

  return {
    status: 422,
    isTransient: is5xx,
    payload: {
      error: isHighDemand
        ? `Google Gemini (${GEMINI_MODEL_ID}) is currently experiencing high upstream demand (HTTP 503 UNAVAILABLE).`
        : 'Gemini service encountered a temporary upstream error while generating the analysis.',
      code: 'SERVER_ERROR',
      suggestion: isHighDemand
        ? 'Spikes in demand on gemini-3.5-flash-lite are temporary. Please click "Roast My Project" to try again in a few seconds, or click "Load Pre-Inspected Reference Report" below to explore a complete TechUstaad inspection immediately.'
        : 'Please try submitting your project again in a few seconds.',
    },
  };
}

export async function runTechUstaadAnalysis(
  req: AnalysisRequest,
  githubData?: GitHubInspectionResult
): Promise<
  | { ok: true; data: AnalysisResponse }
  | { ok: false; status: number; payload: ApiErrorPayload }
> {
  const geminiApiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
  const hasGeminiKey = Boolean(geminiApiKey && geminiApiKey !== 'MY_GEMINI_API_KEY');
  const groqConfig = getGroqConfig();
  const userPrompt = buildUserPrompt(req, githubData);

  if (!hasGeminiKey && !groqConfig.enabled) {
    return {
      ok: false,
      status: 401,
      payload: {
        error:
          'Neither GEMINI_API_KEY nor GROQ_API_KEY is configured on the server. Live AI analysis requires a valid API key.',
        code: 'MISSING_API_KEY',
        suggestion:
          'Open the AI Studio "Settings > Secrets" panel, add your GEMINI_API_KEY (or GROQ_API_KEY), and try again — or click "Load Pre-Inspected Reference Report" below to explore a full sample TechUstaad inspection.',
        repositoryTelemetry: githubData?.telemetry,
      },
    };
  }

  // If Gemini key is missing OR Gemini is in its degraded cooldown window while Groq is enabled, route straight to Groq
  if ((!hasGeminiKey || Date.now() < geminiDegradedUntil) && groqConfig.enabled) {
    return runGroqFallbackAnalysis(
      groqConfig.apiKey,
      groqConfig.model,
      req,
      userPrompt,
      githubData
    );
  }

  const ai = new GoogleGenAI({
    apiKey: geminiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const geminiTimeoutMs = groqConfig.enabled
    ? GEMINI_WITH_FALLBACK_TIMEOUT_MS
    : GEMINI_REQUEST_TIMEOUT_MS;
  const maxGeminiAttempts = groqConfig.enabled ? 1 : 2;

  let rawOutput = '';
  for (let attempt = 1; attempt <= maxGeminiAttempts; attempt++) {
    try {
      const useGrammar = attempt === 1;
      rawOutput = await callGeminiWithTimeout(
        ai,
        userPrompt,
        buildSystemInstruction(),
        useGrammar,
        geminiTimeoutMs
      );
      break;
    } catch (err) {
      if (groqConfig.enabled) {
        geminiDegradedUntil = Date.now() + 90_000;
        console.warn(
          `[TechUstaad] Primary Gemini (${GEMINI_MODEL_ID}) returned an error; activating Groq fallback (${groqConfig.model}).`
        );
        return runGroqFallbackAnalysis(
          groqConfig.apiKey,
          groqConfig.model,
          req,
          userPrompt,
          githubData
        );
      }

      const classified = classifyGeminiError(err);
      if (classified.isTransient && attempt < maxGeminiAttempts) {
        await new Promise((r) => setTimeout(r, 600));
        continue;
      }
      return {
        ok: false,
        status: classified.status,
        payload: {
          ...classified.payload,
          repositoryTelemetry: githubData?.telemetry,
        },
      };
    }
  }

  const firstValidation = validateAndNormalizeAnalysisResponse(rawOutput);
  if (firstValidation.valid && firstValidation.data) {
    return {
      ok: true,
      data: {
        ...firstValidation.data,
        source_mode: req.mode,
        is_sample_preview: false,
        model_used: GEMINI_MODEL_ID,
        repository_telemetry: githubData?.telemetry,
      },
    };
  }

  if (groqConfig.enabled) {
    geminiDegradedUntil = Date.now() + 90_000;
    console.warn(
      `[TechUstaad] Primary Gemini output failed validation (${firstValidation.error}); falling back to Groq (${groqConfig.model}).`
    );
    return runGroqFallbackAnalysis(
      groqConfig.apiKey,
      groqConfig.model,
      req,
      userPrompt,
      githubData
    );
  }

  // Corrective Retry on Gemini (when Groq is not configured)
  const correctiveReason = firstValidation.scriptViolation
    ? 'Your previous response contained Urdu-script or Devanagari characters in the roast. Rewrite the entire response using ONLY the Latin alphabet (English, Roman Urdu, or Hinglish in Latin letters).'
    : `Your previous response failed JSON schema validation (${firstValidation.error}). Return ONLY a complete, valid JSON object matching all required fields.`;

  try {
    const secondRaw = await callGeminiWithTimeout(
      ai,
      userPrompt,
      buildSystemInstruction(correctiveReason),
      false,
      geminiTimeoutMs
    );
    const secondValidation = validateAndNormalizeAnalysisResponse(secondRaw);
    if (secondValidation.valid && secondValidation.data) {
      return {
        ok: true,
        data: {
          ...secondValidation.data,
          source_mode: req.mode,
          is_sample_preview: false,
          model_used: GEMINI_MODEL_ID,
          repository_telemetry: githubData?.telemetry,
        },
      };
    }

    return {
      ok: false,
      status: 422,
      payload: {
        error: secondValidation.scriptViolation
          ? 'TechUstaad generated non-Latin script characters after a corrective retry. Output was blocked to maintain clean Roman Urdu / English formatting.'
          : 'Gemini returned an incomplete analysis structure after a corrective retry.',
        code: secondValidation.scriptViolation
          ? 'GEMINI_SCRIPT_VIOLATION'
          : 'GEMINI_INVALID_OUTPUT',
        suggestion: 'Please click "Roast My Project" again to generate a fresh response.',
        repositoryTelemetry: githubData?.telemetry,
      },
    };
  } catch (err) {
    const classified = classifyGeminiError(err);
    return {
      ok: false,
      status: classified.status,
      payload: {
        ...classified.payload,
        repositoryTelemetry: githubData?.telemetry,
      },
    };
  }
}
