import { useEffect, useState } from 'react';
import { NavLink } from 'react-router';
import { ArrowUpRight, MapPin, Menu, Moon, Sun, X } from 'lucide-react';
import { getTheme, setTheme } from '../../lib/theme.ts';

const LINKS = [
  { to: '/map', label: 'Explore' },
  { to: '/ledger', label: 'Public ledger' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/officer', label: 'Officer' },
];

export function TopNav() {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.dataset.theme === 'dark');
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.dataset.theme === 'dark'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  const toggle = () => { const next = document.documentElement.dataset.theme !== 'dark'; setDark(next); setTheme(next ? 'dark' : 'light'); };
  return (
    <header className="sticky top-0 z-50 border-b border-hairline bg-surface">
      <nav className="mx-auto flex h-[76px] max-w-[1440px] items-center gap-3 px-5 text-[13px] sm:px-10 lg:gap-6" aria-label="Primary">
        <NavLink to="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary"><MapPin size={18} strokeWidth={2} /></span>LeadNet<span className="hidden border-l border-hairline pl-4 text-xs font-normal tracking-normal text-ink-3 xl:inline">Bengaluru, on the record.</span>
        </NavLink>
        <div className="hidden flex-1 items-center justify-center gap-7 text-ink-3 lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `flex min-h-11 items-center ${isActive ? 'font-medium text-ink' : 'hover:text-ink'}`}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0"><button type="button" onClick={toggle} className="flex h-11 w-11 items-center justify-center rounded-full text-ink-3 hover:bg-fill max-[360px]:hidden" aria-label={dark ? 'Use light theme' : 'Use dark theme'} title={`Theme: ${getTheme()}`}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <NavLink to="/report" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 rounded-pill bg-primary px-4 font-medium text-on-primary sm:px-5">
          <span className="sm:hidden">Report</span><span className="hidden sm:inline">Report an issue</span><ArrowUpRight size={14} />
        </NavLink>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-fill lg:hidden">{open ? <X size={20} /> : <Menu size={20} />}</button></div>
      </nav>
      {open && <nav id="mobile-nav" aria-label="Mobile" className="border-t border-hairline px-5 pb-4 lg:hidden">{LINKS.map((l) => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className={({ isActive }) => `flex min-h-12 items-center border-b border-hairline text-sm ${isActive ? 'font-semibold' : 'text-ink-3'}`}>{l.label}</NavLink>)}</nav>}
    </header>
  );
}
