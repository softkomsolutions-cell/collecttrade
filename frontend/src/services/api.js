function createRequestHeaders(token, hasBody) {
  const headers = {};
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

function resolveApiUrl(path) {
  const base = import.meta?.env?.VITE_API_URL;
  if (!base) {
    return path;
  }
  const trimmedBase = String(base).replace(/\/+$/, "");
  const trimmedPath = String(path || "");
  if (!trimmedPath.startsWith("/")) {
    return trimmedPath;
  }
  return `${trimmedBase}${trimmedPath}`;
}

/**
 * Minimal JSON request helper shared across the frontend.
 * - Uses `VITE_API_URL` as an optional base.
 * - Throws an Error with `status` and `payload` on non-2xx.
 * - Supports `timeoutMs`.
 */
export async function requestJson(path, options = {}) {
  const { method = "GET", body, token, timeoutMs } = options;
  const url = resolveApiUrl(path);

  const controller = timeoutMs ? new AbortController() : null;
  const timeoutId = timeoutMs
    ? setTimeout(() => controller.abort(new Error("Request timeout")), timeoutMs)
    : null;

  try {
    const response = await fetch(url, {
      method,
      signal: controller?.signal,
      headers: createRequestHeaders(token, body !== undefined),
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      const error = new Error(data?.error || data?.message || response.statusText);
      error.status = response.status;
      error.payload = data;
      throw error;
    }

    return data;
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

