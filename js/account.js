const DEFAULT_ERROR_MESSAGES = {
  400: "Confira os dados preenchidos e tente novamente.",
  401: "E-mail ou senha não conferem. Verifique os dados e tente novamente.",
  403: "Você não tem permissão para fazer isso.",
  404: "Não encontramos o que você procurava.",
  409: "Já existe uma conta com esse e-mail. Tente entrar ou use outro e-mail.",
  413: "O formulário é muito grande. Revise os dados e tente novamente.",
  429: "Muitas tentativas em pouco tempo. Aguarde um pouco e tente novamente.",
};

export async function apiRequest(url, options = {}) {
  const headers = new Headers(options.headers || {});
  const request = {
    credentials: "same-origin",
    ...options,
    headers,
  };

  if (options.body && typeof options.body === "object") {
    headers.set("Content-Type", "application/json");
    request.body = JSON.stringify(options.body);
  }

  let response;
  try {
    response = await fetch(url, request);
  } catch {
    throw new Error("Não foi possível conectar ao servidor. Confira se ele está ligado e tente novamente.");
  }

  const data = await response.json().catch(() => ({}));
  if (response.ok) return data;

  const message = response.status >= 500
    ? "Ocorreu um problema ao processar seu pedido. Tente novamente em instantes."
    : data.message || DEFAULT_ERROR_MESSAGES[response.status] || "Não foi possível concluir seu pedido. Tente novamente.";

  throw new Error(message);
}


const SIGN_IN_URL = "/api/auth/login";
const SIGN_UP_URL = "/api/auth/register";
const SIGN_OUT_URL = "/api/auth/logout";

export function iniciarAutenticacao() {
  const elements = {
    loginForm: document.getElementById("login-form"),
    loginFeedback: document.getElementById("login-feedback"),
    registerForm: document.getElementById("register-form"),
    registerFeedback: document.getElementById("register-feedback"),
    logoutButton: document.getElementById("logout-btn"),
  };

  setupFormSwitching(elements);
  setupLoginForm(elements);
  setupRegistrationForm(elements);
  setupLogoutButton(elements);
  restoreSession(elements);
}

function setupFormSwitching({ loginForm, registerForm }) {
  document.getElementById("show-register")?.addEventListener("click", () => {
    loginForm.classList.add("is-hidden");
    registerForm.classList.remove("is-hidden");
  });

  document.getElementById("show-login")?.addEventListener("click", () => {
    registerForm.classList.add("is-hidden");
    loginForm.classList.remove("is-hidden");
  });
}

function setupLoginForm({ loginForm, loginFeedback }) {
  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitAuthenticationForm({
      form: loginForm,
      feedback: loginFeedback,
      endpoint: SIGN_IN_URL,
      successMessage: "Login realizado. Abrindo o site...",
    });
  });
}

function setupRegistrationForm({ registerForm, registerFeedback }) {
  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    await submitAuthenticationForm({
      form: registerForm,
      feedback: registerFeedback,
      endpoint: SIGN_UP_URL,
      successMessage: "Conta criada. Abrindo o site...",
    });
  });
}

async function submitAuthenticationForm({ form, feedback, endpoint, successMessage }) {
  const submitButton = form.querySelector('button[type="submit"]');
  feedback.classList.remove("visible", "is-error");
  submitButton.disabled = true;

  try {
    const formData = Object.fromEntries(new FormData(form).entries());
    await apiRequest(endpoint, { method: "POST", body: formData });
    feedback.textContent = successMessage;
    feedback.classList.add("visible");
    window.setTimeout(() => window.location.reload(), 500);
  } catch (error) {
    feedback.textContent = error instanceof TypeError
      ? "Não foi possível conectar ao servidor. Tente novamente."
      : error.message;
    feedback.classList.add("visible", "is-error");
  } finally {
    submitButton.disabled = false;
  }
}

function setupLogoutButton({ logoutButton, loginFeedback }) {
  logoutButton?.addEventListener("click", async () => {
    logoutButton.disabled = true;

    try {
      await apiRequest(SIGN_OUT_URL, { method: "POST" });
      window.location.reload();
    } catch {
      logoutButton.disabled = false;
      if (!loginFeedback) return;

      loginFeedback.textContent = "Não foi possível encerrar a sessão. Tente novamente.";
      loginFeedback.classList.add("visible", "is-error");
    }
  });
}

async function restoreSession({ logoutButton }) {
  try {
    const { user } = await apiRequest("/api/auth/me");
    applySession(user, logoutButton);
  } catch {
    applySession(null, logoutButton);
  }
}

function applySession(user, logoutButton) {
  const isAuthenticated = Boolean(user);
  const isPersonal = user?.role === "PERSONAL";

  document.body.classList.toggle("site-locked", !isAuthenticated);
  document.body.classList.toggle("authenticated", isAuthenticated);
  document.body.classList.toggle("personal-view", isPersonal);

  const brandLink = document.getElementById("brand-link");
  if (brandLink) brandLink.href = isPersonal ? "#painel-personal" : "#home";

  if (logoutButton) logoutButton.hidden = !isAuthenticated;

  if (user?.role === "ALUNO") {
    document.getElementById("treinos")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

