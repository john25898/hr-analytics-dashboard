// Lightweight credential auth for the UJTP HR Management System.
// Mirrors the CHAK/CMaT enterprise login: validates against the official
// roster credentials so Patrick (HR) and Program HR can sign in securely.

export interface AuthUser {
  email: string;
  name: string;
  role: "hr" | "program_hr";
  jobTitle: string;
  facility: string;
  county: string;
  phone: string;
}

interface CredentialUser extends AuthUser {
  password: string;
}

const USERS: Record<string, CredentialUser> = {
  "patrick.mutua.karuti@chak.org": {
    email: "patrick.mutua.karuti@chak.org",
    password: "Chak!GgbDZHt3",
    name: "Patrick Mutua Karuti",
    role: "hr",
    jobTitle: "Human Resource Officer",
    facility: "Theera Health Centre",
    county: "Meru",
    phone: "0721220174",
  },
  "hr@chak.org": {
    email: "hr@chak.org",
    password: "Chak!PAFJRE25",
    name: "Program HR",
    role: "program_hr",
    jobTitle: "Human Resource Officer",
    facility: "Program Office",
    county: "",
    phone: "",
  },
};

export function authenticate(email: string, password: string): AuthUser | null {
  const key = email.trim().toLowerCase();
  const user = USERS[key];
  if (!user || user.password !== password) return null;
  const { password: _pw, ...safe } = user;
  return safe;
}

const SESSION_KEY = "ujtp-hr-session";

export function loadSession(): AuthUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.email || !parsed?.role) return null;
    return parsed as AuthUser;
  } catch {
    return null;
  }
}

export function saveSession(user: AuthUser) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
  } catch {
    // ignore storage errors
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore storage errors
  }
}
