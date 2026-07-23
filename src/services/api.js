import router from '@/router';

export const AUTH_STORAGE_KEY = 'rahmet_auth';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

function getToken() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw).token : null;
  } catch {
    return null;
  }
}

/**
 * Thin fetch wrapper: adds the API base URL + bearer token, and centrally
 * handles 401 (session gone -> /login) and 402 (subscription inactive ->
 * /subscription-expired) so every view doesn't have to check for them.
 */
export async function apiFetch(path, { method = 'GET', body, skipAuth = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (!skipAuth && token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (response.status === 401 && !skipAuth) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    if (router.currentRoute.value.path !== '/login') {
      router.replace('/login');
    }
    throw new Error('Unauthorized');
  }
  if (response.status === 402) {
    if (router.currentRoute.value.path !== '/subscription-expired') {
      router.replace('/subscription-expired');
    }
    throw new Error('Subscription inactive');
  }

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = (data && data.detail) || `Request failed: ${response.status}`;
    throw new Error(message);
  }
  return data;
}
