export const SESSION_STORAGE_KEY = 'biblioteca-pimentasvii:session-token';
export const AUTH_CHANGED_EVENT = 'biblioteca:auth-changed';
export const LIBRARY_UPDATED_EVENT = 'biblioteca:library-updated';

export const getStoredSessionToken = () => {
  if (typeof window === 'undefined') {
    return null;
  }

  return window.localStorage.getItem(SESSION_STORAGE_KEY);
};

export const setStoredSessionToken = (token: string) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(SESSION_STORAGE_KEY, token);
};

export const clearStoredSessionToken = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};

export const emitAuthChanged = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
};

export const emitLibraryUpdated = () => {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(new Event(LIBRARY_UPDATED_EVENT));
};
