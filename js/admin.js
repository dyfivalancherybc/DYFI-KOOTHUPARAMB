let sessionPassword = "";

const loginForm = document.getElementById("loginForm");
const summarySection = document.getElementById("summarySection");
const detailSection = document.getElementById("detailSection");

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

    if (data.entries.length === 0) {
      setMsg("detailStatus", "എൻട്രികൾ ഒന്നുമില്ല", "");
      return;
    }
    setMsg("detailStatus", `ആകെ ${data.entries.length} പേർ`, "");

    data.entries.forEach((en, i) => {
      const tr = document.createElement("tr");
      [i + 1, en.unit, en.name, en.phone, en.time].forEach(val => {
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
