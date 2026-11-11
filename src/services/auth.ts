import { getSupabaseClient } from './supabase';

// v2: sessions created with the old shared passwords are no longer valid
const AUTH_STORAGE_KEY = 'portal_auth_session_v2';
const PASSWORD_STORAGE_KEY = 'portal_admin_password';
const DEFAULT_PASSWORD = 'admin'; // Initial clean default password

export interface AuthSession {
  isLoggedIn: boolean;
  userRole: 'admin' | 'staff';
  username: string;
  loginTime: string;
}

/**
 * Retrieves the stored admin password or returns the default.
 */
export function getAdminPassword(): string {
  try {
    if (typeof localStorage !== 'undefined') {
      const stored = localStorage.getItem(PASSWORD_STORAGE_KEY);
      if (stored) return stored;
    }
  } catch (e) {
    console.error('Failed to get admin password from storage', e);
  }
  return DEFAULT_PASSWORD;
}

/**
 * Changes the admin password.
 */
export function setAdminPassword(newPassword: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(PASSWORD_STORAGE_KEY, newPassword);
    }
  } catch (e) {
    console.error('Failed to save admin password', e);
  }
}

/**
 * Checks if user is currently logged in.
 */
export function isAuthenticated(): boolean {
  try {
    if (typeof localStorage !== 'undefined') {
      const sessionRaw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionRaw) {
        const session: AuthSession = JSON.parse(sessionRaw);
        return Boolean(session?.isLoggedIn);
      }
    }
  } catch (e) {
    console.error('Failed to check auth state', e);
  }
  return false;
}

/**
 * Gets the current auth session or null.
 */
export function getCurrentSession(): AuthSession | null {
  try {
    if (typeof localStorage !== 'undefined') {
      const sessionRaw = localStorage.getItem(AUTH_STORAGE_KEY);
      if (sessionRaw) {
        return JSON.parse(sessionRaw);
      }
    }
  } catch (e) {
    console.error('Failed to get current session', e);
  }
  return null;
}

// SHA-256 of the owner's password; only this password unlocks the portal
const OWNER_PASSWORD_SHA256 = '79bee0d5ab7149c3ff8633760e39f6c49ca25f033b14e557b5ca99c27c174950';

async function sha256Hex(text: string): Promise<string> {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Logs in with the owner's password (single-user portal).
 * The email parameter is kept for compatibility but no longer used.
 */
export async function loginWithCredentials(
  password: string,
  _email?: string
): Promise<{ success: boolean; message: string }> {
  if ((await sha256Hex(password.trim())) === OWNER_PASSWORD_SHA256) {
    const session: AuthSession = {
      isLoggedIn: true,
      userRole: 'admin',
      username: 'Owner',
      loginTime: new Date().toISOString(),
    };
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
    }
    window.dispatchEvent(new CustomEvent('portal_auth_changed', { detail: session }));
    return { success: true, message: 'Access granted. Welcome back!' };
  }

  return { success: false, message: 'Incorrect password. Please try again.' };
}

/**
 * Logs out the user.
 */
export function logoutUser(): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
    // Also sign out from Supabase client if active
    try {
      getSupabaseClient().auth.signOut().catch(() => {});
    } catch {}
    
    window.dispatchEvent(new CustomEvent('portal_auth_changed', { detail: null }));
  } catch (e) {
    console.error('Failed to log out', e);
  }
}

/**
 * Updates the admin password given the correct old password.
 */
export function updateAdminPassword(
  oldPassword: string,
  newPassword: string
): { success: boolean; message: string } {
  const currentPassword = getAdminPassword();
  if (oldPassword.trim() !== currentPassword) {
    return { success: false, message: 'Current password does not match.' };
  }

  if (newPassword.trim().length < 4) {
    return { success: false, message: 'New password must be at least 4 characters long.' };
  }

  setAdminPassword(newPassword.trim());
  return { success: true, message: 'Password successfully updated!' };
}
