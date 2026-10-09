"use strict";
// Katran-inspired choreography; CSS handles motion and native dialog manages focus.
window.SentinelIntro = (() => {
  const dialog = document.getElementById("opening-intro");
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const key = "sentinelcall.cinematic.seen";
  let endTimer, revealTimer, cleanupTimer;
  function end(reveal = false) {
    clearTimeout(endTimer);
    clearTimeout(revealTimer);
    clearTimeout(cleanupTimer);
    if (!dialog.open) return;
    dialog.close();
    document.body.classList.remove("intro-active");
    if (reveal && !preference.matches) {
      document.body.classList.add("intro-reveal");
      cleanupTimer = setTimeout(
        () => document.body.classList.remove("intro-reveal"),
        1200,
      );
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
      /* Storage is optional. */
    }
    clearTimeout(cleanupTimer);
    document.body.classList.remove("intro-reveal");
    if (force) {
      // Replaying the opening returns to the hero, including keyboard focus.
      document.querySelector(".brand")?.focus({ preventScroll: true });
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    dialog.showModal();
    document.body.classList.add("intro-active");
    // Reveal the hero behind the lifting curtain, with a bounded fallback close.
    revealTimer = setTimeout(
      () => document.body.classList.add("intro-reveal"),
      3250,
    );
    endTimer = setTimeout(() => end(true), 4000);
  }
  document
    .getElementById("skip-opening")
    .addEventListener("click", () => end());
  document
    .getElementById("replay-opening")
    .addEventListener("click", () => start({ force: true }));
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    end();
  });
  dialog.addEventListener("close", () => {
    clearTimeout(endTimer);
    clearTimeout(revealTimer);
    document.body.classList.remove("intro-active");
  });
  preference.addEventListener("change", (event) => {
    if (event.matches) {
      end();
      clearTimeout(cleanupTimer);
      document.body.classList.remove("intro-reveal");
    }
  });
  return { start };
})();
