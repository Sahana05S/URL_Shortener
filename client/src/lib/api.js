export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "content-type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (response.status === 204) return null;
  const body = await response.json();
  if (!response.ok) {
    const error = new Error(body.error?.message || "Request failed.");
    error.code = body.error?.code;
    error.fields = body.error?.fields;
    throw error;
  }
  return body.data;
}
