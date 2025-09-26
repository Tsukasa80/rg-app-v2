import { renderTo, createEl } from '../utils/dom.js';
import { formatDateTime, formatDuration } from '../utils/date.js';
import { fetchEntries, removeEntry, createEntry, loadEntry } from '../data-service.js';
import { openEntryModal } from './entry-modal.js';
import { updateFilters, resetFilters, notify, emitDataChange } from '../state.js';

export async function renderHistory(container, state) {
  const { filters, settings } = state;
  const fragment = document.createDocumentFragment();

  fragment.append(createFilters(filters));

  const entries = await fetchEntries(filters, settings);

  const listCard = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: `履歴 (${entries.length} 件)` }));
  listCard.append(header);

  if (!entries.length) {
    listCard.append(createEl('p', { text: '該当する履歴がありません。' }));
  } else {
    const list = createEl('div', { class: 'list' });
    entries.forEach((entry) => {
      list.append(renderEntryItem(entry, settings));
    });
    listCard.append(list);
  }

  fragment.append(listCard);
  renderTo(container, fragment);
}

function createFilters(filters) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: 'フィルター' }));
  const resetBtn = createEl('button', { class: 'secondary', text: 'リセット', type: 'button' });
  resetBtn.addEventListener('click', () => resetFilters());
  header.append(resetBtn);
  card.append(header);

  const form = createEl('form', { class: 'grid two' });
  form.innerHTML = `
    <label>タイプ
      <select name="type">
        <option value="ALL">すべて</option>
        <option value="GREEN">グリーンのみ</option>
        <option value="RED">レッドのみ</option>
      </select>
    </label>
    <label>エネルギー
      <select name="energy">
        <option value="ALL">すべて</option>
        <option value="2">++</option>
        <option value="1">+</option>
        <option value="0">0</option>
        <option value="-1">-</option>
        <option value="-2">--</option>
      </select>
    </label>
    <label>期間（日数）
      <select name="range">
        <option value="7">直近7日</option>
        <option value="30">直近30日</option>
        <option value="90">直近90日</option>
        <option value="all">指定なし</option>
      </select>
    </label>
    <label>キーワード
      <input type="text" name="search" placeholder="タイトル・メモを検索" />
    </label>
  `;

  const typeSelect = form.querySelector('select[name="type"]');
  const energySelect = form.querySelector('select[name="energy"]');
  const rangeSelect = form.querySelector('select[name="range"]');
  const searchInput = form.querySelector('input[name="search"]');

  typeSelect.value = filters.type ?? 'ALL';
  energySelect.value = filters.energy ?? 'ALL';
  rangeSelect.value = filters.range ?? '7';
  searchInput.value = filters.search ?? '';

  form.addEventListener('change', () => {
    const formData = new FormData(form);
    updateFilters(Object.fromEntries(formData.entries()));
  });

  searchInput.addEventListener('input', (event) => {
    updateFilters({ search: event.target.value });
  });

  card.append(form);
  return card;
}

function renderEntryItem(entry, settings) {
  const item = createEl('article', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  const badge = createEl('span', { class: `badge ${entry.type === 'GREEN' ? 'green' : 'red'}`, text: entry.type === 'GREEN' ? 'グリーン' : 'レッド' });
  header.append(createEl('h3', { text: entry.title }), badge);
  item.append(header);

  item.append(createEl('div', { class: 'muted', text: formatDateTime(entry.occurredAt) }));
  item.append(createEl('div', { text: `エネルギー: ${entry.energy}` }));
  if (entry.durationMin) {
    item.append(createEl('div', { text: `所要時間: ${formatDuration(entry.durationMin)}` }));
  }
  if (entry.note) {
    item.append(createEl('p', { text: entry.note }));
  }
  if (entry.tags?.length) {
    const tags = createEl('div', { class: 'tag-list' });
    entry.tags.forEach((tag) => tags.append(createEl('span', { class: 'tag', text: `#${tag}` })));
    item.append(tags);
  }

  const actions = createEl('div', { class: 'action-bar' });
  const editBtn = createEl('button', { class: 'secondary', text: '編集', type: 'button' });
  editBtn.addEventListener('click', async () => {
    const data = await loadEntry(entry.id);
    openEntryModal({
      entry: data,
      onSubmit: async (payload) => {
        await createEntry(payload, settings);
        notify('更新しました');
        emitDataChange({ scope: 'entries' });
      },
      onDelete: async () => {
        await removeEntry(entry.id);
        notify('削除しました');
        emitDataChange({ scope: 'entries' });
      },
    });
  });
  const deleteBtn = createEl('button', { class: 'secondary', text: '削除', type: 'button' });
  deleteBtn.addEventListener('click', async () => {
    const confirmDelete = window.confirm('削除しますか？');
    if (!confirmDelete) return;
    await removeEntry(entry.id);
    notify('削除しました');
    emitDataChange({ scope: 'entries' });
  });
  actions.append(editBtn, deleteBtn);
  item.append(actions);
  return item;
}
