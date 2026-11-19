let sessionPassword = "";
let currentCommittee = "";
let currentEntries = [];

const loginForm = document.getElementById("loginForm");
const summarySection = document.getElementById("summarySection");
const detailSection = document.getElementById("detailSection");
const printArea = document.getElementById("printArea");

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

      const left = document.createElement("span");
      left.textContent = `${i + 1}. ${item.name}`;

      const right = document.createElement("span");
      right.className = "count-badge";
      right.textContent = item.count;

      li.appendChild(left);
      li.appendChild(right);
      li.addEventListener("click", () => loadDetails(item.name));
      list.appendChild(li);
    });

    document.getElementById("grandTotal").textContent = `ആകെ: ${data.total}`;
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
    setMsg("detailStatus", `ആകെ ${data.entries.length} പേർ`, "");

    data.entries.forEach((en, i) => {
      const tr = document.createElement("tr");
      [i + 1, en.unit, en.name, en.phone].forEach(val => {
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

// ===== PDF REPORTS (browser print -> Save as PDF) =====
function todayIST() {
  return new Date().toLocaleDateString("en-GB", { timeZone: "Asia/Kolkata" }); // dd/mm/yyyy
}

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

function reportHeader(subtitle) {
  const wrap = el("div", null, "report-header");
  wrap.appendChild(el("h1", "കൂത്തുപറമ്പ് രക്തസാക്ഷി അനുസ്മരണം"));
  wrap.appendChild(el("h2", "DYFI വളാഞ്ചേരി ബ്ലോക്ക് കമ്മിറ്റി"));
  if (subtitle) wrap.appendChild(el("h3", subtitle));
  wrap.appendChild(el("p", `തിയ്യതി: ${todayIST()}`, "report-date"));
  return wrap;
}

function mekhalaSection(name, entries) {
  const sec = el("div", null, "report-section");
  sec.appendChild(el("h3", `${name} - ആകെ ${entries.length}`, "section-title"));
  if (entries.length === 0) {
    sec.appendChild(el("p", "എൻട്രികൾ ഒന്നുമില്ല"));
    return sec;
  }
  const rows = sortByUnit(entries).map((en, i) => ({
    cells: [i + 1, en.unit, en.name, en.phone]
  }));
  sec.appendChild(buildTable(["ക്രമ. നം.", "യൂണിറ്റ്", "പേര്", "ഫോൺ"], rows));
  return sec;
}

function printReport(fileTitle) {
  const oldTitle = document.title;
  document.title = fileTitle; // browsers use this as the default PDF file name
  const restore = () => {
    document.title = oldTitle;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}

// ----- Single mekhala report -----
document.getElementById("mekhalaPdfBtn").addEventListener("click", () => {
  if (!currentCommittee) return;
  printArea.innerHTML = "";
  printArea.appendChild(reportHeader(`മേഖല: ${currentCommittee}`));
  printArea.appendChild(mekhalaSection(currentCommittee, currentEntries));
  printReport(`anusmaranam_${currentCommittee}`);
});

// ----- Full block report -----
document.getElementById("blockPdfBtn").addEventListener("click", async () => {
  const btn = document.getElementById("blockPdfBtn");
  btn.disabled = true;
  setMsg("summaryStatus", "റിപ്പോർട്ട് തയ്യാറാക്കുന്നു...", "");

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=all&password=${encodeURIComponent(sessionPassword)}`);
    const data = await res.json();
    if (!data.success) {
      setMsg("summaryStatus", data.error || "പിശക് സംഭവിച്ചു", "error");
      return;
    }
    setMsg("summaryStatus", "", "");

    printArea.innerHTML = "";
    printArea.appendChild(reportHeader("ബ്ലോക്ക് റിപ്പോർട്ട്"));

    // Summary table
    const sumRows = data.committees.map((c, i) => ({ cells: [i + 1, c.name, c.entries.length] }));
    sumRows.push({ cells: ["", "ആകെ", data.total], cls: "total-row" });
    printArea.appendChild(el("h3", "മേഖല തിരിച്ചുള്ള ആകെ എണ്ണം", "section-title"));
    printArea.appendChild(buildTable(["ക്രമ. നം.", "മേഖലാ കമ്മിറ്റി", "ആകെ"], sumRows, "summary-table"));

    // Each mekhala on its own page
    data.committees.forEach(c => {
      const sec = mekhalaSection(c.name, c.entries);
      sec.classList.add("page-break");
      printArea.appendChild(sec);
    });

    printReport("anusmaranam_block_report");
  } catch (err) {
    setMsg("summaryStatus", "നെറ്റ്‌വർക്ക് പിശക്", "error");
  } finally {
    btn.disabled = false;
  }
});
