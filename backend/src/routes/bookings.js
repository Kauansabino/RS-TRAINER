import { Router } from "express";
import { randomUUID } from "node:crypto";
import { database, saveDatabase } from "../database.js";
import { requireAuthentication, requireRole, cleanText } from "../security.js";

const router = Router();
const ALLOWED_TIMES = new Set(["07:00", "08:00", "09:00", "17:00", "18:00", "19:00"]);

function isFutureDate(date) {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const parsedDate = new Date(`${date}T00:00:00.000Z`);
  const todayInBrazil = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  return !Number.isNaN(parsedDate.valueOf())
    && parsedDate.toISOString().slice(0, 10) === date
    && date >= todayInBrazil;
}

function isSlotTaken(date, time, ignoredBookingId = null) {
  return database.bookings.some((booking) => booking.id !== ignoredBookingId
    && booking.date === date
    && booking.time === time
    && booking.status !== "cancelado");
}

router.post("/", async (req, res, next) => {
  try {
    const bookingData = {
      name: cleanText(req.body.name, 100),
      phone: cleanText(req.body.phone, 40),
      goal: cleanText(req.body.goal, 80),
      date: cleanText(req.body.date, 10),
      time: cleanText(req.body.time, 5),
    };

    if (bookingData.name.length < 2 || !bookingData.phone || !bookingData.goal
      || !isFutureDate(bookingData.date) || !ALLOWED_TIMES.has(bookingData.time)) {
      return res.status(400).json({ message: "Confira nome, telefone, objetivo, data futura e horário válido." });
    }

    if (isSlotTaken(bookingData.date, bookingData.time)) {
      return res.status(409).json({ message: "Este horário acabou de ser reservado. Escolha outro." });
    }

    const booking = {
      id: randomUUID(),
      ...bookingData,
      userId: req.user?.role === "ALUNO" ? req.user.id : null,
      status: "solicitado",
      createdAt: new Date().toISOString(),
    };

    database.bookings.push(booking);
    await saveDatabase();
    return res.status(201).json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.get("/disponibilidade", (req, res) => {
  const date = req.query.date || "";
  if (!isFutureDate(date)) return res.status(400).json({ message: "Informe uma data futura válida." });

  const ocupados = database.bookings
    .filter((booking) => booking.date === date && booking.status !== "cancelado")
    .map((booking) => booking.time);

  return res.json({ ocupados });
});

router.get("/me", requireAuthentication, requireRole("ALUNO"), (req, res) => {
  const bookings = database.bookings
    .filter((booking) => booking.userId === req.user.id)
    .sort((first, second) => `${first.date} ${first.time}`.localeCompare(`${second.date} ${second.time}`));

  return res.json({ bookings });
});

router.patch("/:bookingId/reagendar", requireAuthentication, requireRole("ALUNO"), async (req, res, next) => {
  try {
    const booking = database.bookings.find((entry) => entry.id === req.params.bookingId && entry.userId === req.user.id);
    if (!booking) return res.status(404).json({ message: "Agendamento não encontrado." });
    if (["concluido", "cancelado"].includes(booking.status)) {
      return res.status(409).json({ message: "Este agendamento não pode mais ser alterado." });
    }

    const date = cleanText(req.body.date, 10);
    const time = cleanText(req.body.time, 5);
    if (!isFutureDate(date) || !ALLOWED_TIMES.has(time)) {
      return res.status(400).json({ message: "Escolha uma data futura e um horário válido." });
    }
    if (isSlotTaken(date, time, booking.id)) return res.status(409).json({ message: "Este horário já está ocupado." });

    booking.date = date;
    booking.time = time;
    booking.updatedAt = new Date().toISOString();
    await saveDatabase();
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

router.patch("/:bookingId/cancelar", requireAuthentication, requireRole("ALUNO"), async (req, res, next) => {
  try {
    const booking = database.bookings.find((entry) => entry.id === req.params.bookingId && entry.userId === req.user.id);
    if (!booking) return res.status(404).json({ message: "Agendamento não encontrado." });
    if (["concluido", "cancelado"].includes(booking.status)) {
      return res.status(409).json({ message: "Este agendamento não pode mais ser cancelado." });
    }

    booking.status = "cancelado";
    booking.updatedAt = new Date().toISOString();
    await saveDatabase();
    return res.json({ booking });
  } catch (error) {
    return next(error);
  }
});

export default router;
