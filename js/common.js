(function () {
  const siteHeader = document.getElementById("siteHeader");
  const navToggle = document.getElementById("navToggle");
  const siteNav = document.getElementById("siteNav");

  navToggle?.addEventListener("click", () => {
    const open = !siteHeader.classList.contains("is-nav-open");
    siteHeader.classList.toggle("is-nav-open", open);
    navToggle.setAttribute("aria-expanded", String(open));
  });

  document.querySelectorAll(".site-nav .nav-link, .site-nav .btn").forEach((a) => {
    a.addEventListener("click", () => {
      siteHeader?.classList.remove("is-nav-open");
      navToggle?.setAttribute("aria-expanded", "false");
    });
  });

  const toastEl = document.getElementById("toast");
  window.kadastrToast = function kadastrToast(msg) {
    if (!toastEl) return;
    toastEl.textContent = msg;
    toastEl.hidden = false;
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(() => {
      toastEl.hidden = true;
    }, 4200);
  };

  function closeModal(el) {
    const m = el && el.closest ? el.closest(".modal") : null;
    if (!m) return;
    if (m.id === "siteAuthModal") return;
    m.hidden = true;
    document.body.style.overflow = "";
  }

  function closeAllModals() {
    document.querySelectorAll(".modal").forEach((m) => {
      if (m.id === "siteAuthModal") return;
      m.hidden = true;
    });
    document.body.style.overflow = "";
  }

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => closeModal(el));
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    const siteAuth = document.getElementById("siteAuthModal");
    if (siteAuth && !siteAuth.hidden) {
      sessionStorage.setItem(MODAL_SKIP_KEY, "1");
      siteAuth.hidden = true;
      document.body.style.overflow = "";
      return;
    }
    closeAllModals();
  });

  const CABINET_AUTH_KEY = "kadastr_cabinet_auth_v1";
  const MODAL_SKIP_KEY = "kadastr_site_auth_modal_skip_v1";

  function shouldShowSiteAuthModal() {
    if (/cabinet\.html/i.test(location.pathname)) return false;
    try {
      if (sessionStorage.getItem(CABINET_AUTH_KEY)) return false;
      if (sessionStorage.getItem(MODAL_SKIP_KEY) === "1") return false;
    } catch (_) {
      return false;
    }
    return true;
  }

  function hideSiteAuthModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = "";
  }

  function skipAuthModalForSession() {
    try {
      sessionStorage.setItem(MODAL_SKIP_KEY, "1");
    } catch (_) {
      /* ignore */
    }
  }

  function setCabinetAuth(method) {
    try {
      sessionStorage.setItem(
        CABINET_AUTH_KEY,
        JSON.stringify({
          method: method === "gosuslugi" ? "gosuslugi" : "portal",
          displayName: "Иванов Иван Иванович",
        })
      );
      skipAuthModalForSession();
    } catch (_) {
      /* ignore */
    }
  }

  function initSiteAuthModal() {
    if (!shouldShowSiteAuthModal()) return;

    const modal = document.createElement("div");
    modal.className = "modal modal--site-auth";
    modal.id = "siteAuthModal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", "siteAuthTitle");

    modal.innerHTML = `
      <div class="modal-backdrop" data-site-auth-backdrop tabindex="-1" aria-hidden="true"></div>
      <div class="modal-dialog card glass site-auth-dialog">
        <button type="button" class="modal-close" id="siteAuthClose" aria-label="Закрыть">×</button>
        <h2 id="siteAuthTitle">Вход на портал</h2>
        <p class="site-auth-lead muted">ООО «Тамбов Кадастр» — войдите в личный кабинет или продолжите без авторизации.</p>
        <div class="site-auth-actions">
          <button type="button" class="btn btn--primary btn--full btn--ripple" id="siteAuthBtnPortal">Войти</button>
          <button type="button" class="btn btn--secondary btn--full btn--ripple" id="siteAuthBtnGosuslugi">Вход через Госуслуги</button>
          <a href="cabinet.html" class="btn btn--outline btn--full btn--ripple">Открыть личный кабинет</a>
          <button type="button" class="btn btn--ghost btn--full btn--ripple" id="siteAuthContinue">Продолжить без входа</button>
        </div>
        <p class="fine-print site-auth-note">Полная авторизация выполняется через ЕСИА и официальные сервисы Росреестра.</p>
      </div>
    `;

    document.body.appendChild(modal);

    const finishSkip = () => {
      skipAuthModalForSession();
      hideSiteAuthModal(modal);
    };

    modal.querySelector("[data-site-auth-backdrop]")?.addEventListener("click", finishSkip);
    modal.querySelector("#siteAuthClose")?.addEventListener("click", finishSkip);
    modal.querySelector("#siteAuthContinue")?.addEventListener("click", finishSkip);

    modal.querySelector("#siteAuthBtnPortal")?.addEventListener("click", () => {
      setCabinetAuth("portal");
      hideSiteAuthModal(modal);
      window.kadastrToast?.("Вы вошли. Раздел «Личный кабинет» доступен в меню.");
    });

    modal.querySelector("#siteAuthBtnGosuslugi")?.addEventListener("click", () => {
      setCabinetAuth("gosuslugi");
      hideSiteAuthModal(modal);
      window.kadastrToast?.("Выполнен вход через Госуслуги. Откройте личный кабинет для работы с разделами.");
    });

    modal.hidden = false;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => {
      modal.querySelector("#siteAuthBtnPortal")?.focus();
    });
  }

  initSiteAuthModal();
})();
