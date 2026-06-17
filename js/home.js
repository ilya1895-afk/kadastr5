(function () {
  const D = window.KADASTR_DATA;
  if (!D) return;

  const badgeModal = document.getElementById("badge-info-modal");
  const badgeTitle = document.getElementById("badge-info-title");
  const badgeText = document.getElementById("badge-info-text");

  function openBadgeModal(key) {
    const info = D.BADGE_INFO[key];
    if (!info || !badgeModal || !badgeTitle || !badgeText) return;
    badgeTitle.textContent = info.title;
    badgeText.textContent = info.text;
    badgeModal.hidden = false;
    document.body.style.overflow = "hidden";
  }

  document.querySelectorAll("[data-badge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      openBadgeModal(btn.getAttribute("data-badge"));
    });
  });

  const datalist = document.getElementById("quickSearchList");
  if (datalist && D.QUICK_SUGGESTIONS) {
    D.QUICK_SUGGESTIONS.forEach((s) => {
      const opt = document.createElement("option");
      opt.value = s.value;
      opt.textContent = s.label || s.value;
      datalist.appendChild(opt);
    });
  }

  const form = document.getElementById("quickSearchForm");
  form?.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("quickSearchInput");
    const q = (input?.value || "").trim();
    if (!q) return;
    const url = new URL("map.html", window.location.href);
    url.searchParams.set("q", q);
    window.location.href = url.pathname + url.search;
  });
})();
