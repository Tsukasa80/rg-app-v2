import { renderTo, createEl } from '../utils/dom.js';
import { formatDate, formatEnergy, formatDuration } from '../utils/date.js';
import {
  deriveWeekFromDate,
  computeWeekBoundary,
  collectWeekCandidates,
  loadWeeklySelection,
  upsertWeeklySelection,
  loadWeeklyReflection,
  upsertWeeklyReflection,
  summariseEntries,
  formatSummary,
} from '../data-service.js';
import { notify, emitDataChange } from '../state.js';

let viewState = null;
let lastWeekStartsOn = 1;

export async function renderWeekly(container, state) {
  if (!viewState) {
    viewState = deriveWeekFromDate(new Date(), state.settings.weekStartsOn);
    lastWeekStartsOn = state.settings.weekStartsOn;
  }
  if (lastWeekStartsOn !== state.settings.weekStartsOn) {
    viewState = deriveWeekFromDate(new Date(), state.settings.weekStartsOn);
    lastWeekStartsOn = state.settings.weekStartsOn;
  }

  async function refresh() {
    const { year, isoWeek } = viewState;
    const { weekStartsOn } = state.settings;
    const boundary = computeWeekBoundary({ year, isoWeek, weekStartsOn });
    const greenCandidates = await collectWeekCandidates({ year, isoWeek, type: 'GREEN_BEST', weekStartsOn });
    const redCandidates = await collectWeekCandidates({ year, isoWeek, type: 'RED_WORST', weekStartsOn });
    const greenSelection = await loadWeeklySelection(year, isoWeek, 'GREEN_BEST');
    const redSelection = await loadWeeklySelection(year, isoWeek, 'RED_WORST');
    const reflection = await loadWeeklyReflection(year, isoWeek);

    const summary = formatSummary(summariseEntries([...greenCandidates, ...redCandidates]));

    const fragment = document.createDocumentFragment();
    fragment.append(createHeader(boundary, state, refresh));
    fragment.append(createSummaryCard(summary));
    fragment.append(createSelectionCard({
      title: 'グリーン・ベスト5',
      type: 'GREEN_BEST',
      candidates: greenCandidates,
      selection: greenSelection,
      week: viewState,
      noteLabel: 'こんな強みを使っているかも',
      onRefresh: refresh,
    }));
    fragment.append(createSelectionCard({
      title: 'レッド・ワースト5',
      type: 'RED_WORST',
      candidates: redCandidates,
      selection: redSelection,
      week: viewState,
      noteLabel: 'こんな弱みのせいかも',
      onRefresh: refresh,
    }));
    fragment.append(createReflectionCard({ reflection, week: viewState, onRefresh: refresh }));

    renderTo(container, fragment);
  }

  await refresh();
}

function createHeader(boundary, state, refresh) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: `${viewState.year}年 Week ${viewState.isoWeek}` }));
  header.append(createEl('span', { class: 'badge', text: `${formatDate(boundary.start)} - ${formatDate(boundary.end)}` }));
  card.append(header);

  const nav = createEl('div', { class: 'action-bar' });
  const prevBtn = createEl('button', { class: 'secondary', text: '前の週', type: 'button' });
  const todayBtn = createEl('button', { class: 'secondary', text: '今週', type: 'button' });
  const nextBtn = createEl('button', { class: 'secondary', text: '次の週', type: 'button' });

  prevBtn.addEventListener('click', () => {
    viewState = shiftWeek(boundary.start, -7, state.settings.weekStartsOn);
    refresh();
  });
  todayBtn.addEventListener('click', () => {
    viewState = deriveWeekFromDate(new Date(), state.settings.weekStartsOn);
    refresh();
  });
  nextBtn.addEventListener('click', () => {
    viewState = shiftWeek(boundary.start, 7, state.settings.weekStartsOn);
    refresh();
  });

  nav.append(prevBtn, todayBtn, nextBtn);
  card.append(nav);
  return card;
}

function shiftWeek(startDate, deltaDays, weekStartsOn) {
  const target = new Date(startDate.getTime() + deltaDays * 24 * 60 * 60 * 1000);
  return deriveWeekFromDate(target, weekStartsOn);
}

function createSummaryCard(summary) {
  const card = createEl('section', { class: 'card' });
  card.append(createEl('h2', { text: '週次サマリー' }));
  const list = createEl('ul');
  list.append(createEl('li', { text: `入力件数: ${summary.total} 件 (グリーン ${summary.greenCount} / レッド ${summary.redCount})` }));
  list.append(createEl('li', { text: `平均エネルギー: ${summary.avgEnergy}` }));
  list.append(createEl('li', { text: `合計時間: ${summary.totalDurationLabel}` }));
  card.append(list);

  if (summary.tagStats.length) {
    const tags = createEl('div', { class: 'tag-list' });
    summary.tagStats.slice(0, 6).forEach((tag) => {
      tags.append(createEl('span', { class: 'tag', text: `${tag.tag} (${tag.count})` }));
    });
    card.append(tags);
  }
  return card;
}

function createSelectionCard({ title, type, candidates, selection, week, noteLabel, onRefresh }) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: `${title} (${selection?.entryIds?.length ?? 0}/5)` }));
  card.append(header);

  const locked = Boolean(selection?.locked);
  const selectedIds = new Set(selection?.entryIds ?? []);
  const notes = { ...(selection?.notes ?? {}) };

  const lockToggle = createEl('button', { class: 'secondary', text: locked ? 'ロック解除' : 'ロックする', type: 'button' });
  lockToggle.addEventListener('click', async () => {
    const nextLocked = !locked;
    await upsertWeeklySelection({ ...(selection ?? {}), ...week, type, entryIds: [...selectedIds], notes, locked: nextLocked });
    notify(nextLocked ? 'ロックしました' : 'ロックを解除しました');
    emitDataChange({ scope: 'weekly-selection' });
    onRefresh();
  });
  card.append(lockToggle);

  if (!candidates.length) {
    card.append(createEl('p', { text: '該当するアクティビティがありません。' }));
    return card;
  }

  const list = createEl('div', { class: 'list' });
  candidates.forEach((entry) => {
    const item = createEl('article', { class: 'card' });
    const head = createEl('div', { class: 'card-header' });
    head.append(createEl('h3', { text: entry.title }), createEl('span', { class: 'badge', text: formatEnergy(entry.energy) }));
    item.append(head);
    item.append(createEl('div', { class: 'muted', text: formatDate(entry.occurredAt) }));
    if (entry.tags?.length) {
      const tags = createEl('div', { class: 'tag-list' });
      entry.tags.forEach((tag) => tags.append(createEl('span', { class: 'tag', text: `#${tag}` })));
      item.append(tags);
    }
    if (entry.durationMin) {
      item.append(createEl('div', { text: `所要時間: ${formatDuration(entry.durationMin)}` }));
    }

    const controlRow = createEl('div', { class: 'action-bar' });
    const checkbox = createEl('input', { type: 'checkbox' });
    checkbox.checked = selectedIds.has(entry.id);
    checkbox.disabled = locked;

    const noteField = createEl('textarea', { placeholder: noteLabel, class: 'selection-note' });
    noteField.value = notes[entry.id]?.hypothesis ?? '';

    const updateNoteState = () => {
      const isSelected = selectedIds.has(entry.id);
      noteField.disabled = locked || !isSelected;
      noteField.classList.toggle('inactive-note', !isSelected);
    };
    updateNoteState();

    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (selectedIds.size >= 5) {
          checkbox.checked = false;
          notify('5件まで選択できます');
          return;
        }
        selectedIds.add(entry.id);
      } else {
        selectedIds.delete(entry.id);
        delete notes[entry.id];
      }
      updateNoteState();
    });

    noteField.addEventListener('input', () => {
      if (!selectedIds.has(entry.id)) return;
      notes[entry.id] = { hypothesis: noteField.value };
    });

    controlRow.append(createEl('label', { children: [checkbox, createEl('span', { text: ' 候補に含める' })] }));
    item.append(controlRow);
    item.append(createEl('label', { text: noteLabel }));
    item.append(noteField);

    list.append(item);
  });

  const saveBtn = createEl('button', { class: 'primary', text: '保存する', type: 'button' });
  saveBtn.disabled = locked;
  saveBtn.addEventListener('click', async () => {
    if (selectedIds.size === 0) {
      notify('少なくとも1件選択してください');
      return;
    }
    await upsertWeeklySelection({ ...(selection ?? {}), ...week, type, entryIds: [...selectedIds], notes });
    notify('保存しました');
    emitDataChange({ scope: 'weekly-selection' });
    onRefresh();
  });

  card.append(list, saveBtn);
  return card;
}

function createReflectionCard({ reflection, week, onRefresh }) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: '週次リフレクション' }));
  card.append(header);

  const form = createEl('form');
  form.innerHTML = `
    <div class="form-group">
      <label>どうしたらもっと自分の強みを活かせるだろうか？</label>
      <textarea name="q1" placeholder="自由に記入してください"></textarea>
    </div>
    <div class="form-group">
      <label>もっとエネルギーが増えるような活動はできないだろうか？</label>
      <textarea name="q2" placeholder="自由に記入してください"></textarea>
    </div>
    <div class="form-group">
      <label>エネルギーを消耗する状況に効果的に対処するには？</label>
      <textarea name="q3" placeholder="自由に記入してください"></textarea>
    </div>
  `;

  form.q1.value = reflection?.q1 ?? '';
  form.q2.value = reflection?.q2 ?? '';
  form.q3.value = reflection?.q3 ?? '';

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    await upsertWeeklyReflection({ ...(reflection ?? {}), ...week, q1: form.q1.value, q2: form.q2.value, q3: form.q3.value });
    notify('リフレクションを保存しました');
    emitDataChange({ scope: 'weekly-reflection' });
    onRefresh();
  });

  const saveBtn = createEl('button', { class: 'primary', text: 'リフレクションを保存', type: 'submit' });
  form.append(saveBtn);

  card.append(form);
  return card;
}
