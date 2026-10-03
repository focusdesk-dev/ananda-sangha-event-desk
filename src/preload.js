const { contextBridge, ipcRenderer } = require('electron');

const STATE_KEY = 'annualEventRegistration.v1';

function isVisible(el) {
  if (!el) return false;
  const style = window.getComputedStyle(el);
  if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) return false;
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function activePage() {
  return document.querySelector('.page.active') || [...document.querySelectorAll('.page')].find(isVisible) || null;
}

function isTypingTarget(el) {
  if (!el) return false;
  return el.matches?.('input, textarea, select, [contenteditable="true"]');
}

function clickById(id) {
  const el = document.getElementById(id);
  if (el && isVisible(el)) {
    el.click();
    return true;
  }
  return false;
}

function clickVisibleByText(patterns, root = document) {
  const controls = [...root.querySelectorAll('button, [role="button"], a.btn, summary.btn')].filter(isVisible);
  const match = controls.find(el => {
    const text = (el.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return patterns.some(p => p.test(text));
  });
  if (!match) return false;
  match.click();
  return true;
}

function goToMasterAndAdd(page, addId) {
  const nav = document.querySelector(`[data-page="${page}"]`);
  if (nav) nav.click();
  setTimeout(() => {
    const add = document.getElementById(addId);
    if (add) add.click();
  }, 80);
}

function showPermanentRecordChooser() {
  const old = document.getElementById('anandaShortcutChooser');
  if (old) old.remove();

  const backdrop = document.createElement('div');
  backdrop.id = 'anandaShortcutChooser';
  backdrop.style.cssText = 'position:fixed;inset:0;z-index:999999;background:rgba(16,38,54,.35);display:flex;align-items:center;justify-content:center;padding:20px';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.24);padding:20px;min-width:330px;max-width:520px;font-family:Arial,sans-serif';
  box.innerHTML = '<div style="font-size:18px;font-weight:700;margin-bottom:5px">Add Permanent Record</div><div style="font-size:13px;color:#667;margin-bottom:16px">Choose the record you want to add.</div>';

  const options = [
    ['Volunteer', 'volunteers', 'addVolunteer'],
    ['Attendee', 'attendeeMaster', 'addAttendeeMaster'],
    ['Kriyaban', 'kriyabans', 'addKriyaban'],
    ['VIP', 'vips', 'addVip']
  ];
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:10px';
  for (const [label, page, id] of options) {
    const b = document.createElement('button');
    b.type = 'button';
    b.textContent = `＋ ${label}`;
    b.style.cssText = 'padding:12px;border-radius:9px;border:1px solid #bfd0db;background:#f7fbfd;cursor:pointer;font-weight:700';
    b.onclick = () => { backdrop.remove(); goToMasterAndAdd(page, id); };
    grid.appendChild(b);
  }
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.textContent = 'Cancel';
  cancel.style.cssText = 'margin-top:12px;width:100%;padding:10px;border-radius:9px;border:1px solid #d7e1e8;background:white;cursor:pointer';
  cancel.onclick = () => backdrop.remove();
  box.append(grid, cancel);
  backdrop.appendChild(box);
  backdrop.addEventListener('click', e => { if (e.target === backdrop) backdrop.remove(); });
  document.body.appendChild(backdrop);
}

function handleAddShortcut() {
  if (isTypingTarget(document.activeElement)) return;
  const page = activePage();
  const pageId = page?.id || '';

  if (pageId === 'dashboard') {
    showPermanentRecordChooser();
    return;
  }
  if (pageId === 'volunteers' && clickById('addVolunteer')) return;
  if (pageId === 'attendeeMaster' && clickById('addAttendeeMaster')) return;
  if (pageId === 'kriyabans' && clickById('addKriyaban')) return;
  if (pageId === 'vips' && clickById('addVip')) return;

  // Phase 2 beta.4A: when already inside a permanent master, + must add that record directly.
  if (page && clickVisibleByText([
    /^(?:\+|＋)?\s*(?:add\s+)?acharya$/i,
    /^(?:\+|＋)?\s*(?:add\s+)?student$/i,
    /^(?:\+|＋)?\s*(?:add\s+)?volunteer$/i,
    /^(?:\+|＋)?\s*(?:add\s+)?attendee$/i,
    /^(?:\+|＋)?\s*(?:add\s+)?kriyaban$/i,
    /^(?:\+|＋)?\s*(?:add\s+)?vip$/i
  ], page)) return;

  if (pageId === 'events') {
    const cancel = document.getElementById('cancelEventEdit');
    if (cancel && isVisible(cancel)) cancel.click();
    const input = document.getElementById('eventName');
    if (input) {
      input.focus();
      input.select?.();
      return;
    }
  }
  if ((pageId === 'daily' || pageId === 'eventWorkspace') && clickById('v48AddVolunteer')) return;
  if ((pageId === 'checkin' || pageId === 'register' || pageId === 'eventWorkspace') && clickById('v36NewRegistration')) return;
  if (clickById('v36NewRegistration')) return;
  if (clickById('v48AddVolunteer')) return;
  if (clickVisibleByText([/^＋?\s*new registration$/i, /^\+?\s*new registration$/i, /^＋?\s*add volunteer$/i, /^\+?\s*add volunteer$/i, /^＋?\s*add attendee$/i, /^\+?\s*add attendee$/i], page || document)) return;

  showPermanentRecordChooser();
}

function submitFormWithPreferredButton(form, preferredButton) {
  if (!form || !isVisible(form)) return false;
  try {
    if (preferredButton) form.requestSubmit(preferredButton);
    else form.requestSubmit();
    return true;
  } catch {
    if (preferredButton) preferredButton.click();
    else form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    return true;
  }
}

function handleSaveShortcut() {
  const registrationModal = document.getElementById('v36RegistrationModal');
  const registrationForm = document.getElementById('v36RegistrationForm');
  if (registrationModal && registrationModal.classList.contains('open') && registrationForm) {
    const saveOnly = registrationForm.querySelector('button[type="submit"][data-mode="register"]');
    if (submitFormWithPreferredButton(registrationForm, saveOnly)) return;
  }

  const knownForms = [
    ['volunteerModal', 'volunteerForm'],
    ['attendeeMasterModal', 'attendeeMasterForm'],
    ['kriyabanModal', 'kriyabanForm'],
    ['vipModal', 'vipForm']
  ];
  for (const [modalId, formId] of knownForms) {
    const modal = document.getElementById(modalId);
    const form = document.getElementById(formId);
    if (modal && (modal.classList.contains('open') || isVisible(modal)) && submitFormWithPreferredButton(form, form?.querySelector('button[type="submit"]'))) return;
  }

  // Phase 2 beta.4A: support Acharya/Student custom forms directly.
  const visibleDialogOrPage = [...document.querySelectorAll('.modal-backdrop.open, [role="dialog"], .page.active')].filter(isVisible);
  for (const scope of visibleDialogOrPage) {
    if (clickVisibleByText([
      /^save\s+acharya$/i,
      /^update\s+acharya$/i,
      /^save\s+student$/i,
      /^update\s+student$/i,
      /^save\s+volunteer$/i,
      /^update\s+volunteer$/i,
      /^save\s+attendee$/i,
      /^update\s+attendee$/i,
      /^save\s+kriyaban$/i,
      /^update\s+kriyaban$/i,
      /^save\s+vip$/i,
      /^update\s+vip$/i
    ], scope)) return;
  }

  const page = activePage();
  if (page?.id === 'events') {
    const form = document.getElementById('eventForm');
    const button = document.getElementById('eventSaveButton');
    if (submitFormWithPreferredButton(form, button)) return;
  }

  const visibleModals = [...document.querySelectorAll('.modal-backdrop.open, [role="dialog"]')].filter(isVisible);
  for (const modal of visibleModals) {
    const form = modal.querySelector('form');
    if (!form) continue;
    const buttons = [...form.querySelectorAll('button[type="submit"]')].filter(isVisible);
    const preferred = buttons.find(b => !/check\s*in/i.test(b.textContent || '')) || buttons[0];
    if (submitFormWithPreferredButton(form, preferred)) return;
  }

  const scope = page || document;
  const visibleForm = [...scope.querySelectorAll('form')].filter(isVisible).find(form =>
    [...form.querySelectorAll('button[type="submit"]')].some(isVisible)
  );
  if (visibleForm) {
    const preferred = [...visibleForm.querySelectorAll('button[type="submit"]')].filter(isVisible).find(b => !/check\s*in/i.test(b.textContent || ''));
    if (submitFormWithPreferredButton(visibleForm, preferred)) return;
  }

  const saveButton = [...scope.querySelectorAll('button')].filter(isVisible).find(b => {
    const t = (b.textContent || '').replace(/\s+/g, ' ').trim().toLowerCase();
    return /^(save|update|save event|update event|save volunteer|update volunteer|save attendee|update attendee|save kriyaban|update kriyaban|save vip|update vip|save acharya|update acharya|save student|update student|save registration|register only)$/.test(t) && !/check in/.test(t);
  });
  if (saveButton) saveButton.click();
}

function runAutoBackup() {
  try {
    const raw = window.localStorage.getItem(STATE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.events) || !Array.isArray(parsed.volunteers)) return;
    ipcRenderer.invoke('ananda-auto-backup-state', raw).catch(() => {});
  } catch {}
}

ipcRenderer.on('ananda-shortcut', (_event, action) => {
  if (action === 'add') handleAddShortcut();
  if (action === 'save') handleSaveShortcut();
});

window.addEventListener('DOMContentLoaded', () => {
  setTimeout(runAutoBackup, 1200);
});

contextBridge.exposeInMainWorld('anandaDesktop', {
  printHtml: (html) => ipcRenderer.invoke('ananda-native-print-html', { html }),
  openDataFolder: () => ipcRenderer.invoke('ananda-open-data-folder'),
  openBackupFolder: () => ipcRenderer.invoke('ananda-open-backup-folder'),
  dataLocation: () => ipcRenderer.invoke('ananda-data-location'),
  autoBackupState: (stateJson) => ipcRenderer.invoke('ananda-auto-backup-state', stateJson),
  manualBackupState: (stateJson) => ipcRenderer.invoke('ananda-manual-backup-state', stateJson)
});
