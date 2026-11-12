(() => {
'use strict';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const LS = localStorage;
const J = (k, d) => { try { const v = JSON.parse(LS.getItem(k)); return v == null ? d : v; } catch (_) { return d; } };
const st = { boot: J('boot', null), lang: LS.getItem('lang') || 'lo', drafts: J('drafts', {}), form: null, pending: 0 };
const API = () => window.API_URL;
const t = k => { const r = st.boot && st.boot.tr[k]; return (r && (r[st.lang] || r.en)) || k.replace(/^f\./, '').replace(/_/g, ' '); };
const cfg = k => (st.boot && st.boot.config[k]) || '';
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
const n = x => (x === '' || x == null) ? NaN : +x;
const avg = (v, ks) => { const a = ks.map(k => n(v[k])).filter(x => !isNaN(x)); return a.length ? Math.round(a.reduce((s, x) => s + x, 0) / a.length * 100) / 100 : ''; };
const ic = (n, s) => `<span class="ic"><svg class="i"><use href="#${s}"/></svg><img src="img/${n}.png" alt="" onload="this.parentNode.classList.add('has-img')" onerror="this.remove()"></span>`;
const who = () => ((LS.fn || '') + ' ' + (LS.ln || '')).trim();
const plots = () => (st.boot ? st.boot.plots : []).filter(p => p.Label);
function msg(text) { const m = $('#msg'); m.textContent = text; m.hidden = !text; if (text) setTimeout(() => { m.hidden = true; }, 6000); }

/* ---------- offline queue (IndexedDB) ---------- */
const idb = new Promise((res, rej) => { const r = indexedDB.open('rt', 1); r.onupgradeneeded = () => r.result.createObjectStore('q', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = rej; });
const tx = (m, f) => idb.then(d => new Promise((res, rej) => { const r = f(d.transaction('q', m).objectStore('q')); r.onsuccess = () => res(r.result); r.onerror = rej; }));
const qAdd = i => tx('readwrite', s => s.put(i)), qAll = () => tx('readonly', s => s.getAll()), qDel = id => tx('readwrite', s => s.delete(id));
const post = body => fetch(API(), { method: 'POST', body: JSON.stringify(body) }).then(r => r.json());
async function sync() {
  if (st.syncing || !navigator.onLine || !API()) return;
  st.syncing = true;
  try {
    for (const it of (await qAll()).sort((a, b) => a.t - b.t)) { const r = await post(it.body); if (r.ok) await qDel(it.id); else break; }
  } catch (_) {}
  st.syncing = false; await pend(); loadBoot();
}
async function pend() { st.pending = (await qAll()).length; renderOverview(); }
async function loadBoot() {
  if (!API() || !navigator.onLine) return;
  try { const r = await (await fetch(API() + '?action=bootstrap')).json(); if (r.ok) { st.boot = r; LS.setItem('boot', JSON.stringify(r)); render(); } } catch (_) {}
}

/* ---------- form definitions ---------- */
const F5 = k => [1, 2, 3, 4, 5].map(i => k + '_' + i), req = a => a.map(k => k + '*');
const FORMS = {
  methane: { sheet: 'Methane_Temp', round: 'M', max: 4, f: [...req(['T0_temp', 'T10_temp', 'T20_temp', 'T30_temp']), 'Problem'], calc: v => ({ Avg_temp: avg(v, ['T0_temp', 'T10_temp', 'T20_temp', 'T30_temp']) }) },
  redox: { sheet: 'Redox', round: 'M', max: 1, f: [...req(['Redox_Eh', 'SoilTemp', 'WaterLevel']), 'SoilCondition', 'Problem'] },
  height: { sheet: 'Height_Tillers', round: 'G', max: 1, f: [...req(F5('Height')), ...req(F5('Tillers')), 'Problem_Height', 'Problem_Tillers'], calc: v => ({ Height_Avg: avg(v, F5('Height')), Tillers_Avg: avg(v, F5('Tillers')) }) },
  panicle: { sheet: 'Panicle_Length', max: 1, f: [...F5('Panicle'), 'Problem'], calc: v => ({ Panicle_Avg: avg(v, F5('Panicle')) }) },
  grains: { sheet: 'Grains', max: 1, f: [...F5('Total'), ...F5('Unfilled'), 'Problem'], calc: v => {
    const o = {}; F5('Total').forEach((k, i) => { const a = n(v[k]), b = n(v['Unfilled_' + (i + 1)]); o['Filled_' + (i + 1)] = isNaN(a) || isNaN(b) ? '' : a - b; });
    return { ...o, Total_Avg: avg(v, F5('Total')), Unfilled_Avg: avg(v, F5('Unfilled')), Filled_Avg: avg(o, F5('Filled')) }; } },
  straw: { sheet: 'Straw', max: 1, f: [...req(['Straw_Weight']), 'Problem'], pre: { Unit: 'kg' } },
  seed: { sheet: 'SeedWeight_1000', max: 1, f: [...req(['Weight_100']), 'Problem'], calc: v => { const w = n(v.Weight_100); return { Weight_1000: isNaN(w) ? '' : Math.round(w * (+cfg('Seed_Target_Count') || 1000) / (+cfg('Seed_Sample_Count') || 100) * 100) / 100 }; } },
  flower: { sheet: 'Flowering', max: 1, f: ['Option_Pct', 'Custom_Pct', 'Problem'] }
};
const SEL = { SoilCondition: ['ປຽກ', 'ແຊະ', 'ຊຸ່ມ', 'ແຫ້ງ', 'ແຂງ'], Option_Pct: ['10', '50', '100'] };
const isText = k => /^(Problem|Details)/.test(k);
const showCalc = k => /Avg$|^Weight_1000$/.test(k);

function daysSince(d) { return d ? Math.floor((Date.now() - new Date(d).getTime()) / 864e5) : null; }
function stageOptions(date) {
  const g = st.boot ? st.boot.growth : [], dat = daysSince(cfg('Transplanting_Date')) ;
  const cur = date && cfg('Transplanting_Date') ? Math.floor((new Date(date) - new Date(cfg('Transplanting_Date'))) / 864e5) : dat;
  let best = g[0] && g[0].Round, diff = 1e9;
  g.forEach(s => { const d = Math.abs((+s.DAT) - cur); if (d < diff) { diff = d; best = s.Round; } });
  return { list: g, best };
}

/* ---------- form rendering ---------- */
function cardHTML(fd, c, i) {
  const opts = '<option value=""></option>' + plots().map(p => `<option value="${p.Label}"${p.Label === c.plot ? ' selected' : ''}>${p.Label} (R${p.Rep})</option>`).join('');
  const fields = fd.f.map(raw => {
    const k = raw.replace('*', ''), r = raw.endsWith('*'), v = (c.v[k] ?? '');
    const lab = `<span>${t('f.' + k)}${r ? ' *' : ''}</span>`;
    if (SEL[k]) return `<label class="field">${lab}<select data-k="${k}"><option value=""></option>${SEL[k].map((o, j) => `<option value="${o}"${o === v ? ' selected' : ''}>${k === 'SoilCondition' ? t('soil.' + j) : o}</option>`).join('')}</select></label>`;
    if (isText(k)) return `<label class="field">${lab}<input data-k="${k}" value="${v}"></label>`;
    return `<label class="field">${lab}<input data-k="${k}" inputmode="decimal" value="${v}"></label>`;
  }).join('');
  const calc = fd.calc ? Object.keys(fd.calc({})).filter(showCalc).map(k => `<label class="field"><span>${t('f.' + k)}</span><input readonly data-calc="${k}"></label>`).join('') : '';
  return `<div class="sample" data-c="${i}"><label class="field"><span>${t('f.PlotLabel')} *</span><select data-plot>${opts}</select></label><p class="muted" data-vn></p><div class="fields-5">${fields}</div>${calc ? `<div class="fields-5">${calc}</div>` : ''}</div>`;
}
function renderForm() {
  const fd = FORMS[st.form], d = st.drafts[st.form], body = $('#form-body');
  let head = `<div class="fields-2"><label class="field"><span>${t('f.Date')}</span><input type="date" id="f-date" value="${d.date}"></label>`;
  if (fd.round) {
    let o = '';
    if (fd.round === 'M') for (let r = 1; r <= (+cfg('Methane_Rounds') || 6); r++) { const full = plots().length && ((st.boot.methane || {})[r] || 0) >= plots().length; o += `<option value="${r}"${full ? ' disabled' : ''}${String(d.round) === String(r) ? ' selected' : ''}>${r}${full ? ' ✓' : ''}</option>`; }
    else { const s = stageOptions(d.date); if (!d.round) d.round = s.best; o = s.list.map(g => `<option value="${g.Round}"${String(d.round) === String(g.Round) ? ' selected' : ''}>${g.Round} (${g.DAT} ${t('unit.dat')})</option>`).join(''); }
    head += `<label class="field"><span>${t('f.Round')}</span><select id="f-round">${o}</select></label>`;
  }
  head += '</div>';
  body.innerHTML = head + d.cards.map((c, i) => cardHTML(fd, c, i)).join('') +
    (fd.max > 1 && d.cards.length < fd.max ? `<button class="btn tonal press" id="f-add">+ ${t('form.add')}</button>` : '') +
    `<p class="muted">${t('form.autosave')}</p><button class="btn block press" id="f-save">${t('form.save')}</button>`;
  $('#form-title').textContent = t('form.' + st.form);
  collect();
}
function collect() {   // read DOM -> draft, recompute calcs, autosave
  const fd = FORMS[st.form], d = st.drafts[st.form];
  d.date = $('#f-date').value; const r = $('#f-round'); if (r) d.round = r.value;
  d.cards = $$('.sample').map(el => {
    const v = {}; $$('[data-k]', el).forEach(i => { v[i.dataset.k] = i.value.trim(); });
    const plot = $('[data-plot]', el).value, p = plots().find(x => x.Label === plot);
    $('[data-vn]', el).textContent = p ? (p['Variety Name'] || p.VarietyCode || '') : '';
    if (fd.calc) { const c = fd.calc(v); $$('[data-calc]', el).forEach(i => { i.value = c[i.dataset.calc]; }); }
    return { plot, v };
  });
  LS.setItem('drafts', JSON.stringify(st.drafts));
}
function openForm(name) {
  st.form = name; LS.setItem('open', name);
  if (!st.drafts[name]) st.drafts[name] = { date: today(), round: '', cards: [{ plot: '', v: {} }] };
  renderForm(); UI.openSheet('sheet-form');
}
async function saveForm() {
  const fd = FORMS[st.form], d = st.drafts[st.form]; collect();
  if (!who()) return msg(t('msg.profile'));
  const rows = [];
  for (const c of d.cards) {
    const filled = c.plot || Object.values(c.v).some(x => x !== '');
    if (!filled) continue;
    const ok = c.plot && fd.f.every(raw => !raw.endsWith('*') || c.v[raw.replace('*', '')] !== '') && Object.values(c.v).some(x => x !== '');
    if (!ok) return msg(t('msg.incomplete'));
    const p = plots().find(x => x.Label === c.plot), now = new Date();
    const row = { Date: d.date, Season: cfg('Season_Name'), PlotLabel: c.plot, Rep: p ? p.Rep : '', Variety: p ? (p['Variety Name'] || p.VarietyCode) : '', ...c.v, ...(fd.calc ? fd.calc(c.v) : {}), ...(fd.pre || {}), RecordedBy: who() };
    if (fd.round) row.Round = d.round;
    if (st.form === 'redox') row.Time = now.toTimeString().slice(0, 5);
    if (st.form === 'height') { const g = st.boot.growth.find(x => String(x.Round) === String(d.round)); row.DAT = g ? g.DAT : ''; }
    rows.push(row);
  }
  if (!rows.length) return msg(t('msg.incomplete'));
  const id = uid(); await qAdd({ id, t: Date.now(), body: { action: 'save', sheet: fd.sheet, clientId: id, rows } });
  delete st.drafts[st.form]; LS.setItem('drafts', JSON.stringify(st.drafts)); LS.removeItem('open');
  UI.closeSheet(); msg(t('msg.queued')); pend(); sync();
}

/* ---------- photos ---------- */
function openPhoto(kind) {
  st.form = 'photo_' + kind; LS.setItem('open', st.form);
  const opts = '<option value=""></option>' + plots().map(p => `<option>${p.Label}</option>`).join('');
  $('#form-title').textContent = t('ph.' + kind);
  $('#form-body').innerHTML = `<div class="fields-2"><label class="field"><span>${t('f.Date')}</span><input type="date" id="p-date" value="${today()}"></label><label class="field"><span>${t('ph.name')}</span><select id="p-name">${opts}</select></label></div>
  <label class="field"><span>${t('ph.camera')}</span><input type="file" id="p-cam" accept="image/*" capture="environment"></label>
  <label class="field"><span>${t('ph.gallery')}</span><input type="file" id="p-gal" accept="image/*"></label>
  ${kind === 'problem' ? `<label class="field"><span>${t('f.Details')}</span><textarea id="p-det" rows="3"></textarea></label>` : ''}
  <button class="btn block press" id="p-save">${t('form.save')}</button>`;
  UI.openSheet('sheet-form');
}
async function compress(file) {
  const b = await createImageBitmap(file), s = Math.min(1, 1600 / Math.max(b.width, b.height));
  const c = document.createElement('canvas'); c.width = b.width * s; c.height = b.height * s; c.getContext('2d').drawImage(b, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.8).split(',')[1];
}
async function savePhoto() {
  const kind = st.form.replace('photo_', ''), file = ($('#p-cam').files[0] || $('#p-gal').files[0]), label = $('#p-name').value;
  if (!who()) return msg(t('msg.profile'));
  if (!file || !label) return msg(t('msg.incomplete'));
  const date = $('#p-date').value, [y, m, dd] = date.split('-'), id = uid();
  const body = { action: 'photo', kind, clientId: id, name: `${label}_${dd}${m}${y}`, mime: 'image/jpeg', data: await compress(file), date, season: cfg('Season_Name'), details: kind === 'problem' ? $('#p-det').value : '', user: who() };
  await qAdd({ id, t: Date.now(), body }); LS.removeItem('open'); UI.closeSheet(); msg(t('msg.queued')); pend(); sync();
}

/* ---------- views ---------- */
function renderOverview() {
  const ov = $('#ov'); if (!ov) return;
  const d = daysSince(cfg('Transplanting_Date')), N = +cfg('Methane_Rounds') || 6, total = plots().length;
  let tiles = '';
  for (let r = 1; r <= N; r++) { const c = st.boot ? ((st.boot.methane || {})[r] || 0) : 0, s = c === 0 ? 'bad' : (total && c >= total ? 'ok' : 'warn'); tiles += `<div class="tile" data-state="${s}">${r}<small>${t('st.' + s)}</small></div>`; }
  ov.innerHTML = `<div class="card hero"><p class="muted">${t('ov.days')}</p><p class="big">${d == null || d < 0 ? '—' : d}</p><p class="muted">${t('ov.harvest')}: ${cfg('Expected_Harvest_Date') || '—'}</p></div>
  <div class="card"><div class="card-title"><h2>${t('ov.methane')}</h2><span class="badge ${st.pending ? 'warn' : 'ok'}">${t('ov.pending')}: ${st.pending}</span></div><div class="tiles">${tiles}</div></div>`;
  $('#season').textContent = cfg('Season_Name');
}
function renderLayout() {
  const box = $('#lay'); if (!st.boot) { box.innerHTML = ''; return; }
  box.innerHTML = [1, 2, 3].map(rep => `<div class="card"><h2 style="margin-bottom:12px">${t('lay.rep')} ${rep}</h2><div class="lay">${st.boot.plots.filter(p => +p.Rep === rep).map(p => `<div class="cell${p.Label ? '' : ' empty'}" title="${p['Variety Name'] || ''}">${p.Label || p.PlotID}</div>`).join('')}</div></div>`).join('');
}
function render() {
  $$('[data-i]').forEach(e => { e.textContent = t(e.dataset.i); });
  $('#forms').innerHTML = Object.keys(FORMS).map(k => `<button class="row press" data-form="${k}"><span class="ico">${ic('form-' + k, 'i-edit')}</span><span class="grow">${t('form.' + k)}</span></button>`).join('');
  $$('#langseg button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.lang === st.lang)));
  $('#about').innerHTML = `v1.0<br>${cfg('About_Phone')}<br>${cfg('About_Email')}`;
  document.documentElement.lang = st.lang; renderOverview(); renderLayout();
  if (st.form && FORMS[st.form] && $('#sheet-form.open')) { const y = $('#sheet-form').scrollTop; renderForm(); $('#sheet-form').scrollTop = y; }
}

/* ---------- events ---------- */
document.addEventListener('DOMContentLoaded', () => {
  $('#fn').value = LS.fn || ''; $('#ln').value = LS.ln || '';
  document.addEventListener('input', e => {
    if (e.target.id === 'fn') LS.fn = e.target.value; if (e.target.id === 'ln') LS.ln = e.target.value;
    if (e.target.closest('#form-body') && FORMS[st.form]) collect();
  });
  document.addEventListener('change', e => { if (e.target.closest('#form-body') && FORMS[st.form] && (e.target.id === 'f-date')) { st.drafts[st.form].round = ''; renderForm(); } });
  document.addEventListener('click', e => {
    const f = e.target.closest('[data-form]'); if (f) return openForm(f.dataset.form);
    const p = e.target.closest('[data-photo]'); if (p) return openPhoto(p.dataset.photo);
    const l = e.target.closest('[data-lang]'); if (l) { st.lang = l.dataset.lang; LS.lang = st.lang; return render(); }
    if (e.target.id === 'f-add') { collect(); st.drafts[st.form].cards.push({ plot: '', v: {} }); return renderForm(); }
    if (e.target.id === 'f-save') return saveForm();
    if (e.target.id === 'p-save') return savePhoto();
    if (e.target.closest('[data-close]') || e.target.classList.contains('scrim')) LS.removeItem('open');
  });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') LS.removeItem('open'); });
  // keep work safe: autosave drafts + block accidental refresh/back
  window.addEventListener('beforeunload', e => { if (Object.keys(st.drafts).length) { e.preventDefault(); e.returnValue = ''; } });
  history.pushState(null, '', location.href); window.addEventListener('popstate', () => history.pushState(null, '', location.href));
  window.addEventListener('online', sync); setInterval(sync, 30000);
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
  if (!API()) msg('Set API_URL in config.js');
  render(); pend(); loadBoot(); sync();
  const open = LS.getItem('open'); if (open && FORMS[open]) openForm(open); else if (open && open.startsWith('photo_')) openPhoto(open.slice(6));
});
})();
