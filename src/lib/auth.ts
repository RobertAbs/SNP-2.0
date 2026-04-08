import { cookies } from "next/headers";

const ADMIN_LOGIN = process.env.ADMIN_LOGIN || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin2025!";

export interface SessionUser {
  login: string;
  name: string;
  role: "admin";
}

const SESSION_COOKIE = "snp2_session";

export function validateCredentials(login: string, password: string): SessionUser | null {
  if (login === ADMIN_LOGIN && password === ADMIN_PASSWORD) {
    return { login, name: "Администратор", role: "admin" };
  }
  return null;
}

export function encodeSession(user: SessionUser): string {
  return Buffer.from(JSON.stringify(user)).toString("base64");
}

export function decodeSession(token: string): SessionUser | null {
  try {
    const parsed = JSON.parse(Buffer.from(token, "base64").toString("utf-8"));
    if (parsed && parsed.login && parsed.name && parsed.role) return parsed as SessionUser;
    return null;
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return decodeSession(token);
}

export { SESSION_COOKIE };
