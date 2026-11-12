import React from 'react';
import { BookOpen, Code2, Cpu, Layers, ShieldCheck, Terminal } from 'lucide-react';

export const MethodologyAndFooter: React.FC = () => {
  const rubricCategories = [
    {
      num: '01',
      title: 'Code Quality',
      points: 20,
      bg: '#CCF2FF',
      icon: Code2,
      items: ['Readability & naming', 'Directory organization', 'Modularity & DRY', 'Maintainability'],
    },
    {
      num: '02',
      title: 'Architecture & Design',
      points: 20,
      bg: '#E5DEFF',
      icon: Layers,
      items: [
        'Project structure',
        'Separation of concerns',
        'Sensible technical stack',
        'Scope-appropriate scale',
      ],
    },
    {
      num: '03',
      title: 'Functionality & Implementation',
      points: 20,
      bg: '#FFF3B0',
      icon: Cpu,
      items: [
        'Feature completeness',
        'Real implementation evidence',
        'Zero buzzword inflation',
        'End-to-end flow',
      ],
    },
    {
      num: '04',
      title: 'Documentation & Presentation',
      points: 20,
      bg: '#B8F3D8',
      icon: BookOpen,
      items: [
        'Clear README overview',
        'Reproducible setup steps',
        'Architecture explanation',
        'Demo & usage clarity',
      ],
    },
    {
      num: '05',
      title: 'Testing & Reliability',
      points: 20,
      bg: '#FFD6E8',
      icon: ShieldCheck,
      items: [
        'Automated test evidence',
        'Input validation',
        'Graceful error handling',
        'Secret & config hygiene',
      ],
    },
  ];

  return (
    <>
      {/* 100-Point Rubric Section */}
      <section id="rubric" className="py-12 sm:py-16 border-t-3 border-[#111111] scroll-mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="mb-8">
            <span className="inline-block font-mono text-xs font-bold bg-[#FFE600] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] px-3 py-1 mb-3">
              02. TRANSPARENT 100-POINT SCORING RUBRIC
            </span>
            <h2 className="font-display font-extrabold text-2xl sm:text-4xl text-[#111111] tracking-tight">
              Five Equally Weighted Engineering Pillars (5 × 20 Points)
            </h2>
            <p className="text-sm sm:text-base text-[#333333] max-w-2xl mt-2">
              Ustaad never inflates scores to flatter you and never penalizes blindly when source
              code is unavailable — unverified areas are explicitly marked as insufficient evidence.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {rubricCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <div
                  key={cat.num}
                  className="neo-card bg-[#FFFDF7] p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-3">
                      <span
                        className="w-9 h-9 border-2 border-[#111111] flex items-center justify-center"
                        style={{ backgroundColor: cat.bg }}
                      >
                        <Icon className="w-4 h-4 text-[#111111]" aria-hidden="true" />
                      </span>
                      <span className="font-mono text-xs font-bold bg-[#111111] text-[#FFE600] px-2 py-0.5 tabular-nums">
                        {cat.points} PTS
                      </span>
                    </div>

                    <h3 className="font-display font-extrabold text-lg text-[#111111] mb-3">
                      {cat.num}. {cat.title}
                    </h3>

                    <ul className="space-y-1.5 text-xs sm:text-sm text-[#222222]">
                      {cat.items.map((item, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <span className="font-mono font-bold">·</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Methodology / About Section */}
      <section
        id="methodology"
        className="py-12 sm:py-16 border-t-3 border-[#111111] bg-[#F6F3EC] scroll-mt-16"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            <div className="lg:col-span-5 neo-card bg-[#FFE600] p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="font-mono text-xs font-bold bg-[#111111] text-[#FFFDF7] px-2.5 py-1">
                  03. THE TECHUSTAAD PHILOSOPHY
                </span>
                <h2 className="font-display font-extrabold text-2xl sm:text-3xl text-[#111111] mt-4 mb-3">
                  First Make Them Laugh. Then Make Them Ship Better Code.
                </h2>
                <p className="text-sm sm:text-base text-[#111111] leading-relaxed">
                  Generic AI code reviewers put developers to sleep with polite boilerplate.
                  TechUstaad combines the unmistakable wit of a battle-tested Pakistani senior lead
                  with a rigorous architectural post-mortem.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t-2 border-[#111111] font-mono text-xs font-bold text-[#111111]">
                ROAST THE CODE — NEVER THE PERSON · 100% EVIDENCE-BASED
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="neo-card bg-[#FFFDF7] p-5">
                <div className="font-mono text-xs font-bold text-[#FF5C93] mb-1">
                  STEP 01 · TELEMETRY & CONTEXT
                </div>
                <h3 className="font-display font-extrabold text-lg text-[#111111] mb-2">
                  Real GitHub Evidence Inspection
                </h3>
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
                  When given a public GitHub URL, TechUstaad fetches the repository tree, README,
                  language distribution, commit history, and representative source files — without
                  inventing fake files or claiming runtime execution.
                </p>
              </div>

              <div className="neo-card bg-[#FFFDF7] p-5">
                <div className="font-mono text-xs font-bold text-[#111111] mb-1">
                  STEP 02 · CULTURAL ROAST
                </div>
                <h3 className="font-display font-extrabold text-lg text-[#111111] mb-2">
                  Roman Urdu & Hinglish Wit
                </h3>
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
                  Calls out 1,500-line God files, missing tests, tutorial clones, and “AI wrapper”
                  claims in natural English, Roman Urdu, and Hinglish — validated strictly in Latin
                  script.
                </p>
              </div>

              <div className="neo-card bg-[#FFFDF7] p-5">
                <div className="font-mono text-xs font-bold text-[#111111] mb-1">
                  STEP 03 · SENIOR MENTOR AUDIT
                </div>
                <h3 className="font-display font-extrabold text-lg text-[#111111] mb-2">
                  Four-Pillar Deep Assessment
                </h3>
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
                  Evaluates Architecture, Code Quality, Documentation, and Testing separately,
                  clearly distinguishing observed repository facts from assumptions.
                </p>
              </div>

              <div className="neo-card bg-[#FFFDF7] p-5">
                <div className="font-mono text-xs font-bold text-[#111111] mb-1">
                  STEP 04 · CALIBRATED ROADMAP
                </div>
                <h3 className="font-display font-extrabold text-lg text-[#111111] mb-2">
                  What, Why & How Action Plan
                </h3>
                <p className="text-xs sm:text-sm text-[#333333] leading-relaxed">
                  Groups fixes into Immediate, Next, and Future priorities tailored to whether you
                  have 24 hours before a hackathon demo or a month for an MVP.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer with Exact Required Attribution */}
      <footer className="border-t-3 border-[#111111] bg-[#FFFDF7] py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center gap-4">
          <div className="inline-flex items-center gap-2 bg-[#FFE600] border-2 border-[#111111] shadow-[3px_3px_0px_#111111] px-3.5 py-1 font-display font-extrabold text-sm text-[#111111]">
            <Terminal className="w-4 h-4" aria-hidden="true" />
            <span>TechUstaad — Your Project Deserves a Reality Check</span>
          </div>

          <p className="text-sm sm:text-base font-bold text-[#111111]">
            Made with ❤️ by{' '}
            <a
              href="https://abdulhayykhan.dev/"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#FFE600] hover:bg-[#FF5C93] px-2 py-0.5 border-2 border-[#111111] shadow-[2px_2px_0px_#111111] underline decoration-2 underline-offset-2 transition-colors"
            >
              Abdul Hayy Khan
            </a>{' '}
            for Prompt Wars by GDGoC MAJU
          </p>

          <p className="text-xs font-mono text-[#444444]">
            Pehle savage roast, phir asli engineering salah · Powered by Google Gemini 3.5
            Flash-Lite & GitHub Public API
          </p>
        </div>
      </footer>
    </>
  );
};
