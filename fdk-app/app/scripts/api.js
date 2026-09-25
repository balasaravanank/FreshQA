// Inside Freshdesk, calls go through FDK request templates (secret stays server-side).
// In the browser preview served by the backend at /preview, calls go straight to /api.
window.QA = (function () {
  const TEMPLATES = { GET: 'qaGet', POST: 'qaPost', PUT: 'qaPut', PATCH: 'qaPatch' };
  let client = null;

  async function init() {
    if (typeof window.app !== 'undefined' && window.app.initialized) {
      client = await window.app.initialized();
    }
    return client;
  }

  function errorMessage(data, fallback) {
    if (!data) return fallback;
    return data.error + (data.details ? ': ' + [].concat(data.details).join('; ') : '');
  }

  async function call(method, path, body) {
    if (client) {
      try {
        const res = await client.request.invokeTemplate(TEMPLATES[method], {
          context: { path },
          body: body ? JSON.stringify(body) : undefined,
        });
        return JSON.parse(res.response);
      } catch (err) {
        let data = null;
        try { data = JSON.parse(err.response); } catch (e) { /* non-JSON error body */ }
        throw new Error(errorMessage(data, 'Request failed (' + err.status + ')'));
      }
    }
    const headers = { 'Content-Type': 'application/json' };
    if (window.QA_PREVIEW_SECRET) headers['X-QA-Secret'] = window.QA_PREVIEW_SECRET;
    const res = await fetch('/api' + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(errorMessage(data, 'Request failed (' + res.status + ')'));
    return data;
  }

  async function currentUserName() {
    if (!client) return 'Preview user';
    try {
      const { loggedInUser } = await client.data.get('loggedInUser');
      return (loggedInUser.contact && loggedInUser.contact.name) || 'Agent';
    } catch (e) {
      return 'Agent';
    }
  }

  return {
    init,
    currentUserName,
    isPreview: () => !client,
    client: () => client,
    get: (p) => call('GET', p),
    post: (p, b) => call('POST', p, b),
    put: (p, b) => call('PUT', p, b),
    patch: (p, b) => call('PATCH', p, b),
  };
})();
