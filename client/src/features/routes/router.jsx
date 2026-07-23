import { createBrowserRouter } from 'react-router-dom';

import HomePage from '../pages/HomePage';
import LoginPage from '../pages/LoginPage';
import { loginLoader, requireAuthLoader } from './authLoaders';

function RouteError() {
  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl font-semibold text-foreground">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We could not load this page. Refresh and try again.
        </p>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
    loader: requireAuthLoader,
    errorElement: <RouteError />,
  },
  {
    path: '/login',
    element: <LoginPage />,
    loader: loginLoader,
    errorElement: <RouteError />,
  },
]);
