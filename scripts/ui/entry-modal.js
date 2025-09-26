import { createEl, renderTo, trapFocus } from '../utils/dom.js';
import { toInputDateTimeLocal } from '../utils/date.js';

const ENERGY_OPTIONS = [
  { value: -2, label: '--' },
  { value: -1, label: '-' },
  { value: 0, label: '0' },
  { value: 1, label: '+' },
  { value: 2, label: '++' },
];

export function openEntryModal({ entry = null, onSubmit, onDelete } = {}) {
  const container = document.getElementById('modalContainer');
  container.hidden = false;

  const defaultState = entry ?? {
    type: 'GREEN',
    title: '',
    note: '',
    energy: 0,
    tags: [],
    durationMin: '',
    occurredAt: new Date().toISOString(),
  };

  const modal = createEl('div', { class: 'modal', role: 'document' });
  const header = createEl('div', { class: 'modal-header' });
  const title = createEl('h2', { class: 'modal-title', text: entry ? 'アクティビティを編集' : 'アクティビティを追加' });
  const closeBtn = createEl('button', { class: 'secondary', text: '閉じる', type: 'button' });

  const backdropHandler = (event) => {
    if (event.target === container) {
      closeModal();
    }
  };

  function closeModal() {
    container.hidden = true;
    renderTo(container, []);
    container.removeEventListener('click', backdropHandler);
  }

  closeBtn.addEventListener('click', closeModal);
  container.addEventListener('click', backdropHandler);

  header.append(title, closeBtn);

  const form = createEl('form');
  form.setAttribute('novalidate', 'true');

  form.innerHTML = `
    <div class="form-group">
      <label>タイプ</label>
      <div class="radio-group" role="radiogroup">
        <button type="button" data-type="GREEN" class="radio-pill">グリーン</button>
        <button type="button" data-type="RED" class="radio-pill">レッド</button>
      </div>
    </div>
    <div class="form-group">
      <label for="entryTitle">活動名 *</label>
      <input id="entryTitle" name="title" type="text" required maxlength="120" placeholder="例: 朝のジョギング" />
    </div>
    <div class="form-group">
      <label for="entryNote">メモ</label>
      <textarea id="entryNote" name="note" placeholder="感じたこと、状況など"></textarea>
    </div>
    <div class="form-group">
      <label>エネルギー指標</label>
      <div class="energy-selector">
        ${ENERGY_OPTIONS.map((option) => `<button type="button" class="energy-pill" data-energy="${option.value}">${option.label}</button>`).join('')}
      </div>
    </div>
    <div class="form-group">
      <label for="entryTags">タグ（カンマ区切り）</label>
      <input id="entryTags" name="tags" type="text" placeholder="例: 仕事,チーム,集中" />
    </div>
    <div class="form-group">
      <label for="entryDuration">所要時間（分）</label>
      <input id="entryDuration" name="duration" type="number" min="0" step="5" />
    </div>
    <div class="form-group">
      <label for="entryOccurredAt">日時</label>
      <input id="entryOccurredAt" name="occurredAt" type="datetime-local" />
    </div>
  `;

  const buttonRow = createEl('div', { class: 'button-row' });
  if (entry && onDelete) {
    const deleteBtn = createEl('button', { class: 'secondary', text: '削除', type: 'button' });
    deleteBtn.addEventListener('click', async () => {
      const confirmDelete = window.confirm('このアクティビティを削除しますか？');
      if (!confirmDelete) return;
      await onDelete(entry);
      closeModal();
    });
    buttonRow.append(deleteBtn);
  }
  const cancelBtn = createEl('button', { class: 'secondary', text: 'キャンセル', type: 'button' });
  cancelBtn.addEventListener('click', closeModal);
  const submitBtn = createEl('button', { class: 'primary', text: entry ? '更新する' : '保存する', type: 'submit' });
  buttonRow.append(cancelBtn, submitBtn);

  form.append(buttonRow);
  modal.append(header, form);
  renderTo(container, modal);
  trapFocus(modal);

  const typeButtons = modal.querySelectorAll('.radio-pill');
  const energyButtons = modal.querySelectorAll('.energy-pill');
  const titleInput = modal.querySelector('#entryTitle');
  const noteInput = modal.querySelector('#entryNote');
  const tagInput = modal.querySelector('#entryTags');
  const durationInput = modal.querySelector('#entryDuration');
  const occurredInput = modal.querySelector('#entryOccurredAt');

  let currentType = defaultState.type;
  let currentEnergy = defaultState.energy;

  function updateTypeButtons() {
    typeButtons.forEach((button) => {
      button.classList.toggle('active', button.dataset.type === currentType);
    });
  }

  function updateEnergyButtons() {
    energyButtons.forEach((button) => {
      button.classList.toggle('active', Number(button.dataset.energy) === Number(currentEnergy));
    });
  }

  typeButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentType = button.dataset.type;
      updateTypeButtons();
    });
  });

  energyButtons.forEach((button) => {
    button.addEventListener('click', () => {
      currentEnergy = Number(button.dataset.energy);
      updateEnergyButtons();
    });
  });

  titleInput.value = defaultState.title ?? '';
  noteInput.value = defaultState.note ?? '';
  tagInput.value = defaultState.tags?.join(',') ?? '';
  durationInput.value = defaultState.durationMin ?? '';
  occurredInput.value = toInputDateTimeLocal(defaultState.occurredAt ?? new Date());
  updateTypeButtons();
  updateEnergyButtons();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!titleInput.value.trim()) {
      titleInput.focus();
      titleInput.setCustomValidity('活動名は必須です');
      titleInput.reportValidity();
      return;
    }
    titleInput.setCustomValidity('');
    const tags = tagInput.value.split(',').map((tag) => tag.trim()).filter(Boolean);
    const payload = {
      ...entry,
      type: currentType,
      title: titleInput.value.trim(),
      note: noteInput.value.trim(),
      energy: currentEnergy,
      tags,
      durationMin: durationInput.value ? Number(durationInput.value) : undefined,
      occurredAt: new Date(occurredInput.value).toISOString(),
    };
    await onSubmit(payload);
    closeModal();
  });

  return { close: closeModal };
}
