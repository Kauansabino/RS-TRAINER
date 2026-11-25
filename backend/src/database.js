import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const projectDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dataDirectory = path.join(projectDirectory, "backend", "data");
const databaseFile = path.join(dataDirectory, "database.json");

export const database = { users: [], bookings: [], plans: [], progress: [] };

export async function loadEnvironment() {
  try {
    const contents = await readFile(path.join(projectDirectory, ".env"), "utf8");
    for (const line of contents.split(/\r?\n/)) {
      const setting = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!setting || setting[1] in process.env) continue;
      process.env[setting[1]] = setting[2].replace(/^("|')(.*)\1$/, "$2");
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function loadDatabase() {
  try {
    const savedData = JSON.parse(await readFile(databaseFile, "utf8"));
    database.users = Array.isArray(savedData.users) ? savedData.users : [];
    database.bookings = Array.isArray(savedData.bookings) ? savedData.bookings : [];
    database.plans = Array.isArray(savedData.plans) ? savedData.plans : [];
    database.progress = Array.isArray(savedData.progress) ? savedData.progress : [];
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

export async function saveDatabase() {
  await mkdir(dataDirectory, { recursive: true });
  const temporaryFile = `${databaseFile}.${randomUUID()}.tmp`;
  await writeFile(temporaryFile, JSON.stringify(database, null, 2), { mode: 0o600 });
  await rename(temporaryFile, databaseFile);
}
