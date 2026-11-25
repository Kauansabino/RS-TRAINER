import { Router } from "express";
import { randomUUID } from "node:crypto";
import { database, saveDatabase } from "../database.js";
import {
  hashPassword,
  verifyPassword,
  endUserSession,
  getUserFromRequest,
  publicUser,
  startUserSession,
  createRateLimiter,
  cleanText,
  isValidEmail,
  isValidName,
  isValidPassword,
  normalizeEmail,
} from "../security.js";

const router = Router();
const loginRateLimit = createRateLimiter(10, 15 * 60 * 1000, "Muitas tentativas de login. Aguarde alguns minutos.");
const registrationRateLimit = createRateLimiter(10, 60 * 60 * 1000, "Muitas tentativas de cadastro. Tente novamente mais tarde.");

router.get("/me", (req, res) => {
  const user = getUserFromRequest(req);
  if (!user) return res.status(401).json({ message: "Sessão não autenticada." });
  return res.json({ user: publicUser(user) });
});

router.post("/register", registrationRateLimit, async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 100);
    const email = normalizeEmail(req.body.email);
    const password = req.body.password;

    if (!isValidName(name) || !isValidEmail(email) || !isValidPassword(password)) {
      return res.status(400).json({ message: "Confira o nome e o e-mail. Use uma senha de 8 a 72 caracteres, sem emojis." });
    }

    if (database.users.some((user) => user.email === email)) {
      return res.status(409).json({ message: "Já existe uma conta com este e-mail." });
    }

    const student = {
      id: randomUUID(),
      name,
      email,
      role: "ALUNO",
      passwordHash: await hashPassword(password),
      phone: cleanText(req.body.phone, 40),
      notes: "",
      active: true,
      createdAt: new Date().toISOString(),
    };

    database.users.push(student);
    await saveDatabase();
    return startUserSession(res, student, 201);
  } catch (error) {
    return next(error);
  }
});

router.post("/login", loginRateLimit, async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body.email);
    const password = typeof req.body.password === "string" ? req.body.password : "";
    const user = database.users.find((entry) => entry.email === email && entry.active !== false);

    if (!user) return res.status(401).json({ message: "E-mail ou senha inválidos." });

    const passwordMatches = await verifyPassword(password, user.passwordHash);
    if (!passwordMatches) return res.status(401).json({ message: "E-mail ou senha inválidos." });

    return startUserSession(res, user);
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res) => endUserSession(req, res));

export default router;
