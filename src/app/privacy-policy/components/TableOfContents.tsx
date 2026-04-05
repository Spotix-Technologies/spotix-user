"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ClipboardList,
  Building2,
  FolderOpen,
  Settings,
  Wallet,
  Handshake,
  Users,
  Cookie,
  Wrench,
  Archive,
  Scale,
  ShieldCheck,
  ShieldOff,
  FileEdit,
  Mail,
  ChevronDown,
} from "lucide-react";
import { LucideIcon } from "lucide-react";

interface Section {
  id: string;
  label: string;
  Icon: LucideIcon;
}

const sections: Section[] = [
  { id: "overview",          label: "Overview",                           Icon: ClipboardList },
  { id: "who-we-are",        label: "Who We Are",                         Icon: Building2     },
  { id: "data-we-collect",   label: "Data We Collect",                    Icon: FolderOpen    },
  { id: "how-we-use-data",   label: "How We Use Your Data",               Icon: Settings      },
  { id: "iwss",              label: "IWSS Wallet",                        Icon: Wallet        },
  { id: "sharing-data",      label: "Sharing Your Data",                  Icon: Handshake     },
  { id: "organizer-access",  label: "Organizer Access",                   Icon: Users         },
  { id: "cookies-tracking",  label: "Cookies & Tracking",                 Icon: Cookie        },
  { id: "third-party-tools", label: "Third-Party Tools",                  Icon: Wrench        },
  { id: "data-retention",    label: "Data Retention",                     Icon: Archive       },
  { id: "your-rights",       label: "Your Rights",                        Icon: Scale         },
  { id: "data-security",     label: "Data Security",                      Icon: ShieldCheck   },
  { id: "children",          label: "Age Policy",                         Icon: ShieldOff     },
  { id: "policy-changes",    label: "Policy Changes",                     Icon: FileEdit      },
  { id: "contact",           label: "Contact Us",                         Icon: Mail          },
];

export default function TableOfContents() {
  const [activeIndex, setActiveIndex]   = useState<number>(0);
  const [mobileOpen, setMobileOpen]     = useState<boolean>(false);
  const [tocHeight, setTocHeight]       = useState<number>(52); // mobile bar height
  const mobileBarRef                    = useRef<HTMLDivElement>(null);
  const dropdownRef                     = useRef<HTMLDivElement>(null);

  /* ── Measure the mobile sticky bar height so scroll-margin matches ── */
  useEffect(() => {
    const update = () => {
      if (mobileBarRef.current) {
        setTocHeight(mobileBarRef.current.offsetHeight);
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  /* ── IntersectionObserver: track which section top is in view ── */
  useEffect(() => {
    // We observe a tiny sentinel div at the TOP of each section.
    // When it enters the upper portion of the viewport we mark that section active.
    const observers: IntersectionObserver[] = [];

    sections.forEach((s, i) => {
      const el = document.getElementById(s.id);
      if (!el) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(i);
          }
        },
        // rootMargin: top edge enters within top 30% of viewport
        { rootMargin: "0px 0px -70% 0px", threshold: 0 }
      );
      observer.observe(el);
      observers.push(observer);
    });

    return () => observers.forEach((o) => o.disconnect());
  }, []);

  /* ── Close dropdown when clicking outside ── */
  useEffect(() => {
    if (!mobileOpen) return;
    const handler = (e: MouseEvent) => {
      if (
        mobileBarRef.current &&
        !mobileBarRef.current.contains(e.target as Node) &&
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [mobileOpen]);

  /* ── Scroll to section: land at the TOP of the section ── */
  const scrollToSection = useCallback(
    (id: string) => {
      const el = document.getElementById(id);
      if (!el) return;

      // Get current mobile bar height (0 on desktop — bar is not rendered)
      const isMobile = window.innerWidth < 1024;
      const offset = isMobile ? tocHeight + 8 : 0;

      const top =
        el.getBoundingClientRect().top + window.scrollY - offset;

      window.scrollTo({ top, behavior: "smooth" });
      setMobileOpen(false);
    },
    [tocHeight]
  );

  const activeSection = sections[activeIndex];

  /* ════════════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════════════ */
  return (
    <>
      {/* ── MOBILE: Sticky top bar ─────────────────────────────── */}
      <div className="lg:hidden">
        {/* The sticky bar itself */}
        <div
          ref={mobileBarRef}
          className="sticky top-0 z-40 bg-white border-b border-purple-100 shadow-sm"
        >
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="w-full flex items-center gap-3 px-4 py-3"
            aria-expanded={mobileOpen}
            aria-controls="mobile-toc-dropdown"
          >
            {/* Icon for active section */}
            <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#6b2fa5]/10 flex items-center justify-center">
              <activeSection.Icon className="w-3.5 h-3.5 text-[#6b2fa5]" />
            </div>

            {/* Section number + title */}
            <div className="flex-1 text-left min-w-0">
              <p className="text-[10px] font-black tracking-widest uppercase text-[#6b2fa5]/50 leading-none mb-0.5">
                Section {String(activeIndex + 1).padStart(2, "0")}
              </p>
              <p className="text-sm font-bold text-slate-800 truncate leading-tight">
                {activeSection.label}
              </p>
            </div>

            {/* Progress badge */}
            <span className="flex-shrink-0 text-[10px] font-bold text-[#6b2fa5]/50 tabular-nums mr-1">
              {activeIndex + 1}/{sections.length}
            </span>

            {/* Chevron */}
            <ChevronDown
              className={`flex-shrink-0 w-4 h-4 text-slate-400 transition-transform duration-200 ${
                mobileOpen ? "rotate-180" : ""
              }`}
            />
          </button>

          {/* Thin progress bar along bottom of sticky bar */}
          <div className="h-0.5 bg-purple-100">
            <div
              className="h-full bg-[#6b2fa5] transition-all duration-300"
              style={{ width: `${((activeIndex + 1) / sections.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Slide-down section list */}
        <div
          id="mobile-toc-dropdown"
          ref={dropdownRef}
          className={[
            "sticky z-30 bg-white border-b border-purple-100 shadow-lg overflow-hidden transition-all duration-300 ease-in-out",
            // top = height of the bar above (set via inline style below)
            mobileOpen ? "max-h-[70vh] overflow-y-auto" : "max-h-0",
          ].join(" ")}
          style={{ top: tocHeight }}
        >
          <ol className="py-2 px-3">
            {sections.map((s, i) => {
              const isActive = activeIndex === i;
              return (
                <li key={s.id}>
                  <button
                    onClick={() => scrollToSection(s.id)}
                    className={[
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors duration-150",
                      isActive
                        ? "bg-purple-50 text-[#6b2fa5]"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                    ].join(" ")}
                  >
                    <span
                      className={`text-[10px] font-black tabular-nums w-5 flex-shrink-0 ${
                        isActive ? "text-[#6b2fa5]" : "text-slate-300"
                      }`}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div
                      className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                        isActive ? "bg-[#6b2fa5]/10" : "bg-slate-100"
                      }`}
                    >
                      <s.Icon
                        className={`w-3 h-3 ${isActive ? "text-[#6b2fa5]" : "text-slate-400"}`}
                      />
                    </div>
                    <span
                      className={`text-sm flex-1 leading-tight ${
                        isActive ? "font-bold text-[#6b2fa5]" : "font-medium"
                      }`}
                    >
                      {s.label}
                    </span>
                    {isActive && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#6b2fa5] flex-shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* ── DESKTOP: Sticky sidebar ────────────────────────────── */}
      <nav
        aria-label="Privacy Policy Contents"
        className="hidden lg:block sticky top-28 max-h-[calc(100vh-8rem)] overflow-y-auto w-64 flex-shrink-0 bg-white border border-purple-100 rounded-2xl p-5 shadow-sm scrollbar-thin scrollbar-thumb-purple-200 scrollbar-track-transparent"
      >
        {/* Header */}
        <div className="flex items-center gap-2 mb-4 pb-4 border-b border-purple-100">
          <span className="w-2.5 h-2.5 rounded-full bg-[#6b2fa5] flex-shrink-0" />
          <p className="text-[10px] font-black tracking-widest uppercase text-[#6b2fa5]">
            Contents
          </p>
          <span className="ml-auto text-[10px] font-semibold text-purple-300">
            {sections.length} sections
          </span>
        </div>

        {/* List */}
        <ol className="space-y-0.5">
          {sections.map((s, i) => {
            const isActive = activeIndex === i;
            return (
              <li key={s.id}>
                <button
                  onClick={() => scrollToSection(s.id)}
                  className={[
                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all duration-150",
                    isActive
                      ? "bg-purple-50 text-[#6b2fa5]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700",
                  ].join(" ")}
                >
                  <span
                    className={`text-[10px] font-black tabular-nums w-5 flex-shrink-0 ${
                      isActive ? "text-[#6b2fa5]" : "text-slate-300"
                    }`}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div
                    className={`flex-shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${
                      isActive ? "bg-[#6b2fa5]/10" : ""
                    }`}
                  >
                    <s.Icon
                      className={`w-3.5 h-3.5 ${isActive ? "text-[#6b2fa5]" : "text-slate-400"}`}
                    />
                  </div>
                  <span
                    className={`text-[13px] flex-1 leading-tight ${
                      isActive ? "font-bold text-[#6b2fa5]" : "font-medium"
                    }`}
                  >
                    {s.label}
                  </span>
                  {isActive && (
                    <span className="w-1.5 h-1.5 rounded-full bg-[#6b2fa5] flex-shrink-0 animate-pulse" />
                  )}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}