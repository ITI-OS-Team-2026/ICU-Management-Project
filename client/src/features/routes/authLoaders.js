import { redirect } from 'react-router-dom';
import { authService } from '../services/authService';
import { useAuthStore } from '../store/authStore';

/** Fetch current user; syncs zustand. Returns null when unauthenticated. */
async function resolveSession() {
  try {
    const user = await authService.getMe();
    useAuthStore.getState().setUser(user);
    return user;
  } catch (error) {
    const clearSession = error?.response?.data?.clearSession;
    if (error?.response?.status === 401 || clearSession) {
      useAuthStore.getState().clearUser();
      return null;
    }
    // Network / unexpected: clear optimistic session, treat as logged out
    useAuthStore.getState().clearUser();
    return null;
  }
}

/** Guest-only: redirect authenticated users away from /login. */
export async function loginLoader() {
  const user = await resolveSession();
  if (user) {
    throw redirect('/');
  }
  return null;
}

/** Protected: require a valid session cookie. */
export async function requireAuthLoader() {
  const user = await resolveSession();
  if (!user) {
    throw redirect('/login');
  }
  return { user };
}

/**
 * Role guard factory — wraps requireAuthLoader with a role check.
 * Redirects to '/' (not a 403 page) if the user's role is not allowed.
 * Usage: loader: roleGuardLoader(['SYSTEM_ADMIN'])
 */
export function roleGuardLoader(allowedRoles) {
  return async function () {
    const user = await resolveSession();
    if (!user) {
      throw redirect('/login');
    }
    if (!allowedRoles.includes(user.role)) {
      throw redirect('/');
    }
    return { user };
  };
}
