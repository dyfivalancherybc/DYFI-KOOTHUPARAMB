/**
 * Koothuparamb Rakthasakshi Anusmaranam - Registration backend
 * Google Apps Script (Web App)
 *
 * Setup:
 *  1. Set SHEET_ID below.
 *  2. Project Settings > Script Properties > ADMIN_PASSWORD = <your password>
 *  3. Run setupSheets() once (authorise when asked).
 *  4. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone).
 */

const SHEET_ID = "PASTE_YOUR_SHEET_ID_HERE";
const ENTRIES_SHEET = "Entries";
const MEKHALA_SHEET = "Mekhalas";
const ENTRY_HEADERS = ["ID", "Timestamp", "Mekhala", "Unit", "Name", "Phone"];

/* ---------- One-time setup ---------- */
function setupSheets() {
  const ss = SpreadsheetApp.openById(SHEET_ID);

  let e = ss.getSheetByName(ENTRIES_SHEET);
  if (!e) e = ss.insertSheet(ENTRIES_SHEET);
  if (e.getLastRow() === 0) {
    e.getRange(1, 1, 1, ENTRY_HEADERS.length).setValues([ENTRY_HEADERS]).setFontWeight("bold");
    e.setFrozenRows(1);
  }
  e.getRange("F:F").setNumberFormat("@"); // phone as text (keeps leading zeros)

  let m = ss.getSheetByName(MEKHALA_SHEET);
  if (!m) {
    m = ss.insertSheet(MEKHALA_SHEET);
    m.getRange(1, 1).setValue("Mekhala").setFontWeight("bold");
    m.getRange(2, 1, 3, 1).setValues([["Mekhala 1"], ["Mekhala 2"], ["Mekhala 3"]]); // replace with real names
    m.setFrozenRows(1);
  }
}

/* ---------- Router ---------- */
function doGet(e) {
  const p = (e && e.parameter) || {};
  try {
    switch (p.action) {
      case "mekhalas":    return json({ success: true, mekhalas: getMekhalas() });
      case "submit":      return json(submitEntry(p));
      case "verifyLogin": return json({ success: checkPassword(p.password) });
      case "all":         return json(requireAuth(p, getAll));
      case "delete":      return json(requireAuth(p, () => deleteEntry(p.id)));
      default:            return json({ success: false, error: "Unknown action" });
    }
  } catch (err) {
    return json({ success: false, error: "Server error: " + err.message });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* ---------- Auth ---------- */
function checkPassword(pw) {
  const real = PropertiesService.getScriptProperties().getProperty("ADMIN_PASSWORD");
  return !!real && pw === real;
}

function requireAuth(p, fn) {
  if (!checkPassword(p.password)) return { success: false, error: "പാസ്‌വേഡ് തെറ്റാണ്" };
  return fn();
}

/* ---------- Helpers ---------- */
function ss_() { return SpreadsheetApp.openById(SHEET_ID); }

function getMekhalas() {
  const sh = ss_().getSheetByName(MEKHALA_SHEET);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues()
    .map(r => String(r[0]).trim()).filter(Boolean);
}

// Prevent spreadsheet formula injection (=, +, -, @ at start)
function safeText(s) {
  s = String(s || "").trim().replace(/\s+/g, " ").slice(0, 100);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function nowIST() {
  return Utilities.formatDate(new Date(), "Asia/Kolkata", "yyyy-MM-dd HH:mm:ss");
}

/* ---------- Submit ---------- */
function submitEntry(p) {
  const mekhala = String(p.mekhala || "").trim();
  const unit = safeText(p.unit);
  const name = safeText(p.name);
  const phone = String(p.phone || "").replace(/\D/g, "");

  if (!mekhala || !unit || !name) return { success: false, error: "എല്ലാ വിവരങ്ങളും നൽകുക" };
  if (!/^[0-9]{10}$/.test(phone)) return { success: false, error: "10 അക്ക ഫോൺ നമ്പർ നൽകുക" };
  if (getMekhalas().indexOf(mekhala) === -1) return { success: false, error: "അസാധുവായ മേഖല" };

  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = ss_().getSheetByName(ENTRIES_SHEET);
    const last = sh.getLastRow();

    // duplicate phone check
    if (last > 1) {
      const phones = sh.getRange(2, 6, last - 1, 1).getValues().map(r => String(r[0]));
      if (phones.indexOf(phone) !== -1) {
        return { success: false, error: "ഈ ഫോൺ നമ്പർ നേരത്തെ രജിസ്റ്റർ ചെയ്തിട്ടുണ്ട്" };
      }
    }

    const id = Utilities.getUuid().slice(0, 8);
    sh.getRange(last + 1, 6).setNumberFormat("@");
    sh.getRange(last + 1, 1, 1, 6).setValues([[id, nowIST(), mekhala, unit, name, phone]]);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}

/* ---------- Admin: all entries + per-mekhala counts ---------- */
function getAll() {
  const sh = ss_().getSheetByName(ENTRIES_SHEET);
  const last = sh.getLastRow();
  const entries = [];
  if (last > 1) {
    sh.getRange(2, 1, last - 1, 6).getValues().forEach(r => {
      if (!r[0]) return;
      entries.push({
        id: String(r[0]),
        timestamp: String(r[1]),
        mekhala: String(r[2]),
        unit: String(r[3]),
        name: String(r[4]),
        phone: String(r[5])
      });
    });
  }

  const counts = {};
  entries.forEach(en => { counts[en.mekhala] = (counts[en.mekhala] || 0) + 1; });

  const list = getMekhalas();
  const summary = list.map(m => ({ mekhala: m, count: counts[m] || 0 }));
  // entries whose mekhala was later renamed/removed from the list: still show them
  Object.keys(counts).forEach(m => {
    if (list.indexOf(m) === -1) summary.push({ mekhala: m, count: counts[m] });
  });

  return { success: true, entries: entries, summary: summary };
}

/* ---------- Admin: delete ---------- */
function deleteEntry(id) {
  if (!id) return { success: false, error: "ID ഇല്ല" };
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const sh = ss_().getSheetByName(ENTRIES_SHEET);
    const last = sh.getLastRow();
    if (last < 2) return { success: false, error: "എൻട്രി കണ്ടെത്തിയില്ല" };
    const ids = sh.getRange(2, 1, last - 1, 1).getValues().map(r => String(r[0]));
    const idx = ids.indexOf(String(id));
    if (idx === -1) return { success: false, error: "എൻട്രി കണ്ടെത്തിയില്ല" };
    sh.deleteRow(idx + 2);
    return { success: true };
  } finally {
    lock.releaseLock();
  }
}
