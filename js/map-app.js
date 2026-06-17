(function () {
  const D = window.KADASTR_DATA;
  if (!D) return;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  const toast = window.kadastrToast || function () {};

  const mapEl = $("#cadastreMap");
  let map;
  let measureLayer = null;
  let measurePoints = [];
  let measureLine = null;

  function parseCoords(q) {
    const m = String(q).trim().match(/^([\d]{1,2}\.\d+)\s*[,;]\s*([\d]{1,2}\.\d+)/);
    if (!m) return null;
    return [parseFloat(m[1]), parseFloat(m[2])];
  }

  function findObjectByCoords(lat, lng, eps = 0.002) {
    return D.OBJECTS.find(
      (o) => Math.abs(o.coords[0] - lat) < eps && Math.abs(o.coords[1] - lng) < eps
    );
  }

  function initMap() {
    if (!mapEl || typeof L === "undefined") return;

    map = L.map("cadastreMap", { zoomControl: true }).setView(D.TAMBOV_CENTER, 13);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    D.OBJECTS.forEach((obj) => {
      const color = obj.type === "plot" ? "#c989a8" : "#8b5a6e";
      const poly = L.polygon(obj.polygon, {
        color,
        weight: 2,
        fillColor: color,
        fillOpacity: 0.22,
      }).addTo(map);
      poly.on("click", () => selectObject(obj.id));

      const marker = L.circleMarker(obj.coords, {
        radius: 9,
        color: "#fff",
        weight: 2,
        fillColor: color,
        fillOpacity: 1,
      }).addTo(map);
      marker.bindPopup(`<strong>${obj.title}</strong><br>${obj.address}<br><small>КН: ${obj.id}</small>`);
      marker.on("click", () => selectObject(obj.id));
    });

    map.on("click", onMapClickMeasure);
    map.on("dblclick", onMapDblClickMeasure);

    readHashView();
    map.on("moveend", () => writeHashView());

    const params = new URLSearchParams(location.search);
    const q = params.get("q");
    const highlight = params.get("highlight");
    if (highlight && D.OBJECTS.some((o) => o.id === highlight)) {
      setTimeout(() => selectObject(highlight), 300);
    } else if (q) {
      setTimeout(() => searchObjects(q), 300);
    }
  }

  function onMapDblClickMeasure(e) {
    const btn = $("#toolMeasure");
    if (!btn || btn.getAttribute("aria-pressed") !== "true") return;
    L.DomEvent.stopPropagation(e.originalEvent);
    if (measurePoints.length >= 2) {
      let sum = 0;
      for (let i = 1; i < measurePoints.length; i++) {
        sum += measurePoints[i - 1].distanceTo(measurePoints[i]);
      }
      toast(`Измерение завершено. Итого: ${sum.toFixed(1)} м`);
    } else {
      toast("Добавьте минимум две точки, затем двойной клик для завершения");
    }
    btn.setAttribute("aria-pressed", "false");
    map?.doubleClickZoom?.enable();
    $("#measureHint")?.setAttribute("hidden", "");
    $("#toolClearMeasure")?.setAttribute("hidden", "");
    measurePoints = [];
    if (measureLayer && map) {
      map.removeLayer(measureLayer);
      measureLayer = null;
      measureLine = null;
    }
  }

  function onMapClickMeasure(e) {
    const btn = $("#toolMeasure");
    if (!btn || btn.getAttribute("aria-pressed") !== "true") return;

    measurePoints.push(e.latlng);
    if (!measureLayer) {
      measureLayer = L.layerGroup().addTo(map);
    }
    if (measureLine) {
      measureLayer.removeLayer(measureLine);
    }
    measureLine = L.polyline(measurePoints, { color: "#8b5a6e", weight: 3, dashArray: "6 8" }).addTo(measureLayer);

    if (measurePoints.length >= 2) {
      let sum = 0;
      for (let i = 1; i < measurePoints.length; i++) {
        sum += measurePoints[i - 1].distanceTo(measurePoints[i]);
      }
      toast(`Длина линии: ${sum.toFixed(1)} м (приблизительно)`);
    }
  }

  function clearMeasure() {
    measurePoints = [];
    if (measureLayer && map) {
      map.removeLayer(measureLayer);
      measureLayer = null;
      measureLine = null;
    }
    $("#toolClearMeasure")?.setAttribute("hidden", "");
  }

  function toggleMeasure() {
    const btn = $("#toolMeasure");
    const hint = $("#measureHint");
    const clearBtn = $("#toolClearMeasure");
    if (!btn) return;
    const on = btn.getAttribute("aria-pressed") === "true";
    if (on) {
      btn.setAttribute("aria-pressed", "false");
      hint?.setAttribute("hidden", "");
      clearBtn?.setAttribute("hidden", "");
      map?.doubleClickZoom?.enable();
      clearMeasure();
      toast("Режим измерения выключен");
    } else {
      btn.setAttribute("aria-pressed", "true");
      hint?.removeAttribute("hidden");
      clearBtn?.removeAttribute("hidden");
      measurePoints = [];
      if (measureLayer && map) map.removeLayer(measureLayer);
      measureLayer = L.layerGroup().addTo(map);
      measureLine = null;
      map?.doubleClickZoom?.disable();
      toast("Режим измерения: кликайте по карте; двойной клик — завершить и показать суммарную длину.");
    }
  }

  $("#toolMeasure")?.addEventListener("click", toggleMeasure);
  $("#toolClearMeasure")?.addEventListener("click", () => {
    measurePoints = [];
    if (measureLayer && map) {
      measureLayer.clearLayers();
      measureLine = null;
    }
    toast("Линия сброшена");
  });

  function writeHashView() {
    if (!map) return;
    const c = map.getCenter();
    const z = map.getZoom();
    const base = location.pathname + location.search;
    const hash = `#map=${z}/${c.lat.toFixed(5)}/${c.lng.toFixed(5)}`;
    if (history.replaceState) {
      history.replaceState(null, "", base.split("#")[0] + hash);
    }
  }

  function readHashView() {
    const m = /^#map=(\d+(?:\.\d+)?)\/([\d.-]+)\/([\d.-]+)/.exec(location.hash);
    if (m && map) {
      map.setView([parseFloat(m[2]), parseFloat(m[3])], parseFloat(m[1]));
    }
  }

  $("#toolShare")?.addEventListener("click", () => {
    writeHashView();
    const url = location.href;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(url).then(() => toast("Ссылка на вид карты скопирована в буфер"));
    } else {
      prompt("Скопируйте ссылку:", url);
    }
  });

  $("#toolPrint")?.addEventListener("click", () => {
    window.print();
  });

  const detailsEl = $("#objectDetails");
  const btnExtract = $("#btnRequestExtract");
  const btnCert = $("#btnCertificate");
  const btnPdf = $("#btnDownloadPdf");

  function selectObject(id) {
    const obj = D.OBJECTS.find((o) => o.id === id);
    if (!obj || !detailsEl) return;

    detailsEl.innerHTML = `
      <dl>
        <dt>Кадастровый номер</dt><dd>${obj.id}</dd>
        <dt>Адрес / местоположение</dt><dd>${obj.address}</dd>
        <dt>Тип объекта</dt><dd>${obj.title}</dd>
        <dt>Площадь</dt><dd>${obj.area}</dd>
        <dt>Кадастровая стоимость</dt><dd>${obj.cadastralValue}</dd>
        <dt>Статус учёта / регистрации</dt><dd>${obj.status}</dd>
        <dt>Правообладатель (обобщённо)</dt><dd>${obj.owner}</dd>
      </dl>
      <p class="small muted">* Состав сведений ЕГРН определяется запрошенным типом выписки.</p>
    `;
    btnExtract.disabled = false;
    btnCert.disabled = false;
    if (btnPdf) btnPdf.disabled = false;
    btnExtract.dataset.objectId = id;
    btnCert.dataset.objectId = id;

    map?.setView(obj.coords, Math.max(map.getZoom(), 15));
  }

  btnPdf?.addEventListener("click", async () => {
    const id = btnExtract?.dataset?.objectId;
    if (!id) {
      toast("Сначала выберите объект на карте или выполните поиск");
      return;
    }
    const obj = D.OBJECTS.find((o) => o.id === id);
    if (!obj || !window.KadastrPdf) {
      toast("Не удалось сформировать PDF. Обновите страницу.");
      return;
    }
    btnPdf.disabled = true;
    try {
      await window.KadastrPdf.downloadObjectPdf(obj);
      toast("Файл PDF сохранён");
    } catch (err) {
      toast("Ошибка при создании PDF. Проверьте подключение к сети.");
    } finally {
      btnPdf.disabled = false;
    }
  });

  btnExtract?.addEventListener("click", () => {
    toast("Заявление на выписку ЕГРН отправлено. Результат придёт на указанный при обращении e-mail.");
  });
  btnCert?.addEventListener("click", () => {
    toast("Запрос справки о кадастровой стоимости зарегистрирован.");
  });

  function searchObjects(query) {
    const raw = (query || "").trim();
    const q = raw.toLowerCase();
    if (!q) {
      toast("Введите кадастровый номер, адрес или координаты");
      return;
    }

    const coords = parseCoords(raw);
    if (coords) {
      const byCoord = findObjectByCoords(coords[0], coords[1]);
      if (byCoord) {
        selectObject(byCoord.id);
        toast("Объект найден по координатам");
        return;
      }
    }

    const found = D.OBJECTS.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q)
    );
    if (found.length === 0) {
      toast("Объекты не найдены. Попробуйте: 68-41-0102034-45, «Советская» или координаты с главной страницы.");
      return;
    }
    selectObject(found[0].id);
    toast(`Найдено объектов: ${found.length}`);
  }

  $("#mapSearchBtn")?.addEventListener("click", () => {
    searchObjects($("#mapSearchInput")?.value);
  });
  $("#mapSearchInput")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchObjects($("#mapSearchInput")?.value);
    }
  });

  window.addEventListener("beforeprint", () => {
    map?.invalidateSize();
  });

  initMap();
})();
