import { createServer } from "node:http";
import { randomUUID } from "node:crypto";
import path from "node:path";
import express from "express";
import {
  database,
  loadDatabase,
  loadEnvironment,
  projectDirectory,
  saveDatabase,
} from "./src/database.js";
import { getUserFromRequest, hashPassword, isValidPassword } from "./src/security.js";
import authRoutes from "./src/routes/auth.js";
import bookingRoutes from "./src/routes/bookings.js";
import personalRoutes, { workoutRouter } from "./src/routes/personal.js";

await loadEnvironment();
await loadDatabase();
await createInitialPersonalAccount();

const app = express();
app.disable("x-powered-by");
app.use(addSecurityHeaders);
app.use(express.json({ limit: "1mb" }));
app.use((req, res, next) => {
  if (!req.body || typeof req.body !== "object") req.body = {};
  next();
});
app.use(checkRequestOrigin);
app.use(attachCurrentUser);

app.get("/api/health", (req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/bookings", bookingRoutes);
app.use("/api/personal", personalRoutes);
app.use("/api/treinos", workoutRouter);

app.use("/assets", express.static(path.join(projectDirectory, "assets")));
app.use("/js", express.static(path.join(projectDirectory, "js")));
app.get("/", (req, res) => res.sendFile(path.join(projectDirectory, "index.html")));
app.get("/index.html", (req, res) => res.sendFile(path.join(projectDirectory, "index.html")));
app.get("/script.js", (req, res) => res.sendFile(path.join(projectDirectory, "script.js")));
app.get("/style.css", (req, res) => res.sendFile(path.join(projectDirectory, "style.css")));

app.use((req, res) => {
  if (req.path.startsWith("/api/")) return res.status(404).json({ message: "Rota não encontrada." });
  return res.status(404).send("Página não encontrada.");
});

app.use(handleErrors);

const port = Number(process.env.PORT) || 3000;
const server = createServer(app);

server.listen(port, "0.0.0.0", () => {
  console.log(`RS Personal Trainer disponível em http://localhost:${port}`);
  if (!process.env.PERSONAL_EMAIL || !process.env.PERSONAL_PASSWORD) {
    console.info("Para criar o acesso do personal, execute: npm run setup:personal");
  }
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

async function createInitialPersonalAccount() {
  const email = process.env.PERSONAL_EMAIL?.trim().toLowerCase();
  const password = process.env.PERSONAL_PASSWORD;
  if (!email || !password) return;
  if (!isValidPassword(password, 12)) {
    throw new Error("PERSONAL_PASSWORD precisa ter entre 12 e 72 caracteres, sem emojis.");
  }

  const existingAccount = database.users.find((user) => user.email === email);
  if (existingAccount) return;

  const account = {
    id: randomUUID(),
    name: "Personal",
    email,
    role: "PERSONAL",
    passwordHash: await hashPassword(password),
    phone: "",
    notes: "",
    active: true,
    createdAt: new Date().toISOString(),
  };

  database.users.push(account);
  await saveDatabase();
  console.log(`Acesso do personal criado para ${email}.`);
}

function addSecurityHeaders(req, res, next) {
  res.set({
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "Referrer-Policy": "same-origin",
  });
  return next();
}

function checkRequestOrigin(req, res, next) {
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(req.method) || !req.headers.origin) return next();

  try {
    if (new URL(req.headers.origin).host !== req.headers.host) {
      return res.status(403).json({ message: "Origem da solicitação não permitida." });
    }
  } catch {
    return res.status(403).json({ message: "Origem da solicitação inválida." });
  }

  return next();
}

function attachCurrentUser(req, res, next) {
  req.user = getUserFromRequest(req);
  return next();
}

function handleErrors(error, req, res, next) {
  if (res.headersSent) return next(error);

  if (error.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Envie um JSON válido." });
  }
  if (error.type === "entity.too.large") {
    return res.status(413).json({ message: "A solicitação excede o limite de tamanho." });
  }

  console.error(error);
  return res.status(500).json({ message: "Erro interno do servidor." });
}
