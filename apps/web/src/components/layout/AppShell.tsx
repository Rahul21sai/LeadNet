import { Link, Outlet, ScrollRestoration, useLocation } from 'react-router';
import { Toaster } from 'sonner';
import { TopNav } from './TopNav.tsx';
import { isOfflineDemo } from '../../lib/demo.ts';

export function AppShell() {
  const location = useLocation();
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <TopNav />
      {isOfflineDemo && <div role="status" className="border-b border-hairline bg-st-awaiting-tint px-5 py-2 text-center text-xs leading-relaxed text-st-awaiting">Read-only demo. All issue records and outcomes are fictional. Posting and verification need the connected version.</div>}
      <main id="main">
        <Outlet />
      </main>
      {location.pathname !== '/map' && <footer className="mt-16 border-t border-hairline px-5 py-8 sm:px-10"><div className="mx-auto flex max-w-[1360px] flex-wrap justify-between gap-6 text-xs leading-relaxed text-ink-3"><div><Link to="/" className="text-sm font-semibold text-ink">LeadNet</Link><p className="mt-2">A civic accountability prototype. Demo issues and fictional personas are labelled.</p><p className="mt-1">Ward boundaries: Greater Bengaluru Authority, 2025 delimitation, via <a href="https://data.opencity.in/dataset/gba-wards-delimitation-2025" className="text-link" target="_blank" rel="noreferrer">OpenCity</a>.</p></div><div className="flex flex-wrap gap-6"><Link to="/how-it-works" className="flex min-h-11 items-center">Methodology &amp; data</Link><a href="/samples/CREDITS.md" className="flex min-h-11 items-center">Media credits</a><Link to="/officer" className="flex min-h-11 items-center">Officer demo</Link></div></div></footer>}
      <Toaster position="top-center" />
      <ScrollRestoration />
    </div>
  );
}
