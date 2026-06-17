/**
 * PDF через pdfMake + vfs_fonts (Roboto): текст в документе, кириллица, не «пустой лист».
 */
(function (global) {
  function formatDateRu() {
    return new Intl.DateTimeFormat("ru-RU", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date());
  }

  function buildPdfContent(items) {
    const stack = [];
    for (const it of items) {
      if (it.t === "gap") {
        stack.push({ text: " ", margin: [0, 0, 0, 6] });
      } else if (it.t === "title") {
        stack.push({ text: it.v, style: "docTitle", margin: [0, 0, 0, 8] });
      } else if (it.t === "sub") {
        stack.push({ text: it.v, style: "docSub", margin: [0, 0, 0, 10] });
      } else if (it.t === "h2") {
        stack.push({ text: it.v, style: "docH2", margin: [0, 14, 0, 6] });
      } else if (it.t === "p") {
        stack.push({ text: it.v, style: "docP", margin: [0, 0, 0, 4] });
      } else if (it.t === "small") {
        stack.push({ text: it.v, style: "docSmall", margin: [0, 10, 0, 0] });
      } else if (it.t === "kv") {
        stack.push({ text: String(it.k) + ":", style: "docLabel", margin: [0, 4, 0, 2] });
        stack.push({ text: String(it.v ?? "—"), style: "docP", margin: [0, 0, 0, 6] });
      }
    }
    return stack.length
      ? stack
      : [{ text: "Нет данных для вывода.", style: "docP" }];
  }

  function runPdfMake(items, filename) {
    const pm = global.pdfMake || global.pdfmake;
    if (!pm || typeof pm.createPdf !== "function") {
      throw new Error("Библиотека pdfMake не загружена. Проверьте подключение скриптов.");
    }

    const docDefinition = {
      pageSize: "A4",
      pageMargins: [48, 48, 48, 48],
      content: buildPdfContent(items),
      styles: {
        docTitle: { fontSize: 18, bold: true, color: "#7a4a5c" },
        docSub: { fontSize: 12, color: "#333333" },
        docH2: { fontSize: 12, bold: true, color: "#7a4a5c" },
        docP: { fontSize: 10.5, color: "#1a1a1a" },
        docLabel: { fontSize: 10.5, bold: true, color: "#5c4f55" },
        docSmall: { fontSize: 8.5, color: "#666666", italics: true },
      },
      defaultStyle: {
        font: "Roboto",
        fontSize: 10.5,
      },
    };

    pm.createPdf(docDefinition).download(filename || "kadastr.pdf");
  }

  function buildObjectPdfItems(obj) {
    const coords =
      Array.isArray(obj.coords) && obj.coords.length >= 2
        ? `${obj.coords[0].toFixed(6)}, ${obj.coords[1].toFixed(6)}`
        : "—";
    return [
      { t: "title", v: "ООО Тамбов Кадастр" },
      { t: "sub", v: "Сведения об объекте недвижимости" },
      { t: "gap" },
      { t: "p", v: "Дата и время формирования: " + formatDateRu() },
      { t: "gap" },
      { t: "h2", v: "Паспорт объекта" },
      { t: "kv", k: "Кадастровый номер", v: String(obj.id || "—") },
      { t: "kv", k: "Адрес / местоположение", v: String(obj.address || "—") },
      { t: "kv", k: "Тип объекта", v: String(obj.title || "—") },
      { t: "kv", k: "Площадь", v: String(obj.area || "—") },
      { t: "kv", k: "Кадастровая стоимость", v: String(obj.cadastralValue || "—") },
      { t: "kv", k: "Статус учёта / регистрации", v: String(obj.status || "—") },
      { t: "kv", k: "Правообладатель (обобщённо)", v: String(obj.owner || "—") },
      { t: "kv", k: "Координаты (WGS-84), прибл.", v: coords },
      { t: "gap" },
      {
        t: "small",
        v:
          "* Состав сведений ЕГРН определяется запрошенным типом выписки. Документ сформирован из данных портала ООО «Тамбов Кадастр».",
      },
    ];
  }

  async function downloadObjectPdf(obj) {
    if (!obj) throw new Error("Нет данных объекта");
    const safeName = String(obj.id).replace(/[^\w\-]+/g, "_");
    runPdfMake(buildObjectPdfItems(obj), `kadastr_${safeName}.pdf`);
  }

  global.KadastrPdf = {
    downloadObjectPdf,
  };
})(window);
