"use strict";
// A short, dismissible welcome. Native dialog handles focus and background inertness.
window.SentinelIntro = (() => {
  const dialog = document.getElementById("opening-intro");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const key = "sentinelcall.opening.seen";
  let welcomeTimer, closeTimer;
  function finish(immediate = false) {
    clearTimeout(welcomeTimer);
    clearTimeout(closeTimer);
    if (!dialog.open) return;
    if (immediate) dialog.close();
    else {
      dialog.classList.add("is-leaving");
      closeTimer = setTimeout(() => dialog.close(), 240);
    }
  }
  function start({ force = false } = {}) {
    if (
      preference.matches ||
      typeof dialog.showModal !== "function" ||
      dialog.open
    )
      return;
    try {
      if (!force && sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* A blocked storage API must never block the page. */
    }
    dialog.classList.remove("is-leaving");
    dialog.showModal();
    welcomeTimer = setTimeout(() => finish(), 2100);
  }
  document
    .getElementById("skip-opening")
    .addEventListener("click", () => finish(true));
  document
    .getElementById("replay-opening")
    .addEventListener("click", () => start({ force: true }));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    finish(true);
  });
  dialog.addEventListener("close", () => {
    clearTimeout(welcomeTimer);
    clearTimeout(closeTimer);
  });
  preference.addEventListener("change", (event) => {
    if (event.matches) finish(true);
  });
  return { start };
})();
