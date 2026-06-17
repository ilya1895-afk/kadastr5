(function () {
  const D = window.KADASTR_DATA;
  const toast = window.kadastrToast;
  const AUTH_KEY = "kadastr_cabinet_auth_v1";
  const EXTRAS_KEY = "kadastr_cabinet_extras_v1";

  const authEl = document.getElementById("cabinetAuth");
  const dashEl = document.getElementById("cabinetDashboard");
  const userDisplay = document.getElementById("cabinetUserDisplay");
  const authMethod = document.getElementById("cabinetAuthMethod");

  function getAuth() {
    try {
      const raw = sessionStorage.getItem(AUTH_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function setAuth(data) {
    sessionStorage.setItem(AUTH_KEY, JSON.stringify(data));
  }

  function clearAuth() {
    sessionStorage.removeItem(AUTH_KEY);
  }

  function getExtras() {
    try {
      const raw = sessionStorage.getItem(EXTRAS_KEY);
      const x = raw ? JSON.parse(raw) : {};
      return {
        applications: Array.isArray(x.applications) ? x.applications : [],
        history: Array.isArray(x.history) ? x.history : [],
        documents: Array.isArray(x.documents) ? x.documents : [],
      };
    } catch (_) {
      return { applications: [], history: [], documents: [] };
    }
  }

  function saveExtras(x) {
    sessionStorage.setItem(EXTRAS_KEY, JSON.stringify(x));
  }

  function escapeHtml(s) {
    const d = document.createElement("div");
    d.textContent = s;
    return d.innerHTML;
  }

  function todayRu() {
    const t = new Date();
    const dd = String(t.getDate()).padStart(2, "0");
    const mm = String(t.getMonth() + 1).padStart(2, "0");
    return `${dd}.${mm}.${t.getFullYear()}`;
  }

  function parseRuDate(s) {
    const p = String(s).split(".");
    if (p.length !== 3) return 0;
    return new Date(+p[2], +p[1] - 1, +p[0]).getTime();
  }

  function showDashboard(auth) {
    authEl.hidden = true;
    dashEl.hidden = false;
    userDisplay.textContent = auth.displayName || "Пользователь";
    authMethod.textContent =
      auth.method === "gosuslugi" ? "Вход через Госуслуги" : "Учётная запись портала";
    authMethod.className =
      "cabinet-badge " + (auth.method === "gosuslugi" ? "cabinet-badge--esia" : "cabinet-badge--portal");
    renderAll();
  }

  function showAuth() {
    authEl.hidden = false;
    dashEl.hidden = true;
    clearAuth();
  }

  function loginPortal(method) {
    setAuth({
      method: method === "gosuslugi" ? "gosuslugi" : "portal",
      displayName: "Иванов Иван Иванович",
    });
    showDashboard(getAuth());
    toast?.("Добро пожаловать в личный кабинет.");
  }

  function renderObjects() {
    const tbody = document.getElementById("cabinetObjectsBody");
    if (!tbody || !D?.CABINET_OBJECTS) return;
    tbody.innerHTML = D.CABINET_OBJECTS.map(
      (o) => `
      <tr>
        <td data-label="Кадастровый номер"><strong>${escapeHtml(o.cadastralNumber)}</strong></td>
        <td data-label="Адрес">${escapeHtml(o.address)}</td>
        <td data-label="Площадь">${escapeHtml(o.area)}</td>
        <td data-label="Стоимость">${escapeHtml(o.cadastralValue)}</td>
        <td data-label="Права">${escapeHtml(o.rights)}</td>
        <td data-label="Обременения">${escapeHtml(o.encumbrances)}</td>
        <td data-label="Карта"><a class="link-forward" href="map.html?q=${encodeURIComponent(o.mapQuery || o.cadastralNumber)}">На карте</a></td>
      </tr>`
    ).join("");
  }

  function renderApplications() {
    const tbody = document.getElementById("cabinetApplicationsBody");
    const sel = document.getElementById("cabinetAppType");
    if (!tbody || !D?.CABINET_APPLICATIONS) return;

    if (sel && !sel.dataset.ready) {
      sel.innerHTML = (D.CABINET_APPLICATION_TYPES || [])
        .map((t) => `<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`)
        .join("");
      sel.dataset.ready = "1";
    }

    const ex = getExtras();
    const all = [...D.CABINET_APPLICATIONS, ...ex.applications];
    tbody.innerHTML = all
      .map(
        (a) => `
      <tr>
        <td data-label="Номер"><strong>${escapeHtml(a.id)}</strong></td>
        <td data-label="Тип">${escapeHtml(a.type)}</td>
        <td data-label="Дата">${escapeHtml(a.submittedAt)}</td>
        <td data-label="Статус"><span class="cabinet-status">${escapeHtml(a.status)}</span></td>
        <td data-label="Комментарий">${escapeHtml(a.statusDetail || "—")}</td>
      </tr>`
      )
      .join("");
  }

  function renderNotify() {
    const ul = document.getElementById("cabinetNotifyList");
    if (!ul || !D?.CABINET_NOTIFICATIONS) return;
    const kindLabel = { object: "Объект", application: "Заявление", restriction: "Обременение" };
    ul.innerHTML = D.CABINET_NOTIFICATIONS.map(
      (n) => `
      <li class="cabinet-notify-item card">
        <div class="cabinet-notify-meta">
          <span class="cabinet-notify-date">${escapeHtml(n.date)}</span>
          <span class="cabinet-notify-kind">${escapeHtml(kindLabel[n.kind] || "Сообщение")}</span>
        </div>
        <h3 class="cabinet-notify-title">${escapeHtml(n.title)}</h3>
        <p class="cabinet-notify-body muted">${escapeHtml(n.body)}</p>
      </li>`
    ).join("");
  }

  function renderDocs() {
    const tbody = document.getElementById("cabinetDocsBody");
    if (!tbody || !D?.CABINET_DOCUMENTS) return;
    const ex = getExtras();
    const all = [...D.CABINET_DOCUMENTS, ...ex.documents];
    tbody.innerHTML = all
      .map((doc) => {
        const id = escapeHtml(doc.id);
        const name = escapeHtml(doc.name);
        return `
      <tr>
        <td data-label="Документ">${name}</td>
        <td data-label="Дата">${escapeHtml(doc.date)}</td>
        <td data-label="Размер">${escapeHtml(doc.size)}</td>
        <td data-label="Направление">${doc.direction === "входящий" ? "Входящий" : "Исходящий"}</td>
        <td data-label="Действие"><button type="button" class="btn btn--small btn--outline cabinet-download" data-doc-id="${id}">Скачать</button></td>
      </tr>`;
      })
      .join("");

    tbody.querySelectorAll(".cabinet-download").forEach((btn) => {
      btn.addEventListener("click", () => {
        const id = btn.getAttribute("data-doc-id");
        const doc = [...(D.CABINET_DOCUMENTS || []), ...getExtras().documents].find((d) => d.id === id);
        const fname = doc?.name || "document";
        const blob = new Blob(
          [
            "Файл личного кабинета «Тамбов Кадастр» (учебный пример).\r\nВ рабочей системе здесь был бы подписанный документ.\r\nИмя: " +
              fname,
          ],
          { type: "text/plain;charset=utf-8" }
        );
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fname.replace(/\.pdf$/i, "") + "-vypiska.txt";
        a.click();
        URL.revokeObjectURL(a.href);
        toast?.("Файл скачан.");
      });
    });
  }

  function renderHistory() {
    const tbody = document.getElementById("cabinetHistoryBody");
    if (!tbody || !D?.CABINET_HISTORY) return;
    const ex = getExtras();
    const merged = [...ex.history, ...D.CABINET_HISTORY];
    merged.sort((a, b) => parseRuDate(b.date) - parseRuDate(a.date));
    tbody.innerHTML = merged
      .map(
        (h) => `
      <tr>
        <td data-label="Дата">${escapeHtml(h.date)}</td>
        <td data-label="Действие">${escapeHtml(h.action)}</td>
        <td data-label="Детали">${escapeHtml(h.detail)}</td>
      </tr>`
      )
      .join("");
  }

  function renderAll() {
    renderObjects();
    renderApplications();
    renderNotify();
    renderDocs();
    renderHistory();
  }

  function setupTabs() {
    const tabs = document.querySelectorAll(".cabinet-tab");
    const panels = document.querySelectorAll(".cabinet-panel");
    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const id = tab.getAttribute("data-panel");
        tabs.forEach((t) => {
          t.classList.toggle("is-active", t === tab);
          t.setAttribute("aria-selected", String(t === tab));
        });
        panels.forEach((p) => {
          const on = p.id === id;
          p.classList.toggle("is-active", on);
          p.hidden = !on;
        });
      });
    });
  }

  function setupForms() {
    const form = document.getElementById("cabinetNewApplicationForm");
    form?.addEventListener("submit", (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const type = fd.get("type");
      const comment = (fd.get("comment") || "").trim();
      if (!type) return;
      const num = "ЗВ-2026-" + String(Math.floor(1000 + Math.random() * 9000));
      const x = getExtras();
      x.applications.push({
        id: num,
        type: String(type),
        submittedAt: todayRu(),
        status: "Принято к рассмотрению",
        statusDetail: comment || "Ожидается обработка регистратором",
      });
      x.history.unshift({
        id: "h_" + Date.now(),
        date: todayRu(),
        action: "Подано заявление",
        detail: `${num} — ${type}`,
      });
      saveExtras(x);
      form.reset();
      toast?.("Заявление зарегистрировано.");
      renderApplications();
      renderHistory();
    });

    document.getElementById("cabinetUploadBtn")?.addEventListener("click", () => {
      const input = document.getElementById("cabinetFileInput");
      const f = input?.files?.[0];
      if (!f) {
        toast?.("Выберите файл.");
        return;
      }
      const x = getExtras();
      const id = "d_" + Date.now();
      const sizeStr = f.size < 1024 ? f.size + " Б" : (f.size / 1024).toFixed(1) + " КБ";
      x.documents.push({
        id,
        name: f.name,
        date: todayRu(),
        size: sizeStr,
        direction: "входящий",
      });
      x.history.unshift({
        id: "h_" + Date.now(),
        date: todayRu(),
        action: "Загружен документ",
        detail: f.name,
      });
      saveExtras(x);
      input.value = "";
      toast?.("Документ прикреплён.");
      renderDocs();
      renderHistory();
    });
  }

  document.getElementById("cabinetLoginGosuslugi")?.addEventListener("click", () => loginPortal("gosuslugi"));
  document.getElementById("cabinetLoginPortal")?.addEventListener("click", () => loginPortal("portal"));
  document.getElementById("cabinetLogout")?.addEventListener("click", () => {
    clearAuth();
    authEl.hidden = false;
    dashEl.hidden = true;
    toast?.("Вы вышли из кабинета.");
  });

  setupTabs();
  setupForms();

  const auth = getAuth();
  if (auth && auth.displayName) {
    showDashboard(auth);
  }
})();
