import { apiRequest } from "./account.js";

function iniciarPreloader() {
  const preloader = document.getElementById("preloader");
  if (!preloader) return;

  window.addEventListener("load", () => {
    window.setTimeout(() => {
      preloader.style.opacity = "0";
      window.setTimeout(() => preloader.remove(), 600);
    }, 800);
  }, { once: true });
}

function iniciarNavbar() {
  const header = document.getElementById("header");
  if (!header) return;

  const updateHeader = () => header.classList.toggle("scrolled", window.scrollY > 50);
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
}

function iniciarMenuMobile() {
  const menuButton = document.getElementById("menu-btn");
  const navigation = document.getElementById("main-navigation");
  if (!menuButton || !navigation) return;

  const setMenuOpen = (isOpen) => {
    navigation.classList.toggle("active", isOpen);
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.setAttribute("aria-label", isOpen ? "Fechar menu" : "Abrir menu");
  };

  menuButton.addEventListener("click", () => {
    setMenuOpen(menuButton.getAttribute("aria-expanded") !== "true");
  });
  navigation.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => setMenuOpen(false));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") setMenuOpen(false);
  });
}

function iniciarScrollSuave() {
  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener("click", (event) => {
      const targetId = link.getAttribute("href");
      if (!targetId || targetId === "#") return;

      const target = document.querySelector(targetId);
      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}


const SAMPLE_WORKOUTS = {
  peito: [
    { name: "Supino reto", sets: "3 séries × 12 repetições" },
    { name: "Crucifixo", sets: "3 séries × 12 repetições" },
  ],
  costas: [{ name: "Puxada frontal", sets: "3 séries × 12 repetições" }],
  pernas: [{ name: "Agachamento", sets: "3 séries × 10 repetições" }],
  ombros: [{ name: "Desenvolvimento", sets: "3 séries × 10 repetições" }],
  biceps: [{ name: "Rosca direta", sets: "3 séries × 12 repetições" }],
  triceps: [{ name: "Tríceps pulley", sets: "3 séries × 12 repetições" }],
};

const DAYS = {
  segunda: { label: "Segunda-feira", number: "1" },
  terca: { label: "Terça-feira", number: "2" },
  quarta: { label: "Quarta-feira", number: "3" },
  quinta: { label: "Quinta-feira", number: "4" },
  sexta: { label: "Sexta-feira", number: "5" },
};

const state = {
  selectedDay: "segunda",
  selectedMuscle: "peito",
  plans: [],
};

let elements;

function iniciarTreinos() {
  elements = {
    dayButtons: [...document.querySelectorAll(".day-button")],
    muscleButtons: [...document.querySelectorAll(".muscle-button")],
    list: document.querySelector(".exercise-list"),
    title: document.querySelector(".workout-title"),
    status: document.querySelector(".workout-status"),
  };

  if (!elements.list || !elements.title) return;

  state.selectedDay = document.querySelector(".day-button.active")?.dataset.day || "segunda";
  state.selectedMuscle = document.querySelector(".muscle-button.active")?.dataset.muscle || "peito";

  elements.dayButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDay = button.dataset.day;
      setActiveButton(elements.dayButtons, button);
      renderWorkout();
    });
  });

  elements.muscleButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedMuscle = button.dataset.muscle;
      setActiveButton(elements.muscleButtons, button);
      renderWorkout();
    });
  });

  renderWorkout();
}

async function iniciarTreinosPersonalizados() {
  if (!elements?.list) return;

  try {
    const result = await apiRequest("/api/treinos/me");
    state.plans = result.planos || [];
    renderWorkout();
  } catch {
    // Visitantes e alunos sem sessão veem os treinos de exemplo.
  }
}

function renderWorkout() {
  const planDay = findPlanDay();
  const exercises = planDay ? filterExercises(planDay.exercises) : SAMPLE_WORKOUTS[state.selectedMuscle] || [];
  const visibleExercises = planDay && exercises.length === 0 ? planDay.exercises : exercises;

  elements.title.textContent = planDay?.name || getSelectedMuscleLabel();
  elements.list.replaceChildren();

  visibleExercises.forEach((exercise) => {
    elements.list.appendChild(createExerciseCard(exercise, planDay));
  });

  updateStatus(visibleExercises.length, planDay);
}

function findPlanDay() {
  const plan = state.plans[0];
  if (!plan?.days?.length) return null;

  const selectedDay = DAYS[state.selectedDay];
  return plan.days.find((day) => String(day.dayOfWeek) === selectedDay.number)
    || plan.days.find((day) => day.name.toLowerCase().includes(selectedDay.label.split("-")[0].toLowerCase()))
    || plan.days[0];
}

function filterExercises(exercises = []) {
  const selectedMuscle = normalizeText(state.selectedMuscle);
  return exercises.filter((exercise) => {
    const muscleGroup = normalizeText(exercise.muscleGroup);
    return muscleGroup && (muscleGroup.includes(selectedMuscle) || selectedMuscle.includes(muscleGroup));
  });
}

function createExerciseCard(exercise, planDay) {
  const card = document.createElement("article");
  card.className = "exercise-card";

  const info = document.createElement("div");
  info.className = "exercise-info";

  const name = document.createElement("h4");
  name.textContent = exercise.name;

  const details = document.createElement("p");
  details.textContent = planDay
    ? `${exercise.sets} séries × ${exercise.reps} · ${exercise.restSeconds || 0}s de descanso`
    : exercise.sets;
  info.append(name, details);

  if (exercise.notes) {
    const notes = document.createElement("p");
    notes.textContent = exercise.notes;
    info.appendChild(notes);
  }

  const completeButton = document.createElement("button");
  completeButton.type = "button";
  completeButton.className = "exercise-complete";
  completeButton.textContent = "Marcar como concluído";
  completeButton.addEventListener("click", () => completeExercise(completeButton, card, exercise, planDay));
  info.appendChild(completeButton);
  card.appendChild(info);

  return card;
}

async function completeExercise(button, card, exercise, planDay) {
  button.disabled = true;

  if (planDay) {
    try {
      await apiRequest("/api/treinos/progresso", {
        method: "POST",
        body: { exerciseId: exercise.id },
      });
    } catch {
      button.disabled = false;
      if (elements.status) elements.status.textContent = "Não foi possível salvar o progresso. Tente novamente.";
      return;
    }
  }

  button.textContent = "Concluído ✓";
  card.classList.add("completed");
  if (elements.status) elements.status.textContent = `${planDay?.name || "Treino"} · exercício concluído`;
}

function updateStatus(exerciseCount, planDay) {
  if (!elements.status) return;

  if (planDay) {
    elements.status.textContent = `${planDay.name} · ${exerciseCount} exercícios do seu plano`;
    return;
  }

  const completedCount = elements.list.querySelectorAll(".exercise-complete:disabled").length;
  elements.status.textContent = `${DAYS[state.selectedDay].label} · ${completedCount} de ${exerciseCount} exercícios concluídos`;
}

function getSelectedMuscleLabel() {
  return elements.muscleButtons.find((button) => button.dataset.muscle === state.selectedMuscle)?.textContent.trim() || "Treino";
}

function setActiveButton(buttons, activeButton) {
  buttons.forEach((button) => button.classList.toggle("active", button === activeButton));
}

function normalizeText(value = "") {
  return String(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}


export function iniciarSite() {

  iniciarPreloader();

  iniciarNavbar();

  iniciarMenuMobile();

  iniciarScrollSuave();

  iniciarTreinos();

  iniciarTreinosPersonalizados();

}
