import { NavLink } from 'react-router';

const LINKS = [
  { to: '/map', label: 'Map' },
  { to: '/ledger', label: 'Ledger' },
  { to: '/how-it-works', label: 'How it works' },
  { to: '/officer', label: 'Officer' },
];

/** v0 placeholder — replaced by the design-system agent. */
export function TopNav() {
  return (
    <header className="material-chrome sticky top-0 z-50 border-x-0 border-t-0">
      <nav className="mx-auto flex h-12 max-w-[1200px] items-center gap-6 px-5 text-[13px]" aria-label="Primary">
        <NavLink to="/" className="font-semibold tracking-tight">
          LeadNet
        </NavLink>
        <div className="flex flex-1 items-center gap-5 text-ink-2">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'text-ink' : 'hover:text-ink')}>
              {l.label}
            </NavLink>
          ))}
        </div>
        <NavLink to="/report" className="rounded-pill bg-primary px-3.5 py-1.5 font-medium text-on-primary">
          Report an issue
        </NavLink>
      </nav>
    </header>
  );
}
