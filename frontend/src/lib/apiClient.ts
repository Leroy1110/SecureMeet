const BASE_URL = import.meta.env.VITE_API_URL

if (!BASE_URL) {
  throw new Error("Missing VITE_API_URL environment variable");
}

const buildUrl = (endpoint: string): string => `${BASE_URL}${endpoint}`;

export const post = async <T>(
  endpoint: string,
  data: unknown = null,
  headers?: HeadersInit
): Promise<T> => {
  const mergedHeaders = new Headers(headers);
  const hasBody = data !== null && data !== undefined;

  if (hasBody && !mergedHeaders.has("Content-Type")) {
    mergedHeaders.set("Content-Type", "application/json");
  }

  const response = await fetch(buildUrl(endpoint), {
    method: "POST",
    headers: mergedHeaders,
    body: hasBody ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
        const errorData = await response.json();
        if(errorData?.detail) {
            errorMessage = errorData.detail;
        }
    } catch (error){
      console.error("Failed to parse error response", error);
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
};

export const get = async <T>(endpoint: string, headers?: HeadersInit): Promise<T> => {
  const response = await fetch(buildUrl(endpoint), {
    method: "GET",
    headers,
  });

  if (!response.ok) {
    let errorMessage = `Request failed with status ${response.status}`;

    try {
        const errorData = await response.json();
        if(errorData?.detail) {
            errorMessage = errorData.detail;
        }
    } catch (error){
      console.error("Failed to parse error response", error);
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<T>;
};