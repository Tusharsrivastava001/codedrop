const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

export const API_BASE_URL = API_BASE;

export function createSnippet(snippet) {
  return request('/snippets', {
    method: 'POST',
    body: JSON.stringify(snippet)
  });
}

export function getSnippet(id) {
  return request(`/snippets/${id}`);
}

export function unlockSnippet(id, password) {
  return request(`/snippets/${id}/verify`, {
    method: 'POST',
    body: JSON.stringify({ password })
  });
}

export function forkSnippet(id) {
  return request(`/snippets/${id}/fork`, {
    method: 'POST'
  });
}

export function getRecentSnippets() {
  return request('/snippets/recent');
}

export function getStats() {
  return request('/stats');
}

export function searchSnippets(query, language, sort = 'newest', page = 1) {
  const params = new URLSearchParams();
  if (query) {
    params.set('q', query);
  }
  if (language) {
    params.set('language', language);
  }
  params.set('sort', sort);
  params.set('page', String(page));
  return request(`/snippets/search?${params.toString()}`);
}
