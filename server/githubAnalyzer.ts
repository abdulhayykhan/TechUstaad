import fs from 'fs';
import {
  GITHUB_REQUEST_TIMEOUT_MS,
  MAX_FILE_CONTENT_CHARS,
  MAX_INSPECTED_SOURCE_FILES,
  MAX_README_CHARS,
} from './config.ts';
import type { ParsedGitHubRepo, RepositoryTelemetry } from '../src/types/analysis.ts';

export interface GitHubInspectionResult {
  ok: boolean;
  telemetry?: RepositoryTelemetry;
  readmeExcerpt?: string;
  fileTreeSample?: string[];
  inspectedFileSnippets?: Array<{ path: string; content: string }>;
  errorCode?:
    | 'GITHUB_NOT_FOUND'
    | 'GITHUB_RATE_LIMIT'
    | 'GITHUB_EMPTY_OR_INACCESSIBLE';
  errorMessage?: string;
}

const PRIORITY_CONFIG_FILES = new Set([
  'package.json',
  'tsconfig.json',
  'requirements.txt',
  'pyproject.toml',
  'Cargo.toml',
  'go.mod',
  'pom.xml',
  'build.gradle',
  'Dockerfile',
  'docker-compose.yml',
  'vercel.json',
  '.env.example',
]);

const SOURCE_EXTENSIONS = [
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.py',
  '.go',
  '.rs',
  '.java',
  '.kt',
  '.cpp',
  '.c',
  '.cs',
  '.rb',
  '.php',
  '.vue',
  '.svelte',
];

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript',
  '.js': 'JavaScript',
  '.jsx': 'JavaScript',
  '.py': 'Python',
  '.go': 'Go',
  '.rs': 'Rust',
  '.java': 'Java',
  '.kt': 'Kotlin',
  '.cpp': 'C++',
  '.c': 'C',
  '.cs': 'C#',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.html': 'HTML',
  '.css': 'CSS',
};

async function fetchGitHubJson<T>(url: string): Promise<{
  status: number;
  data?: T;
  rateLimited?: boolean;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {
      Accept: 'application/vnd.github.v3+json',
      'User-Agent': 'TechUstaad-Analyzer/1.0',
    };
    if (process.env.GITHUB_TOKEN) {
      headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    }

    const res = await fetch(url, {
      headers,
      signal: controller.signal,
    });

    if (res.status === 403 || res.status === 429) {
      const remaining = res.headers.get('x-ratelimit-remaining');
      if (remaining === '0' || res.status === 429 || res.status === 403) {
        return { status: res.status, rateLimited: true };
      }
    }

    if (!res.ok) {
      return { status: res.status };
    }

    const data = (await res.json()) as T;
    return { status: res.status, data };
  } catch {
    return { status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

async function fetchRawFile(
  owner: string,
  repo: string,
  branch: string,
  filePath: string,
  maxChars: number = MAX_FILE_CONTENT_CHARS
): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);
  try {
    const encodedPath = filePath
      .split('/')
      .map((seg) => encodeURIComponent(seg))
      .join('/');
    const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(branch)}/${encodedPath}`;
    const res = await fetch(rawUrl, {
      headers: { 'User-Agent': 'TechUstaad-Analyzer/1.0' },
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text.slice(0, maxChars);
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

const CACHE_FILE_PATH = '/tmp/techustaad-github-cache.json';
const REPO_CACHE_TTL_MS = 30 * 60 * 1000;
const repoInspectionCache = new Map<
  string,
  { expiresAt: number; result: GitHubInspectionResult }
>();

function loadDiskCache(): void {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) return;
    const raw = JSON.parse(fs.readFileSync(CACHE_FILE_PATH, 'utf8')) as Record<
      string,
      { expiresAt: number; result: GitHubInspectionResult }
    >;
    const now = Date.now();
    for (const [k, v] of Object.entries(raw)) {
      if (v && v.expiresAt > now && v.result?.ok) {
        repoInspectionCache.set(k, v);
      }
    }
  } catch {
    // Ignore corrupt cache file
  }
}

function saveDiskCache(): void {
  try {
    const obj: Record<string, { expiresAt: number; result: GitHubInspectionResult }> = {};
    const now = Date.now();
    for (const [k, v] of repoInspectionCache.entries()) {
      if (v.expiresAt > now && v.result.ok) {
        obj[k] = v;
      }
    }
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(obj), 'utf8');
  } catch {
    // Ignore disk cache write errors
  }
}

loadDiskCache();

async function fetchGitHubEmbeddedPayload(url: string): Promise<{
  status: number;
  payload?: Record<string, unknown>;
}> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GITHUB_REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; TechUstaad/1.0)',
        Accept: 'text/html',
      },
      signal: controller.signal,
    });
    if (!res.ok) {
      return { status: res.status };
    }
    const html = await res.text();
    const matches = [
      ...html.matchAll(
        /<script type="application\/json" data-target="react-app\.embeddedData">([\s\S]*?)<\/script>/g
      ),
    ];
    for (const m of matches) {
      try {
        const parsed = JSON.parse(m[1]) as { payload?: Record<string, unknown> };
        if (parsed?.payload) {
          return { status: res.status, payload: parsed.payload };
        }
      } catch {
        // continue
      }
    }
    return { status: res.status };
  } catch {
    return { status: 0 };
  } finally {
    clearTimeout(timer);
  }
}

function inferLanguagesFromPaths(paths: string[]): {
  primaryLanguage: string | null;
  languages: Record<string, number>;
} {
  const counts: Record<string, number> = {};
  for (const p of paths) {
    const lower = p.toLowerCase();
    for (const [ext, lang] of Object.entries(EXTENSION_LANGUAGE_MAP)) {
      if (lower.endsWith(ext)) {
        counts[lang] = (counts[lang] || 0) + 1200;
        break;
      }
    }
  }
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  return {
    primaryLanguage: sorted[0]?.[0] || null,
    languages: counts,
  };
}

/**
 * Fallback inspector when api.github.com hits its 60 req/hr unauthenticated IP rate limit.
 * Uses github.com web route metadata + raw.githubusercontent.com (which is not subject to the 60/hr REST limit).
 */
async function inspectGitHubViaWebFallback(
  owner: string,
  repo: string
): Promise<{
  ok: boolean;
  errorCode?: GitHubInspectionResult['errorCode'];
  errorMessage?: string;
  branch?: string;
  description?: string | null;
  stars?: number;
  forks?: number;
  allBlobPaths?: string[];
  readmeText?: string;
  languages?: Record<string, number>;
  primaryLanguage?: string | null;
}> {
  const repoUrl = `https://github.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;
  const webRes = await fetchGitHubEmbeddedPayload(repoUrl);

  if (webRes.status === 404) {
    return {
      ok: false,
      errorCode: 'GITHUB_NOT_FOUND',
      errorMessage: `Repository "${owner}/${repo}" could not be found or is private. Make sure the repository is public, or use the "Project Description" tab instead.`,
    };
  }

  const payload = webRes.payload as
    | {
        sidebarAbout?: {
          description?: string | null;
          stargazerCount?: number;
          forksCount?: number;
        };
        codeViewRepoRoute?: {
          refInfo?: { name?: string };
          tree?: {
            items?: Array<{ name?: string; path?: string; contentType?: string }>;
          };
        };
      }
    | undefined;

  const branch = payload?.codeViewRepoRoute?.refInfo?.name || 'main';
  const description = payload?.sidebarAbout?.description || null;
  const stars = payload?.sidebarAbout?.stargazerCount ?? 0;
  const forks = payload?.sidebarAbout?.forksCount ?? 0;

  const rootItems = payload?.codeViewRepoRoute?.tree?.items || [];
  const blobPaths: string[] = [];
  const subdirPaths: string[] = [];

  for (const item of rootItems) {
    if (!item?.path) continue;
    if (item.contentType === 'directory') {
      subdirPaths.push(item.path);
    } else {
      blobPaths.push(item.path);
    }
  }

  // Inspect up to 4 common subdirectories in parallel for deeper file tree visibility
  const priorityDirs = subdirPaths
    .filter((d) =>
      /^(src|api|server|app|lib|components|pages|routes|utils|tests?|__tests__|docs)$/i.test(d)
    )
    .slice(0, 4);

  if (priorityDirs.length > 0) {
    const subResults = await Promise.all(
      priorityDirs.map((dir) =>
        fetchGitHubEmbeddedPayload(
          `${repoUrl}/tree/${encodeURIComponent(branch)}/${encodeURIComponent(dir)}`
        )
      )
    );
    for (const sub of subResults) {
      const subPayload = sub.payload as
        | {
            tree?: { items?: Array<{ path?: string; contentType?: string }> };
            codeViewTreeRoute?: {
              tree?: { items?: Array<{ path?: string; contentType?: string }> };
            };
          }
        | undefined;
      const items =
        subPayload?.tree?.items || subPayload?.codeViewTreeRoute?.tree?.items || [];
      for (const item of items) {
        if (item?.path && item.contentType !== 'directory') {
          blobPaths.push(item.path);
        }
      }
    }
  }

  const readmeFile =
    blobPaths.find((p) => /^readme(\.md|\.txt)?$/i.test(p)) || 'README.md';
  const readmeText =
    (await fetchRawFile(owner, repo, branch, readmeFile, MAX_README_CHARS)) || '';

  if (blobPaths.length === 0 && !readmeText) {
    return {
      ok: false,
      errorCode: 'GITHUB_EMPTY_OR_INACCESSIBLE',
      errorMessage: `Repository "${owner}/${repo}" appears to be empty or inaccessible. Switch to the "Project Description" tab to describe your project directly!`,
    };
  }

  const inferred = inferLanguagesFromPaths(blobPaths);

  return {
    ok: true,
    branch,
    description,
    stars,
    forks,
    allBlobPaths: blobPaths,
    readmeText,
    languages: inferred.languages,
    primaryLanguage: inferred.primaryLanguage,
  };
}

export async function inspectGitHubRepository(
  parsed: ParsedGitHubRepo
): Promise<GitHubInspectionResult> {
  const { owner, repo } = parsed;
  const cacheKey = `${owner.toLowerCase()}/${repo.toLowerCase()}`;
  const cached = repoInspectionCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.result;
  }

  const baseApi = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`;

  const repoRes = await fetchGitHubJson<{
    name: string;
    full_name: string;
    html_url: string;
    description: string | null;
    private: boolean;
    fork: boolean;
    default_branch: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    language: string | null;
    created_at: string;
    pushed_at: string;
    size: number;
  }>(baseApi);

  let branch = 'main';
  let description: string | null = null;
  let stars = 0;
  let forks = 0;
  let openIssues = 0;
  let primaryLanguage: string | null = null;
  let languages: Record<string, number> = {};
  let createdAt: string = new Date().toISOString();
  let pushedAt: string = new Date().toISOString();
  let recentCommitMessages: string[] = [];
  let readmeText = '';
  let allBlobPaths: string[] = [];

  if (repoRes.rateLimited || repoRes.status === 0) {
    const webFallback = await inspectGitHubViaWebFallback(owner, repo);
    if (!webFallback.ok) {
      return {
        ok: false,
        errorCode: webFallback.errorCode || 'GITHUB_RATE_LIMIT',
        errorMessage:
          webFallback.errorMessage ||
          'GitHub public API rate limit reached right now. Switch to the "Project Description" tab to get your project roasted immediately!',
      };
    }
    branch = webFallback.branch || 'main';
    description = webFallback.description ?? null;
    stars = webFallback.stars ?? 0;
    forks = webFallback.forks ?? 0;
    allBlobPaths = webFallback.allBlobPaths || [];
    readmeText = webFallback.readmeText || '';
    languages = webFallback.languages || {};
    primaryLanguage = webFallback.primaryLanguage ?? null;
  } else {
    if (repoRes.status === 404 || !repoRes.data) {
      return {
        ok: false,
        errorCode: 'GITHUB_NOT_FOUND',
        errorMessage: `Repository "${owner}/${repo}" could not be found or is private. Make sure the repository is public, or use the "Project Description" tab instead.`,
      };
    }

    const meta = repoRes.data;
    if (meta.size === 0) {
      return {
        ok: false,
        errorCode: 'GITHUB_EMPTY_OR_INACCESSIBLE',
        errorMessage: `Repository "${owner}/${repo}" appears to be completely empty (0 KB). Push some code first or use the "Project Description" tab!`,
      };
    }

    branch = meta.default_branch || 'main';
    description = meta.description;
    stars = meta.stargazers_count ?? 0;
    forks = meta.forks_count ?? 0;
    openIssues = meta.open_issues_count ?? 0;
    primaryLanguage = meta.language;
    createdAt = meta.created_at;
    pushedAt = meta.pushed_at;

    // Fetch languages, commits, and git tree in parallel; fetch README via raw.githubusercontent.com to conserve REST API quota
    const [langRes, commitsRes, rawReadme, treeRes] = await Promise.all([
      fetchGitHubJson<Record<string, number>>(`${baseApi}/languages`),
      fetchGitHubJson<
        Array<{
          commit?: { message?: string; author?: { date?: string } };
        }>
      >(`${baseApi}/commits?per_page=10`),
      fetchRawFile(owner, repo, branch, 'README.md', MAX_README_CHARS),
      fetchGitHubJson<{
        tree?: Array<{ path?: string; type?: string; size?: number }>;
        truncated?: boolean;
      }>(`${baseApi}/git/trees/${encodeURIComponent(branch)}?recursive=1`),
    ]);

    languages = langRes.data || {};
    recentCommitMessages = Array.isArray(commitsRes.data)
      ? commitsRes.data
          .map((c) => (c.commit?.message || '').split('\n')[0].trim())
          .filter(Boolean)
          .slice(0, 8)
      : [];

    readmeText = rawReadme || '';

    allBlobPaths = Array.isArray(treeRes.data?.tree)
      ? treeRes.data!.tree!
          .filter((item) => item.type === 'blob' && typeof item.path === 'string')
          .map((item) => item.path!)
      : [];

    // If tree call was rate-limited mid-flight, fallback to web tree extraction
    if (allBlobPaths.length === 0) {
      const webFallback = await inspectGitHubViaWebFallback(owner, repo);
      if (webFallback.ok && webFallback.allBlobPaths) {
        allBlobPaths = webFallback.allBlobPaths;
        if (!readmeText && webFallback.readmeText) {
          readmeText = webFallback.readmeText;
        }
      }
    }
  }

  if (allBlobPaths.length === 0 && !readmeText) {
    return {
      ok: false,
      errorCode: 'GITHUB_EMPTY_OR_INACCESSIBLE',
      errorMessage: `Could not retrieve files from "${owner}/${repo}". The repository may be empty or restricted. Please try the "Project Description" tab.`,
    };
  }

  const detectedTestFiles = allBlobPaths.filter((p) =>
    /(^|\/)(__tests__|tests?|spec)\/|\.(test|spec)\.[a-z0-9]+$|^test_.*\.py$|.*_test\.(go|py|rs)$/i.test(
      p
    )
  );

  const detectedConfigFiles = allBlobPaths.filter((p) => {
    const base = p.split('/').pop() || '';
    return (
      PRIORITY_CONFIG_FILES.has(base) ||
      p.startsWith('.github/workflows/') ||
      /eslint|prettier|vitest|jest|pytest|tailwind|vite\.config|next\.config/i.test(base)
    );
  });

  // Select up to MAX_INSPECTED_SOURCE_FILES representative files to inspect
  const candidateFiles: string[] = [];

  // 1. Primary manifest file (package.json, requirements.txt, pyproject.toml, etc.)
  for (const manifest of ['package.json', 'requirements.txt', 'pyproject.toml', 'Cargo.toml', 'go.mod']) {
    if (allBlobPaths.includes(manifest) && candidateFiles.length < 2) {
      candidateFiles.push(manifest);
    }
  }

  // 2. Entry point & main source files
  const likelyEntryPoints = allBlobPaths.filter((p) => {
    if (
      p.includes('node_modules/') ||
      p.includes('dist/') ||
      p.includes('build/') ||
      p.includes('.min.') ||
      p.endsWith('lock.json') ||
      p.endsWith('.lock')
    ) {
      return false;
    }
    const lower = p.toLowerCase();
    return (
      SOURCE_EXTENSIONS.some((ext) => lower.endsWith(ext)) &&
      /(^|\/)(app|main|index|server|routes|api|roast|core|model|schema)\.[a-z0-9]+$/i.test(p)
    );
  });

  for (const entry of likelyEntryPoints) {
    if (candidateFiles.length >= MAX_INSPECTED_SOURCE_FILES) break;
    if (!candidateFiles.includes(entry)) {
      candidateFiles.push(entry);
    }
  }

  // 3. Fill remaining slots with other non-vendor source files
  if (candidateFiles.length < MAX_INSPECTED_SOURCE_FILES) {
    for (const filePath of allBlobPaths) {
      if (candidateFiles.length >= MAX_INSPECTED_SOURCE_FILES) break;
      const lower = filePath.toLowerCase();
      if (
        !candidateFiles.includes(filePath) &&
        !lower.includes('node_modules/') &&
        !lower.includes('vendor/') &&
        !lower.includes('dist/') &&
        SOURCE_EXTENSIONS.some((ext) => lower.endsWith(ext))
      ) {
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
    (item): item is { path: string; content: string } => item !== null
  );

  const inspectedFilesList = [
    ...(readmeText ? ['README.md'] : []),
    ...inspectedFileSnippets.map((s) => s.path),
  ];

  const telemetry: RepositoryTelemetry = {
    owner,
    repo,
    htmlUrl: `https://github.com/${owner}/${repo}`,
    description,
    defaultBranch: branch,
    stars,
    forks,
    openIssues,
    primaryLanguage,
    languages,
    createdAt,
    pushedAt,
    hasReadme: Boolean(readmeText),
    readmeLength: readmeText.length,
    totalFilesCount: allBlobPaths.length,
    inspectedFiles: inspectedFilesList,
    detectedTestFiles: detectedTestFiles.slice(0, 15),
    detectedConfigFiles: detectedConfigFiles.slice(0, 15),
    recentCommitMessages,
  };

  const successResult: GitHubInspectionResult = {
    ok: true,
    telemetry,
    readmeExcerpt: readmeText.slice(0, MAX_README_CHARS),
    fileTreeSample: allBlobPaths.slice(0, 120),
    inspectedFileSnippets,
  };

  repoInspectionCache.set(cacheKey, {
    expiresAt: Date.now() + REPO_CACHE_TTL_MS,
    result: successResult,
  });
  saveDiskCache();

  return successResult;
}
