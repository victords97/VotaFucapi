import { api } from './api';

const CACHE_TTL_MS = 60_000;

let turmasCache = null;
let turmasCacheAt = 0;
let turmasPromise = null;

function cacheIsFresh() {
  return turmasCache && Date.now() - turmasCacheAt < CACHE_TTL_MS;
}

export function primeTurmasCache(data) {
  turmasCache = Array.isArray(data) ? data : [];
  turmasCacheAt = Date.now();
}

export async function fetchTurmas({ force = false } = {}) {
  if (!force && cacheIsFresh()) {
    return turmasCache;
  }

  if (!force && turmasPromise) {
    return turmasPromise;
  }

  turmasPromise = api.get('/turmas').then((response) => {
    primeTurmasCache(response.data || []);
    turmasPromise = null;
    return turmasCache;
  }).catch((error) => {
    turmasPromise = null;
    throw error;
  });

  return turmasPromise;
}

export function prefetchTurmas() {
  void fetchTurmas().catch(() => {});
}
