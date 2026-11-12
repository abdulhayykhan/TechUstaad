import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cleanEnvValue, GEMINI_MODEL_ID, getGroqConfig } from './server/config.ts';
import { inspectGitHubRepository } from './server/githubAnalyzer.ts';
import { runTechUstaadAnalysis } from './server/geminiService.ts';
import { validateAnalysisInput } from './src/utils/validation.ts';
import type { AnalysisRequest, ApiErrorPayload } from './src/types/analysis.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Ensures we never send 403, 502, 503, or 504 to the container's Nginx reverse proxy,
 * because /etc/nginx/nginx.conf intercepts those exact status codes (`error_page 403 = /forbidden.html; error_page 502 503 504 = /warmup.html;`)
 * and replaces the JSON body with a 200 OK HTML page.
 */
function toProxySafeStatus(status: number): number {
  if (status === 403) return 401;
  if (status === 502 || status === 503 || status === 504) return 422;
  return status;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.disable('x-powered-by');
  app.use(express.json({ limit: '256kb' }));

  // Serve root favicon.ico directly if requested
  const publicFavicon = path.join(__dirname, 'public', 'favicon.ico');
  const rootFavicon = path.join(__dirname, 'favicon.ico');
  app.get('/favicon.ico', (_req, res, next) => {
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

  // Health & configuration status endpoint (never exposes any secret value)
  app.get('/api/health', (_req, res) => {
    const key = cleanEnvValue(process.env.GEMINI_API_KEY);
    const hasConfiguredKey = Boolean(key && key !== 'MY_GEMINI_API_KEY');
    const groqConfig = getGroqConfig();
    res.json({
      status: 'ok',
      service: 'TechUstaad',
      model: GEMINI_MODEL_ID,
      apiKeyConfigured: hasConfiguredKey,
      groqFallbackConfigured: groqConfig.enabled,
      groqModel: groqConfig.model,
    });
  });

  // Main analysis endpoint
  app.post('/api/analyze', async (req, res) => {
    try {
      const body = req.body as AnalysisRequest;
      const validation = validateAnalysisInput(body);

      if (!validation.valid) {
        const errPayload: ApiErrorPayload = {
          error: validation.error || 'Invalid project input.',
          code: 'VALIDATION_ERROR',
          suggestion:
            'Provide either a valid public GitHub repository URL or a detailed project description (at least 30 characters).',
        };
        res.status(400).json(errPayload);
        return;
      }

      let githubInspection = undefined;
      if (body.mode === 'github' && validation.parsedRepo) {
        githubInspection = await inspectGitHubRepository(validation.parsedRepo);
        if (!githubInspection.ok) {
          const status =
            githubInspection.errorCode === 'GITHUB_NOT_FOUND'
              ? 404
              : githubInspection.errorCode === 'GITHUB_RATE_LIMIT'
                ? 429
                : 422;
          const errPayload: ApiErrorPayload = {
            error:
              githubInspection.errorMessage ||
              'Could not access the specified GitHub repository.',
            code: githubInspection.errorCode || 'GITHUB_EMPTY_OR_INACCESSIBLE',
            suggestion:
              'Switch to the "Project Description" tab to describe your project directly and get roasted without needing public GitHub access.',
            canFallbackToDescription: true,
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
      console.error('Unhandled error in /api/analyze:', err);
      const errPayload: ApiErrorPayload = {
        error: 'An unexpected server error occurred while processing your analysis.',
        code: 'SERVER_ERROR',
        suggestion: 'Please try again in a few moments.',
      };
      res.status(500).json(errPayload);
    }
  });

  const distPath = path.join(__dirname, 'dist');
  const hasBuiltClient = fs.existsSync(path.join(distPath, 'index.html'));
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    Boolean(process.env.K_SERVICE) ||
    (process.env.NODE_ENV !== 'development' && hasBuiltClient);

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath, { maxAge: '1h', index: false }));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api/')) {
        res.status(404).json({ error: 'API endpoint not found.' });
        return;
      }
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(
      `TechUstaad server running on http://localhost:${PORT} (mode: ${isProduction ? 'production' : 'development'}, model: ${GEMINI_MODEL_ID})`
    );
  });
}

startServer();
