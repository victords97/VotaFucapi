import axios from 'axios';

function normalizeUrl(url) {
  return url.replace(/\/+$/, '');
}

function buildBackendCandidates() {
  const envUrl = import.meta.env.VITE_BACKEND_URL;
  const candidates = [];

  if (envUrl) {
    candidates.push(normalizeUrl(envUrl));
  }

  if (typeof window !== 'undefined' && window.location?.hostname) {
    const protocol = window.location.protocol === 'file:' ? 'http:' : window.location.protocol;
    const hostUrl = normalizeUrl(`${protocol}//${window.location.hostname}:8001`);
    candidates.push(hostUrl);
  }

  candidates.push('http://127.0.0.1:8001', 'http://localhost:8001');

  return [...new Set(candidates)];
}

const HTTPS_SAME_ORIGIN_MODE =
  typeof window !== 'undefined' &&
  window.location?.protocol === 'https:' &&
  Boolean(window.location?.origin);

const BACKEND_CANDIDATES = HTTPS_SAME_ORIGIN_MODE ? [] : buildBackendCandidates();

let resolvedBackendUrl = HTTPS_SAME_ORIGIN_MODE ? normalizeUrl(window.location.origin) : BACKEND_CANDIDATES[0];
let backendResolutionPromise = null;

async function checkBackendHealth(baseUrl) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(`${baseUrl}/api/`, {
      method: 'GET',
      signal: controller.signal,
    });

    return response.ok;
  } catch {
    return false;
  } finally {
    window.clearTimeout(timeoutId);
  }
}

async function resolveBackendUrl() {
  if (HTTPS_SAME_ORIGIN_MODE) {
    return resolvedBackendUrl;
  }

  if (backendResolutionPromise) {
    return backendResolutionPromise;
  }

  backendResolutionPromise = (async () => {
    for (const candidate of BACKEND_CANDIDATES) {
      const healthy = await checkBackendHealth(candidate);
      if (healthy) {
        resolvedBackendUrl = candidate;
        return candidate;
      }
    }

    return resolvedBackendUrl;
  })();

  return backendResolutionPromise;
}

export function getBackendUrl() {
  return resolvedBackendUrl;
}

export const api = axios.create({
  timeout: 30000,
});

api.interceptors.request.use(async (config) => {
  if (HTTPS_SAME_ORIGIN_MODE) {
    const rawUrl = String(config.url || '');
    const normalizedPath = rawUrl.startsWith('/api')
      ? rawUrl
      : `/api/${rawUrl.replace(/^\/+/, '')}`;

    return {
      ...config,
      baseURL: resolvedBackendUrl,
      url: normalizedPath,
    };
  }

  const backendUrl = await resolveBackendUrl();

  return {
    ...config,
    baseURL: config.baseURL || `${backendUrl}/api`,
  };
});
