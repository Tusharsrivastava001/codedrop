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

export function createSnippet(snippet) {
  return request('/snippets', {
    method: 'POST',
    body: JSON.stringify(snippet)
  });
}

export function getSnippet(id) {
  return request(`/snippets/${id}`);
}

export function getRecentSnippets() {
  return request('/snippets/recent');
}
