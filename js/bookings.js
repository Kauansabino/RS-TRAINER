import { apiRequest } from "./account.js";

const AVAILABLE_TIMES = ["07:00", "08:00", "09:00", "17:00", "18:00", "19:00"];
const BOOKING_STATUS_LABELS = {
  solicitado: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function iniciarAgendamento() {
  const elements = {
    form: document.getElementById("booking-form"),
    date: document.getElementById("booking-date"),
    time: document.getElementById("booking-time"),
    feedback: document.getElementById("booking-feedback"),
    bookingsCard: document.getElementById("my-bookings-card"),
    bookingsList: document.getElementById("my-bookings-list"),
  };

  if (!elements.form || !elements.date || !elements.time || !elements.feedback) return;

  elements.date.min = getLocalDateString();
  const originalTimeOptions = [...elements.time.options].map((option) => ({
    value: option.value,
    label: option.textContent,
  }));

  elements.date.addEventListener("change", () => updateAvailableTimes(elements, originalTimeOptions));
  elements.form.addEventListener("submit", (event) => submitBooking(event, elements, originalTimeOptions));
  showCurrentBookings(elements, originalTimeOptions);
}

function getLocalDateString() {
  const now = new Date();
  const localTime = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return localTime.toISOString().slice(0, 10);
}

async function updateAvailableTimes(elements, originalOptions) {
  elements.time.replaceChildren(...originalOptions.map(({ value, label }) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    return option;
  }));

  if (!elements.date.value) return;

  try {
    const result = await apiRequest(`/api/bookings/disponibilidade?date=${encodeURIComponent(elements.date.value)}`);
    [...elements.time.options].forEach((option) => {
      if (!option.value || !result.ocupados.includes(option.value)) return;
      option.disabled = true;
      option.textContent = `${option.value} — ocupado`;
    });
  } catch {
    // Horários permanecem selecionáveis se a consulta de disponibilidade falhar.
  }
}

async function submitBooking(event, elements, originalTimeOptions) {
  event.preventDefault();
  const button = elements.form.querySelector('button[type="submit"]');
  const values = Object.fromEntries(new FormData(elements.form).entries());
  const selectedDate = new Date(`${values.date}T00:00:00`);
  const formattedDate = selectedDate.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" });

  setFeedback(elements.feedback, "", false);
  button.disabled = true;

  try {
    await apiRequest("/api/bookings", { method: "POST", body: values });
    setFeedback(elements.feedback, `Obrigado, ${values.name}! Sua solicitação para ${formattedDate}, às ${values.time}, foi registrada.`);
    elements.form.reset();
    elements.date.min = getLocalDateString();
    await showCurrentBookings(elements, originalTimeOptions);
    await updateAvailableTimes(elements, originalTimeOptions);
  } catch (error) {
    setFeedback(elements.feedback, error.message, true);
  } finally {
    button.disabled = false;
  }
}

async function showCurrentBookings(elements, originalTimeOptions) {
  if (!elements.bookingsCard || !elements.bookingsList) return;

  try {
    const { user } = await apiRequest("/api/auth/me");
    if (user.role !== "ALUNO") return;

    const { bookings } = await apiRequest("/api/bookings/me");
    elements.bookingsCard.hidden = false;
    renderBookings(bookings, elements, originalTimeOptions);
  } catch {
    elements.bookingsCard.hidden = true;
  }
}

function renderBookings(bookings, elements, originalTimeOptions) {
  elements.bookingsList.replaceChildren();

  if (bookings.length === 0) {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "personal-empty";
    emptyMessage.textContent = "Você ainda não possui agendamentos.";
    elements.bookingsList.appendChild(emptyMessage);
    return;
  }

  bookings.forEach((booking) => {
    elements.bookingsList.appendChild(createBookingCard(booking, elements, originalTimeOptions));
  });
}

function createBookingCard(booking, elements, originalTimeOptions) {
  const card = document.createElement("article");
  card.className = "my-booking-item";

  const header = document.createElement("div");
  header.className = "my-booking-header";
  const schedule = document.createElement("strong");
  const date = new Date(`${booking.date.slice(0, 10)}T00:00:00`);
  schedule.textContent = `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })} às ${booking.time}`;

  const status = document.createElement("span");
  status.className = `booking-status booking-status-${booking.status}`;
  status.textContent = BOOKING_STATUS_LABELS[booking.status] || booking.status;
  header.append(schedule, status);
  card.appendChild(header);

  if (["concluido", "cancelado"].includes(booking.status)) return card;

  const actions = document.createElement("div");
  actions.className = "my-booking-actions";
  actions.append(
    createRescheduleControl(booking, elements, originalTimeOptions),
    createCancelControl(booking, elements, originalTimeOptions),
  );
  card.appendChild(actions);
  return card;
}

function createRescheduleControl(booking, elements, originalTimeOptions) {
  const wrapper = document.createElement("div");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "student-edit";
  toggle.textContent = "Reagendar";

  const form = document.createElement("form");
  form.className = "booking-reschedule-editor";
  form.hidden = true;

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.name = "date";
  dateInput.min = getLocalDateString();
  dateInput.required = true;

  const timeSelect = document.createElement("select");
  timeSelect.name = "time";
  timeSelect.required = true;
  AVAILABLE_TIMES.forEach((time) => {
    const option = document.createElement("option");
    option.value = time;
    option.textContent = time;
    timeSelect.appendChild(option);
  });

  dateInput.addEventListener("change", () => updateAvailableTimes({ date: dateInput, time: timeSelect }, originalTimeOptions));

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "student-save";
  saveButton.textContent = "Salvar novo horário";

  form.append(dateInput, timeSelect, saveButton);
  toggle.addEventListener("click", () => {
    form.hidden = !form.hidden;
    toggle.textContent = form.hidden ? "Reagendar" : "Cancelar edição";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;

    try {
      const values = Object.fromEntries(new FormData(form).entries());
      await apiRequest(`/api/bookings/${booking.id}/reagendar`, { method: "PATCH", body: values });
      await showCurrentBookings(elements, originalTimeOptions);
      await updateAvailableTimes(elements, originalTimeOptions);
      setFeedback(elements.feedback, "Agendamento reagendado com sucesso.");
    } catch (error) {
      setFeedback(elements.feedback, error.message, true);
    } finally {
      saveButton.disabled = false;
    }
  });

  wrapper.append(toggle, form);
  return wrapper;
}

function createCancelControl(booking, elements, originalTimeOptions) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "student-deactivate";
  button.textContent = "Cancelar";
  button.addEventListener("click", async () => {
    if (!window.confirm("Cancelar este agendamento?")) return;
    button.disabled = true;

    try {
      await apiRequest(`/api/bookings/${booking.id}/cancelar`, { method: "PATCH" });
      await showCurrentBookings(elements, originalTimeOptions);
      await updateAvailableTimes(elements, originalTimeOptions);
    } catch (error) {
      button.disabled = false;
      setFeedback(elements.feedback, error.message, true);
    }
  });
  return button;
}

function setFeedback(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("is-error", isError);
  element.classList.toggle("visible", Boolean(message));
}

