import React from 'react';
import { Flame, Terminal } from 'lucide-react';

interface NavbarProps {
  onScrollToAnalyzer: () => void;
  onLoadSampleReport: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  onScrollToAnalyzer,
  onLoadSampleReport,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-[#FFFDF7]/95 backdrop-blur-sm border-b-3 border-[#111111]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#"
          className="flex items-center gap-2.5 text-xl sm:text-2xl font-extrabold tracking-tight text-[#111111] font-display whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#111111]"
        >
          <span className="inline-flex items-center justify-center w-9 h-9 bg-[#FFE600] border-2 border-[#111111] shadow-[2px_2px_0px_#111111]">
            <Terminal className="w-5 h-5 text-[#111111]" aria-hidden="true" />
          </span>
          <span>TechUstaad</span>
        </a>

        {/* Zone 2: Single-line navigation links */}
        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-7 text-sm font-bold text-[#111111]"
        >
          <a
            href="#analyzer"
            className="hover:underline decoration-2 underline-offset-4 whitespace-nowrap shrink-0"
          >
            Project Analyzer
          </a>
          <a
            href="#rubric"
            className="hover:underline decoration-2 underline-offset-4 whitespace-nowrap shrink-0"
          >
            100-Point Rubric
          </a>
          <a
            href="#methodology"
            className="hover:underline decoration-2 underline-offset-4 whitespace-nowrap shrink-0"
          >
            How Ustaad Works
          </a>
          <button
            type="button"
            onClick={onLoadSampleReport}
            className="hover:underline decoration-2 underline-offset-4 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Sample Verdict
          </button>
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={onScrollToAnalyzer}
            className="neo-btn bg-[#FFE600] hover:bg-[#ffed4a] text-[#111111] font-display font-bold text-xs sm:text-sm px-4 py-2 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Flame className="w-4 h-4 text-[#111111]" aria-hidden="true" />
            <span>Roast My Project</span>
          </button>
        </div>
      </div>
    </header>
  );
};
