import { AuthResponse, SessionData } from "@/lib/types";

const STORAGE_KEY = "ecommere_session";

export function saveSession(response: AuthResponse): SessionData {
  const session: SessionData = {
    token: response.accessToken,
    userId: response.userId,
    fullName: response.fullName,
    email: response.email,
    role: response.role,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  return session;
}

export function getSession(): SessionData | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

export function clearSession() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(STORAGE_KEY);
}

export function isAdminSession(): boolean {
  const session = getSession();
  return session?.role === "ROLE_ADMIN";
}
