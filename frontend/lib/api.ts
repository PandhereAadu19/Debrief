const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

async function getAuthToken(): Promise<string | null> {
  try {
    if (typeof window === 'undefined') return null;
    const clerk = (window as any).Clerk;
    if (!clerk?.session) return null;
    return await clerk.session.getToken();
  } catch (error) {
    console.error('Error getting auth token:', error);
    return null;
  }
}

export async function apiRequest(
  endpoint: string,
  token: string | null,
  options: RequestInit = {}
): Promise<Response> {
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const url = `${API_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers,
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  return response;
}

export async function get(endpoint: string, token: string | null): Promise<Response> {
  return apiRequest(endpoint, token, { method: 'GET' });
}

export async function post(endpoint: string, data: any, token: string | null): Promise<Response> {
  return apiRequest(endpoint, token, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function put(endpoint: string, data: any, token: string | null): Promise<Response> {
  return apiRequest(endpoint, token, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function del(endpoint: string, token: string | null): Promise<Response> {
  return apiRequest(endpoint, token, { method: 'DELETE' });
}

export async function postFormData(endpoint: string, formData: FormData, token: string | null): Promise<Response> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers, // no Content-Type — browser sets multipart boundary automatically
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }
  
  return response;
}
