import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { loadDatabase, loadEnvironment, saveDatabase, database } from "./src/database.js";
import { hashPassword, isValidEmail, isValidName, isValidPassword, normalizeEmail } from "./src/security.js";

const terminal = createInterface({ input: stdin, output: stdout });

try {
  await loadEnvironment();
  await loadDatabase();

  const name = (await terminal.question("Nome do personal: ")).trim();
  const email = normalizeEmail(await terminal.question("E-mail de acesso: "));
  const password = await terminal.question("Senha (mínimo de 12 caracteres): ");

  if (!isValidName(name) || !isValidEmail(email) || !isValidPassword(password, 12)) {
    throw new Error("Confira o nome e o e-mail. Use uma senha de 12 a 72 caracteres, sem emojis.");
  }

  if (database.users.some((user) => user.email === email)) {
    throw new Error("Já existe uma conta com este e-mail.");
  }
  if (database.users.some((user) => user.role === "PERSONAL" && user.active !== false)) {
    throw new Error("Já existe uma conta de personal ativa.");
  }

  const personal = {
    id: randomUUID(),
    name,
    email,
    role: "PERSONAL",
    passwordHash: await hashPassword(password),
    phone: "",
    notes: "",
    active: true,
    createdAt: new Date().toISOString(),
  };

  database.users.push(personal);
  await saveDatabase();
  console.log(`Acesso do personal criado para ${email}.`);
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
} finally {
  terminal.close();
}
