import type { AnalysisRequest, AnalysisResponse } from '../types/analysis';

export interface QuickPreset {
  id: string;
  label: string;
  badge: string;
  request: AnalysisRequest;
  sampleReportId: string;
}

export const QUICK_PRESETS: QuickPreset[] = [
  {
    id: 'rishta-aunty',
    label: 'abdulhayykhan/Rishta-Aunty',
    badge: 'GitHub Repo • Hackathon Winner',
    sampleReportId: 'rishta-aunty',
    request: {
      mode: 'github',
      githubUrl: 'https://github.com/abdulhayykhan/Rishta-Aunty',
      context: {
        projectType: 'Hackathon Project',
        experienceLevel: 'Intermediate',
        availableTime: 'One Week',
        teamSize: 'Solo',
      },
    },
  },
  {
    id: 'ai-pdf-wrapper',
    label: 'AI-Powered Smart FYP Portal (Description)',
    badge: 'FYP • Classic Wrapper',
    sampleReportId: 'ai-pdf-wrapper',
    request: {
      mode: 'description',
      projectName: 'NeuroSync AI Smart University ERP & Blockchain Attendance',
      techStack: 'React, Node.js, Express, MongoDB, OpenAI API, Tailwind CSS',
      projectDescription:
        'We are building an AI-powered Next-Gen University ERP and Smart Attendance System for our Final Year Project. Students log in with JWT auth, upload PDF lecture notes, and our custom AI engine summarizes them using an LLM API call. We also added "Blockchain-ready architecture" in the README (currently stored in a single MongoDB collection called attendance_logs without transactions). All 18 API routes are inside a single index.js file (1,450 lines). There are no unit tests yet because our viva is next week, and environment variables are shared on WhatsApp.',
      context: {
        projectType: 'FYP (Final Year Project)',
        experienceLevel: 'Beginner',
        availableTime: 'One Week',
        teamSize: '2–3 Members',
      },
    },
  },
  {
    id: 'ecommerce-microservice',
    label: 'Overengineered Chai Delivery Microservices',
    badge: 'Personal Project • Overkill',
    sampleReportId: 'ai-pdf-wrapper',
    request: {
      mode: 'description',
      projectName: 'ChaiScale — Distributed Event-Driven Doodh Patti Ordering Engine',
      techStack: 'TypeScript, 6 Express Microservices, Kafka, Redis, Docker Compose, React',
      projectDescription:
        'A personal portfolio project to order tea from a single local dhaba. I split the backend into 6 separate microservices (auth-service,order-service, leaf-inventory-service, milk-telemetry-service, notification-service, billing-service) communicating over Kafka and Redis pub/sub. Currently only auth-service and order-service actually work; the other 4 services return hardcoded JSON stubs. Running locally requires 14GB RAM via Docker Compose, and there is no README setup guide or automated testing.',
      context: {
        projectType: 'Personal Project',
        experienceLevel: 'Intermediate',
        availableTime: 'Two Weeks',
        teamSize: 'Solo',
      },
    },
  },
];

export const SAMPLE_REFERENCE_REPORTS: Record<string, AnalysisResponse> = {
  'rishta-aunty': {
    project_title: 'Rishta Aunty — GitHub Matrimonial Biodata Roast Bureau',
    project_summary:
      'A satirical Desi matrimonial matchmaking web application that converts public GitHub user telemetry into culturally resonant Neo-Brutalist biodata cards, built with vanilla HTML/CSS/JS and Python Flask on Vercel.',
    source_mode: 'github',
    is_sample_preview: true,
    model_used: 'gemini-3.5-flash-lite (Pre-Inspected Reference Report)',
    repository_telemetry: {
      owner: 'abdulhayykhan',
      repo: 'Rishta-Aunty',
      htmlUrl: 'https://github.com/abdulhayykhan/Rishta-Aunty',
      description:
        'A satirical Desi matrimonial matchmaking bureau converting real GitHub developer telemetry into hilarious Neobrutalist biodata roasts.',
      defaultBranch: 'main',
      stars: 4,
      forks: 1,
      openIssues: 0,
      primaryLanguage: 'Python',
      languages: { Python: 38420, JavaScript: 29150, CSS: 18400, HTML: 14200 },
      createdAt: '2025-02-15T00:00:00Z',
      pushedAt: '2025-03-01T00:00:00Z',
      hasReadme: true,
      readmeLength: 14850,
      totalFilesCount: 19,
      inspectedFiles: [
        'README.md',
        'requirements.txt',
        'vercel.json',
        'app.py',
        'app.js',
        'style.css',
        'api/roast.py',
        'fallbacks.py',
      ],
      detectedTestFiles: [],
      detectedConfigFiles: ['requirements.txt', 'vercel.json', '.env.example'],
      recentCommitMessages: [
        'feat: refine neobrutalist dossier card and PNG export',
        'docs: add exhaustive architecture and cultural slang lexicon',
        'fix: handle rate limit fallback gracefully',
      ],
    },
    roast: {
      headline:
        'Documentation Mein PhD Aur Automated Testing Mein Khali Haath — Wah Ustaad Wah!',
      content:
        'Bhai sahab, repo kholte hi aisa laga jaise kisi ne hackathon project ke upar pura CSS encyclopedia likh maara ho! 6 alag markdown files (`ARCHITECTURE.md`, `CULTURAL_SLANG_LEXICON.md`, `UI_DESIGN_SYSTEM.md`) — yaani documentation itni lambi hai ke parhne wala thak ke khud hi rishta haan kar de. Magar jab Ustaad ne root directory mein `app.py` aur `api/roast.py` dono dekhe, aur `fallbacks.js` ke saath `fallbacks.py` bhi baramad hua, toh samajh aa gaya ke DRY principle ko doodh patti mein dabo ke kha liya gaya hai. Aur unit tests? Zero! Matlab dusron ke GitHub repos ka post-mortem karne wali Aunty ke apne codebase mein ek bhi `pytest` ya `vitest` file nahi hai. Shashkay 100%, testing 0% — bilkul asli Desi developer rivaayat!',
      highlights: [
        'Dual-stack mirroring: `fallbacks.js` on the frontend AND `fallbacks.py` on the backend — ek jagah joke badlo toh doosri jagah purana latifa chal raha hota hai.',
        'README aur `docs/` folder mein jitne words likhe hain, utne words mein doosra FYP ban jata, lekin ek single automated test file (`test_*.py`) likhne ka waqt nahi mila.',
        'Hardcoded local Windows OneDrive file paths (`file:///c:/Users/USER/OneDrive...`) accidentally left inside `docs/UI_DESIGN_SYSTEM.md` — Ustaad ki nazar se kuch nahi chupta!',
        'Vanilla JS DOM manipulation inside `app.js` works great for a single page, magar state management dekh kar lagta hai har button click pe duaaon ka sahara liya ja raha hai.',
      ],
    },
    reality_check: {
      verdict:
        'Rishta Aunty is a genuinely creative, well-executed hackathon winning project with standout Neo-Brutalist visual polish, cultural personality, and thoughtful resilience fallbacks. Its primary engineering debt lies in duplicated logic between client and serverless layers (`app.py` vs `api/`, `fallbacks.js` vs `fallbacks.py`) and the complete absence of automated tests.',
      strengths: [
        'Exceptional visual identity and Neo-Brutalist CSS token discipline in `style.css` without bloated framework overhead.',
        'Thoughtful resilience design: includes explicit fallback handling when GitHub or AI rate limits hit.',
        'Outstanding documentation depth across `README.md` and `docs/`, making project intent and deployment steps crystal clear.',
        'Clean serverless routing configuration via `vercel.json` and lightweight Python dependencies.',
      ],
      weaknesses: [
        'Duplicate business logic and fallback dictionaries across both Python (`fallbacks.py`, `app.py`, `api/roast.py`) and JavaScript (`fallbacks.js`).',
        'Zero automated unit or integration tests in the repository to verify API response parsing or fallback triggers.',
        'Local machine `file:///c:/Users/...` absolute paths leaked into markdown documentation links.',
        'Lack of strict schema validation or automated script-filtering tests on LLM outputs.',
      ],
      architecture_assessment:
        'The architecture uses a lightweight hybrid layout: static vanilla HTML/CSS/JS frontend paired with Python serverless endpoints under `api/` and a local Flask runner `app.py`. While appropriate for a fast hackathon deployment on Vercel, maintaining parallel entry points (`app.py` and `api/index.py` / `api/roast.py`) and duplicated fallback datasets in both JS and Python creates synchronization drift whenever prompt logic or schemas change.',
      code_quality_assessment:
        'Inspected files (`app.py`, `api/roast.py`, `app.js`, `style.css`) are readable and well-commented. CSS custom properties are cleanly structured. However, `app.js` mixes DOM querying, HTML template string construction, network fetching, and canvas export logic in one script without modular separation.',
      documentation_assessment:
        'Documentation is top-tier for a hackathon repository (`README.md` plus five dedicated guides in `docs/`). One minor flaw observed directly in `docs/UI_DESIGN_SYSTEM.md` is hardcoded local Windows OneDrive `file:///` URLs instead of repo-relative paths.',
      testing_assessment:
        'No test suite, test runner configuration, or CI workflow was found in the repository tree. Reliability currently relies on manual verification and runtime try/catch fallback blocks.',
    },
    scores: {
      code_quality: {
        score: 16,
        max: 20,
        reason:
          'Clean CSS token system and readable Python/JS code, docked slightly for duplicated fallback files and monolithic DOM manipulation.',
      },
      architecture: {
        score: 15,
        max: 20,
        reason:
          'Simple, fast serverless architecture well-suited for a hackathon scope, though split between `app.py` and `api/` with duplicated client/server fallback logic.',
      },
      functionality: {
        score: 18,
        max: 20,
        reason:
          'Delivers its core promise end-to-end with live GitHub telemetry, AI roast generation, interactive demo profiles, and PNG export.',
      },
      documentation: {
        score: 19,
        max: 20,
        reason:
          'Comprehensive README and `docs/` hub; -1 point only for hardcoded local `file:///c:/Users/...` links in `docs/UI_DESIGN_SYSTEM.md`.',
      },
      testing: {
        score: 8,
        max: 20,
        reason:
          'Good runtime error/fallback handling in code, but zero automated unit or integration tests exist in the repository.',
      },
      total: 76,
    },
    action_plan: {
      fix_immediately: [
        {
          title: 'Replace hardcoded Windows file:/// paths in docs/UI_DESIGN_SYSTEM.md',
          what_to_change:
            'Convert `file:///c:/Users/USER/OneDrive.../style.css` links in `docs/UI_DESIGN_SYSTEM.md` to relative repository links (`../style.css`).',
          why_it_matters:
            'Broken local machine links fail for every external reader on GitHub and leak local directory structure.',
          how_to_approach:
            'Search `docs/` for `file:///` and replace with relative Markdown paths.',
        },
        {
          title: 'Consolidate duplicated fallback datasets into a single source of truth',
          what_to_change:
            'Eliminate maintaining separate `fallbacks.py` and `fallbacks.js` files with identical profile data.',
          why_it_matters:
            'Prevents drift where frontend offline fallbacks and backend API fallbacks return inconsistent structures.',
          how_to_approach:
            'Store fallback data in a single shared `public/data/fallbacks.json` file consumed by both the Python API and frontend JS.',
        },
      ],
      improve_next: [
        {
          title: 'Add a lightweight pytest suite for API validation and response sanitization',
          what_to_change:
            'Create `tests/test_roast_api.py` covering username validation, JSON schema normalization, and fallback triggers.',
          why_it_matters:
            'Verifies that malformed LLM responses or GitHub 404/403 responses never crash the serverless function.',
          how_to_approach:
            'Install `pytest`, mock the external GitHub/LLM HTTP calls, and assert deterministic status codes and schema keys.',
        },
        {
          title: 'Unify local Flask runner (`app.py`) and Vercel serverless handlers (`api/`)',
          what_to_change:
            'Extract core GitHub fetching and prompt formatting into a single shared Python module imported by both `app.py` and `api/roast.py`.',
          why_it_matters:
            'Ensures local development behavior matches production Vercel serverless execution 1:1.',
          how_to_approach:
            'Move shared logic into `core/analyzer.py` and keep `app.py` and `api/roast.py` as thin HTTP adapters.',
        },
      ],
      future_improvements: [
        {
          title: 'Modularize frontend `app.js` into ES modules',
          what_to_change:
            'Split `app.js` into `apiClient.js`, `domRenderer.js`, and `exportCard.js` using native ES modules (`<script type="module">`).',
          why_it_matters:
            'Keeps the zero-framework philosophy intact while making UI updates and PNG export bugs easier to isolate.',
          how_to_approach:
            'Use standard browser `import`/`export` statements without introducing a bundler if you prefer vanilla JS.',
        },
      ],
    },
    evidence_limitations: [
      'Inspected 8 representative files out of 19 total repository files via static inspection.',
      'Runtime execution and live Vercel environment secrets were not directly executed during static repo inspection.',
    ],
    final_message:
      'Chai aur Code jeetne ki mubarak ho! Ab bas `file:///` paths saaf karo aur 5 unit tests likh do taake Ustaad ko agli baar 90+ score dene ka mauqa mile.',
  },

  'ai-pdf-wrapper': {
    project_title: 'NeuroSync AI Smart University ERP & Blockchain Attendance',
    project_summary:
      'A Final Year Project combining student attendance logging in MongoDB with an LLM PDF summarization endpoint inside a monolithic Express server.',
    source_mode: 'description',
    is_sample_preview: true,
    model_used: 'gemini-3.5-flash-lite (Pre-Inspected Reference Report)',
    roast: {
      headline:
        'MongoDB Ke Table Ko "Blockchain" Aur Ek API Call Ko "Custom AI Engine" Bolne Walay!',
      content:
        'Mashallah! FYP ka naam aisa rakha hai jaise MIT aur CERN walon ne mil kar banaya ho: "NeuroSync AI & Blockchain ERP". Aur andar kya hai? Ek `attendance_logs` naam ka sadha sa MongoDB collection aur OpenAI ko bheja gaya ek `Summarize this PDF` prompt! Bhai, agar MongoDB mein document insert karne ko Blockchain kehte hain, toh phir Excel sheet mein row add karne ko Quantum Computing bol dete hain. Sab se khoobsurat baat yeh hai ke saare 18 API routes ek hi `index.js` (1,450 lines!) mein thoonse hue hain, aur `.env` secrets WhatsApp group pe ghoom rahe hain. Viva mein external examiner ne ek dafa `Ctrl+F` daba diya toh poori group ki degree "pending" mein chali jayegi!',
      highlights: [
        '"Blockchain-ready architecture" = A standard MongoDB collection without even a cryptographic hash chain or immutability guarantee.',
        '"Custom AI Engine" = Calling an external LLM completion API on extracted PDF text with a 2-line system prompt.',
        '1,450-line `index.js` God-file: Auth, PDF parsing, attendance CRUD, and database connection all living in one joint family system.',
        'Sharing `.env` keys over WhatsApp and zero tests one week before Viva — khatarnaak level of confidence!',
      ],
    },
    reality_check: {
      verdict:
        'At its core, this is a workable student portal with JWT authentication, attendance CRUD, and PDF summarization. However, its technical credibility is severely undermined by buzzword inflation ("Blockchain" and "Custom AI Engine" without supporting implementation), a 1,450-line monolithic server file, insecure secret sharing, and zero input validation or test coverage.',
      strengths: [
        'Solves a concrete, relatable university workflow (attendance tracking + lecture note summaries).',
        'Uses a familiar, productive full-stack JavaScript stack (React, Express, MongoDB) that a 2–3 member beginner team can ship within a week.',
      ],
      weaknesses: [
        'False architectural claims ("Blockchain" for plain MongoDB documents) will immediately backfire during technical questioning or code review.',
        'All 18 routes live inside a single 1,450-line `index.js` file, causing merge conflicts for a 2–3 person team.',
        'No automated tests, no PDF upload size/MIME validation, and insecure credential handling via WhatsApp.',
      ],
      architecture_assessment:
        'A monolithic Express server is completely fine for an FYP, provided it has internal separation of concerns (routes, controllers, services, models). Putting 18 endpoints inside one `index.js` file makes debugging middleware errors and parallel team work fragile.',
      code_quality_assessment:
        'Based on the provided description, packing 1,450 lines into `index.js` indicates mixed responsibilities (database queries, auth checks, PDF parsing, and HTTP response formatting tangled together).',
      documentation_assessment:
        'README claims ("Blockchain-ready", "Custom AI Engine") contradict the actual implementation. Honest documentation that accurately describes "LLM-assisted PDF summarization" and "Tamper-evident audit logs" is far more credible.',
      testing_assessment:
        'Zero automated tests exist, and PDF uploads + external LLM calls are high-risk failure points during a live Viva demo if rate limits, large files, or network timeouts occur.',
    },
    scores: {
      code_quality: {
        score: 7,
        max: 20,
        reason:
          'A single 1,450-line index.js file with 18 routes severely hurts readability and team maintainability.',
        insufficient_evidence: true,
      },
      architecture: {
        score: 8,
        max: 20,
        reason:
          'Lack of route/service separation and mismatch between claimed "Blockchain" architecture and actual single-collection MongoDB storage.',
      },
      functionality: {
        score: 12,
        max: 20,
        reason:
          'Core JWT login, attendance logging, and LLM PDF summarization work, but "Blockchain" claim is unimplemented.',
      },
      documentation: {
        score: 6,
        max: 20,
        reason:
          'Buzzword-heavy README that misrepresents standard API calls and database tables as custom AI and Blockchain.',
      },
      testing: {
        score: 4,
        max: 20,
        reason:
          'No automated tests, no `.env.example` workflow (keys shared on WhatsApp), and high risk of live Viva demo failures.',
      },
      total: 37,
    },
    action_plan: {
      fix_immediately: [
        {
          title: 'Remove unbacked "Blockchain" claims or implement an honest SHA-256 hash chain',
          what_to_change:
            'Either rename the feature to "Attendance Audit Log" in the README/UI, OR add `prevHash` and `recordHash` (SHA-256) fields to each MongoDB attendance record.',
          why_it_matters:
            'Examiners and interviewers immediately penalize projects that claim Blockchain while using a plain mutable database table.',
          how_to_approach:
            'Use Node built-in `crypto.createHash("sha256")` to hash `(studentId + timestamp + prevRecordHash)` on insert and add a `/api/attendance/verify` endpoint.',
        },
        {
          title: 'Split the 1,450-line index.js into modular route files',
          what_to_change:
            'Extract `routes/auth.js`, `routes/attendance.js`, and `routes/notes.js` using `express.Router()`.',
          why_it_matters:
            'Allows your 2–3 team members to work simultaneously during the final week without breaking each other’s code.',
          how_to_approach:
            'Spend 2 hours moving route groups one by one into `src/routes/` and mounting them in `index.js`.',
        },
        {
          title: 'Rotate API keys and create a proper .env.example',
          what_to_change:
            'Revoke the OpenAI/JWT keys shared on WhatsApp, verify `.env` is in `.gitignore`, and commit `.env.example`.',
          why_it_matters:
            'Prevents accidental key leakage to GitHub and ensures reproducible local setup for all team members.',
          how_to_approach:
            'Generate a fresh API key, add `.env` to `.gitignore`, and list required variable names without secrets in `.env.example`.',
        },
      ],
      improve_next: [
        {
          title: 'Add PDF file size limits, MIME validation, and LLM timeout handling',
          what_to_change:
            'Configure `multer` with a 5MB file limit (`application/pdf` only) and wrap the LLM API call in a 15-second timeout with graceful error message.',
          why_it_matters:
            'Prevents your server from hanging or crashing during your Viva demonstration when someone uploads a huge or corrupted file.',
          how_to_approach:
            'Use `limits: { fileSize: 5 * 1024 * 1024 }` in multer and catch API errors with a clear HTTP 502 fallback message.',
        },
      ],
      future_improvements: [
        {
          title: 'Cache PDF summaries by file SHA-256 hash in MongoDB',
          what_to_change:
            'Compute a SHA-256 hash of uploaded PDF buffers and check MongoDB before calling the LLM API again.',
          why_it_matters:
            'Saves API quota, makes repeated demo runs instant (<50ms), and shows real engineering thought.',
          how_to_approach:
            'Store `{ fileHash, summary, createdAt }` in a `note_summaries` collection.',
        },
      ],
    },
    evidence_limitations: [
      'Analysis is based on user-provided project description rather than direct source-code inspection.',
      'Code quality and internal database schemas were inferred from your architectural summary.',
    ],
    final_message:
      'Beta, Viva mein 7 din bache hain — "Blockchain" ka topi drama hatao, `index.js` ke 3 tukray karo, aur PDF caching laga lo. Examiner khush ho ke A grade dega!',
  },
};
