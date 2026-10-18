import { isRouteErrorResponse, Link, useRouteError } from 'react-router';

export function RouteError() {
  const err = useRouteError();
  const message = isRouteErrorResponse(err) ? `${err.status} ${err.statusText}` : err instanceof Error ? err.message : 'Unknown error';
  return (
    <div className="mx-auto max-w-xl px-6 py-24 text-center">
      <h1 className="text-[28px] font-semibold tracking-tight">Something went wrong</h1>
      <p className="mt-3 text-ink-3">{message}</p>
      <Link to="/" className="mt-8 inline-block rounded-pill bg-primary px-5 py-2.5 text-[15px] font-medium text-on-primary">
        Back to Namma Civic
      </Link>
    </div>
  );
}
