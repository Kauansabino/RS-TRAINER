import { apiRequest } from "./account.js";

const BOOKING_STATUS_LABELS = {
  solicitado: "Pendente",
  confirmado: "Confirmado",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

export function iniciarPainelPersonal() {
  const elements = getDashboardElements();
  if (!elements.panel) return;

  attachStudentForm(elements);
  attachPlanForm(elements);
  loadDashboard(elements);
}

function getDashboardElements() {
  return {
    panel: document.getElementById("painel-personal"),
    studentsList: document.getElementById("personal-students"),
    bookingsList: document.getElementById("personal-bookings"),
    studentSelect: document.getElementById("plan-student"),
    studentSearch: document.getElementById("personal-student-search"),
    studentCount: document.getElementById("personal-student-count"),
    studentForm: document.getElementById("student-form"),
    studentFeedback: document.getElementById("student-feedback"),
    planForm: document.getElementById("plan-form"),
    planFeedback: document.getElementById("plan-feedback"),
    planDays: document.getElementById("plan-days"),
    totalStudents: document.getElementById("dashboard-students"),
    pendingBookings: document.getElementById("dashboard-pending"),
    confirmedBookings: document.getElementById("dashboard-confirmed"),
  };
}

async function loadDashboard(elements) {
  try {
    const { user } = await apiRequest("/api/auth/me");
    if (user.role !== "PERSONAL") return;

    const [studentsResult, bookingsResult] = await Promise.all([
      apiRequest("/api/personal/alunos"),
      apiRequest("/api/personal/agendamentos"),
    ]);

    const state = {
      students: studentsResult.alunos || [],
      bookings: bookingsResult.agendamentos || [],
    };

    populateStudentSelect(elements.studentSelect, state.students);
    renderStudents(state.students, elements);
    renderBookings(state.bookings, elements);
    updateDashboardCounts(state, elements);
    elements.studentSearch?.addEventListener("input", () => renderStudents(state.students, elements));
  } catch (error) {
    showEmptyState(elements.studentsList, "Não foi possível carregar os alunos.");
    showEmptyState(elements.bookingsList, "Não foi possível carregar os agendamentos.");
    console.error("Erro ao carregar o painel do personal:", error);
  }
}

function populateStudentSelect(select, students) {
  if (!select) return;
  select.replaceChildren(new Option("Selecione um aluno", ""));
  students.forEach((student) => select.add(new Option(student.name, student.id)));
}

function renderStudents(students, elements) {
  const filter = elements.studentSearch?.value.trim().toLocaleLowerCase("pt-BR") || "";
  const matchingStudents = students.filter((student) =>
    `${student.name} ${student.email}`.toLocaleLowerCase("pt-BR").includes(filter));

  elements.studentsList.replaceChildren();
  if (matchingStudents.length === 0) {
    showEmptyState(elements.studentsList, filter ? "Nenhum aluno encontrado." : "Nenhum aluno cadastrado.");
  } else {
    matchingStudents.forEach((student) => {
      elements.studentsList.appendChild(createStudentCard(student, students, elements));
    });
  }

  const count = String(students.length);
  if (elements.studentCount) elements.studentCount.textContent = count;
  if (elements.totalStudents) elements.totalStudents.textContent = count;
}

function createStudentCard(student, students, elements) {
  const card = document.createElement("article");
  card.className = "personal-item student-item-card";

  const header = document.createElement("div");
  header.className = "student-card-header";
  const avatar = document.createElement("span");
  avatar.className = "student-avatar";
  avatar.textContent = student.name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  const identity = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = student.name;
  const email = document.createElement("span");
  email.className = "student-email";
  email.textContent = student.email;
  identity.append(name, email);
  header.append(avatar, identity);

  const details = document.createElement("div");
  details.className = "student-details";
  const phone = document.createElement("span");
  phone.textContent = `WhatsApp: ${student.phone || "não informado"}`;
  const notes = document.createElement("p");
  notes.textContent = student.notes || "Sem observações cadastradas.";
  details.append(phone, notes);

  const actions = document.createElement("div");
  actions.className = "student-actions";
  actions.append(
    createStudentEditor(student, students, elements),
    createDeactivateButton(student, students, elements),
  );

  card.append(header, details, actions);
  return card;
}

function createStudentEditor(student, students, elements) {
  const wrapper = document.createElement("div");
  const toggle = document.createElement("button");
  toggle.type = "button";
  toggle.className = "student-edit";
  toggle.textContent = "Editar";

  const form = document.createElement("form");
  form.className = "student-inline-editor";
  form.hidden = true;

  const fields = [
    { name: "name", label: "Nome", value: student.name, type: "text" },
    { name: "phone", label: "WhatsApp", value: student.phone || "", type: "tel" },
    { name: "notes", label: "Observações", value: student.notes || "", type: "textarea" },
  ];
  fields.forEach((field) => form.appendChild(createStudentInput(field)));

  const saveButton = document.createElement("button");
  saveButton.type = "submit";
  saveButton.className = "student-save";
  saveButton.textContent = "Salvar alterações";
  form.appendChild(saveButton);

  toggle.addEventListener("click", () => {
    form.hidden = !form.hidden;
    toggle.textContent = form.hidden ? "Editar" : "Cancelar";
  });
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    saveButton.disabled = true;

    try {
      const updates = Object.fromEntries(new FormData(form).entries());
      await apiRequest(`/api/personal/alunos/${student.id}`, { method: "PATCH", body: updates });
      Object.assign(student, updates);
      const selectOption = [...elements.studentSelect.options].find((option) => option.value === student.id);
      if (selectOption) selectOption.textContent = student.name;
      renderStudents(students, elements);
    } catch (error) {
      window.alert(error.message);
      saveButton.disabled = false;
    }
  });

  wrapper.append(toggle, form);
  return wrapper;
}

function createStudentInput({ name, label, value, type }) {
  const field = document.createElement("label");
  field.append(document.createTextNode(label));
  const input = type === "textarea" ? document.createElement("textarea") : document.createElement("input");
  if (type !== "textarea") input.type = type;
  input.name = name;
  input.value = value;
  if (type === "textarea") input.rows = 2;
  field.appendChild(input);
  return field;
}

function createDeactivateButton(student, students, elements) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "student-deactivate";
  button.textContent = "Desativar";
  button.addEventListener("click", async () => {
    if (!window.confirm(`Desativar o aluno ${student.name}?`)) return;
    button.disabled = true;

    try {
      await apiRequest(`/api/personal/alunos/${student.id}`, { method: "PATCH", body: { active: false } });
      const index = students.findIndex((entry) => entry.id === student.id);
      if (index !== -1) students.splice(index, 1);
      elements.studentSelect.querySelector(`option[value="${student.id}"]`)?.remove();
      renderStudents(students, elements);
    } catch (error) {
      button.disabled = false;
      window.alert(error.message);
    }
  });
  return button;
}

function renderBookings(bookings, elements) {
  elements.bookingsList.replaceChildren();
  if (bookings.length === 0) {
    showEmptyState(elements.bookingsList, "Nenhuma solicitação de agendamento.");
    updateBookingCounts(bookings, elements);
    return;
  }

  bookings.forEach((booking) => {
    elements.bookingsList.appendChild(createBookingCard(booking, bookings, elements));
  });
  updateBookingCounts(bookings, elements);
}

function createBookingCard(booking, bookings, elements) {
  const card = document.createElement("article");
  card.className = "personal-item booking-item";

  const header = document.createElement("div");
  header.className = "booking-card-header";
  const identity = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = booking.name || booking.user?.name || "Cliente";
  const date = new Date(`${booking.date.slice(0, 10)}T00:00:00`);
  const schedule = document.createElement("span");
  schedule.className = "booking-schedule";
  schedule.textContent = `${date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })} às ${booking.time}`;
  identity.append(name, schedule);

  const badge = document.createElement("span");
  updateStatusBadge(badge, booking.status);
  header.append(identity, badge);

  const statusSelect = document.createElement("select");
  statusSelect.className = "booking-status-select";
  statusSelect.setAttribute("aria-label", `Status do agendamento de ${name.textContent}`);
  Object.entries(BOOKING_STATUS_LABELS).forEach(([value, label]) => {
    const option = new Option(label, value, false, value === booking.status);
    statusSelect.add(option);
  });
  statusSelect.addEventListener("change", () => updateBookingStatus(booking, bookings, elements, badge, statusSelect));

  card.append(header, statusSelect);
  return card;
}

async function updateBookingStatus(booking, bookings, elements, badge, select) {
  const previousStatus = booking.status;
  select.disabled = true;

  try {
    await apiRequest(`/api/personal/agendamentos/${booking.id}/status`, {
      method: "PATCH",
      body: { status: select.value },
    });
    booking.status = select.value;
    updateStatusBadge(badge, booking.status);
    updateBookingCounts(bookings, elements);
  } catch (error) {
    select.value = previousStatus;
    window.alert(error.message);
  } finally {
    select.disabled = false;
  }
}

function updateStatusBadge(badge, status) {
  badge.className = `booking-status booking-status-${status}`;
  badge.textContent = BOOKING_STATUS_LABELS[status] || status;
}

function updateDashboardCounts({ students, bookings }, elements) {
  const total = String(students.length);
  if (elements.studentCount) elements.studentCount.textContent = total;
  if (elements.totalStudents) elements.totalStudents.textContent = total;
  updateBookingCounts(bookings, elements);
}

function updateBookingCounts(bookings, elements) {
  const pending = bookings.filter((booking) => booking.status === "solicitado").length;
  const confirmed = bookings.filter((booking) => booking.status === "confirmado").length;
  if (elements.pendingBookings) elements.pendingBookings.textContent = String(pending);
  if (elements.confirmedBookings) elements.confirmedBookings.textContent = String(confirmed);
}

function showEmptyState(container, message) {
  if (!container) return;
  const emptyState = document.createElement("p");
  emptyState.className = "personal-empty";
  emptyState.textContent = message;
  container.replaceChildren(emptyState);
}

function attachStudentForm(elements) {
  elements.studentForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = elements.studentForm.querySelector('button[type="submit"]');
    button.disabled = true;

    try {
      const values = Object.fromEntries(new FormData(elements.studentForm).entries());
      const { aluno } = await apiRequest("/api/personal/alunos", { method: "POST", body: values });
      setFeedback(elements.studentFeedback, `Aluno ${aluno.name} cadastrado.`);
      elements.studentForm.reset();
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setFeedback(elements.studentFeedback, error.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

function attachPlanForm(elements) {
  elements.planForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const button = elements.planForm.querySelector('button[type="submit"]');
    let days;

    try {
      days = JSON.parse(elements.planDays.value);
      if (!Array.isArray(days)) throw new Error();
    } catch {
      setFeedback(elements.planFeedback, "Informe uma lista de dias em JSON válido.", true);
      return;
    }

    button.disabled = true;
    const formValues = Object.fromEntries(new FormData(elements.planForm).entries());
    try {
      await apiRequest("/api/personal/planos", {
        method: "POST",
        body: { ...formValues, days },
      });
      setFeedback(elements.planFeedback, "Plano salvo com sucesso.");
      elements.planForm.reset();
    } catch (error) {
      setFeedback(elements.planFeedback, error.message, true);
    } finally {
      button.disabled = false;
    }
  });
}

function setFeedback(element, message, isError = false) {
  element.textContent = message;
  element.classList.toggle("visible", Boolean(message));
  element.classList.toggle("is-error", isError);
}
