// ==UserScript==
// @name         AIS Visa Slot Notifier (Canada B1/B2)
// @namespace    https://github.com/pamandeepsinghdfl-hash/firefellascalgary
// @version      1.0.0
// @description  Polls AIS visa appointment availability from inside your own logged-in Chrome session. Loud alarm + browser notification + optional Telegram when an earlier date than your current appointment is found. Stops on session expiry / rate-limit. Min 60s interval.
// @author       you
// @match        https://ais.usvisa-info.com/*
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @connect      api.telegram.org
// @run-at       document-idle
// ==/UserScript==

/* eslint-disable no-undef */
(function () {
  'use strict';

  // ---------- config (persisted in localStorage) ----------
  const LS_KEY = 'ais-notifier-v1';
  const loadCfg = () => {
    try { return JSON.parse(localStorage.getItem(LS_KEY) || '{}'); }
    catch (e) { return {}; }
  };
  const saveCfg = (o) => localStorage.setItem(LS_KEY, JSON.stringify(o));

  const cfg = Object.assign({
    targetDate: '',         // YYYY-MM-DD — your current appointment, earlier than this triggers alert
    intervalSec: 120,       // poll interval (min 90)
    telegramToken: '',
    telegramChatId: '',
    enabled: false,
    scheduleId: '',
    facilityId: '',
    lastSeenEarliest: '',
    lastAlertAt: 0,
    maxAlertsPerHour: 6,
    alertTimestamps: [],
  }, loadCfg());

  // ---------- ID auto-detection ----------
  function detectIds() {
    const m = window.location.pathname.match(/\/schedule\/(\d+)/);
    if (m) cfg.scheduleId = m[1];

    const sel = document.querySelector(
      'select[name*="facility_id"], select[id*="facility_id"]'
    );
    if (sel && sel.value) cfg.facilityId = sel.value;

    saveCfg(cfg);
  }

  // ---------- alerting ----------
  function rateLimitedAlert() {
    const now = Date.now();
    cfg.alertTimestamps = (cfg.alertTimestamps || []).filter(
      (t) => now - t < 3600000
    );
    if (cfg.alertTimestamps.length >= cfg.maxAlertsPerHour) {
      log('alert rate-limit hit (' + cfg.maxAlertsPerHour + '/hr); suppressing');
      return false;
    }
    cfg.alertTimestamps.push(now);
    saveCfg(cfg);
    return true;
  }

  function playAlarm() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const make = (freq, when, dur) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = 'square';
        o.frequency.value = freq;
        g.gain.value = 0.25;
        o.connect(g); g.connect(ctx.destination);
        o.start(ctx.currentTime + when);
        o.stop(ctx.currentTime + when + dur);
      };
      for (let i = 0; i < 4; i++) {
        make(880, i * 0.35, 0.18);
        make(1320, i * 0.35 + 0.18, 0.18);
      }
    } catch (e) { /* AudioContext may be blocked before user interaction */ }
  }

  function flashPage() {
    const orig = document.body.style.backgroundColor;
    let i = 0;
    const id = setInterval(() => {
      document.body.style.backgroundColor = (i++ % 2 === 0) ? '#ff2222' : orig;
      if (i > 12) {
        clearInterval(id);
        document.body.style.backgroundColor = orig;
      }
    }, 220);
  }

  function sendTelegram(date, allDates) {
    if (!cfg.telegramToken || !cfg.telegramChatId) return;
    const url = `https://api.telegram.org/bot${cfg.telegramToken}/sendMessage`;
    const list = allDates.slice(0, 5).map((d) => '• ' + d.date).join('\n');
    const body = [
      '🚨 *EARLIER VISA SLOT AVAILABLE*',
      `Earliest: *${date}*`,
      `Your current: ${cfg.targetDate || '(not set)'}`,
      '',
      'Top 5 dates:',
      list,
      '',
      '👉 Open AIS NOW and reschedule.',
    ].join('\n');
    GM_xmlhttpRequest({
      method: 'POST',
      url,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify({
        chat_id: cfg.telegramChatId,
        text: body,
        parse_mode: 'Markdown',
        disable_web_page_preview: true,
      }),
      onload: (r) => log('telegram ' + r.status),
      onerror: () => log('telegram FAILED'),
    });
  }

  function alertUser(date, allDates) {
    if (!rateLimitedAlert()) return;
    log('🚨 ALERT — earlier date: ' + date);
    try {
      GM_notification({
        title: '🚨 Earlier visa slot found',
        text: `${date} (vs. your ${cfg.targetDate || '?'}) — book NOW`,
        timeout: 0,
      });
    } catch (e) {
      if (Notification && Notification.permission === 'granted') {
        new Notification('🚨 Earlier visa slot: ' + date, {
          body: `vs. your ${cfg.targetDate || '?'} — book NOW`,
          requireInteraction: true,
        });
      }
    }
    playAlarm();
    flashPage();
    sendTelegram(date, allDates);
  }

  // ---------- polling ----------
  let pollHandle = null;

  function buildJsonUrl() {
    if (!cfg.scheduleId || !cfg.facilityId) return null;
    return (
      window.location.origin +
      '/en-ca/niv/schedule/' + cfg.scheduleId +
      '/appointment/days/' + cfg.facilityId + '.json' +
      '?appointments[expedite]=false'
    );
  }

  function fetchDates() {
    const url = buildJsonUrl();
    if (!url) {
      log('Need schedule_id & facility_id. Open the appointment page and click Start.');
      return;
    }
    fetch(url, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-Token': csrfToken(),
      },
    })
      .then((r) => {
        if (r.status === 401 || r.status === 302 || r.redirected) {
          log('session expired — stopping. log back in then click Start.');
          stop();
          return null;
        }
        if (r.status === 429) {
          log('429 rate-limited — slowing down for 5 min');
          if (pollHandle) clearTimeout(pollHandle);
          pollHandle = setTimeout(() => { fetchDates(); schedule(); }, 300000);
          return null;
        }
        if (!r.ok) { log('HTTP ' + r.status); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data) return;
        if (!Array.isArray(data) || data.length === 0) {
          log('no dates available');
          return;
        }
        const earliest = data[0].date;
        log('earliest: ' + earliest + ' (' + data.length + ' total)');
        if (cfg.targetDate && earliest && earliest < cfg.targetDate) {
          alertUser(earliest, data);
        }
        cfg.lastSeenEarliest = earliest;
        saveCfg(cfg);
      })
      .catch((e) => log('fetch error: ' + e.message));
  }

  function csrfToken() {
    const m = document.querySelector('meta[name="csrf-token"]');
    return m ? m.content : '';
  }

  function schedule() {
    if (!cfg.enabled) return;
    // ±20% jitter to look human
    const jitter = (Math.random() - 0.5) * 0.4 * cfg.intervalSec;
    const ms = Math.max(90, cfg.intervalSec + jitter) * 1000;
    pollHandle = setTimeout(() => { fetchDates(); schedule(); }, ms);
  }

  function start() {
    if (cfg.enabled) return;
    cfg.enabled = true;
    saveCfg(cfg);
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
    log('▶ started — interval ~' + cfg.intervalSec + 's');
    fetchDates();
    schedule();
  }

  function stop() {
    cfg.enabled = false;
    saveCfg(cfg);
    if (pollHandle) clearTimeout(pollHandle);
    pollHandle = null;
    log('■ stopped');
  }

  // ---------- UI panel ----------
  function log(msg) {
    const ts = new Date().toLocaleTimeString('en-CA', { hour12: false });
    const line = ts + '  ' + msg;
    // eslint-disable-next-line no-console
    console.log('[AIS-notifier] ' + line);
    const el = document.getElementById('ais-notifier-log');
    if (!el) return;
    const lines = (el.textContent + '\n' + line).split('\n');
    el.textContent = lines.slice(-20).join('\n');
    el.scrollTop = el.scrollHeight;
  }

  function buildPanel() {
    if (document.getElementById('ais-notifier-panel')) return;
    const wrap = document.createElement('div');
    wrap.id = 'ais-notifier-panel';
    wrap.innerHTML = `
      <style>
        #ais-notifier-panel {
          position: fixed; bottom: 16px; right: 16px; z-index: 2147483647;
          background: #111; color: #fff; padding: 12px 14px; border-radius: 12px;
          font: 12px -apple-system, "Segoe UI", Roboto, sans-serif;
          width: 320px; box-shadow: 0 6px 24px rgba(0,0,0,.5);
          border: 2px solid #FF7A00;
        }
        #ais-notifier-panel * { box-sizing: border-box; }
        #ais-notifier-panel h3 { margin: 0 0 8px; font-size: 13px; color: #FF7A00; display:flex; justify-content:space-between; }
        #ais-notifier-panel label { display: block; margin: 6px 0 2px; color: #aaa; font-size: 11px; }
        #ais-notifier-panel input { width: 100%; padding: 5px 6px; background: #1f1f1f; color: #fff;
          border: 1px solid #333; border-radius: 5px; font: inherit; }
        #ais-notifier-panel .ids { color:#888; font-size:10px; margin-top:6px; word-break:break-all; }
        #ais-notifier-panel .btn-row { display:flex; gap:6px; margin-top:10px; }
        #ais-notifier-panel button { flex:1; background:#FF7A00; color:#000; border:0;
          padding:7px; border-radius:6px; font: bold 12px inherit; cursor: pointer; }
        #ais-notifier-panel button.sec { background:#333; color:#ddd; }
        #ais-notifier-log { background:#000; padding:5px; margin-top:8px; max-height:110px;
          overflow:auto; font: 10px/1.3 ui-monospace, Menlo, monospace; white-space: pre-wrap;
          border-radius: 5px; color:#9bd; }
        #ais-collapse { cursor:pointer; user-select:none; }
      </style>
      <h3>AIS Slot Notifier<span id="ais-collapse">−</span></h3>
      <div id="ais-body">
        <label>Your current appointment (YYYY-MM-DD)</label>
        <input id="ais-target" type="text" placeholder="2026-12-15" value="${cfg.targetDate}">
        <label>Poll interval (sec, min 90 - 120+ recommended)</label>
        <input id="ais-interval" type="number" min="90" max="600" value="${cfg.intervalSec}">
        <label>Telegram bot token (optional)</label>
        <input id="ais-tg-token" type="password" value="${cfg.telegramToken}">
        <label>Telegram chat ID (optional)</label>
        <input id="ais-tg-chat" type="text" value="${cfg.telegramChatId}">
        <div class="ids">schedule_id: ${cfg.scheduleId || '?'} · facility_id: ${cfg.facilityId || '?'}</div>
        <div class="btn-row">
          <button id="ais-start">▶ Start</button>
          <button id="ais-stop" class="sec">■ Stop</button>
          <button id="ais-test" class="sec">🔔 Test</button>
        </div>
        <pre id="ais-notifier-log"></pre>
      </div>
    `;
    document.body.appendChild(wrap);

    document.getElementById('ais-start').onclick = () => {
      cfg.targetDate = document.getElementById('ais-target').value.trim();
      const iv = parseInt(document.getElementById('ais-interval').value, 10);
      cfg.intervalSec = Math.max(90, isNaN(iv) ? 120 : iv);
      cfg.telegramToken = document.getElementById('ais-tg-token').value.trim();
      cfg.telegramChatId = document.getElementById('ais-tg-chat').value.trim();
      saveCfg(cfg);
      detectIds();
      start();
    };
    document.getElementById('ais-stop').onclick = stop;
    document.getElementById('ais-test').onclick = () => {
      alertUser('2025-01-01', [{ date: '2025-01-01' }, { date: '2025-01-08' }]);
    };
    document.getElementById('ais-collapse').onclick = () => {
      const b = document.getElementById('ais-body');
      const c = document.getElementById('ais-collapse');
      if (b.style.display === 'none') { b.style.display = 'block'; c.textContent = '−'; }
      else { b.style.display = 'none'; c.textContent = '+'; }
    };
  }

  function init() {
    detectIds();
    buildPanel();
    log('ready. ' + (cfg.scheduleId && cfg.facilityId
      ? 'IDs detected — set your current date and click Start.'
      : 'open the Reschedule / appointment page so IDs can auto-detect.'));
    if (cfg.enabled) {
      log('resuming previous session');
      fetchDates();
      schedule();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
