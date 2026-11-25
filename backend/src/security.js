import { randomBytes } from "node:crypto";
import bcrypt from "bcrypt";
import { database } from "./database.js";

const sessions = new Map();
const SESSION_LENGTH_MS = 7 * 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 12;

export function cleanText(value, maxLength = 500) {
  return typeof value === "string" ? value.trim().slice(0, maxLength) : "";
}

export function normalizeEmail(value) {
  return cleanText(value, 254).toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function isValidName(name) {
  return name.length >= 2 && name.length <= 100;
}

export function isValidPassword(password, minimumLength = 8) {
  return typeof password === "string"
    && password.length >= minimumLength
    && password.length <= 72
    && Buffer.byteLength(password, "utf8") <= 72;
}

export function hashPassword(password) {
  return bcrypt.hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export function createRateLimiter(limit, windowMs, message) {
  const attempts = new Map();

  return (req, res, next) => {
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    const now = Date.now();
    let attempt = attempts.get(ip);

    if (!attempt || attempt.resetAt <= now) {
      attempt = { count: 0, resetAt: now + windowMs };
      attempts.set(ip, attempt);
    }
    if (attempt.count >= limit) return res.status(429).json({ message });

    attempt.count += 1;
    return next();
  };
}

export function getUserFromRequest(req) {
  const token = readSessionToken(req.headers.cookie);
  const session = token && sessions.get(token);

  if (!session || session.expiresAt <= Date.now()) {
    if (token) sessions.delete(token);
    return null;
  }

  return database.users.find((user) => user.id === session.userId && user.active !== false) || null;
}

export function startUserSession(res, user, statusCode = 200) {
  const token = randomBytes(32).toString("base64url");
  const isProduction = process.env.NODE_ENV === "production";

  sessions.set(token, { userId: user.id, expiresAt: Date.now() + SESSION_LENGTH_MS });
  res.cookie("rs_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    maxAge: SESSION_LENGTH_MS,
    path: "/",
  });

  return res.status(statusCode).json({ user: publicUser(user) });
}

export function endUserSession(req, res) {
  const token = readSessionToken(req.headers.cookie);
  if (token) sessions.delete(token);

  res.clearCookie("rs_session", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res.json({ ok: true });
}

export function removeUserSessions(userId) {
  for (const [token, session] of sessions) {
    if (session.userId === userId) sessions.delete(token);
  }
}

export function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone || "",
    notes: user.notes || "",
  };
}

export function requireAuthentication(req, res, next) {
  req.user = getUserFromRequest(req);
  if (!req.user) return res.status(401).json({ message: "Entre na sua conta para continuar." });
  return next();
}

export function requireRole(role) {
  return (req, res, next) => {
    if (req.user?.role !== role) {
      return res.status(403).json({ message: "Você não tem permissão para esta ação." });
    }
    return next();
  };
}

function readSessionToken(cookieHeader = "") {
  const sessionCookie = cookieHeader.split(";").find((cookie) => cookie.trim().startsWith("rs_session="));
  if (!sessionCookie) return null;

  try {
    return decodeURIComponent(sessionCookie.trim().slice("rs_session=".length));
  } catch {
    return null;
  }
}
