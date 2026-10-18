import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { MotionConfig, motion, useReducedMotion } from 'motion/react';
import { Info } from 'lucide-react';
import { TopNav } from './TopNav.tsx';
import { isOfflineDemo } from '../../lib/demo.ts';
import '../ui/motion.css';

export function AppShell() {
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  return (
    <MotionConfig reducedMotion="user"><div className="min-h-dvh bg-canvas text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <TopNav />
      {isOfflineDemo && <div role="status" className="civic-demo-notice"><div><span className="civic-demo-label"><Info size={13} aria-hidden="true" />Local demo</span><span>City examples are fictional. Your community posts and reactions stay on this device. Live publishing, AI and email require the connected service.</span></div></div>}
      <main id="main">
        <motion.div key={location.pathname} className="min-w-0" initial={{ opacity: reducedMotion ? 1 : 0.6 }} animate={{ opacity: 1 }} transition={{ duration: reducedMotion ? 0 : 0.2, ease: 'easeOut' }}><Outlet /></motion.div>
      </main>
      {location.pathname !== '/map' && <footer className="mt-14 border-t border-hairline px-5 py-7 sm:px-8"><div className="mx-auto flex max-w-[1296px] flex-wrap justify-between gap-5 text-xs leading-relaxed text-ink-3"><div><Link to="/" className="text-sm font-semibold text-ink">Namma Civic</Link><p className="mt-2">A civic accountability prototype. Demo issues and fictional personas are labelled.</p><p className="mt-1">Ward boundaries: Greater Bengaluru Authority, 2025 delimitation, via <a href="https://data.opencity.in/dataset/gba-wards-delimitation-2025" className="text-link" target="_blank" rel="noreferrer">OpenCity</a>.</p></div><div className="flex flex-wrap gap-5"><Link to="/how-it-works" className="flex min-h-11 items-center">Methodology &amp; data</Link><a href="/samples/CREDITS.md" className="flex min-h-11 items-center">Media credits</a><Link to="/officer" className="flex min-h-11 items-center">Officer demo</Link></div></div></footer>}
      <Toaster position="top-center" />
      <ScrollRestoration />
    </div></MotionConfig>
  );
}
