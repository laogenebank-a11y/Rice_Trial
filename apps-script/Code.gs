/** Rice Trial backend – container-bound script of the Google Sheet.
 *  1) Run setup() once.  2) Deploy > Web app (Execute as: Me, Access: Anyone). */
const DATA = (() => {
  const c = ['Timestamp', 'Date', 'Season'], t = ['Problem', 'RecordedBy', 'ClientId'], p = ['PlotLabel', 'Rep', 'Variety'];
  const f = s => [1, 2, 3, 4, 5].map(i => s + '_' + i);
  return {
    Methane_Temp: [].concat(c, ['Round'], p, ['T0_temp', 'T10_temp', 'T20_temp', 'T30_temp', 'Avg_temp'], t),
    Redox: [].concat(c, ['Round'], p, ['Time', 'Redox_Eh', 'SoilTemp', 'WaterLevel', 'SoilCondition'], t),
    Height_Tillers: [].concat(c, ['Round', 'DAT'], p, f('Height'), ['Height_Avg'], f('Tillers'), ['Tillers_Avg', 'Problem_Height', 'Problem_Tillers', 'RecordedBy', 'ClientId']),
    Panicle_Length: [].concat(c, p, f('Panicle'), ['Panicle_Avg'], t),
    Grains: [].concat(c, p, f('Total'), f('Unfilled'), f('Filled'), ['Total_Avg', 'Unfilled_Avg', 'Filled_Avg'], t),
    Straw: [].concat(c, p, ['Straw_Weight', 'Unit'], t),
    SeedWeight_1000: [].concat(c, p, ['Weight_100', 'Weight_1000'], t),
    Flowering: [].concat(c, p, ['Option_Pct', 'Custom_Pct'], t),
    Photos_Daily: [].concat(c, ['ImageName', 'DriveFileId', 'DriveURL', 'Drive', 'RecordedBy', 'ClientId']),
    Photos_Problem: [].concat(c, ['ImageName', 'DriveFileId', 'DriveURL', 'Details', 'Drive', 'RecordedBy', 'ClientId'])
  };
})();

/* UI texts [key, lo, en]. Edit them in the "Translations" sheet; setup() never overwrites existing rows. */
const SEED = [
  ['nav.overview', 'ພາບລວມ', 'Overview'], ['nav.record', 'ບັນທຶກຂໍ້ມູນ', 'Record data'], ['nav.photos', 'ບັນທຶກພາບ', 'Photos'],
  ['nav.layout', 'Field Layout', 'Field Layout'], ['nav.settings', 'ຕັ້ງຄ່າ', 'Settings'],
  ['ov.days', 'ປັກດຳມາແລ້ວ (ວັນ)', 'Days since transplanting'], ['ov.harvest', 'ຄາດເກັບກ່ຽວ', 'Expected harvest'], ['ov.pending', 'ລໍຖ້າອັບໂຫລດ', 'Waiting to upload'],
  ['st.ok', 'ຄົບແລ້ວ', 'Done'], ['st.warn', 'ບໍ່ຄົບ', 'Incomplete'], ['st.bad', 'ຍັງບໍ່ເກັບ', 'Not started'],
  ['form.methane', 'Methane (ອຸນຫະພູມ)', 'Methane (temperature)'], ['form.redox', 'Redox Potential', 'Redox Potential'],
  ['form.height', 'ຄວາມສູງ ແລະ ການແຕກກໍ', 'Plant height & tillers'], ['form.panicle', 'ຄວາມຍາວຮວງ', 'Panicle length'],
  ['form.grains', 'ຈຳນວນເມັດຕໍ່ຮວງ', 'Grains per panicle'], ['form.straw', 'ຜົນຜະລິດເຟືອງ', 'Straw yield'],
  ['form.seed', 'ນ້ຳໜັກ 1000 ເມັດ', '1000 seed weight'], ['form.flower', 'ວັນອອກດອກ', 'Flowering'],
  ['form.add', 'ເພີ່ມຕົວຢ່າງ', 'Add sample'], ['form.save', 'ອັບໂຫລດຂໍ້ມູນ', 'Upload'], ['form.autosave', 'ບັນທຶກຮ່າງອັດຕະໂນມັດ', 'Draft is saved automatically'],
  ['msg.queued', 'ບັນທຶກໃນເຄື່ອງແລ້ວ ຈະອັບໂຫລດອັດຕະໂນມັດ', 'Saved on device. Uploads automatically.'],
  ['msg.incomplete', 'ກະລຸນາຕື່ມຂໍ້ມູນທີ່ມີ * ໃຫ້ຄົບ', 'Please complete all fields marked *'],
  ['msg.profile', 'ກະລຸນາໃສ່ຊື່ໃນ ຕັ້ງຄ່າ > ໂປຣໄຟລ໌ ກ່ອນ', 'Please enter your name in Settings > Profile first'],
  ['ph.daily', 'ພາບປະຈຳ', 'Routine photo'], ['ph.problem', 'ພາບບັນຫາ', 'Problem photo'], ['ph.name', 'ປ້າຍກຳກັບ', 'Label'],
  ['ph.camera', 'ຖ່າຍພາບ', 'Take photo'], ['ph.gallery', 'ເລືອກຈາກເຄື່ອງ', 'Choose from device'],
  ['set.profile', 'ໂປຣໄຟລ໌', 'Profile'], ['set.first', 'ຊື່', 'First name'], ['set.last', 'ນາມສະກຸນ', 'Last name'],
  ['set.lang', 'ພາສາ', 'Language'], ['set.theme', 'ສີແອັບ', 'Theme'], ['set.about', 'ກ່ຽວກັບແອັບ', 'About'], ['close', 'ປິດ', 'Close'],
  ['f.Date', 'ວັນທີ', 'Date'], ['f.Round', 'ຄັ້ງທີ', 'Round'], ['f.PlotLabel', 'ປ້າຍກຳກັບ', 'Label'], ['f.Problem', 'ບັນຫາ', 'Problem'], ['f.Details', 'ລາຍລະອຽດ', 'Details'],
  ['f.T0_temp', '0 ນາທີ', '0 min'], ['f.T10_temp', '10 ນາທີ', '10 min'], ['f.T20_temp', '20 ນາທີ', '20 min'], ['f.T30_temp', '30 ນາທີ', '30 min'], ['f.Avg_temp', 'ຄ່າສະເລ່ຍ', 'Average'],
  ['f.Redox_Eh', 'ຄ່າ Redox', 'Redox (Eh)'], ['f.SoilTemp', 'ອຸນຫະພູມດິນ', 'Soil temp'], ['f.WaterLevel', 'ລະດັບນ້ຳ', 'Water level'], ['f.SoilCondition', 'ລັກສະນະດິນ', 'Soil condition'],
  ['f.Height_Avg', 'ຄວາມສູງສະເລ່ຍ', 'Height average'], ['f.Tillers_Avg', 'ກໍສະເລ່ຍ', 'Tillers average'], ['f.Panicle_Avg', 'ສະເລ່ຍ', 'Average'],
  ['f.Total_Avg', 'ເມັດທັງໝົດ ສະເລ່ຍ', 'Total avg'], ['f.Unfilled_Avg', 'ເມັດລີບ ສະເລ່ຍ', 'Unfilled avg'], ['f.Filled_Avg', 'ເມັດດີ ສະເລ່ຍ', 'Filled avg'],
  ['f.Straw_Weight', 'ນ້ຳໜັກເຟືອງ (kg)', 'Straw weight (kg)'], ['f.Weight_100', 'ນ້ຳໜັກ 100 ເມັດ (g)', '100 seed weight (g)'], ['f.Weight_1000', 'ນ້ຳໜັກ 1000 ເມັດ (g)', '1000 seed weight (g)'],
  ['f.Option_Pct', 'ອອກດອກ (%)', 'Flowering (%)'], ['f.Custom_Pct', 'ປ້ອນຕົວເລກເອງ (%)', 'Custom (%)']
];

[['Height', 'ຄວາມສູງ ຕົ້ນທີ', 'Height, plant'], ['Tillers', 'ກໍ ຕົ້ນທີ', 'Tillers, plant'], ['Panicle', 'ຄວາມຍາວ ຮວງທີ', 'Length, panicle'], ['Total', 'ເມັດທັງໝົດ ຮວງທີ', 'Total grains, panicle'], ['Unfilled', 'ເມັດລີບ ຮວງທີ', 'Unfilled, panicle']]
  .forEach(g => { for (let i = 1; i <= 5; i++) SEED.push(['f.' + g[0] + '_' + i, g[1] + ' ' + i, g[2] + ' ' + i]); });
SEED.push(['f.Problem_Height', 'ບັນຫາ (ຄວາມສູງ)', 'Problem (height)'], ['f.Problem_Tillers', 'ບັນຫາ (ການແຕກກໍ)', 'Problem (tillers)'],
  ['ov.methane', 'Methane', 'Methane'], ['lay.rep', 'Rap', 'Rep'], ['app.name', 'Rice Trial', 'Rice Trial'], ['unit.dat', 'ວັນ', 'DAT'],
  ['set.theme.default', 'ມາດຕະຖານ', 'Default'], ['set.theme.blue', 'ສີຟ້າ', 'Blue'], ['set.theme.contrast', 'ຄວາມຄົມຊັດສູງ', 'High contrast'],
  ['soil.0', 'ປຽກ', 'Wet'], ['soil.1', 'ແຊະ', 'Soggy'], ['soil.2', 'ຊຸ່ມ', 'Moist'], ['soil.3', 'ແຫ້ງ', 'Dry'], ['soil.4', 'ແຂງ', 'Hard']);
const CFG_DEFAULTS = [['Photos_Daily_Drive', 'A'], ['Photos_Problem_Drive', 'A'], ['About_Phone', '+856 20 95632765'], ['About_Email', 'lm13mond@gmail.com']];

const ss_ = () => SpreadsheetApp.getActive();
const key_ = h => String(h).split(' (')[0].trim();
const fmt_ = v => v instanceof Date ? Utilities.formatDate(v, ss_().getSpreadsheetTimeZone(), 'yyyy-MM-dd') : v;
function table_(name) {
  const sh = ss_().getSheetByName(name); if (!sh || sh.getLastRow() < 2) return [];
  const v = sh.getDataRange().getValues(), h = v[0].map(key_);
  return v.slice(1).map(r => { const o = {}; h.forEach((k, i) => { o[k] = fmt_(r[i]); }); return o; });
}
function ensureHeaders_(name, headers) {
  const ss = ss_(); let sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); sh.getRange(1, 1, 1, headers.length).setValues([headers]); }
  else { const have = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(key_);
    const miss = headers.filter(h => have.indexOf(h) < 0);
    if (miss.length) sh.getRange(1, have.filter(String).length + 1, 1, miss.length).setValues([miss]); }
  sh.setFrozenRows(1); return sh;
}
function setup() {
  Object.keys(DATA).forEach(n => ensureHeaders_(n, DATA[n]));
  const tr = ensureHeaders_('Translations', ['Key', 'lo', 'en']), have = table_('Translations').map(r => r.Key);
  const add = SEED.filter(r => have.indexOf(r[0]) < 0);
  if (add.length) tr.getRange(tr.getLastRow() + 1, 1, add.length, 3).setValues(add);
  const cf = ensureHeaders_('Config', ['Key', 'Value', 'Description']), ck = table_('Config').map(r => r.Key);
  const cadd = CFG_DEFAULTS.filter(r => ck.indexOf(r[0]) < 0).map(r => [r[0], r[1], 'Added by setup()']);
  if (cadd.length) cf.getRange(cf.getLastRow() + 1, 1, cadd.length, 3).setValues(cadd);
  // Drive A folders
  folder_('Rice_Trial_Photos', 'Daily'); folder_('Rice_Trial_Photos', 'Problem');
}
function folder_(root, sub) {
  const g = (p, n) => { const i = p.getFoldersByName(n); return i.hasNext() ? i.next() : p.createFolder(n); };
  const it = DriveApp.getFoldersByName(root), r = it.hasNext() ? it.next() : DriveApp.createFolder(root);
  return g(r, sub);
}
const out_ = o => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

function doGet(e) {
  try {
    if ((e.parameter || {}).action !== 'bootstrap') return out_({ ok: true, ping: 1 });
    const config = {}; table_('Config').forEach(r => { config[r.Key] = r.Value; });
    const tr = {}; table_('Translations').forEach(r => { tr[r.Key] = { lo: r.lo, en: r.en }; });
    const methane = {}, seen = {};
    table_('Methane_Temp').forEach(r => { if (r.Season !== config.Season_Name) return; const k = r.Round + '|' + r.PlotLabel; if (!seen[k]) { seen[k] = 1; methane[r.Round] = (methane[r.Round] || 0) + 1; } });
    return out_({ ok: true, config, tr, methane, plots: table_('Plots'), growth: table_('GrowthStages'), rounds: table_('MethaneRounds'), fert: table_('Fertilizer'), users: table_('Users') });
  } catch (err) { return out_({ ok: false, error: String(err) }); }
}
function doPost(e) {
  const lock = LockService.getScriptLock(); lock.waitLock(30000);
  try {
    const p = JSON.parse(e.postData.contents);
    return out_(p.action === 'photo' ? photo_(p) : save_(p));
  } catch (err) { return out_({ ok: false, error: String(err) }); } finally { lock.releaseLock(); }
}
function save_(p) {
  if (!DATA[p.sheet]) return { ok: false, error: 'bad sheet' };
  const sh = ensureHeaders_(p.sheet, DATA[p.sheet]), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(key_);
  const ci = h.indexOf('ClientId'), last = sh.getLastRow();
  if (last > 1 && sh.getRange(2, ci + 1, last - 1, 1).getValues().some(r => String(r[0]).indexOf(p.clientId + '#') === 0)) return { ok: true, duplicate: true };
  const rows = p.rows.map((r, i) => h.map(k => k === 'Timestamp' ? new Date() : k === 'ClientId' ? p.clientId + '#' + i : (r[k] === undefined ? '' : r[k])));
  sh.getRange(last + 1, 1, rows.length, h.length).setValues(rows);
  return { ok: true, saved: rows.length };
}
function photo_(p) {
  const kind = p.kind === 'problem' ? 'Problem' : 'Daily', sheet = 'Photos_' + kind, cfg = {};
  table_('Config').forEach(r => { cfg[r.Key] = r.Value; });
  const sh = ensureHeaders_(sheet, DATA[sheet]), h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(key_), ci = h.indexOf('ClientId'), last = sh.getLastRow();
  if (last > 1 && sh.getRange(2, ci + 1, last - 1, 1).getValues().some(r => r[0] === p.clientId)) return { ok: true, duplicate: true };
  const drive = String(cfg['Photos_' + kind + '_Drive'] || 'A').toUpperCase(); let res;
  if (drive === 'B') {
    const pr = PropertiesService.getScriptProperties(), r = UrlFetchApp.fetch(pr.getProperty('DRIVE2_URL'), { method: 'post', contentType: 'text/plain', payload: JSON.stringify({ token: pr.getProperty('DRIVE2_TOKEN'), kind, name: p.name, mime: p.mime, data: p.data }), muteHttpExceptions: true, followRedirects: true });
    res = JSON.parse(r.getContentText());
  } else {
    const f = folder_('Rice_Trial_Photos', kind).createFile(Utilities.newBlob(Utilities.base64Decode(p.data), p.mime, p.name + '.jpg'));
    res = { ok: true, fileId: f.getId(), url: f.getUrl() };
  }
  if (!res.ok) return { ok: false, error: res.error || 'drive failed' };
  const row = { Date: p.date, Season: p.season, ImageName: p.name, DriveFileId: res.fileId, DriveURL: res.url, Drive: drive, Details: p.details || '', RecordedBy: p.user, ClientId: p.clientId };
  sh.getRange(last + 1, 1, 1, h.length).setValues([h.map(k => k === 'Timestamp' ? new Date() : (row[k] === undefined ? '' : row[k]))]);
  return { ok: true, url: res.url };
}
