const NEW_UNIT_VALUE = "__new__";

const committeeSel = document.getElementById("committee");
const unitSel = document.getElementById("unitSelect");
const unitNew = document.getElementById("unitNew");

let unitsRequestId = 0; // guards against out-of-order responses

function setStatus(msg, type) {
  const el = document.getElementById("statusMsg");
  el.textContent = msg;
  el.className = "status " + (type || "");
}

async function loadCommittees() {
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=committees`);
    const data = await res.json();
    data.committees.forEach(name => {
      const opt = document.createElement("option");
      opt.value = name;
      opt.textContent = name;
      committeeSel.appendChild(opt);
    });
  } catch (err) {
    console.error(err);
    setStatus("മേഖലകൾ ലോഡ് ചെയ്യാനായില്ല. പേജ് റിഫ്രഷ് ചെയ്യുക", "error");
  }
}

function showNewUnitInput(show) {
  unitNew.classList.toggle("hidden", !show);
  unitNew.required = show;
  if (!show) unitNew.value = "";
}

// Rebuild the unit dropdown. `selectUnit` (optional) is selected afterwards.
async function loadUnits(committee, selectUnit) {
  const reqId = ++unitsRequestId;
  unitSel.disabled = true;
  unitSel.innerHTML = "";
  showNewUnitInput(false);

  const loading = document.createElement("option");
  loading.value = "";
  loading.disabled = true;
  loading.selected = true;
  loading.textContent = "ലോഡ് ചെയ്യുന്നു...";
  unitSel.appendChild(loading);

  let units = [];
  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=units&committee=${encodeURIComponent(committee)}`);
    const data = await res.json();
    if (data.success) units = data.units;
  } catch (err) {
    console.error(err);
  }

  if (reqId !== unitsRequestId) return; // a newer request replaced this one

  unitSel.innerHTML = "";
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.disabled = true;
  placeholder.selected = true;
  placeholder.textContent = "തിരഞ്ഞെടുക്കുക";
  unitSel.appendChild(placeholder);

  units.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u;
    opt.textContent = u;
    unitSel.appendChild(opt);
  });

  const newOpt = document.createElement("option");
  newOpt.value = NEW_UNIT_VALUE;
  newOpt.textContent = "+ പുതിയ യൂണിറ്റ് ചേർക്കുക";
  unitSel.appendChild(newOpt);

  unitSel.disabled = false;

  if (selectUnit && units.includes(selectUnit)) {
    unitSel.value = selectUnit;
  } else if (units.length === 0) {
    // No units yet for this committee: go straight to manual entry
    unitSel.value = NEW_UNIT_VALUE;
    showNewUnitInput(true);
  }
}

committeeSel.addEventListener("change", () => {
  loadUnits(committeeSel.value);
});

unitSel.addEventListener("change", () => {
  const isNew = unitSel.value === NEW_UNIT_VALUE;
  showNewUnitInput(isNew);
  if (isNew) unitNew.focus();
});

// Allow digits only in phone field
document.getElementById("phone").addEventListener("input", (e) => {
  e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
});

document.getElementById("entryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = document.getElementById("submitBtn");
  const committee = committeeSel.value;
  const name = document.getElementById("name").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const ageEl = document.querySelector('input[name="age"]:checked');
  const age = ageEl ? ageEl.value : "";
  const genderEl = document.querySelector('input[name="gender"]:checked');
  const gender = genderEl ? genderEl.value : "";

  const usingNewUnit = unitSel.value === NEW_UNIT_VALUE;
  const unit = (usingNewUnit ? unitNew.value : unitSel.value).replace(/\s+/g, " ").trim();

  if (!committee) { setStatus("മേഖലാ കമ്മിറ്റി തിരഞ്ഞെടുക്കുക", "error"); return; }
  if (!unit) { setStatus("യൂണിറ്റ് തിരഞ്ഞെടുക്കുക / പേര് നൽകുക", "error"); return; }
  if (!name) { setStatus("പേര് നൽകുക", "error"); return; }
  if (!gender) { setStatus("ജെന്റർ തിരഞ്ഞെടുക്കുക", "error"); return; }
  if (!age) { setStatus("വയസ്സ് തിരഞ്ഞെടുക്കുക", "error"); return; }
  if (!/^\d{10}$/.test(phone)) { setStatus("10 അക്ക ഫോൺ നമ്പർ നൽകുക", "error"); return; }

  btn.disabled = true;
  setStatus("സമർപ്പിക്കുന്നു...", "");

  const url = `${APPS_SCRIPT_URL}?action=submit`
    + `&committee=${encodeURIComponent(committee)}`
    + `&unit=${encodeURIComponent(unit)}`
    + `&name=${encodeURIComponent(name)}`
    + `&gender=${encodeURIComponent(gender)}`
    + `&age=${encodeURIComponent(age)}`
    + `&phone=${encodeURIComponent(phone)}`;

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.success) {
      setStatus("വിജയകരമായി സമർപ്പിച്ചു ✓", "success");
      // Keep committee + unit selected; clear only the participant fields
      document.getElementById("name").value = "";
      document.getElementById("phone").value = "";
      document.querySelectorAll('input[name="age"], input[name="gender"]').forEach(r => r.checked = false);
      // Refresh the unit list so a newly added unit shows up, keep it selected
      await loadUnits(committee, unit);
    } else {
      setStatus(data.error || "പിശക് സംഭവിച്ചു", "error");
    }
  } catch (err) {
    setStatus("നെറ്റ്‌വർക്ക് പിശക്", "error");
  } finally {
    btn.disabled = false;
  }
});

loadCommittees();
