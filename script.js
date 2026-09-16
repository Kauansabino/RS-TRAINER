/* ==========================================================
   RS PERSONAL TRAINER
   Desenvolvido por: Kauan Sabino
   Arquivo: script.js
========================================================== */

/* ==========================================================
   INICIALIZAÇÃO
========================================================== */

document.addEventListener("DOMContentLoaded", () => {

    iniciarPreloader();
    iniciarNavbar();
    iniciarMenuMobile();
    iniciarScrollSuave();
    iniciarAnimacoes();
    iniciarTreinos();
    iniciarAgendamento();
    iniciarAcesso();
});


/* ==========================================================
   PRELOADER
========================================================== */

const iniciarPreloader =()=>{

    const preloader = document.getElementById("preloader");

    window.addEventListener("load", () => {

        setTimeout(() => {

            preloader.style.opacity = "0";

            setTimeout(() => {

                preloader.style.display = "none";

            }, 600);

        }, 800);

    });

}


/* ==========================================================
   NAVBAR
========================================================== */
const iniciarNavbar = ()=>{

    const header = document.getElementById("header");

    window.addEventListener("scroll", () => {

        if (window.scrollY > 50) {

            header.classList.add("scrolled");

        } else {

            header.classList.remove("scrolled");

        }

    });

}


/* ==========================================================
   MENU MOBILE
========================================================== */

const iniciarMenuMobile = ()=> {

    const menuBtn = document.getElementById("menu-btn");

    const navMenu = document.querySelector(".nav-menu");

    menuBtn.addEventListener("click", () => {

        navMenu.classList.toggle("active");

    });

}


/* ==========================================================
   SCROLL SUAVE
========================================================== */

const iniciarScrollSuave = () => {

    const links = document.querySelectorAll('a[href^="#"]');

    links.forEach(link => {

        link.addEventListener("click", function (e) {

            e.preventDefault();

            const id = this.getAttribute("href");

            if (id === "#") return;

            const section = document.querySelector(id);

            if (!section) return;

            section.scrollIntoView({

                behavior: "smooth",
                block: "start"

            });

        });

    });

}
 
/* ==========================================================
   TREINOS
========================================================== */



const workouts = {

    peito: [
        {
            name: "Supino reto",
            video: "assets/videos/supino.mp4",
            sets: "3 séries × 12 repetições"
        },
        {
            name: "Crucifixo",
            video: "assets/videos/crucifixo.mp4",
            sets: "3 séries × 12 repetições"
        }
    ],

    costas: [
        {
            name: "Puxada frontal",
            video: "assets/videos/puxada.mp4",
            sets: "3 séries × 12 repetições"
        }
    ],

    pernas: [
        {
            name: "Agachamento",
            video: "assets/videos/agachamento.mp4",
            sets: "3 séries × 10 repetições"
        }
    ],

    ombros: [
        {
            name: "Desenvolvimento",
            video: "assets/videos/desenvolvimento.mp4",
            sets: "3 séries × 10 repetições"
        }
    ],

    biceps: [
        {
            name: "Rosca direta",
            video: "assets/videos/rosca-direta.mp4",
            sets: "3 séries × 12 repetições"
        }
    ],

    triceps: [
        {
            name: "Tríceps pulley",
            video: "assets/videos/triceps-pulley.mp4",
            sets: "3 séries × 12 repetições"
        }
    ]
};
const iniciarTreinos = () => {

    const dayButtons = document.querySelectorAll(".day-button");
    const muscleButtons = document.querySelectorAll(".muscle-button");
    const exerciseList = document.querySelector(".exercise-list");
    const workoutTitle = document.querySelector(".workout-title");
    const workoutStatus = document.querySelector(".workout-status");

    if (!exerciseList || !workoutTitle) return;

    let selectedDay = document.querySelector(".day-button.active")?.dataset.day || "segunda";
    let selectedMuscle = document.querySelector(".muscle-button.active")?.dataset.muscle || "peito";

    const dayNames = {
        segunda: "Segunda-feira",
        terca: "Terça-feira",
        quarta: "Quarta-feira",
        quinta: "Quinta-feira",
        sexta: "Sexta-feira"
    };

    const renderWorkout = () => {

        const exercises = workouts[selectedMuscle] || [];
        const muscleButton = document.querySelector(`[data-muscle="${selectedMuscle}"]`);

        workoutTitle.textContent = muscleButton?.textContent.trim() || "Treino";
        exerciseList.innerHTML = "";

        exercises.forEach(exercise => {

            const exerciseCard = document.createElement("article");
            exerciseCard.className = "exercise-card";
            exerciseCard.innerHTML = `
                <div class="exercise-video">
                    <video controls preload="metadata">
                        <source src="${exercise.video}" type="video/mp4">
                        Seu navegador não suporta vídeos.
                    </video>
                </div>
                <div class="exercise-info">
                    <h4>${exercise.name}</h4>
                    <p>${exercise.sets}</p>
                    <button class="exercise-complete" type="button">
                        Marcar como concluído
                    </button>
                </div>
            `;

            const completeButton = exerciseCard.querySelector(".exercise-complete");

            completeButton.addEventListener("click", () => {
                completeButton.disabled = true;
                completeButton.textContent = "Concluído ✓";
                exerciseCard.classList.add("completed");
                updateStatus(exercises.length);
            });

            exerciseList.appendChild(exerciseCard);
        });

        updateStatus(exercises.length);
    };

    const updateStatus = (totalExercises) => {
        const completedExercises = exerciseList.querySelectorAll(".exercise-complete:disabled").length;

        if (workoutStatus) {
            workoutStatus.textContent = `${dayNames[selectedDay]} · ${completedExercises} de ${totalExercises} exercícios concluídos`;
        }
    };

    dayButtons.forEach(button => {
        button.addEventListener("click", () => {
            dayButtons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            selectedDay = button.dataset.day;
            updateStatus(workouts[selectedMuscle].length);
        });
    });

    muscleButtons.forEach(button => {
        button.addEventListener("click", () => {
            muscleButtons.forEach(item => item.classList.remove("active"));
            button.classList.add("active");
            selectedMuscle = button.dataset.muscle;
            renderWorkout();
        });
    });

    renderWorkout();
};

/* ==========================================================
   AGENDAMENTO PROVISÓRIO
========================================================== */

const iniciarAgendamento = () => {

    const form = document.getElementById("booking-form");
    const dateInput = document.getElementById("booking-date");
    const feedback = document.getElementById("booking-feedback");

    if (!form || !dateInput || !feedback) return;

    const today = new Date();
    const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];

    dateInput.min = localToday;

    form.addEventListener("submit", event => {

        event.preventDefault();

        const formData = new FormData(form);
        const selectedDate = new Date(`${formData.get("date")}T00:00:00`);
        const formattedDate = selectedDate.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long"
        });

        feedback.textContent = `Obrigado, ${formData.get("name")}! Sua solicitação para ${formattedDate}, às ${formData.get("time")}, foi registrada provisoriamente.`;
        feedback.classList.add("visible");
        form.reset();
        dateInput.min = localToday;
    });
};

/* ==========================================================
   LOGIN E CADASTRO PROVISÓRIOS
========================================================== */

const iniciarAcesso = () => {

    const loginForm = document.getElementById("login-form");
    const registerForm = document.getElementById("register-form");
    const loginFeedback = document.getElementById("login-feedback");
    const registerFeedback = document.getElementById("register-feedback");
    const accessSection = document.getElementById("acesso");
    const showRegister = document.getElementById("show-register");
    const showLogin = document.getElementById("show-login");

    if (!accessSection) return;

    document.body.classList.add("site-locked");

    const liberarSite = () => {
        document.body.classList.remove("site-locked");
        accessSection.classList.remove("access-gate");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const mostrarMensagem = (event, feedback, mensagem) => {

        event.preventDefault();
        feedback.textContent = mensagem;
        feedback.classList.add("visible");
        liberarSite();
    };

    if (showRegister && showLogin && loginForm && registerForm) {
        showRegister.addEventListener("click", () => {
            loginForm.classList.add("is-hidden");
            registerForm.classList.remove("is-hidden");
        });

        showLogin.addEventListener("click", () => {
            registerForm.classList.add("is-hidden");
            loginForm.classList.remove("is-hidden");
        });
    }

    if (loginForm && loginFeedback) {
        loginForm.addEventListener("submit", event => {
            mostrarMensagem(
                event,
                loginFeedback,
                "Login visualizado. A autenticação será conectada ao back-end."
            );
        });
    }

    if (registerForm && registerFeedback) {
        registerForm.addEventListener("submit", event => {
            mostrarMensagem(
                event,
                registerFeedback,
                "Cadastro visualizado. O usuário será salvo pelo back-end no futuro."
            );
        });
    }
};

/* ==========================================================
   AOS
========================================================== */

function iniciarAnimacoes() {

    AOS.init({

        duration: 1000,

        once: true,

        easing: "ease"

    });

}


/* ==========================================================
   FUTURO - CALENDÁRIO
========================================================== */

function carregarCalendario() {

    // Será desenvolvido na etapa de Agendamento.

}


/* ==========================================================
   FUTURO - HORÁRIOS
========================================================== */

function carregarHorarios(dataSelecionada) {

    // Atualmente será um array local.

    // Futuramente:
    //
    // GET /api/horarios?data=2026-08-08
    //
    // fetch(...)
}


/* ==========================================================
   FUTURO - MODAL
========================================================== */

function abrirModal() {

}

function fecharModal() {

}


/* ==========================================================
   FUTURO - AGENDAMENTO
========================================================== */

function confirmarAgendamento() {

    // Nesta primeira versão:

    // Abrirá o WhatsApp.

    // Futuramente:

    // POST /api/agendamentos

}


/* ==========================================================
   FUTURO - API
========================================================== */

async function buscarHorariosAPI() {

    /*
        Exemplo futuro

        const resposta = await fetch("/api/horarios");

        const dados = await resposta.json();
    */

}

async function enviarAgendamentoAPI() {

    /*
        Exemplo futuro

        fetch("/api/agendamentos",{

            method:"POST"

        });

    */

}

const user = ()=>{}