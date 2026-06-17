(function () {
  const D = window.KADASTR_DATA;
  const toast = window.kadastrToast;

  function renderPhones() {
    const root = document.getElementById("supportPhonesMount");
    if (!root || !D?.SUPPORT_PHONES) return;
    const p = D.SUPPORT_PHONES;
    const linesHtml = (p.lines || [])
      .map(
        (line) => `
      <li class="support-phone-item card">
        <div class="support-phone-head">
          <span class="support-phone-label">${escapeHtml(line.label)}</span>
          <a class="support-phone-tel" href="tel:${escapeAttr(line.tel)}">${escapeHtml(line.display)}</a>
        </div>
        ${line.note ? `<p class="support-phone-note muted">${escapeHtml(line.note)}</p>` : ""}
      </li>`
      )
      .join("");
    const toll = p.tollFree;
    const tollHtml = toll
      ? `
      <li class="support-phone-item card support-phone-item--accent">
        <div class="support-phone-head">
          <span class="support-phone-label">${escapeHtml(toll.label)}</span>
          <a class="support-phone-tel" href="tel:${escapeAttr(toll.tel)}">${escapeHtml(toll.display)}</a>
        </div>
        ${toll.note ? `<p class="support-phone-note muted">${escapeHtml(toll.note)}</p>` : ""}
      </li>`
      : "";
    root.innerHTML = `
      <p class="support-schedule"><strong>График:</strong> ${escapeHtml(p.schedule)}</p>
      <ul class="support-phone-list">${linesHtml}${tollHtml}</ul>`;
  }

  function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s;
    return div.innerHTML;
  }

  function escapeAttr(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  const CHAT_STORAGE_KEY = "kadastr_support_chat_v1";

  function renderChat() {
    const welcomeEl = document.getElementById("supportChatWelcome");
    const teamEl = document.getElementById("supportChatTeam");
    const slot = document.getElementById("supportWidgetSlot");
    const live = document.getElementById("supportLiveChat");
    if (!D?.SUPPORT_CHAT) return;

    if (welcomeEl) welcomeEl.textContent = D.SUPPORT_CHAT.welcomeMessage || "";

    if (teamEl && Array.isArray(D.SUPPORT_CHAT.operators)) {
      teamEl.innerHTML = D.SUPPORT_CHAT.operators
        .map(
          (op) => `
        <li class="support-team-item">
          <strong>${escapeHtml(op.name)}</strong>
          <span class="support-team-role">${escapeHtml(op.role)}</span>
          <span class="support-team-queues muted">${escapeHtml(op.queues || "")}</span>
        </li>`
        )
        .join("");
    }

    const src = (D.SUPPORT_CHAT.widgetScriptSrc || "").trim();
    if (src) {
      live?.setAttribute("hidden", "");
      slot?.removeAttribute("hidden");
      if (slot) {
        slot.innerHTML = "";
        const script = document.createElement("script");
        script.async = true;
        script.src = src;
        script.setAttribute("data-kadastr-widget", "1");
        document.body.appendChild(script);
      }
      return;
    }

    slot?.setAttribute("hidden", "");
    live?.removeAttribute("hidden");

    setupLiveChat();
  }

  function normalizeChatText(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/ё/g, "е")
      .trim();
  }

  function pickChatReply(userText) {
    const norm = normalizeChatText(userText);
    const rules = D?.SUPPORT_CHAT?.chatAutoReplies;
    if (Array.isArray(rules)) {
      for (const rule of rules) {
        const keys = rule.match || [];
        if (keys.some((k) => norm.includes(normalizeChatText(k)))) {
          return rule.text;
        }
      }
    }
    if (norm.includes("график") || norm.includes("часы") || norm.includes("работаете")) {
      const sch = D?.SUPPORT_PHONES?.schedule;
      if (sch) return `График офиса и линий: ${sch} Телефоны — в соседнем блоке на этой странице.`;
    }
    const fallbacks = D?.SUPPORT_CHAT?.chatFallbackPhrases;
    if (Array.isArray(fallbacks) && fallbacks.length) {
      return fallbacks[Math.floor(Math.random() * fallbacks.length)];
    }
    return "Спасибо за обращение! Для детального ответа позвоните по телефону поддержки или заполните форму внизу страницы.";
  }

  function setupLiveChat() {
    const messagesEl = document.getElementById("supportChatMessages");
    const form = document.getElementById("supportChatForm");
    const input = document.getElementById("supportChatInput");
    const typingEl = document.getElementById("supportChatTyping");
    if (!messagesEl || !form || !input) return;

    const label = D.SUPPORT_CHAT.chatReplyLabel || "Служба поддержки";
    let busy = false;

    function saveState(list) {
      try {
        sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(list));
      } catch (_) {
        /* ignore */
      }
    }

    function loadState() {
      try {
        const raw = sessionStorage.getItem(CHAT_STORAGE_KEY);
        if (!raw) return null;
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : null;
      } catch (_) {
        return null;
      }
    }

    function appendBubble(role, text) {
      const wrap = document.createElement("div");
      wrap.className = `support-msg support-msg--${role}`;
      const meta = document.createElement("span");
      meta.className = "support-msg-label";
      meta.textContent = role === "user" ? "Вы" : label;
      const body = document.createElement("div");
      body.className = "support-msg-text";
      body.textContent = text;
      wrap.appendChild(meta);
      wrap.appendChild(body);
      messagesEl.appendChild(wrap);
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }

    function renderFromState(list) {
      messagesEl.innerHTML = "";
      list.forEach((m) => {
        if (m && m.role && m.text) appendBubble(m.role, m.text);
      });
    }

    let list = loadState();
    if (!list || !list.length) {
      const welcome =
        D.SUPPORT_CHAT.chatOpeningLine ||
        D.SUPPORT_CHAT.welcomeMessage ||
        "Здравствуйте! Напишите ваш вопрос.";
      list = [{ role: "bot", text: welcome }];
      saveState(list);
    }
    renderFromState(list);

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      if (busy) return;
      const text = (input.value || "").trim();
      if (!text) return;

      busy = true;
      input.disabled = true;
      form.querySelector('button[type="submit"]')?.setAttribute("disabled", "");

      list.push({ role: "user", text });
      appendBubble("user", text);
      saveState(list);
      input.value = "";

      typingEl?.removeAttribute("hidden");
      messagesEl.scrollTop = messagesEl.scrollHeight;

      const delay = 650 + Math.random() * 1100;
      window.setTimeout(() => {
        const reply = pickChatReply(text);
        typingEl?.setAttribute("hidden", "");
        list.push({ role: "bot", text: reply });
        appendBubble("bot", reply);
        saveState(list);

        busy = false;
        input.disabled = false;
        form.querySelector('button[type="submit"]')?.removeAttribute("disabled");
        input.focus();
      }, delay);
    });
  }

  function renderFaq() {
    const root = document.getElementById("supportFaqMount");
    if (!root || !Array.isArray(D?.SUPPORT_FAQ)) return;

    root.innerHTML = D.SUPPORT_FAQ.map(renderFaqCategory).join("");

    root.querySelectorAll(".accordion-trigger").forEach((btn) => {
      btn.addEventListener("click", () => {
        const expanded = btn.getAttribute("aria-expanded") === "true";
        const panel = document.getElementById(btn.getAttribute("aria-controls"));
        btn.setAttribute("aria-expanded", String(!expanded));
        if (panel) panel.hidden = expanded;
        btn.closest(".accordion-item")?.classList.toggle("is-open", !expanded);
      });
    });
  }

  function renderFaqCategory(cat) {
    const items = (cat.items || [])
      .map((item, i) => {
        const id = `faq-${cat.id}-${i}`;
        const search = `${cat.title} ${item.q} ${item.a}`.toLowerCase();
        return `
      <div class="accordion-item" data-faq-search="${escapeAttr(search)}">
        <button type="button" class="accordion-trigger" aria-expanded="false" aria-controls="${id}">
          <span>${escapeHtml(item.q)}</span>
          <span class="accordion-chevron" aria-hidden="true"></span>
        </button>
        <div class="accordion-panel" id="${id}" hidden>
          <p class="faq-answer">${escapeHtml(item.a)}</p>
        </div>
      </div>`;
      })
      .join("");

    return `
    <section class="faq-category card support-faq-category" data-category="${escapeAttr(cat.id)}">
      <h3 class="faq-category-title">${escapeHtml(cat.title)}</h3>
      <div class="accordion">${items}</div>
    </section>`;
  }

  function setupFaqSearch() {
    const input = document.getElementById("supportFaqSearch");
    if (!input) return;

    const apply = () => {
      const q = input.value.trim().toLowerCase();
      document.querySelectorAll(".support-faq-category").forEach((section) => {
        let any = false;
        section.querySelectorAll(".accordion-item").forEach((item) => {
          const hay = (item.getAttribute("data-faq-search") || "").toLowerCase();
          const show = !q || hay.includes(q);
          item.hidden = !show;
          if (show) any = true;
        });
        section.hidden = !any;
      });

      const empty = document.getElementById("supportFaqEmpty");
      if (empty) {
        const visible = Array.from(document.querySelectorAll(".support-faq-category")).some((s) => !s.hidden);
        empty.hidden = visible || !q;
      }
    };

    input.addEventListener("input", apply);
    input.addEventListener("search", apply);
  }

  function setupForm() {
    const form = document.getElementById("supportFeedbackForm");
    if (!form) return;

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const consent = form.querySelector('[name="consent"]');
      if (consent && !consent.checked) {
        toast?.("Нужно согласие на обработку персональных данных.");
        return;
      }
      const msg = form.querySelector('[name="message"]');
      if (msg && !(msg.value || "").trim()) {
        toast?.("Опишите вопрос в поле сообщения.");
        return;
      }
      toast?.("Спасибо! Обращение принято. Мы свяжемся с вами в рабочее время.");
      form.reset();
    });
  }

  renderPhones();
  renderChat();
  renderFaq();
  setupFaqSearch();
  setupForm();
})();
