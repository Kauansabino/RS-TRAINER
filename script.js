import { iniciarSite } from "./js/site.js";
import { iniciarAgendamento } from "./js/bookings.js";
import { iniciarAutenticacao } from "./js/account.js";
import { iniciarPainelPersonal } from "./js/personal-dashboard.js";

document.addEventListener("DOMContentLoaded", () => {
  esconderImagensAusentes();
  iniciarSite();
  iniciarAnimacoes();
  iniciarAgendamento();
  iniciarAutenticacao();
  iniciarPainelPersonal();
});

function esconderImagensAusentes() {
  document.querySelectorAll("img").forEach((image) => {
    image.addEventListener("error", () => { image.hidden = true; }, { once: true });
  });
}

function iniciarAnimacoes() {
  if (window.AOS) window.AOS.init({ duration: 1000, once: true, easing: "ease" });
}
