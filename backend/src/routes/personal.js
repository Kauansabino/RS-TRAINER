import { Router } from "express";
import { randomUUID } from "node:crypto";
import { database, saveDatabase } from "../database.js";
import {
  hashPassword,
  publicUser,
  removeUserSessions,
  requireAuthentication,
  requireRole,
  cleanText,
  isValidEmail,
  isValidName,
  isValidPassword,
  normalizeEmail,
} from "../security.js";

const router = Router();
const requirePersonal = [requireAuthentication, requireRole("PERSONAL")];

// As rotas de treino ficam aqui porque fazem parte do painel do aluno.
export const workoutRouter = Router();
const requireStudent = [requireAuthentication, requireRole("ALUNO")];

workoutRouter.get("/me", ...requireStudent, (req, res) => {
  const plans = database.plans.filter((plan) => plan.studentId === req.user.id && plan.active);
  return res.json({ planos: plans });
});

workoutRouter.post("/progresso", ...requireStudent, async (req, res, next) => {
  try {
    const exerciseId = req.body.exerciseId;
    const hasExercise = database.plans.some((plan) => plan.studentId === req.user.id
      && plan.active
      && plan.days.some((day) => day.exercises.some((exercise) => exercise.id === exerciseId)));
    if (!hasExercise) return res.status(404).json({ message: "Exercício não encontrado no seu plano ativo." });

    const progress = {
      id: randomUUID(),
      userId: req.user.id,
      exerciseId,
      completedAt: new Date().toISOString(),
    };
    database.progress.push(progress);
    await saveDatabase();
    return res.status(201).json({ progresso: progress });
  } catch (error) {
    return next(error);
  }
});

function normalizePlanDays(days) {
  if (!Array.isArray(days) || days.length === 0 || days.length > 14) return null;

  const exerciseIds = new Set();
  const normalizedDays = [];

  for (const day of days) {
    if (!day || typeof day !== "object" || !Array.isArray(day.exercises) || day.exercises.length > 100) return null;

    const exercises = [];
    for (const exercise of day.exercises) {
      const name = cleanText(exercise?.name, 120);
      const sets = Number(exercise?.sets);
      const reps = cleanText(String(exercise?.reps ?? ""), 40);
      if (!name || !Number.isInteger(sets) || sets < 1 || sets > 30 || !reps) return null;

      const id = typeof exercise.id === "string" && exercise.id ? exercise.id : randomUUID();
      if (exerciseIds.has(id)) return null;
      exerciseIds.add(id);

      exercises.push({
        id,
        name,
        muscleGroup: cleanText(exercise.muscleGroup, 80),
        sets,
        reps,
        restSeconds: Math.max(0, Math.min(3600, Number(exercise.restSeconds) || 0)),
        notes: cleanText(exercise.notes, 500),
      });
    }

    normalizedDays.push({
      name: cleanText(day.name, 100) || "Treino",
      dayOfWeek: cleanText(String(day.dayOfWeek ?? ""), 10),
      exercises,
    });
  }

  return normalizedDays;
}

router.get("/alunos", ...requirePersonal, (req, res) => {
  const students = database.users
    .filter((user) => user.role === "ALUNO" && user.active !== false)
    .map(publicUser);
  return res.json({ alunos: students });
});

router.post("/alunos", ...requirePersonal, async (req, res, next) => {
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
      notes: cleanText(req.body.notes, 1000),
      active: true,
      createdAt: new Date().toISOString(),
    };

    database.users.push(student);
    await saveDatabase();
    return res.status(201).json({ aluno: publicUser(student) });
  } catch (error) {
    return next(error);
  }
});

router.patch("/alunos/:studentId", ...requirePersonal, async (req, res, next) => {
  try {
    const student = database.users.find((user) => user.id === req.params.studentId && user.role === "ALUNO");
    if (!student) return res.status(404).json({ message: "Aluno não encontrado." });

    if (req.body.name !== undefined) {
      const name = cleanText(req.body.name, 100);
      if (!isValidName(name)) return res.status(400).json({ message: "O nome precisa ter pelo menos 2 caracteres." });
      student.name = name;
    }
    if (req.body.phone !== undefined) student.phone = cleanText(req.body.phone, 40);
    if (req.body.notes !== undefined) student.notes = cleanText(req.body.notes, 1000);
    if (req.body.active === false) {
      student.active = false;
      removeUserSessions(student.id);
    }

    student.updatedAt = new Date().toISOString();
    await saveDatabase();
    return res.json({ aluno: publicUser(student) });
  } catch (error) {
    return next(error);
  }
});

router.get("/agendamentos", ...requirePersonal, (req, res) => {
  const bookings = database.bookings
    .slice()
    .sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`))
    .map((booking) => {
      const linkedUser = database.users.find((user) => user.id === booking.userId);
      return { ...booking, user: linkedUser ? publicUser(linkedUser) : null };
    });
  return res.json({ agendamentos: bookings });
});

router.patch("/agendamentos/:bookingId/status", ...requirePersonal, async (req, res, next) => {
  try {
    const booking = database.bookings.find((entry) => entry.id === req.params.bookingId);
    if (!booking) return res.status(404).json({ message: "Agendamento não encontrado." });

    const allowedStatuses = new Set(["solicitado", "confirmado", "concluido", "cancelado"]);
    if (!allowedStatuses.has(req.body.status)) return res.status(400).json({ message: "Status inválido." });

    booking.status = req.body.status;
    booking.updatedAt = new Date().toISOString();
    await saveDatabase();
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.post("/planos", ...requirePersonal, async (req, res, next) => {
  try {
    const student = database.users.find((user) => user.id === req.body.studentId
      && user.role === "ALUNO"
      && user.active !== false);
    const title = cleanText(req.body.title, 120);
    const days = normalizePlanDays(req.body.days);
    if (!student || !title || !days) return res.status(400).json({ message: "Confira aluno, título e exercícios do plano." });

    database.plans = database.plans.filter((plan) => plan.studentId !== student.id);
    const plan = {
      id: randomUUID(),
      studentId: student.id,
      title,
      description: cleanText(req.body.description, 1000),
      days,
      active: true,
      createdAt: new Date().toISOString(),
    };

    database.plans.push(plan);
    await saveDatabase();
    return res.status(201).json({ plano: plan });
  } catch (error) {
    return next(error);
  }
});

export default router;
