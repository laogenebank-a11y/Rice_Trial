/* Rice Trial App – ui.js (vanilla, no libraries)
   JS only toggles classes; CSS does all animation. */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const root = document.documentElement;
  root.classList.add('js');

  /* ---- Reveal on load / scroll (IntersectionObserver, staggered) ---- */
  const io = 'IntersectionObserver' in window
    ? new IntersectionObserver((entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' })
    : null;
  function watch(scope = document) {
    $$('.reveal:not(.in)', scope).forEach((el, i) => {
      el.style.setProperty('--i', Math.min(i, 8));
      io ? io.observe(el) : el.classList.add('in');
    });
  }

  /* ---- Navigation: tabs / sidebar ---- */
  function go(id, updateHash = true) {
    const view = document.getElementById('view-' + id);
    if (!view) return;
    $$('.view').forEach((v) => v.classList.toggle('active', v === view));
    $$('[data-nav]').forEach((b) => {
      const on = b.dataset.nav === id;
      b.classList.toggle('active', on);
      on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
    });
    window.scrollTo(0, 0);
    watch(view);
    if (updateHash) history.replaceState(null, '', '#' + id);
    closeSheet();
  }

  /* ---- Bottom sheet / modal ---- */
  let scrim, lastFocus = null;
  function openSheet(id) {
    const s = document.getElementById(id);
    if (!s) return;
    lastFocus = document.activeElement;
    s.classList.add('open');
    s.removeAttribute('inert'); s.setAttribute('aria-hidden', 'false');
    scrim.classList.add('show');
    document.body.classList.add('lock');
    const f = $('[autofocus], input, select, textarea, button', s);
    (f || s).focus({ preventScroll: true });
  }
  function closeSheet() {
    const open = $$('.sheet.open');
    if (!open.length) return;
    open.forEach((s) => {
      s.classList.remove('open');
      s.setAttribute('inert', ''); s.setAttribute('aria-hidden', 'true');
    });
    scrim.classList.remove('show');
    document.body.classList.remove('lock');
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
  }

  /* ---- Theme (default / blue / contrast), remembered on device ---- */
  function setTheme(t) {
    t && t !== 'default' ? root.setAttribute('data-theme', t) : root.removeAttribute('data-theme');
    try { localStorage.setItem('theme', t || 'default'); } catch (_) {}
    $$('[data-theme-set]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.themeSet === (t || 'default'))));
  }

  /* ---- Init ---- */
  document.addEventListener('DOMContentLoaded', () => {
    scrim = document.createElement('div');
    scrim.className = 'scrim';
    scrim.addEventListener('click', closeSheet);
    document.body.appendChild(scrim);
    $$('.sheet').forEach((s) => { s.setAttribute('inert', ''); s.setAttribute('aria-hidden', 'true'); });

    document.addEventListener('click', (e) => {
      const nav = e.target.closest('[data-nav]');
      if (nav) return go(nav.dataset.nav);
      const op = e.target.closest('[data-open-sheet]');
      if (op) return openSheet(op.dataset.openSheet);
      if (e.target.closest('[data-close]')) return closeSheet();
      const th = e.target.closest('[data-theme-set]');
      if (th) return setTheme(th.dataset.themeSet);
      const seg = e.target.closest('.seg button');
      if (seg) {
        $$('button', seg.parentElement).forEach((b) => b.setAttribute('aria-pressed', String(b === seg)));
        seg.parentElement.dispatchEvent(new CustomEvent('seg-change', { bubbles: true, detail: seg.dataset.value }));
      }
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeSheet(); });
    window.addEventListener('hashchange', () => go(location.hash.slice(1), false));

    let saved = 'default';
    try { saved = localStorage.getItem('theme') || 'default'; } catch (_) {}
    setTheme(saved);
    go(location.hash.slice(1) || $('[data-nav]').dataset.nav, false);
  });

  window.UI = { go, openSheet, closeSheet, setTheme, watch };
})();
