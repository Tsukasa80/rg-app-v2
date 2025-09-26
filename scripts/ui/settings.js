import { renderTo, createEl } from '../utils/dom.js';
import { updateSettings, notify, emitDataChange } from '../state.js';
import { exportDataFile, importDataFile, fetchEntries, toCSV } from '../data-service.js';

export async function renderSettings(container, state) {
  const fragment = document.createDocumentFragment();
  fragment.append(createWeekStartCard(state.settings));
  fragment.append(await createBackupCard());
  fragment.append(createNotificationCard(state.settings));
  renderTo(container, fragment);
}

function createWeekStartCard(settings) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: '週の開始曜日' }));
  card.append(header);

  const form = createEl('form', { class: 'radio-group' });
  const monday = createEl('label', { children: [createRadio('weekStartsOn', 1, settings.weekStartsOn === 1), createEl('span', { text: '月曜開始 (ISO週)' })] });
  const sunday = createEl('label', { children: [createRadio('weekStartsOn', 0, settings.weekStartsOn === 0), createEl('span', { text: '日曜開始' })] });
  form.append(monday, sunday);

  form.addEventListener('change', (event) => {
    const value = Number(event.target.value);
    updateSettings({ weekStartsOn: value });
    notify('週の開始曜日を更新しました');
    emitDataChange({ scope: 'settings' });
  });

  card.append(form);
  return card;
}

function createRadio(name, value, checked) {
  const input = createEl('input', { type: 'radio', name, value: String(value) });
  input.checked = checked;
  return input;
}

async function createBackupCard() {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: 'バックアップ / インポート' }));
  card.append(header);

  const exportJsonBtn = createEl('button', { class: 'primary', text: 'JSONを書き出す', type: 'button' });
  exportJsonBtn.addEventListener('click', async () => {
    const data = await exportDataFile();
    downloadFile(JSON.stringify(data, null, 2), 'rgx-export.json', 'application/json');
    notify('JSONを書き出しました');
  });

  const exportCsvBtn = createEl('button', { class: 'secondary', text: 'CSVを書き出す', type: 'button' });
  exportCsvBtn.addEventListener('click', async () => {
    const entries = await fetchEntries({ range: 'all' });
    const csv = toCSV(entries);
    downloadFile(csv, 'rgx-export.csv', 'text/csv');
    notify('CSVを書き出しました');
  });

  const importBtn = createEl('button', { class: 'secondary', text: 'JSONをインポート', type: 'button' });
  const fileInput = createEl('input', { type: 'file', accept: '.json', hidden: 'true' });
  importBtn.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const text = await file.text();
    try {
      const payload = JSON.parse(text);
      await importDataFile(payload);
      notify('データをインポートしました');
      emitDataChange({ scope: 'import' });
    } catch (error) {
      console.error(error);
      notify('インポートに失敗しました');
    }
  });

  const buttons = createEl('div', { class: 'action-bar' });
  buttons.append(exportJsonBtn, exportCsvBtn, importBtn, fileInput);
  card.append(buttons);
  return card;
}

function createNotificationCard(settings) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: '通知設定（任意）' }));
  card.append(header);

  const info = createEl('p', { class: 'muted', text: 'ブラウザのローカル通知を利用します。権限が必要です。' });
  const dailyToggle = createToggle('日次入力リマインダー', settings.enableNotifications, async (checked) => {
    const permission = await ensureNotificationPermission();
    if (permission !== 'granted') {
      notify('通知が許可されませんでした');
      return;
    }
    updateSettings({ enableNotifications: checked });
    notify('日次通知設定を更新しました');
  });
  const weeklyToggle = createToggle('週末リマインダー', settings.enableWeeklyReminder, async (checked) => {
    const permission = await ensureNotificationPermission();
    if (permission !== 'granted') {
      notify('通知が許可されませんでした');
      return;
    }
    updateSettings({ enableWeeklyReminder: checked });
    notify('週次通知設定を更新しました');
  });

  card.append(info, dailyToggle, weeklyToggle);
  return card;
}

function createToggle(label, initial, onChange) {
  const wrapper = createEl('div', { class: 'action-bar' });
  const checkbox = createEl('input', { type: 'checkbox' });
  checkbox.checked = Boolean(initial);
  const span = createEl('span', { text: label });
  checkbox.addEventListener('change', () => onChange(checkbox.checked));
  wrapper.append(checkbox, span);
  return wrapper;
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) {
    notify('このブラウザは通知に対応していません');
    return 'denied';
  }
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 500);
}
