# Koothuparamb Rakthasakshi Anusmaranam – Registration Tool
DYFI Valanchery Block Committee

Collects participant registrations (mekhala, unit, name, phone) into a Google Sheet,
with an admin panel showing the count per mekhala and the detailed entries.

## Setup
1. Create a new Google Sheet. Open Extensions > Apps Script and paste `Code.gs`.
2. Project Settings > Script Properties > add `ADMIN_PASSWORD`.
3. Deploy > New deployment > Web app (Execute as: Me, Access: Anyone). Copy the `/exec` URL.
4. Paste the URL into `js/config.js`.
5. Enable GitHub Pages (Settings > Pages > branch `main`, root).

## Pages
- `index.html` – registration form
- `admin.html` – admin panel (counts + details)

## Structure
index.html
admin.html
css/style.css
js/config.js
js/app.js
js/admin.js
font/anek-malayalam-regular.ttf
