import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router';
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react';
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
  const menuButton = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const reducedMotion = useReducedMotion();
  const spring = reducedMotion ? { type: 'tween' as const, duration: 0 } : { type: 'spring' as const, stiffness: 380, damping: 34 };
  useEffect(() => {
    const observer = new MutationObserver(() => setDark(document.documentElement.dataset.theme === 'dark'));
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);
  useEffect(() => { setOpen(false); }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault(); setOpen(false); menuButton.current?.focus();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [open]);
  const toggle = () => { const next = document.documentElement.dataset.theme !== 'dark'; setDark(next); setTheme(next ? 'dark' : 'light'); };
  return (
    <LayoutGroup id="primary-navigation"><header className="civic-topnav sticky top-0 z-50 border-b border-hairline bg-surface">
      <nav className="mx-auto flex h-16 max-w-[1360px] items-center gap-3 px-5 text-[13px] sm:px-8 lg:gap-6" aria-label="Primary">
        <NavLink to="/" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2.5 text-xl font-semibold tracking-tight">
          <span className="civic-brand-mark flex h-8 w-8 items-center justify-center rounded-full bg-primary text-on-primary"><MapPin size={18} strokeWidth={2} /></span>LeadNet<span className="hidden border-l border-hairline pl-4 text-xs font-normal tracking-normal text-ink-3 xl:inline">Bengaluru, on the record.</span>
        </NavLink>
        <div className="hidden flex-1 items-center justify-center gap-1 text-ink-3 lg:flex">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => `civic-nav-link relative flex min-h-11 items-center rounded-pill px-3.5 ${isActive ? 'font-medium text-ink' : 'hover:text-ink'}`}>
              {({ isActive }) => <>{isActive && <motion.span layoutId="desktop-active-route" className="civic-nav-link__indicator absolute inset-0 rounded-pill bg-fill" transition={spring} />}<span className="relative">{l.label}</span></>}
            </NavLink>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2 lg:ml-0"><button type="button" onClick={toggle} className="grid h-11 w-11 place-items-center rounded-full text-ink-3 hover:bg-fill max-[360px]:hidden" aria-label={dark ? 'Use light theme' : 'Use dark theme'} title={`Theme: ${getTheme()}`}><AnimatePresence initial={false}><motion.span key={dark ? 'light' : 'dark'} className="col-start-1 row-start-1 inline-flex" initial={{ opacity: 0, rotate: reducedMotion ? 0 : -25, scale: reducedMotion ? 1 : 0.75 }} animate={{ opacity: 1, rotate: 0, scale: 1 }} exit={{ opacity: 0, rotate: reducedMotion ? 0 : 25, scale: reducedMotion ? 1 : 0.75 }} transition={{ duration: reducedMotion ? 0 : 0.18 }}>{dark ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}</motion.span></AnimatePresence></button>
        <NavLink to="/report" onClick={() => setOpen(false)} className="flex min-h-11 items-center gap-2 rounded-pill bg-primary px-4 font-medium text-on-primary sm:px-5">
          <span className="sm:hidden">Report</span><span className="hidden sm:inline">Report an issue</span><ArrowUpRight size={14} />
        </NavLink>
        <button ref={menuButton} type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-controls="mobile-nav" aria-label={open ? 'Close menu' : 'Open menu'} className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-fill lg:hidden">{open ? <X size={20} aria-hidden="true" /> : <Menu size={20} aria-hidden="true" />}</button></div>
      </nav>
      <div className="lg:hidden" aria-hidden={!open} inert={!open}><AnimatePresence initial={false}>{open && <motion.nav id="mobile-nav" key="mobile-nav" aria-label="Mobile" className="overflow-hidden border-t border-hairline" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ height: spring, opacity: { duration: reducedMotion ? 0 : 0.16 } }}><div className="px-5 pb-4 pt-2">{LINKS.map((l) => <NavLink key={l.to} to={l.to} onClick={() => setOpen(false)} className={({ isActive }) => `relative flex min-h-12 items-center justify-between rounded-md px-3 text-sm ${isActive ? 'font-semibold text-ink' : 'text-ink-3'}`}>{({ isActive }) => <>{isActive && <motion.span layoutId="mobile-active-route" className="civic-nav-link__indicator absolute inset-0 rounded-md bg-fill" transition={spring} />}<span className="relative">{l.label}</span><ArrowUpRight size={14} className="relative" aria-hidden="true" /></>}</NavLink>)}<button type="button" onClick={toggle} className="mt-2 flex min-h-11 w-full items-center justify-between border-t border-hairline px-3 pt-2 text-sm text-ink-3 min-[361px]:hidden"><span>{dark ? 'Use light theme' : 'Use dark theme'}</span>{dark ? <Sun size={17} aria-hidden="true" /> : <Moon size={17} aria-hidden="true" />}</button></div></motion.nav>}</AnimatePresence></div>
    </header></LayoutGroup>
  );
}
