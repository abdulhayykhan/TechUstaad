// server.ts
import "dotenv/config";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// server/config.ts
var GEMINI_MODEL_ID = "gemini-3.5-flash-lite";
var DEFAULT_GROQ_MODEL = "llama-3.3-70b-versatile";
var GEMINI_REQUEST_TIMEOUT_MS = 65e3;
var GEMINI_WITH_FALLBACK_TIMEOUT_MS = 3500;
var GROQ_REQUEST_TIMEOUT_MS = 25e3;
var GITHUB_REQUEST_TIMEOUT_MS = 1e4;
var MAX_INSPECTED_SOURCE_FILES = 4;
var MAX_FILE_CONTENT_CHARS = 1600;
var MAX_README_CHARS = 2800;
function cleanEnvValue(raw) {
  if (!raw) return "";
  return raw.trim().replace(/^["']|["']$/g, "").trim();
}
function getGroqConfig() {
  const apiKey = cleanEnvValue(process.env.GROQ_API_KEY);
  const model = cleanEnvValue(process.env.GROQ_MODEL) || DEFAULT_GROQ_MODEL;
  const enabled = Boolean(apiKey && apiKey !== "MY_GROQ_API_KEY");
  return { apiKey, model, enabled };
}

// server/githubAnalyzer.ts
var PRIORITY_CONFIG_FILES = /* @__PURE__ */ new Set([
  "package.json",
  "tsconfig.json",
  "requirements.txt",
  "pyproject.toml",
  "Cargo.toml",
  "go.mod",
  "pom.xml",
  "build.gradle",
  "Dockerfile",
  "docker-compose.yml",
  "vercel.json",
  ".env.example"
]);
var SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".py",
  ".go",
  ".rs",
  ".java",
  ".kt",
  ".cpp",
  ".c",
  ".cs",
  ".rb",
  ".php",
  ".vue",
  ".svelte"
];
async function fetchGitHubJson(url) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);
  try {
    const headers = {
      Accept: "application/vnd.github.v3+json",
      "User-Agent": "TechUstaad-Analyzer/1.0"
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    const res = await fetch(url, {
      headers,
      signal: controller.signal
    });
    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get("x-ratelimit-remaining");
      if (remaining === "0" || res.status === 429) {
        return { status: res.status, rateLimited: true };
      }
    }
    if (!res.ok) {
      return { status: res.status };
    }
    const data = await res.json();
    return { status: res.status, data };
  } catch {
    return { status: 0 };
  } finally {
    clearTimeout(timer);
  }
}
async function fetchRawFile(owner, repo, branch, filePath) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);
  try {
    const encodedPath = filePath.split("/").map((seg) => encodeURIComponent(seg)).join("/");
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
    const res = await fetch(rawUrl, {
      headers: { "User-Agent": "TechUstaad-Analyzer/1.0" },
      signal: controller.signal
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, MAX_FILE_CONTENT_CHARS);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}
var repoInspectionCache = /* @__PURE__ */ new Map();
var REPO_CACHE_TTL_MS = 10 * 60 * 1e3;
async function inspectGitHubRepository(parsed) {
  const { owner, repo } = parsed;
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = repoInspectionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }
  const baseApi = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const repoRes = await fetchGitHubJson(baseApi);
  if (repoRes.rateLimited) {
    return {
      ok: false,
      errorCode: "GITHUB_RATE_LIMIT",
      errorMessage: 'GitHub public API rate limit reached right now. Switch to the "Project Description" tab to get your project roasted immediately!'
    };
  }
  if (repoRes.status === 404 || !repoRes.data) {
    return {
      ok: false,
      errorCode: "GITHUB_NOT_FOUND",
      errorMessage: `Repository "${owner}/${repo}" could not be found or is private. Make sure the repository is public, or use the "Project Description" tab instead.`
    };
  }
  const meta = repoRes.data;
  if (meta.size === 0) {
    return {
      ok: false,
      errorCode: "GITHUB_EMPTY_OR_INACCESSIBLE",
      errorMessage: `Repository "${owner}/${repo}" appears to be completely empty (0 KB). Push some code first or use the "Project Description" tab!`
    };
  }
  const branch = meta.default_branch || "main";
  const [langRes, commitsRes, readmeRes, treeRes] = await Promise.all([
    fetchGitHubJson(`${baseApi}/languages`),
    fetchGitHubJson(`${baseApi}/commits?per_page=10`),
    fetchGitHubJson(`${baseApi}/readme`),
    fetchGitHubJson(`${baseApi}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
  ]);
  const languages = langRes.data || {};
  const recentCommitMessages = Array.isArray(commitsRes.data) ? commitsRes.data.map((c) => (c.commit?.message || "").split("\n")[0].trim()).filter(Boolean).slice(0, 8) : [];
  let readmeText = "";
  if (readmeRes.data?.content && readmeRes.data.encoding === "base64") {
    try {
      readmeText = Buffer.from(readmeRes.data.content, "base64").toString("utf8");
    } catch {
      readmeText = "";
    }
  }
  let allBlobPaths = Array.isArray(treeRes.data?.tree) ? treeRes.data.tree.filter((item) => item.type === "blob" && typeof item.path === "string").map((item) => item.path) : [];
  if (allBlobPaths.length === 0) {
    const contentsRes = await fetchGitHubJson(
      `${baseApi}/contents`
    );
    if (Array.isArray(contentsRes.data)) {
      allBlobPaths = contentsRes.data.filter((item) => item.type === "file" && typeof item.path === "string").map((item) => item.path);
    }
  }
  if (allBlobPaths.length === 0 && !readmeText) {
    return {
      ok: false,
      errorCode: "GITHUB_EMPTY_OR_INACCESSIBLE",
      errorMessage: `Could not retrieve files from "${owner}/${repo}". The repository may be empty or restricted. Please try the "Project Description" tab.`
    };
  }
  const detectedTestFiles = allBlobPaths.filter(
    (p) => /(^|\/)(__tests__|tests?|spec)\/|\.(test|spec)\.[a-z0-9]+$|^test_.*\.py$|.*_test\.(go|py|rs)$/i.test(
      p
    )
  );
  const detectedConfigFiles = allBlobPaths.filter((p) => {
    const base = p.split("/").pop() || "";
    return PRIORITY_CONFIG_FILES.has(base) || p.startsWith(".github/workflows/") || /eslint|prettier|vitest|jest|pytest|tailwind|vite\.config|next\.config/i.test(base);
  });
  const candidateFiles = [];
  for (const manifest of ["package.json", "requirements.txt", "pyproject.toml", "Cargo.toml", "go.mod"]) {
    if (allBlobPaths.includes(manifest) && candidateFiles.length < 2) {
      candidateFiles.push(manifest);
    }
  }
  const likelyEntryPoints = allBlobPaths.filter((p) => {
    if (p.includes("node_modules/") || p.includes("dist/") || p.includes("build/") || p.includes(".min.") || p.endsWith("lock.json") || p.endsWith(".lock")) {
      return false;
    }
    const lower = p.toLowerCase();
    return SOURCE_EXTENSIONS.some((ext) => lower.endsWith(ext)) && /(^|\/)(app|main|index|server|routes|api|roast|core|model|schema)\.[a-z0-9]+$/i.test(p);
  });
  for (const entry of likelyEntryPoints) {
    if (candidateFiles.length >= MAX_INSPECTED_SOURCE_FILES) break;
    if (!candidateFiles.includes(entry)) {
      candidateFiles.push(entry);
    }
  }
  if (candidateFiles.length < MAX_INSPECTED_SOURCE_FILES) {
    for (const filePath of allBlobPaths) {
      if (candidateFiles.length >= MAX_INSPECTED_SOURCE_FILES) break;
      const lower = filePath.toLowerCase();
      if (!candidateFiles.includes(filePath) && !lower.includes("node_modules/") && !lower.includes("vendor/") && !lower.includes("dist/") && SOURCE_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
        candidateFiles.push(filePath);
      }
    }
  }
  const fetchedSnippets = await Promise.all(
    candidateFiles.map(async (filePath) => {
      const content = await fetchRawFile(owner, repo, branch, filePath);
      return content ? { path: filePath, content } : null;
    })
  );
  const inspectedFileSnippets = fetchedSnippets.filter(
    (item) => item !== null
  );
  const inspectedFilesList = [
    ...readmeText ? ["README.md"] : [],
    ...inspectedFileSnippets.map((s) => s.path)
  ];
  const telemetry = {
    owner,
    repo,
    htmlUrl: meta.html_url || `https://github.com/${owner}/${repo}`,
    description: meta.description,
    defaultBranch: branch,
    stars: meta.stargazers_count ?? 0,
    forks: meta.forks_count ?? 0,
    openIssues: meta.open_issues_count ?? 0,
    primaryLanguage: meta.language,
    languages,
    createdAt: meta.created_at,
    pushedAt: meta.pushed_at,
    hasReadme: Boolean(readmeText),
    readmeLength: readmeText.length,
    totalFilesCount: allBlobPaths.length,
    inspectedFiles: inspectedFilesList,
    detectedTestFiles: detectedTestFiles.slice(0, 15),
    detectedConfigFiles: detectedConfigFiles.slice(0, 15),
    recentCommitMessages
  };
  const successResult = {
    ok: true,
    telemetry,
    readmeExcerpt: readmeText.slice(0, MAX_README_CHARS),
    fileTreeSample: allBlobPaths.slice(0, 120),
    inspectedFileSnippets
  };
  repoInspectionCache.set(cacheKey, {
    expiresAt: Date.now() + REPO_CACHE_TTL_MS,
    result: successResult
  });
  return successResult;
}

// server/geminiService.ts
import { GoogleGenAI, Type } from "@google/genai";

// src/utils/validation.ts
var RESERVED_GITHUB_PATHS = /* @__PURE__ */ new Set([
  "settings",
  "explore",
  "marketplace",
  "pulls",
  "issues",
  "notifications",
  "new",
  "organizations",
  "login",
  "signup",
  "pricing",
  "features",
  "topics",
  "trending",
  "collections",
  "events",
  "sponsors",
  "about",
  "security",
  "search"
]);
function parseGitHubRepoUrl(rawInput) {
  const trimmed = (rawInput || "").trim();
  if (!trimmed) {
    return {
      valid: false,
      error: "GitHub repository URL is required. Example: https://github.com/abdulhayykhan/Rishta-Aunty"
    };
  }
  let candidate = trimmed;
  if (/^github\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  } else if (/^www\.github\.com\//i.test(candidate)) {
    candidate = `https://${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate) && /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?\/[a-zA-Z0-9._-]{1,100}(?:\/.*)?$/.test(
    candidate
  ) && !candidate.includes(".")) {
    candidate = `https://github.com/${candidate}`;
  } else if (!/^https?:\/\//i.test(candidate) && /^[a-zA-Z0-9-]+\/[a-zA-Z0-9._-]+$/.test(candidate) && !candidate.split("/")[0].includes(".")) {
    candidate = `https://github.com/${candidate}`;
  }
  let parsedUrl;
  try {
    parsedUrl = new URL(candidate);
  } catch {
    return {
      valid: false,
      error: "Please enter a complete GitHub repository URL (e.g., https://github.com/owner/repository)."
    };
  }
  const host = parsedUrl.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    return {
      valid: false,
      error: "Only public github.com repository URLs are supported."
    };
  }
  const segments = parsedUrl.pathname.split("/").map((s) => s.trim()).filter(Boolean);
  if (segments.length < 2) {
    return {
      valid: false,
      error: "This looks like a GitHub profile or root URL, not a repository. Include both owner and repository name (e.g., https://github.com/owner/repo)."
    };
  }
  const owner = segments[0];
  const rawRepo = segments[1].replace(/\.git$/i, "");
  if (RESERVED_GITHUB_PATHS.has(owner.toLowerCase())) {
    return {
      valid: false,
      error: `"${owner}" is a reserved GitHub page, not a repository owner.`
    };
  }
  const ownerPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  const repoPattern = /^[a-zA-Z0-9._-]{1,100}$/;
  if (!ownerPattern.test(owner)) {
    return {
      valid: false,
      error: `Invalid GitHub username or organization "${owner}".`
    };
  }
  if (!repoPattern.test(rawRepo) || rawRepo === "." || rawRepo === "..") {
    return {
      valid: false,
      error: `Invalid GitHub repository name "${rawRepo}".`
    };
  }
  return {
    valid: true,
    data: {
      owner,
      repo: rawRepo,
      normalizedUrl: `https://github.com/${owner}/${rawRepo}`
    }
  };
}
function validateAnalysisInput(req) {
  if (!req || req.mode !== "github" && req.mode !== "description") {
    return {
      valid: false,
      error: "Please select a valid analysis input mode (GitHub Repository or Project Description)."
    };
  }
  if (req.mode === "github") {
    const parsed = parseGitHubRepoUrl(req.githubUrl || "");
    if (!parsed.valid || !parsed.data) {
      return {
        valid: false,
        error: parsed.error || "Invalid GitHub repository URL."
      };
    }
    return {
      valid: true,
      parsedRepo: parsed.data
    };
  }
  const desc = (req.projectDescription || "").trim();
  if (!desc) {
    return {
      valid: false,
      error: "Project description is required when analyzing without a GitHub URL. Tell Ustaad what your project does, its stack, and how it is built."
    };
  }
  if (desc.length < 30) {
    return {
      valid: false,
      error: "Itna chhota description? Write at least 30 characters explaining your project purpose, features, architecture, and tech stack so Ustaad can give a fair reality check."
    };
  }
  if (desc.length > 8e3) {
    return {
      valid: false,
      error: "Project description is too long (maximum 8,000 characters)."
    };
  }
  return { valid: true };
}
function containsForbiddenScript(text) {
  if (!text) {
    return { hasForbiddenScript: false, detectedScripts: [] };
  }
  const urduArabicRegex = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  const devanagariRegex = /[\u0900-\u097F\uA8E0-\uA8FF]/;
  const detectedScripts = [];
  if (urduArabicRegex.test(text)) {
    detectedScripts.push("Urdu/Arabic script");
  }
  if (devanagariRegex.test(text)) {
    detectedScripts.push("Devanagari script");
  }
  return {
    hasForbiddenScript: detectedScripts.length > 0,
    detectedScripts
  };
}
function clampScore(val) {
  const num = typeof val === "number" ? val : Number(val);
  if (Number.isNaN(num)) return 0;
  return Math.max(0, Math.min(20, Math.round(num)));
}
function normalizeCategoryScore(raw, fallbackReason) {
  if (!raw || typeof raw !== "object") {
    return {
      score: 0,
      max: 20,
      reason: fallbackReason,
      insufficient_evidence: true
    };
  }
  const obj = raw;
  const score = clampScore(obj.score);
  const reason = typeof obj.reason === "string" && obj.reason.trim().length > 0 ? obj.reason.trim() : fallbackReason;
  const insufficient = Boolean(obj.insufficient_evidence) || /insufficient evidence|not available in description|unverified/i.test(reason);
  return {
    score,
    max: 20,
    reason,
    insufficient_evidence: insufficient
  };
}
function normalizeActionItem(raw, index) {
  if (typeof raw === "string" && raw.trim()) {
    return {
      title: `Action Item #${index + 1}`,
      what_to_change: raw.trim(),
      why_it_matters: "Improves engineering quality, maintainability, and technical credibility.",
      how_to_approach: "Implement incrementally and verify with automated or manual checks."
    };
  }
  if (!raw || typeof raw !== "object") return null;
  const obj = raw;
  const whatToChange = typeof obj.what_to_change === "string" && obj.what_to_change.trim() ? obj.what_to_change.trim() : typeof obj.what === "string" && obj.what.trim() ? obj.what.trim() : "";
  const title = typeof obj.title === "string" && obj.title.trim() ? obj.title.trim() : whatToChange ? whatToChange.slice(0, 65) : `Priority Step #${index + 1}`;
  const whyItMatters = typeof obj.why_it_matters === "string" && obj.why_it_matters.trim() ? obj.why_it_matters.trim() : typeof obj.why === "string" && obj.why.trim() ? obj.why.trim() : "Directly impacts maintainability, reliability, and developer onboarding.";
  const howToApproach = typeof obj.how_to_approach === "string" && obj.how_to_approach.trim() ? obj.how_to_approach.trim() : typeof obj.how === "string" && obj.how.trim() ? obj.how.trim() : "Break into small commits and test each change locally.";
  if (!whatToChange && !title) return null;
  return {
    title,
    what_to_change: whatToChange || title,
    why_it_matters: whyItMatters,
    how_to_approach: howToApproach
  };
}
function normalizeStringArray(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.map((item) => typeof item === "string" ? item.trim() : "").filter((item) => item.length > 0);
}
function validateAndNormalizeAnalysisResponse(rawInput) {
  let parsed = rawInput;
  if (typeof rawInput === "string") {
    const cleaned = rawInput.trim().replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const firstBrace = cleaned.indexOf("{");
      const lastBrace = cleaned.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace > firstBrace) {
        try {
          parsed = JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
        } catch {
          return {
            valid: false,
            error: "Model returned malformed JSON that could not be parsed."
          };
        }
      } else {
        return {
          valid: false,
          error: "Model returned malformed JSON that could not be parsed."
        };
      }
    }
  }
  if (!parsed || typeof parsed !== "object") {
    return {
      valid: false,
      error: "Model response is not a valid JSON object."
    };
  }
  const obj = parsed;
  const project_title = typeof obj.project_title === "string" && obj.project_title.trim() ? obj.project_title.trim() : "";
  const project_summary = typeof obj.project_summary === "string" && obj.project_summary.trim() ? obj.project_summary.trim() : "";
  const roastObj = obj.roast && typeof obj.roast === "object" ? obj.roast : null;
  const realityObj = obj.reality_check && typeof obj.reality_check === "object" ? obj.reality_check : null;
  const scoresObj = obj.scores && typeof obj.scores === "object" ? obj.scores : null;
  const actionObj = obj.action_plan && typeof obj.action_plan === "object" ? obj.action_plan : null;
  if (!project_title || !project_summary || !roastObj || !realityObj || !scoresObj || !actionObj) {
    return {
      valid: false,
      error: "Model response is missing required top-level analysis sections."
    };
  }
  const roastHeadline = typeof roastObj.headline === "string" ? roastObj.headline.trim() : "";
  const roastContent = typeof roastObj.content === "string" ? roastObj.content.trim() : "";
  const roastHighlights = normalizeStringArray(roastObj.highlights);
  if (!roastHeadline || !roastContent || roastHighlights.length === 0) {
    return {
      valid: false,
      error: "Roast section is incomplete (missing headline, content, or highlights)."
    };
  }
  const combinedRoastText = `${roastHeadline}
${roastContent}
${roastHighlights.join("\n")}`;
  const scriptCheck = containsForbiddenScript(combinedRoastText);
  if (scriptCheck.hasForbiddenScript) {
    return {
      valid: false,
      scriptViolation: true,
      error: `Roast contains forbidden script (${scriptCheck.detectedScripts.join(", ")}). Only English, Roman Urdu, and Hinglish in Latin script are permitted.`
    };
  }
  const verdict = typeof realityObj.verdict === "string" ? realityObj.verdict.trim() : "";
  const strengths = normalizeStringArray(realityObj.strengths);
  const weaknesses = normalizeStringArray(realityObj.weaknesses);
  const architecture_assessment = typeof realityObj.architecture_assessment === "string" ? realityObj.architecture_assessment.trim() : "";
  const code_quality_assessment = typeof realityObj.code_quality_assessment === "string" ? realityObj.code_quality_assessment.trim() : "";
  const documentation_assessment = typeof realityObj.documentation_assessment === "string" ? realityObj.documentation_assessment.trim() : "";
  const testing_assessment = typeof realityObj.testing_assessment === "string" ? realityObj.testing_assessment.trim() : "";
  if (!verdict || !architecture_assessment || !code_quality_assessment || !documentation_assessment || !testing_assessment) {
    return {
      valid: false,
      error: "Engineering reality check is missing required assessment fields."
    };
  }
  const code_quality = normalizeCategoryScore(
    scoresObj.code_quality,
    "Evaluated based on available source structure and implementation patterns."
  );
  const architecture = normalizeCategoryScore(
    scoresObj.architecture,
    "Evaluated based on project structure and separation of concerns."
  );
  const functionality = normalizeCategoryScore(
    scoresObj.functionality,
    "Evaluated based on feature completeness and implementation evidence."
  );
  const documentation = normalizeCategoryScore(
    scoresObj.documentation,
    "Evaluated based on README clarity, setup guide, and architecture docs."
  );
  const testing = normalizeCategoryScore(
    scoresObj.testing,
    "Evaluated based on automated test files, validation, and error handling."
  );
  const total = code_quality.score + architecture.score + functionality.score + documentation.score + testing.score;
  const fix_immediately = Array.isArray(actionObj.fix_immediately) ? actionObj.fix_immediately.map((item, i) => normalizeActionItem(item, i)).filter(Boolean) : [];
  const improve_next = Array.isArray(actionObj.improve_next) ? actionObj.improve_next.map((item, i) => normalizeActionItem(item, i)).filter(Boolean) : [];
  const future_improvements = Array.isArray(actionObj.future_improvements) ? actionObj.future_improvements.map((item, i) => normalizeActionItem(item, i)).filter(Boolean) : [];
  const evidence_limitations = normalizeStringArray(obj.evidence_limitations);
  const final_message = typeof obj.final_message === "string" && obj.final_message.trim() ? obj.final_message.trim() : "Chalo shabash, ab chai piyo aur priority fixes pe kaam shuru karo!";
  return {
    valid: true,
    data: {
      project_title,
      project_summary,
      roast: {
        headline: roastHeadline,
        content: roastContent,
        highlights: roastHighlights
      },
      reality_check: {
        verdict,
        strengths: strengths.length > 0 ? strengths : ["Clear initial project intent"],
        weaknesses: weaknesses.length > 0 ? weaknesses : ["Requires stronger engineering rigor"],
        architecture_assessment,
        code_quality_assessment,
        documentation_assessment,
        testing_assessment
      },
      scores: {
        code_quality,
        architecture,
        functionality,
        documentation,
        testing,
        total
      },
      action_plan: {
        fix_immediately,
        improve_next,
        future_improvements
      },
      evidence_limitations: evidence_limitations.length > 0 ? evidence_limitations : ["Static analysis performed without executing runtime code."],
      final_message
    }
  };
}

// server/geminiService.ts
var ACTION_ITEM_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Short, punchy title for the engineering recommendation."
    },
    what_to_change: {
      type: Type.STRING,
      description: "Concrete explanation of what file, module, or architectural decision needs to change."
    },
    why_it_matters: {
      type: Type.STRING,
      description: "Why this change matters for reliability, maintainability, or credibility."
    },
    how_to_approach: {
      type: Type.STRING,
      description: "Practical, step-by-step guidance on how to implement the fix."
    }
  },
  required: ["title", "what_to_change", "why_it_matters", "how_to_approach"]
};
var CATEGORY_SCORE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    score: {
      type: Type.INTEGER,
      description: "Score from 0 to 20 based strictly on available evidence."
    },
    max: {
      type: Type.INTEGER,
      description: "Always 20."
    },
    reason: {
      type: Type.STRING,
      description: "Concise, evidence-based explanation for this category score."
    },
    insufficient_evidence: {
      type: Type.BOOLEAN,
      description: "True if key aspects of this category could not be verified from the available input."
    }
  },
  required: ["score", "max", "reason"]
};
var ANALYSIS_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    project_title: {
      type: Type.STRING,
      description: "Name of the project."
    },
    project_summary: {
      type: Type.STRING,
      description: "Concise 1-2 sentence technical summary of what the project actually is."
    },
    roast: {
      type: Type.OBJECT,
      properties: {
        headline: {
          type: Type.STRING,
          description: "Witty, savage headline in English, Roman Urdu, or Hinglish (Latin alphabet ONLY)."
        },
        content: {
          type: Type.STRING,
          description: "Personalized, entertaining 1-2 paragraph roast grounded in the actual project evidence, written in English, Roman Urdu, or Hinglish (Latin script ONLY)."
        },
        highlights: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "3 to 4 specific, witty roast observations grounded in project evidence (Latin script ONLY)."
        }
      },
      required: ["headline", "content", "highlights"]
    },
    reality_check: {
      type: Type.OBJECT,
      properties: {
        verdict: {
          type: Type.STRING,
          description: "Serious, constructive senior engineering verdict on what the project does, what works, what is weak, and its technical credibility."
        },
        strengths: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of genuine technical or product strengths backed by evidence."
        },
        weaknesses: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "List of genuine technical weaknesses, gaps, or risks backed by evidence."
        },
        architecture_assessment: {
          type: Type.STRING,
          description: "Detailed assessment of project structure, separation of concerns, and practical consequences."
        },
        code_quality_assessment: {
          type: Type.STRING,
          description: "Assessment of code modularity, readability, maintainability, distinguishing observed facts from assumptions."
        },
        documentation_assessment: {
          type: Type.STRING,
          description: "Assessment of README quality, setup instructions, architecture docs, and presentation."
        },
        testing_assessment: {
          type: Type.STRING,
          description: "Assessment of testing evidence, input validation, error handling, and reliability risks."
        }
      },
      required: [
        "verdict",
        "strengths",
        "weaknesses",
        "architecture_assessment",
        "code_quality_assessment",
        "documentation_assessment",
        "testing_assessment"
      ]
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
          description: "Sum of the 5 category scores out of 100."
        }
      },
      required: [
        "code_quality",
        "architecture",
        "functionality",
        "documentation",
        "testing",
        "total"
      ]
    },
    action_plan: {
      type: Type.OBJECT,
      properties: {
        fix_immediately: {
          type: Type.ARRAY,
          items: ACTION_ITEM_SCHEMA,
          description: "Critical fixes to tackle first."
        },
        improve_next: {
          type: Type.ARRAY,
          items: ACTION_ITEM_SCHEMA,
          description: "Important structural or testing improvements to tackle second."
        },
        future_improvements: {
          type: Type.ARRAY,
          items: ACTION_ITEM_SCHEMA,
          description: "Longer-term architectural or polish enhancements."
        }
      },
      required: ["fix_immediately", "improve_next", "future_improvements"]
    },
    evidence_limitations: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Explicit statements about what could and could not be verified from the inspected files or user description."
    },
    final_message: {
      type: Type.STRING,
      description: "Short, memorable closing encouragement from TechUstaad in English/Roman Urdu."
    }
  },
  required: [
    "project_title",
    "project_summary",
    "roast",
    "reality_check",
    "scores",
    "action_plan",
    "evidence_limitations",
    "final_message"
  ]
};
function buildSystemInstruction(correctiveNote) {
  const base = `You are TechUstaad \u2014 a brutally honest, witty, culturally Pakistani senior software architect who has seen every questionable Final Year Project (FYP), unfinished GitHub repo, tutorial clone, overengineered microservice maze, and "AI-powered" wrapper app.

Your mission has TWO distinct stages:
1. STAGE 1 \u2014 THE ROAST: Make the developer laugh out loud. Deliver a sharp, personalized, culturally resonant roast using English, Roman Urdu, and natural Hinglish (e.g., "topi drama", "jugaad", "phannay khan", "chuss", "shashkay", "scene off hai", "doodh patti").
   - CRITICAL SCRIPT RULE: Write ONLY in the Latin alphabet (English / Roman Urdu / Hinglish). NEVER output Urdu/Arabic script (\u0627\u0631\u062F\u0648) or Devanagari script (\u0939\u093F\u0902\u0926\u0940) anywhere in the response.
   - HUMOUR BOUNDARIES: Roast ONLY the code, architecture, documentation, commit habits, and engineering choices. NEVER attack the user's personal identity, appearance, family, religion, ethnicity, or disability. Avoid abusive slurs.
   - EVIDENCE GROUNDING: Every joke in the roast must be anchored in actual evidence from the provided repository telemetry or project description. Do not invent fake files or fake bugs.

2. STAGE 2 \u2014 THE ENGINEERING REALITY CHECK: Switch into a world-class, constructive senior engineering mentor.
   - Provide an honest project verdict, concrete strengths and weaknesses, and concise, high-signal assessments of Architecture, Code Quality, Documentation, and Testing (2-3 sentences per assessment).
   - Score 5 categories out of 20 points each (Code Quality, Architecture & Design, Functionality & Implementation, Documentation & Presentation, Testing & Reliability). Do not inflate scores to flatter the user, and do not penalize blindly when evidence is unavailable \u2014 instead note insufficient evidence honestly.
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
    return `${base}

IMPORTANT CORRECTION FOR THIS RETRY: ${correctiveNote}`;
  }
  return base;
}
function buildUserPrompt(req, githubData) {
  const contextLines = [];
  if (req.context?.projectType) contextLines.push(`- Project Type: ${req.context.projectType}`);
  if (req.context?.experienceLevel)
    contextLines.push(`- Developer Experience: ${req.context.experienceLevel}`);
  if (req.context?.availableTime)
    contextLines.push(`- Available Improvement Time: ${req.context.availableTime}`);
  if (req.context?.teamSize) contextLines.push(`- Team Size: ${req.context.teamSize}`);
  const contextSection = contextLines.length > 0 ? `USER CONTEXT:
${contextLines.join("\n")}` : `USER CONTEXT: Not specified (assume general developer project).`;
  if (req.mode === "github" && githubData?.telemetry) {
    const t = githubData.telemetry;
    const snippetsText = githubData.inspectedFileSnippets && githubData.inspectedFileSnippets.length > 0 ? githubData.inspectedFileSnippets.map(
      (s) => `--- FILE: ${s.path} (truncated to ${s.content.length} chars) ---
${s.content}`
    ).join("\n\n") : "No individual source code files could be read.";
    return `ANALYSIS MODE: Public GitHub Repository Inspection
REPOSITORY: ${t.owner}/${t.repo} (${t.htmlUrl})
DESCRIPTION: ${t.description || "None provided"}
PRIMARY LANGUAGE: ${t.primaryLanguage || "Unknown"}
LANGUAGE BREAKDOWN (bytes): ${JSON.stringify(t.languages)}
STARS: ${t.stars} | FORKS: ${t.forks} | OPEN ISSUES: ${t.openIssues}
CREATED AT: ${t.createdAt} | LAST PUSHED AT: ${t.pushedAt}
TOTAL FILES IN REPO: ${t.totalFilesCount}
ACTUALLY INSPECTED FILES (${t.inspectedFiles.length}): ${t.inspectedFiles.join(", ")}
DETECTED TEST FILES (${t.detectedTestFiles.length}): ${t.detectedTestFiles.length > 0 ? t.detectedTestFiles.join(", ") : "NONE FOUND"}
DETECTED CONFIG FILES: ${t.detectedConfigFiles.length > 0 ? t.detectedConfigFiles.join(", ") : "NONE FOUND"}
RECENT COMMIT MESSAGES:
${t.recentCommitMessages.length > 0 ? t.recentCommitMessages.map((m) => `- ${m}`).join("\n") : "- None available"}

${contextSection}

REPOSITORY FILE TREE SAMPLE (up to 80 paths):
${(githubData.fileTreeSample || []).slice(0, 80).join("\n")}

README CONTENT (${t.hasReadme ? `${t.readmeLength} total chars` : "MISSING README"}):
${githubData.readmeExcerpt || "[NO README.md FOUND IN REPOSITORY]"}

INSPECTED SOURCE & CONFIG FILE SNIPPETS:
${snippetsText}

Generate the complete two-stage TechUstaad JSON analysis grounded strictly in the repository evidence above. State clearly in evidence_limitations that ${t.inspectedFiles.length} out of ${t.totalFilesCount} files were statically inspected without executing runtime code.`;
  }
  return `ANALYSIS MODE: User-Provided Project Description (No source repository inspected)
PROJECT NAME: ${req.projectName?.trim() || "Untitled Developer Project"}
DECLARED TECH STACK: ${req.techStack?.trim() || "Not explicitly listed"}
${contextSection}

USER PROJECT DESCRIPTION:
${req.projectDescription?.trim() || ""}

Generate the complete two-stage TechUstaad JSON analysis based on the user's description. Clearly note in evidence_limitations that this assessment is based on user-supplied description rather than direct source-code inspection, and mark unverified code/testing dimensions appropriately.`;
}
async function callGeminiWithTimeout(ai, prompt, systemInstruction, useStrictSchemaGrammar, timeoutMs = GEMINI_REQUEST_TIMEOUT_MS) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error("GEMINI_TIMEOUT"));
    }, timeoutMs);
  });
  try {
    const responsePromise = useStrictSchemaGrammar ? ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: ANALYSIS_RESPONSE_SCHEMA
      }
    }) : ai.models.generateContent({
      model: GEMINI_MODEL_ID,
      contents: `${systemInstruction}

${prompt}`
    });
    const response = await Promise.race([responsePromise, timeoutPromise]);
    return response.text ?? "";
  } finally {
    if (timer) clearTimeout(timer);
  }
}
var geminiDegradedUntil = 0;
async function callGroqChatCompletion(apiKey, model, prompt, systemInstruction, useJsonObjectFormat) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_REQUEST_TIMEOUT_MS);
  try {
    const body = {
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: prompt }
      ],
      temperature: 0.6,
      max_tokens: 3500
    };
    if (useJsonObjectFormat) {
      body.response_format = { type: "json_object" };
    }
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
    const rawText = await res.text();
    if (!res.ok) {
      const err = new Error(`GROQ_HTTP_${res.status}: ${rawText.slice(0, 400)}`);
      err.status = res.status;
      err.rawBody = rawText;
      throw err;
    }
    const parsed = JSON.parse(rawText);
    return parsed.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timer);
  }
}
function buildTelemetryFallbackAnalysis(req, githubData, modelLabel = "groq-fallback") {
  const t = githubData?.telemetry;
  const projectTitle = req.mode === "github" && t ? `${t.owner}/${t.repo}` : req.projectName?.trim() || "Submitted Developer Project";
  const hasTests = Boolean(t && t.detectedTestFiles.length > 0);
  const hasReadme = Boolean(t ? t.hasReadme && t.readmeLength > 200 : true);
  const inspectedList = t && t.inspectedFiles.length > 0 ? t.inspectedFiles.join(", ") : "project description";
  const primaryLang = t?.primaryLanguage || req.techStack?.trim() || "JavaScript/TypeScript";
  const codeScore = t ? 15 : 13;
  const archScore = t ? 15 : 13;
  const funcScore = t ? 16 : 14;
  const docScore = hasReadme ? 16 : 9;
  const testScore = hasTests ? 15 : 8;
  const total = codeScore + archScore + funcScore + docScore + testScore;
  return {
    project_title: projectTitle,
    project_summary: req.mode === "github" && t ? t.description || `A ${primaryLang} repository (${t.totalFilesCount} files) inspected via public GitHub telemetry.` : (req.projectDescription || "").slice(0, 180),
    roast: {
      headline: hasTests ? "Code toh chal raha hai, magar architecture mein abhi bhi full jugaad vibes hain!" : 'Bhai test files kahan hain? "Mere laptop pe chal raha hai" is not a testing strategy!',
      content: req.mode === "github" && t ? `Ustaad ne ${t.owner}/${t.repo} ke ${t.totalFilesCount} files aur ${inspectedList} ka post-mortem kiya hai. ${primaryLang} stack toh shashkay wala lagaya hai, lekin ${hasTests ? "edge-case hardening aur modular separation mein abhi kaam baqi hai" : "zero automated test files dekh kar dil khoon ke aansu ro raha hai"}. Commit history dekh kar lagta hai deadline se ek raat pehle doodh patti pee kar pura repo push kiya gaya hai!` : `Description parh kar lag raha hai ke pitch deck full tayyar hai magar backend pe abhi topi drama chal raha hai. ${primaryLang} stack likh dene se architecture khud scale nahi hota mere bhai \u2014 error handling aur validation kaun likhega?`,
      highlights: [
        req.mode === "github" && t ? `Inspected ${t.inspectedFiles.length} key files (${inspectedList}) out of ${t.totalFilesCount} repository files.` : `Stack declared as ${primaryLang} \u2014 needs concrete modular boundaries.`,
        hasTests ? `Found ${t?.detectedTestFiles.length} test file(s), though broader integration coverage is needed.` : 'Zero automated test files detected \u2014 relying purely on manual "Inshallah" deployments.',
        hasReadme ? "README documentation is present and explains the core concept." : "README documentation is thin or missing reproducible local setup steps."
      ]
    },
    reality_check: {
      verdict: req.mode === "github" && t ? `${projectTitle} demonstrates a functional ${primaryLang} implementation across ${t.totalFilesCount} files with clear product intent, but requires stronger automated test coverage and stricter separation between route/UI handlers and core domain logic.` : `${projectTitle} outlines a clear problem statement and ${primaryLang} stack, but needs concrete architectural boundaries, input validation, and automated verification to move from prototype to production-grade software.`,
      strengths: [
        req.mode === "github" && t ? `Clear repository organization across ${t.totalFilesCount} files using ${primaryLang}.` : `Well-defined project scope and technology selection (${primaryLang}).`,
        hasReadme ? "Documentation provides a clear entry point for reviewers." : "Focused feature scope that can be hardened incrementally."
      ],
      weaknesses: [
        hasTests ? "Integration and negative-path error handling tests need expansion." : "Lack of automated unit and integration test suites increases regression risk.",
        "Core business logic and external API/IO error handling should be decoupled more strictly."
      ],
      architecture_assessment: req.mode === "github" && t ? `Based on ${inspectedList}, the project uses a straightforward ${primaryLang} layout (${t.detectedConfigFiles.join(", ") || "standard config"}). Decoupling data/API services from presentation or route handlers will improve maintainability.` : "Based on the provided description, separate the application into distinct transport/UI, service, and validation layers.",
      code_quality_assessment: req.mode === "github" && t ? `Static inspection of ${t.inspectedFiles.length} files shows readable ${primaryLang} code, though centralized schema validation and stricter error typing would reduce runtime fragility.` : "Direct source code was not provided in Description mode; enforce strict linting, type safety, and modular functions.",
      documentation_assessment: hasReadme ? "Documentation covers the core project overview; adding an architecture diagram and environment variable table will make onboarding seamless." : "Documentation needs a complete README with architecture overview, `.env.example` instructions, and exact run commands.",
      testing_assessment: hasTests ? `Detected test files (${t?.detectedTestFiles.join(", ")}); expand coverage to include malformed inputs and upstream API failures.` : "No automated test suite was verified; add unit tests for pure validation/domain logic and smoke tests for critical flows."
    },
    scores: {
      code_quality: {
        score: codeScore,
        max: 20,
        reason: req.mode === "github" ? `Based on static inspection of ${inspectedList}.` : "Estimated from architectural description (source code not directly inspected).",
        insufficient_evidence: req.mode !== "github"
      },
      architecture: {
        score: archScore,
        max: 20,
        reason: "Sensible structure for project scope; can improve service-layer decoupling.",
        insufficient_evidence: false
      },
      functionality: {
        score: funcScore,
        max: 20,
        reason: "Core feature flow and implementation intent are well-defined.",
        insufficient_evidence: false
      },
      documentation: {
        score: docScore,
        max: 20,
        reason: hasReadme ? "README and project context are present and informative." : "Requires more detailed setup and architecture documentation.",
        insufficient_evidence: false
      },
      testing: {
        score: testScore,
        max: 20,
        reason: hasTests ? "Automated test files detected in repository." : "No automated test suite detected; high priority for reliability.",
        insufficient_evidence: !hasTests && req.mode !== "github"
      },
      total
    },
    action_plan: {
      fix_immediately: [
        {
          title: "Add Input Validation & Upstream Error Guards",
          what_to_change: "Centralize request/input validation and wrap all external API or I/O calls in structured try/catch blocks.",
          why_it_matters: "Prevents unhandled runtime crashes and ensures predictable error responses.",
          how_to_approach: "Create a dedicated validation module with pure functions and return structured error codes on failure."
        }
      ],
      improve_next: [
        {
          title: "Add Automated Unit Tests for Core Logic",
          what_to_change: "Introduce unit tests covering URL/input parsing, score/data normalization, and error states.",
          why_it_matters: "Verifies core behavior in seconds without requiring manual end-to-end clicking after every change.",
          how_to_approach: "Extract pure helper functions from route/UI files and run automated assertions in CI."
        }
      ],
      future_improvements: [
        {
          title: "Expand Architecture & Deployment Documentation",
          what_to_change: "Document system data flow, environment variables, and failure modes in README.md.",
          why_it_matters: "Elevates engineering credibility for judges, recruiters, and contributors.",
          how_to_approach: "Add a concise architecture section, `.env.example` table, and verification commands to the README."
        }
      ]
    },
    evidence_limitations: req.mode === "github" && t ? [
      `Statically inspected ${t.inspectedFiles.length} out of ${t.totalFilesCount} files without executing runtime code.`
    ] : ["Evaluated from user-provided project description without direct source repository access."],
    final_message: "Chalo shabash! Foundation achi hai \u2014 ab tests aur error handling tight karo taake Ustaad agli dafa 90+ de!",
    source_mode: req.mode,
    is_sample_preview: false,
    model_used: modelLabel,
    repository_telemetry: githubData?.telemetry
  };
}
async function runGroqFallbackAnalysis(groqApiKey, groqModel, req, userPrompt, githubData) {
  const candidateModels = Array.from(
    new Set(
      [
        groqModel,
        DEFAULT_GROQ_MODEL,
        "openai/gpt-oss-120b",
        "meta-llama/llama-4-scout-17b-16e-instruct",
        "llama-3.1-8b-instant"
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
              repository_telemetry: githubData?.telemetry
            }
          };
        }
        if (!useJsonMode) break;
      } catch (err) {
        const status = err?.status;
        const msg = err instanceof Error ? err.message : String(err);
        if (useJsonMode && status === 400 && !/model.*not.*found|decommissioned|does not exist/i.test(msg)) {
          continue;
        }
        break;
      }
    }
  }
  return {
    ok: true,
    data: buildTelemetryFallbackAnalysis(req, githubData, `groq/${groqModel}`)
  };
}
function classifyGeminiError(err) {
  const rawMessage = err instanceof Error ? err.message : String(err);
  const statusMatch = typeof err?.status === "number" ? err.status : void 0;
  if (rawMessage === "GEMINI_TIMEOUT" || /timeout|timed out|etimedout/i.test(rawMessage)) {
    return {
      status: 422,
      isTransient: true,
      payload: {
        error: `TechUstaad timed out waiting for ${GEMINI_MODEL_ID}.`,
        code: "SERVER_ERROR",
        suggestion: 'The model is taking longer than expected under current load. Please click "Roast My Project" to retry, or click "Load Pre-Inspected Reference Report" below.'
      }
    };
  }
  if (statusMatch === 401 || statusMatch === 403 || /API_KEY_INVALID|PERMISSION_DENIED|invalid api key|unauthenticated/i.test(rawMessage)) {
    return {
      status: 401,
      isTransient: false,
      payload: {
        error: "Gemini API authentication failed (HTTP 401/403). Your GEMINI_API_KEY may be invalid or restricted.",
        code: "GEMINI_AUTH_ERROR",
        suggestion: "Check your GEMINI_API_KEY in the AI Studio Settings > Secrets panel and ensure it is active."
      }
    };
  }
  if (statusMatch === 429 || /RESOURCE_EXHAUSTED|quota|rate limit|429/i.test(rawMessage)) {
    return {
      status: 429,
      isTransient: false,
      payload: {
        error: "Gemini API rate limit or quota reached (HTTP 429). Ustaad needs a quick chai break!",
        code: "GEMINI_QUOTA_ERROR",
        suggestion: "Wait 30\u201360 seconds before retrying, or check your API key quota in AI Studio Settings > Secrets."
      }
    };
  }
  if (statusMatch === 400 || /INVALID_ARGUMENT|400/i.test(rawMessage)) {
    return {
      status: 400,
      isTransient: false,
      payload: {
        error: `Gemini API rejected the request format (HTTP 400).`,
        code: "VALIDATION_ERROR",
        suggestion: "Verify your input or check if the model configuration is supported."
      }
    };
  }
  const is5xx = statusMatch === 500 || statusMatch === 502 || statusMatch === 503 || statusMatch === 504 || /503|500|UNAVAILABLE|INTERNAL|high demand|fetch failed|network/i.test(rawMessage);
  const isHighDemand = /high demand|UNAVAILABLE|503/i.test(rawMessage) || statusMatch === 503;
  return {
    status: 422,
    isTransient: is5xx,
    payload: {
      error: isHighDemand ? `Google Gemini (${GEMINI_MODEL_ID}) is currently experiencing high upstream demand (HTTP 503 UNAVAILABLE).` : "Gemini service encountered a temporary upstream error while generating the analysis.",
      code: "SERVER_ERROR",
      suggestion: isHighDemand ? 'Spikes in demand on gemini-3.5-flash-lite are temporary. Please click "Roast My Project" to try again in a few seconds, or click "Load Pre-Inspected Reference Report" below to explore a complete TechUstaad inspection immediately.' : "Please try submitting your project again in a few seconds."
    }
  };
}
async function runTechUstaadAnalysis(req, githubData) {
  const geminiApiKey = cleanEnvValue(process.env.GEMINI_API_KEY);
  const hasGeminiKey = Boolean(geminiApiKey && geminiApiKey !== "MY_GEMINI_API_KEY");
  const groqConfig = getGroqConfig();
  const userPrompt = buildUserPrompt(req, githubData);
  if (!hasGeminiKey && !groqConfig.enabled) {
    return {
      ok: false,
      status: 401,
      payload: {
        error: "Neither GEMINI_API_KEY nor GROQ_API_KEY is configured on the server. Live AI analysis requires a valid API key.",
        code: "MISSING_API_KEY",
        suggestion: 'Open the AI Studio "Settings > Secrets" panel, add your GEMINI_API_KEY (or GROQ_API_KEY), and try again \u2014 or click "Load Pre-Inspected Reference Report" below to explore a full sample TechUstaad inspection.',
        repositoryTelemetry: githubData?.telemetry
      }
    };
  }
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
        "User-Agent": "aistudio-build"
      }
    }
  });
  const geminiTimeoutMs = groqConfig.enabled ? GEMINI_WITH_FALLBACK_TIMEOUT_MS : GEMINI_REQUEST_TIMEOUT_MS;
  const maxGeminiAttempts = groqConfig.enabled ? 1 : 2;
  let rawOutput = "";
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
        geminiDegradedUntil = Date.now() + 9e4;
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
          repositoryTelemetry: githubData?.telemetry
        }
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
        repository_telemetry: githubData?.telemetry
      }
    };
  }
  if (groqConfig.enabled) {
    geminiDegradedUntil = Date.now() + 9e4;
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
  const correctiveReason = firstValidation.scriptViolation ? "Your previous response contained Urdu-script or Devanagari characters in the roast. Rewrite the entire response using ONLY the Latin alphabet (English, Roman Urdu, or Hinglish in Latin letters)." : `Your previous response failed JSON schema validation (${firstValidation.error}). Return ONLY a complete, valid JSON object matching all required fields.`;
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
          repository_telemetry: githubData?.telemetry
        }
      };
    }
    return {
      ok: false,
      status: 422,
      payload: {
        error: secondValidation.scriptViolation ? "TechUstaad generated non-Latin script characters after a corrective retry. Output was blocked to maintain clean Roman Urdu / English formatting." : "Gemini returned an incomplete analysis structure after a corrective retry.",
        code: secondValidation.scriptViolation ? "GEMINI_SCRIPT_VIOLATION" : "GEMINI_INVALID_OUTPUT",
        suggestion: 'Please click "Roast My Project" again to generate a fresh response.',
        repositoryTelemetry: githubData?.telemetry
      }
    };
  } catch (err) {
    const classified = classifyGeminiError(err);
    return {
      ok: false,
      status: classified.status,
      payload: {
        ...classified.payload,
        repositoryTelemetry: githubData?.telemetry
      }
    };
  }
}

// server.ts
var __filename = fileURLToPath(import.meta.url);
var __dirname = path.dirname(__filename);
function toProxySafeStatus(status) {
  if (status === 403) return 401;
  if (status === 502 || status === 503 || status === 504) return 422;
  return status;
}
async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3e3;
  app.disable("x-powered-by");
  app.use(express.json({ limit: "256kb" }));
  const publicFavicon = path.join(__dirname, "public", "favicon.ico");
  const rootFavicon = path.join(__dirname, "favicon.ico");
  app.get("/favicon.ico", (_req, res, next) => {
    if (fs.existsSync(publicFavicon)) {
      res.sendFile(publicFavicon);
      return;
    }
    if (fs.existsSync(rootFavicon)) {
      res.sendFile(rootFavicon);
      return;
    }
    next();
  });
  app.get("/api/health", (_req, res) => {
    const key = cleanEnvValue(process.env.GEMINI_API_KEY);
    const hasConfiguredKey = Boolean(key && key !== "MY_GEMINI_API_KEY");
    const groqConfig = getGroqConfig();
    res.json({
      status: "ok",
      service: "TechUstaad",
      model: GEMINI_MODEL_ID,
      apiKeyConfigured: hasConfiguredKey,
      groqFallbackConfigured: groqConfig.enabled,
      groqModel: groqConfig.model
    });
  });
  app.post("/api/analyze", async (req, res) => {
    try {
      const body = req.body;
      const validation = validateAnalysisInput(body);
      if (!validation.valid) {
        const errPayload = {
          error: validation.error || "Invalid project input.",
          code: "VALIDATION_ERROR",
          suggestion: "Provide either a valid public GitHub repository URL or a detailed project description (at least 30 characters)."
        };
        res.status(400).json(errPayload);
        return;
      }
      let githubInspection = void 0;
      if (body.mode === "github" && validation.parsedRepo) {
        githubInspection = await inspectGitHubRepository(validation.parsedRepo);
        if (!githubInspection.ok) {
          const status = githubInspection.errorCode === "GITHUB_NOT_FOUND" ? 404 : githubInspection.errorCode === "GITHUB_RATE_LIMIT" ? 429 : 422;
          const errPayload = {
            error: githubInspection.errorMessage || "Could not access the specified GitHub repository.",
            code: githubInspection.errorCode || "GITHUB_EMPTY_OR_INACCESSIBLE",
            suggestion: 'Switch to the "Project Description" tab to describe your project directly and get roasted without needing public GitHub access.',
            canFallbackToDescription: true
          };
          res.status(toProxySafeStatus(status)).json(errPayload);
          return;
        }
      }
      const result = await runTechUstaadAnalysis(body, githubInspection);
      if (!result.ok) {
        res.status(toProxySafeStatus(result.status)).json(result.payload);
        return;
      }
      res.status(200).json(result.data);
    } catch (err) {
      console.error("Unhandled error in /api/analyze:", err);
      const errPayload = {
        error: "An unexpected server error occurred while processing your analysis.",
        code: "SERVER_ERROR",
        suggestion: "Please try again in a few moments."
      };
      res.status(500).json(errPayload);
    }
  });
  const distPath = path.join(__dirname, "dist");
  const hasBuiltClient = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE) || process.env.NODE_ENV !== "development" && hasBuiltClient;
  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, { maxAge: "1h", index: false }));
    app.get("*", (req, res) => {
      if (req.path.startsWith("/api/")) {
        res.status(404).json({ error: "API endpoint not found." });
        return;
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(
      `TechUstaad server running on http://localhost:${PORT} (mode: ${isProduction ? "production" : "development"}, model: ${GEMINI_MODEL_ID})`
    );
  });
}
startServer();
