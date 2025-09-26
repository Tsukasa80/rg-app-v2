import { renderTo, createEl } from '../utils/dom.js';
import { formatDate, formatDuration } from '../utils/date.js';
import { fetchEntries, summariseEntries, formatSummary, loadWeeklySelection, loadWeeklyReflection, deriveWeekFromDate, computeWeekBoundary } from '../data-service.js';

export async function renderHome(container, state) {
  const { settings } = state;
  const now = new Date();
  const { year, isoWeek } = deriveWeekFromDate(now, settings.weekStartsOn);
  const { start, end } = computeWeekBoundary({ year, isoWeek, weekStartsOn: settings.weekStartsOn });
  const entries = await fetchEntries({}, settings);
  const thisWeekEntries = entries.filter((entry) => {
    const occurred = new Date(entry.occurredAt);
    return occurred >= start && occurred <= end;
  });

  const summary = formatSummary(summariseEntries(thisWeekEntries));
  const greenSelection = await loadWeeklySelection(year, isoWeek, 'GREEN_BEST');
  const redSelection = await loadWeeklySelection(year, isoWeek, 'RED_WORST');
  const reflection = await loadWeeklyReflection(year, isoWeek);

  const pending = [];
  if (!thisWeekEntries.length) {
    pending.push('今週のアクティビティを追加しましょう');
  }
  if (!greenSelection?.entryIds?.length) {
    pending.push('グリーン・ベスト5を選定しましょう');
  }
  if (!redSelection?.entryIds?.length) {
    pending.push('レッド・ワースト5を選定しましょう');
  }
  if (!reflection?.q1 && !reflection?.q2 && !reflection?.q3) {
    pending.push('週次リフレクションを記入しましょう');
  }

  const fragment = document.createDocumentFragment();

  fragment.append(createSummaryCard(summary, { start, end }));
  fragment.append(createRecentList(thisWeekEntries.slice(0, 5)));
  fragment.append(createPendingCard(pending));

  renderTo(container, fragment);
}

function createSummaryCard(summary, { start, end }) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(
    createEl('h2', { text: '今週のサマリー' }),
    createEl('span', { class: 'badge', text: `${formatDate(start)} - ${formatDate(end)}` }),
  );

  const list = createEl('div', { class: 'summary-card' });
  list.append(
    createEl('div', { text: `入力数: 合計 ${summary.total} 件 (グリーン ${summary.greenCount} / レッド ${summary.redCount})` }),
    createEl('div', { text: `平均スコア: ${summary.avgEnergy} / 中央値: ${summary.medianEnergy}` }),
    createEl('div', { text: `合計時間: ${summary.totalDurationLabel}` }),
  );

  const histogram = createEl('div', { class: 'tag-list' });
  summary.histogramList.forEach((item) => {
    histogram.append(createEl('span', { class: 'tag', text: `${item.label}: ${item.count}` }));
  });

  card.append(header, list, histogram);
  return card;
}

function createRecentList(entries) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: '直近の入力' }));
  card.append(header);

  if (!entries.length) {
    card.append(createEl('p', { class: 'muted', text: 'まだ入力がありません。' }));
    return card;
  }

  const list = createEl('div', { class: 'list' });
  entries.forEach((entry) => {
    const item = createEl('div', { class: 'card' });
    const badge = createEl('span', { class: `badge ${entry.type === 'GREEN' ? 'green' : 'red'}`, text: entry.type === 'GREEN' ? 'グリーン' : 'レッド' });
    const headerRow = createEl('div', { class: 'card-header' });
    headerRow.append(createEl('h3', { text: entry.title }), badge);
    const meta = createEl('div', { class: 'muted', text: `${formatDate(entry.occurredAt)} / エネルギー ${entry.energy}` });
    item.append(headerRow, meta);
    if (entry.durationMin) {
      item.append(createEl('div', { text: `所要時間: ${formatDuration(entry.durationMin)}` }));
    }
    if (entry.tags?.length) {
      const tags = createEl('div', { class: 'tag-list' });
      entry.tags.forEach((tag) => tags.append(createEl('span', { class: 'tag', text: `#${tag}` })));
      item.append(tags);
    }
    list.append(item);
  });

  card.append(list);
  return card;
}

function createPendingCard(pending) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: '今週のタスク' }));
  card.append(header);

  if (!pending.length) {
    card.append(createEl('p', { text: 'すべて完了しています。お疲れさまでした！' }));
    return card;
  }

  const list = createEl('ul');
  pending.forEach((item) => {
    list.append(createEl('li', { text: item }));
  });
  card.append(list);
  return card;
}
