let sessionPassword = "";
let currentCommittee = "";
let currentEntries = [];

const loginForm = document.getElementById("loginForm");
const summarySection = document.getElementById("summarySection");
const detailSection = document.getElementById("detailSection");

const AGE_TEXT = {
  below: "40 ൽ താഴെ",
  above: "40 ന് മുകളിൽ"
};

const GENDER_TEXT = {
  male: "പുരുഷൻ",
  female: "സ്ത്രീ",
  other: "മറ്റുള്ളവർ"
};

function ageText(code) {
  return AGE_TEXT[code] || "-";
}

function genderText(code) {
  return GENDER_TEXT[code] || "-";
}

// All the counts needed for screens and reports
function calcStats(entries) {
  const s = {
    total: entries.length,
    below: 0, above: 0,
    male: 0, mBelow: 0, mAbove: 0,
    female: 0, fBelow: 0, fAbove: 0
  };
  entries.forEach(en => {
    if (en.age === "below") s.below++;
    if (en.age === "above") s.above++;
    if (en.gender === "male") {
      s.male++;
      if (en.age === "below") s.mBelow++;
      if (en.age === "above") s.mAbove++;
    }
    if (en.gender === "female") {
      s.female++;
      if (en.age === "below") s.fBelow++;
      if (en.age === "above") s.fAbove++;
    }
  });
  return s;
}

function setMsg(id, msg, type) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.className = "status " + (type || "");
}

// ----- Login -----
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const password = document.getElementById("password").value;
  setMsg("loginStatus", "പരിശോധിക്കുന്നു...", "");

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=verifyLogin&password=${encodeURIComponent(password)}`);
    const data = await res.json();
    if (data.success) {
      sessionPassword = password;
      loginForm.classList.add("hidden");
      summarySection.classList.remove("hidden");
      loadSummary();
    } else {
      setMsg("loginStatus", "പാസ്‌വേഡ് തെറ്റാണ്", "error");
    }
  } catch (err) {
    setMsg("loginStatus", "നെറ്റ്‌വർക്ക് പിശക്", "error");
  }
});

// ----- Summary -----
async function loadSummary() {
  const list = document.getElementById("summaryList");
  list.innerHTML = "";
  document.getElementById("grandTotal").textContent = "";
  setMsg("summaryStatus", "ലോഡ് ചെയ്യുന്നു...", "");

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=summary&password=${encodeURIComponent(sessionPassword)}`);
    const data = await res.json();
    if (!data.success) {
      setMsg("summaryStatus", data.error || "പിശക് സംഭവിച്ചു", "error");
      return;
    }
    setMsg("summaryStatus", "", "");

    data.summary.forEach((item, i) => {
      const li = document.createElement("li");
      li.className = "summary-item";

      const left = document.createElement("div");
      const nameLine = document.createElement("div");
      nameLine.textContent = `${i + 1}. ${item.name}`;
      const sub = document.createElement("div");
      sub.className = "summary-sub";
      sub.textContent =
        `40 ൽ താഴെ: ${item.below}  |  40 ന് മുകളിൽ: ${item.above}  |  പുരുഷൻ: ${item.male}  |  സ്ത്രീ: ${item.female}`;
      left.appendChild(nameLine);
      left.appendChild(sub);

      const right = document.createElement("span");
      right.className = "count-badge";
      right.textContent = item.count;

      li.appendChild(left);
      li.appendChild(right);
      li.addEventListener("click", () => loadDetails(item.name));
      list.appendChild(li);
    });

    document.getElementById("grandTotal").textContent =
      `40 ൽ താഴെ: ${data.totalBelow}  |  40 ന് മുകളിൽ: ${data.totalAbove}  |  `
      + `പുരുഷൻ: ${data.totalMale}  |  സ്ത്രീ: ${data.totalFemale}  |  ആകെ: ${data.total}`;
  } catch (err) {
    setMsg("summaryStatus", "നെറ്റ്‌വർക്ക് പിശക്", "error");
  }
}

document.getElementById("refreshBtn").addEventListener("click", loadSummary);

// ----- Details -----
async function loadDetails(committee) {
  currentCommittee = committee;
  currentEntries = [];
  summarySection.classList.add("hidden");
  detailSection.classList.remove("hidden");
  document.getElementById("detailTitle").textContent = committee;
  const body = document.getElementById("detailBody");
  body.innerHTML = "";
  setMsg("detailStatus", "ലോഡ് ചെയ്യുന്നു...", "");

  try {
    const url = `${APPS_SCRIPT_URL}?action=details&committee=${encodeURIComponent(committee)}&password=${encodeURIComponent(sessionPassword)}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!data.success) {
      setMsg("detailStatus", data.error || "പിശക് സംഭവിച്ചു", "error");
      return;
    }

    currentEntries = data.entries;

    if (data.entries.length === 0) {
      setMsg("detailStatus", "എൻട്രികൾ ഒന്നുമില്ല", "");
      return;
    }
    const c = calcStats(data.entries);
    setMsg("detailStatus",
      `40 ൽ താഴെ: ${c.below}  |  40 ന് മുകളിൽ: ${c.above}  |  `
      + `പുരുഷൻ: ${c.male}  |  സ്ത്രീ: ${c.female}  |  ആകെ: ${c.total}`, "");

    data.entries.forEach((en, i) => {
      const tr = document.createElement("tr");
      [i + 1, en.unit, en.name, genderText(en.gender), ageText(en.age), en.phone].forEach(val => {
        const td = document.createElement("td");
        td.textContent = val; // textContent => safe against HTML injection
        tr.appendChild(td);
      });
      body.appendChild(tr);
    });
  } catch (err) {
    setMsg("detailStatus", "നെറ്റ്‌വർക്ക് പിശക്", "error");
  }
}

document.getElementById("backBtn").addEventListener("click", () => {
  detailSection.classList.add("hidden");
  summarySection.classList.remove("hidden");
  loadSummary();
});

// ===== PDF REPORTS (direct download via html2pdf.js) =====
function el(tag, text, cls) {
  const n = document.createElement(tag);
  if (text !== undefined && text !== null) n.textContent = text;
  if (cls) n.className = cls;
  return n;
}

// Sort by unit name, keeping original order inside a unit
function sortByUnit(entries) {
  return entries
    .map((en, idx) => ({ en, idx }))
    .sort((a, b) => a.en.unit.localeCompare(b.en.unit, "ml") || a.idx - b.idx)
    .map(x => x.en);
}

function buildTable(headers, rows, extraClass) {
  const table = el("table", null, "report-table " + (extraClass || ""));
  const thead = el("thead");
  const hr = el("tr");
  headers.forEach(h => hr.appendChild(el("th", h)));
  thead.appendChild(hr);
  table.appendChild(thead);

  const tbody = el("tbody");
  rows.forEach(r => {
    const tr = el("tr", null, r.cls || "");
    r.cells.forEach(c => tr.appendChild(el("td", c)));
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
}

// Title block at the top of a report (no date)
function reportHeader(subtitle) {
  const wrap = el("div", null, "report-header");
  wrap.appendChild(el("h1", "കൂത്തുപറമ്പ് രക്തസാക്ഷി അനുസ്മരണം"));
  wrap.appendChild(el("h2", "DYFI വളാഞ്ചേരി ബ്ലോക്ക് കമ്മിറ്റി"));
  if (subtitle) wrap.appendChild(el("h3", subtitle));
  return wrap;
}

// Totals table: age totals, then male and female breakdowns, then grand total
function totalsBox(entries) {
  const c = calcStats(entries);
  const box = el("div", null, "totals-box");
  box.appendChild(buildTable(["വിവരം", "എണ്ണം"], [
    { cells: ["40 ൽ താഴെ (ആകെ)", c.below] },
    { cells: ["40 ന് മുകളിൽ (ആകെ)", c.above] },
    { cells: ["പുരുഷൻ - 40 ൽ താഴെ", c.mBelow] },
    { cells: ["പുരുഷൻ - 40 ന് മുകളിൽ", c.mAbove] },
    { cells: ["ആകെ പുരുഷൻ", c.male], cls: "sub-total-row" },
    { cells: ["സ്ത്രീ - 40 ൽ താഴെ", c.fBelow] },
    { cells: ["സ്ത്രീ - 40 ന് മുകളിൽ", c.fAbove] },
    { cells: ["ആകെ സ്ത്രീ", c.female], cls: "sub-total-row" },
    { cells: ["ആകെ", c.total], cls: "total-row" }
  ], "totals-table"));
  return box;
}

// One mekhala: big centered name, list with signature column, totals at the end
function mekhalaSection(name, entries) {
  const sec = el("div", null, "report-section");
  sec.appendChild(el("h2", name, "mekhala-title"));

  if (entries.length === 0) {
    sec.appendChild(el("p", "എൻട്രികൾ ഒന്നുമില്ല", "empty-note"));
  } else {
    const rows = sortByUnit(entries).map((en, i) => ({
      cells: [i + 1, en.unit, en.name, genderText(en.gender), ageText(en.age), en.phone, ""]
    }));
    sec.appendChild(buildTable(
      ["ക്രമ. നം.", "യൂണിറ്റ്", "പേര്", "ലിംഗം", "വയസ്സ്", "ഫോൺ", "ഒപ്പ്"],
      rows,
      "sign-table"
    ));
  }

  sec.appendChild(totalsBox(entries));
  return sec;
}

// Render `doc` to a PDF and download it straight away
async function savePdf(doc, filename, statusId, btn) {
  if (typeof html2pdf === "undefined") {
    setMsg(statusId, "PDF ലൈബ്രറി ലോഡ് ആയില്ല. പേജ് റിഫ്രഷ് ചെയ്യുക", "error");
    return;
  }

  btn.disabled = true;
  setMsg(statusId, "PDF തയ്യാറാക്കുന്നു... (കുറച്ച് സമയമെടുക്കും)", "");

  try {
    // Make sure the Malayalam font is ready before drawing
    await document.fonts.load("16px 'Anek Malayalam'");
    await document.fonts.ready;

    await html2pdf().set({
      margin: [10, 10, 12, 10],
      filename: filename,
      image: { type: "jpeg", quality: 0.95 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      pagebreak: { mode: ["css", "legacy"], before: ".page-break", avoid: ["tr", ".totals-box"] }
    }).from(doc).save();

    setMsg(statusId, "PDF ഡൗൺലോഡ് ചെയ്തു ✓", "success");
  } catch (err) {
    console.error(err);
    setMsg(statusId, "PDF ഉണ്ടാക്കാനായില്ല", "error");
  } finally {
    btn.disabled = false;
  }
}

// ----- Single mekhala report -----
document.getElementById("mekhalaPdfBtn").addEventListener("click", () => {
  if (!currentCommittee) return;
  const doc = el("div", null, "pdf-doc");
  doc.appendChild(reportHeader());
  doc.appendChild(mekhalaSection(currentCommittee, currentEntries));
  savePdf(doc, `anusmaranam_${currentCommittee}.pdf`,
          "detailStatus", document.getElementById("mekhalaPdfBtn"));
});

// ----- Full block report -----
document.getElementById("blockPdfBtn").addEventListener("click", async () => {
  const btn = document.getElementById("blockPdfBtn");
  btn.disabled = true;
  setMsg("summaryStatus", "വിവരങ്ങൾ ശേഖരിക്കുന്നു...", "");

  let data;
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=all&password=${encodeURIComponent(sessionPassword)}`);
    data = await res.json();
  } catch (err) {
    setMsg("summaryStatus", "നെറ്റ്‌വർക്ക് പിശക്", "error");
    btn.disabled = false;
    return;
  }

  if (!data.success) {
    setMsg("summaryStatus", data.error || "പിശക് സംഭവിച്ചു", "error");
    btn.disabled = false;
    return;
  }

  const doc = el("div", null, "pdf-doc");
  doc.appendChild(reportHeader("ബ്ലോക്ക് റിപ്പോർട്ട്"));

  // First page: mekhala-wise summary with grand total
  const allEntries = [];
  const sumRows = data.committees.map((c, i) => {
    const k = calcStats(c.entries);
    c.entries.forEach(en => allEntries.push(en));
    return { cells: [i + 1, c.name, k.below, k.above, k.male, k.female, k.total] };
  });
  const g = calcStats(allEntries);
  sumRows.push({ cells: ["", "ആകെ", g.below, g.above, g.male, g.female, g.total], cls: "total-row" });

  doc.appendChild(el("h3", "മേഖല തിരിച്ചുള്ള ആകെ എണ്ണം", "section-title"));
  doc.appendChild(buildTable(
    ["ക്രമ. നം.", "മേഖലാ കമ്മിറ്റി", "40 ൽ താഴെ", "40 ന് മുകളിൽ", "പുരുഷൻ", "സ്ത്രീ", "ആകെ"],
    sumRows,
    "summary-table"
  ));

  // Block-wide breakdown (male / female by age)
  doc.appendChild(el("h3", "ബ്ലോക്ക് ആകെ വിവരം", "section-title"));
  doc.appendChild(totalsBox(allEntries));

  // Each mekhala starts on a new page: big name, list, totals
  data.committees.forEach(c => {
    const sec = mekhalaSection(c.name, c.entries);
    sec.classList.add("page-break");
    doc.appendChild(sec);
  });

  await savePdf(doc, "anusmaranam_block_report.pdf", "summaryStatus", btn);
});
