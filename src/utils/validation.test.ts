import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseGitHubRepoUrl,
  validateAnalysisInput,
  containsForbiddenScript,
  validateAndNormalizeAnalysisResponse,
  getScoreVerdict,
  formatReportAsMarkdown,
} from './validation';

test('parseGitHubRepoUrl accepts valid GitHub repository URLs and normalizes them', () => {
  const res1 = parseGitHubRepoUrl('https://github.com/abdulhayykhan/Rishta-Aunty');
  assert.equal(res1.valid, true);
  assert.deepEqual(res1.data, {
    owner: 'abdulhayykhan',
    repo: 'Rishta-Aunty',
    normalizedUrl: 'https://github.com/abdulhayykhan/Rishta-Aunty',
  });

  const res2 = parseGitHubRepoUrl('github.com/facebook/react.git/tree/main');
  assert.equal(res2.valid, true);
  assert.equal(res2.data?.owner, 'facebook');
  assert.equal(res2.data?.repo, 'react');

  const res3 = parseGitHubRepoUrl('abdulhayykhan/Rishta-Aunty');
  assert.equal(res3.valid, true);
  assert.equal(res3.data?.owner, 'abdulhayykhan');
  assert.equal(res3.data?.repo, 'Rishta-Aunty');
});

test('parseGitHubRepoUrl rejects non-GitHub URLs, profile URLs, and reserved routes', () => {
  assert.equal(parseGitHubRepoUrl('').valid, false);
  assert.equal(parseGitHubRepoUrl('https://gitlab.com/user/repo').valid, false);
  assert.equal(parseGitHubRepoUrl('https://github.com/abdulhayykhan').valid, false);
  assert.equal(parseGitHubRepoUrl('https://github.com/settings/profile').valid, false);
});

test('validateAnalysisInput validates both github and description modes', () => {
  assert.equal(
    validateAnalysisInput({ mode: 'github', githubUrl: 'https://github.com/vercel/next.js' }).valid,
    true
  );
  assert.equal(
    validateAnalysisInput({ mode: 'github', githubUrl: 'not-a-url' }).valid,
    false
  );
  assert.equal(
    validateAnalysisInput({ mode: 'description', projectDescription: 'Too short' }).valid,
    false
  );
  assert.equal(
    validateAnalysisInput({
      mode: 'description',
      projectDescription:
        'A full-stack inventory management system built with React, Express, and PostgreSQL for local retail pharmacies.',
    }).valid,
    true
  );
});

test('containsForbiddenScript detects Urdu/Arabic and Devanagari script while allowing Latin Hinglish', () => {
  const latinRoast =
    'Bhai README dekh kar lag raha hai project ka onboarding bhi developer se permission leta hai!';
  assert.equal(containsForbiddenScript(latinRoast).hasForbiddenScript, false);

  const urduScriptRoast = 'بھائی یہ کیا کوڈ لکھا ہے';
  const urduCheck = containsForbiddenScript(urduScriptRoast);
  assert.equal(urduCheck.hasForbiddenScript, true);
  assert.ok(urduCheck.detectedScripts.includes('Urdu/Arabic script'));

  const devanagariRoast = 'भाई यह क्या कोड लिखा है';
  const devCheck = containsForbiddenScript(devanagariRoast);
  assert.equal(devCheck.hasForbiddenScript, true);
  assert.ok(devCheck.detectedScripts.includes('Devanagari script'));
});

test('validateAndNormalizeAnalysisResponse enforces consistent 100-point total and clamps scores', () => {
  const sampleRaw = {
    project_title: 'Smart Chai Dispenser IoT',
    project_summary: 'An ESP32 + React dashboard that claims AI-powered tea brewing.',
    roast: {
      headline: 'If-Else Ko AI Bolne Wale Bhaiसाब — Oh Wait, Roman Urdu Only!',
      content:
        'Teen if-else statements laga kar README mein Neural Tea Optimization likh diya hai.',
      highlights: [
        'Hardcoded WiFi credentials in main.cpp',
        'No tests anywhere in the repository',
      ],
    },
    reality_check: {
      verdict: 'Functional hardware prototype buried under exaggerated marketing claims.',
      strengths: ['Clean ESP32 serial telemetry loop'],
      weaknesses: ['Zero automated tests and hardcoded secrets'],
      architecture_assessment: 'Monolithic sketch file mixed with React frontend in one folder.',
      code_quality_assessment: 'Readable C++ loop but magic numbers everywhere.',
      documentation_assessment: 'Good wiring diagram in README.',
      testing_assessment: 'No unit or integration tests exist.',
    },
    scores: {
      code_quality: { score: 12, max: 20, reason: 'Readable but magic numbers.' },
      architecture: { score: 11, max: 20, reason: 'Tightly coupled.' },
      functionality: { score: 15, max: 20, reason: 'Core relay control works.' },
      documentation: { score: 16, max: 20, reason: 'Clear README setup.' },
      testing: { score: 4, max: 20, reason: 'Zero automated tests.' },
      total: 99, // Intentionally wrong total to verify deterministic recalculation
    },
    action_plan: {
      fix_immediately: [
        {
          title: 'Remove hardcoded WiFi credentials',
          what_to_change: 'Move SSID and password to an untracked secrets.h header.',
          why_it_matters: 'Prevents leaking local network credentials on public GitHub.',
          how_to_approach: 'Add secrets.h to .gitignore and commit secrets.example.h.',
        },
      ],
      improve_next: [],
      future_improvements: [],
    },
    evidence_limitations: ['Hardware sensors cannot be verified without physical ESP32 board.'],
    final_message: 'Pehle WiFi password hatao repo se, phir agla commit karna!',
  };

  // Note: headline above had 'साब' in Devanagari! Let's verify it catches script violation first:
  const violationResult = validateAndNormalizeAnalysisResponse(sampleRaw);
  assert.equal(violationResult.valid, false);
  assert.equal(violationResult.scriptViolation, true);

  // Now fix the headline to pure Latin script and verify total score calculation:
  sampleRaw.roast.headline = 'If-Else Ko AI Bolne Wale Ustaaad!';
  const validResult = validateAndNormalizeAnalysisResponse(sampleRaw);
  assert.equal(validResult.valid, true);
  assert.equal(validResult.data?.scores.total, 12 + 11 + 15 + 16 + 4);
  assert.equal(validResult.data?.scores.total, 58);

  const markdown = formatReportAsMarkdown(validResult.data!);
  assert.ok(markdown.includes('58 / 100'));
  assert.equal(getScoreVerdict(58).tier, 'decent');
});

import { SAMPLE_REFERENCE_REPORTS } from '../data/sampleReports';

test('all SAMPLE_REFERENCE_REPORTS pass schema validation and Latin-script enforcement', () => {
  for (const [key, report] of Object.entries(SAMPLE_REFERENCE_REPORTS)) {
    const check = validateAndNormalizeAnalysisResponse(report);
    assert.equal(check.valid, true, `Sample report ${key} failed validation: ${check.error}`);
    assert.equal(check.data?.scores.total, report.scores.total);
  }
});

