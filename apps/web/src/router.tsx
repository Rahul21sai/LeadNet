import { createBrowserRouter } from 'react-router';
import { AppShell } from './components/layout/AppShell.tsx';
import { RouteError } from './components/layout/RouteError.tsx';

/**
 * Route table — a contract. Each route lazy-loads a module owned by one build agent:
 *   /                 routes/home        (design-system agent)
 *   /map              routes/map         (map agent)
 *   /report           routes/report      (report agent)
 *   /issue/:id        routes/issue       (issue agent)
 *   /pass/:id         routes/pass        (issue agent)
 *   /officer          routes/officer     (officer agent)
 *   /ledger           routes/ledger      (ledger agent)
 *   /ward/:id         routes/ward        (ledger agent)
 *   /projects/:id     routes/project     (ledger agent)
 *   /how-it-works     routes/methodology (ledger agent)
 */
export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, lazy: () => import('./routes/community/index.tsx') },
      { path: 'community', lazy: () => import('./routes/community/index.tsx') },
      { path: 'city', lazy: () => import('./routes/home/index.tsx') },
      { path: 'map', lazy: () => import('./routes/map/index.tsx') },
      { path: 'report', lazy: () => import('./routes/report/index.tsx') },
      { path: 'issue/:id', lazy: () => import('./routes/issue/index.tsx') },
      { path: 'pass/:id', lazy: () => import('./routes/pass/index.tsx') },
      { path: 'officer', lazy: () => import('./routes/officer/index.tsx') },
      { path: 'ledger', lazy: () => import('./routes/ledger/index.tsx') },
      { path: 'ward/:id', lazy: () => import('./routes/ward/index.tsx') },
      { path: 'projects/:id', lazy: () => import('./routes/project/index.tsx') },
      { path: 'how-it-works', lazy: () => import('./routes/methodology/index.tsx') },
      { path: '*', lazy: () => import('./routes/not-found/index.tsx') },
    ],
  },
]);
