import React from 'react';
import { ArrowDownRight, Eye, Flame, ShieldAlert, CheckCircle2 } from 'lucide-react';

interface HeroSectionProps {
  onScrollToAnalyzer: () => void;
  onLoadSampleReport: () => void;
}

export const HeroSection: React.FC<HeroSectionProps> = ({
  onScrollToAnalyzer,
  onLoadSampleReport,
}) => {
  return (
    <section className="relative pt-8 pb-12 sm:pt-12 sm:pb-16 border-b-3 border-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
          {/* Left Column: Core Pitch & Headline */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-[#FFFDF7] neo-card-lg p-6 sm:p-8 lg:p-10 relative">
            <div>
              {/* Kicker metadata line */}
              <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm font-mono font-bold text-[#111111] mb-5">
                <span className="bg-[#FF5C93] text-[#111111] border-2 border-[#111111] px-2.5 py-0.5 shadow-[2px_2px_0px_#111111]">
                  PAKISTANI SENIOR DEV AI
                </span>
                <span aria-hidden="true">·</span>
                <span>STAGE 1: SAVAGE ROAST</span>
                <span aria-hidden="true">·</span>
                <span>STAGE 2: REALITY CHECK</span>
              </div>

              <h1
                className="font-display font-extrabold text-[#111111] tracking-tight leading-[1.08] mb-5"
                style={{
                  fontSize: 'clamp(2.25rem, 4.2vw, 3.75rem)',
                  textWrap: 'balance',
                }}
              >
                “Code Likha Hai Ya Sirf Folder Banaya Hai?”
              </h1>

              <p className="text-base sm:text-lg md:text-xl text-[#222222] font-medium leading-relaxed max-w-2xl mb-8">
                Apna GitHub repo lao. Ustaad uski reality check karega —{' '}
                <span className="bg-[#FFE600] px-1.5 py-0.5 font-bold border border-[#111111] whitespace-nowrap inline-block">
                  pehle roast
                </span>
                , phir{' '}
                <span className="bg-[#B8F3D8] px-1.5 py-0.5 font-bold border border-[#111111] whitespace-nowrap inline-block">
                  proper engineering advice
                </span>
                . Your project deserves a reality check.
              </p>
            </div>

            <div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-6">
                <button
                  type="button"
                  onClick={onScrollToAnalyzer}
                  className="neo-btn bg-[#FFE600] hover:bg-[#ffed4a] text-[#111111] font-display font-extrabold text-base sm:text-lg px-6 py-3.5 flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Flame className="w-5 h-5" aria-hidden="true" />
                  <span>Inspect My Project Now</span>
                  <ArrowDownRight className="w-5 h-5" aria-hidden="true" />
                </button>

                <button
                  type="button"
                  onClick={onLoadSampleReport}
                  className="neo-btn bg-[#E5DEFF] hover:bg-[#d5cbff] text-[#111111] font-display font-bold text-sm sm:text-base px-5 py-3.5 flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Eye className="w-4 h-4" aria-hidden="true" />
                  <span>See Sample Verdict (76/100)</span>
                </button>
              </div>

              <div className="pt-4 border-t-2 border-dashed border-[#111111]/30 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-mono text-[#333333]">
                <span>Public GitHub Repo URL or Project Description</span>
                <span aria-hidden="true">·</span>
                <span>Transparent 100-Point Rubric</span>
                <span aria-hidden="true">·</span>
                <span>Powered by Gemini 3.5 Flash-Lite</span>
              </div>
            </div>
          </div>

          {/* Right Column: Two-Stage Contrast Dossier Preview */}
          <div className="lg:col-span-5 flex flex-col justify-between neo-card-lg bg-gradient-to-br from-[#FFD6E8] via-[#FFF3B0] to-[#CCF2FF] p-5 sm:p-6">
            {/* Retro Window Header */}
            <div className="bg-[#111111] text-[#FFFDF7] px-3.5 py-2.5 border-2 border-[#111111] flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-[#FF5C93] border border-[#FFFDF7]" />
                <span className="w-3 h-3 rounded-full bg-[#FFE600] border border-[#FFFDF7]" />
                <span className="w-3 h-3 rounded-full bg-[#6EE7B7] border border-[#FFFDF7]" />
              </div>
              <span className="font-mono text-xs font-bold tracking-wider">
                USTAAD_DUAL_CORE.sh
              </span>
              <span className="font-mono text-[11px] bg-[#FFE600] text-[#111111] px-1.5 py-0.5 font-bold">
                2-STAGE
              </span>
            </div>

            {/* Stage 1 Preview Box */}
            <div className="bg-[#FFFDF7] border-3 border-[#111111] shadow-[4px_4px_0px_#111111] p-4 mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold bg-[#FF5C93] text-[#111111] border border-[#111111] px-2 py-0.5">
                  STAGE 01: THE ROAST
                </span>
                <span className="font-mono text-xs text-[#444444]">Roman Urdu / Hinglish</span>
              </div>
              <p className="font-display font-bold text-sm sm:text-base text-[#111111] mb-1.5">
                “AI-powered likh diya, lekin AI ko khud samajh nahi aa raha ke karna kya hai.”
              </p>
              <p className="text-xs sm:text-sm text-[#333333] leading-snug">
                Exposes copy-paste tutorials, 1,400-line God files, missing READMEs, and fake
                “Blockchain” claims with zero mercy and 100% evidence.
              </p>
            </div>

            {/* Stage 2 Preview Box */}
            <div className="bg-[#FFFDF7] border-3 border-[#111111] shadow-[4px_4px_0px_#111111] p-4 mb-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="font-mono text-xs font-bold bg-[#7DD3FC] text-[#111111] border border-[#111111] px-2 py-0.5">
                  STAGE 02: REALITY CHECK
                </span>
                <span className="font-mono text-xs font-bold tabular-nums text-[#111111]">
                  5 × 20 PTS = 100
                </span>
              </div>
              <p className="font-display font-bold text-sm sm:text-base text-[#111111] mb-2">
                Senior Architect Post-Mortem & Action Plan
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-[#B8F3D8] border border-[#111111] px-2.5 py-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">Fix Immediately</span>
                </div>
                <div className="bg-[#FFF3B0] border border-[#111111] px-2.5 py-1.5 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                  <span className="truncate">Architecture Audit</span>
                </div>
              </div>
            </div>

            {/* Bottom Motto Bar */}
            <div className="bg-[#111111] text-[#FFE600] px-4 py-2.5 font-mono text-xs font-bold text-center">
              FIRST MAKE THEM LAUGH — THEN MAKE THEM SHIP BETTER CODE
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
