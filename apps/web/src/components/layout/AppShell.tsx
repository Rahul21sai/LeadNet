import { Outlet, ScrollRestoration } from 'react-router';
import { Toaster } from 'sonner';
import { TopNav } from './TopNav.tsx';

/** v0 shell — the design-system agent owns and refines everything under components/layout. */
export function AppShell() {
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-sm focus:bg-surface focus:px-4 focus:py-2">
        Skip to content
      </a>
      <TopNav />
      <main id="main">
        <Outlet />
      </main>
      <Toaster position="top-center" />
      <ScrollRestoration />
    </div>
  );
}
