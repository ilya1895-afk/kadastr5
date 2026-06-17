(function () {
  const D = window.KADASTR_DATA;
  if (!D) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const newsList = $("#newsList");
  if (newsList) {
    newsList.innerHTML = D.NEWS.map(
      (n) => `
      <li>
        <p class="news-meta">${n.date}</p>
        <strong>${n.title}</strong>
        <p class="muted small">${n.excerpt}</p>
      </li>`
    ).join("");
  }

  $$(".accordion-item").forEach((item) => {
    const trigger = item.querySelector(".accordion-trigger");
    const panel = item.querySelector(".accordion-panel");
    if (!trigger || !panel) return;
    trigger.addEventListener("click", () => {
      const willOpen = trigger.getAttribute("aria-expanded") !== "true";
      $$(".accordion-item").forEach((other) => {
        const t = other.querySelector(".accordion-trigger");
        const p = other.querySelector(".accordion-panel");
        if (!t || !p) return;
        const active = other === item && willOpen;
        t.setAttribute("aria-expanded", String(active));
        p.hidden = !active;
        other.classList.toggle("is-open", active);
      });
    });
  });
})();
