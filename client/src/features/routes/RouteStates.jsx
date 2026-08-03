import { useRouteError } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

/**
 * The two states a route can be in before its page renders: still fetching its
 * chunk, or failed outright.
 *
 * They live here rather than in `router.jsx` because that module exports the
 * router config — a non-component — and a file that mixes the two breaks Fast
 * Refresh for everything in it.
 */

/**
 * Shown while a route's chunk is in flight. Only ever appears on the first
 * visit to that route, since the browser caches the chunk afterwards.
 *
 * Deliberately quiet: a full-page skeleton guessing at a layout it does not
 * know flashes and shifts more than a still spinner does.
 */
export function RouteFallback() {
  return (
    <div className="flex min-h-[60svh] items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden="true" />
      <span className="sr-only">Loading page…</span>
    </div>
  );
}

export function RouteError() {
  const error = useRouteError();
  console.error('ROUTE ERROR:', error);

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not load this page. Refresh and try again.
        </p>
        <div className="mt-4 text-xs text-red-500 max-w-lg text-left overflow-auto p-2 bg-red-500/10 rounded">
          {error?.message || error?.statusText || 'Unknown error'}
          <br />
          {error?.stack}
        </div>
      </div>
    </div>
  );
}
