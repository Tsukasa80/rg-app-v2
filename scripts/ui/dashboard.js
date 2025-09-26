import { renderTo, createEl } from '../utils/dom.js';
import { fetchEntries, summariseEntries, formatSummary } from '../data-service.js';
import { formatDate, formatDuration } from '../utils/date.js';

let dashboardState = { range: '30' };

export async function renderDashboard(container, state) {
  async function refresh() {
    const filters = dashboardState.range === 'all' ? { range: 'all' } : { range: dashboardState.range };
    const entries = await fetchEntries(filters, state.settings);
    const summary = formatSummary(summariseEntries(entries));
    const fragment = document.createDocumentFragment();
    fragment.append(createControls(dashboardState, () => refresh()));
    fragment.append(createKeyMetrics(summary, entries));
    fragment.append(createEnergyHistogram(summary));
    fragment.append(createTagBreakdown(summary));
    fragment.append(createTimeline(entries));
    renderTo(container, fragment);
  }

  await refresh();
}

function createControls(current, onChange) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: '期間設定' }));
  card.append(header);

  const select = createEl('select');
  select.innerHTML = `
    <option value="7">直近7日</option>
    <option value="30">直近30日</option>
    <option value="90">直近90日</option>
    <option value="365">直近1年</option>
    <option value="all">すべて</option>
  `;
  select.value = current.range ?? '30';
  select.addEventListener('change', (event) => {
    dashboardState = { ...dashboardState, range: event.target.value };
    onChange();
  });
  card.append(select);
  return card;
}

function createKeyMetrics(summary, entries) {
  const card = createEl('section', { class: 'card' });
  const header = createEl('div', { class: 'card-header' });
  header.append(createEl('h2', { text: '指標' }));
  card.append(header);

  const grid = createEl('div', { class: 'grid two' });
  grid.append(createMetric('入力件数', `${summary.total} 件`));
  const ratio = summary.total ? Math.round((summary.greenCount / summary.total) * 100) : 0;
  grid.append(createMetric('グリーン比率', `${ratio}%`));
  grid.append(createMetric('平均エネルギー', `${summary.avgEnergy}`));
  grid.append(createMetric('合計時間', summary.totalDurationLabel));
  card.append(grid);

  if (entries.length) {
    const last = entries[0];
    card.append(createEl('p', { class: 'muted', text: `最終入力: ${formatDate(last.occurredAt)}` }));
  }

  return card;
}

function createMetric(label, value) {
  const div = createEl('div', { class: 'summary-card' });
  div.append(createEl('span', { class: 'muted', text: label }));
  div.append(createEl('strong', { text: value }));
  return div;
}

function createEnergyHistogram(summary) {
  const card = createEl('section', { class: 'card' });
  card.append(createEl('h2', { text: 'エネルギー分布' }));
  if (!summary.total) {
    card.append(createEl('p', { text: 'データがありません。' }));
    return card;
  }
  const max = Math.max(...Object.values(summary.energyHistogram));
  const list = createEl('div');
  Object.entries(summary.energyHistogram).forEach(([energy, count]) => {
    const row = createEl('div', { class: 'summary-card' });
    row.append(createEl('span', { text: `指標 ${energy}` }));
    const bar = createEl('div', { class: 'bar' });
    const inner = createEl('div', { class: 'bar-inner' });
    inner.style.width = max ? `${(count / max) * 100}%` : '0%';
    inner.textContent = `${count} 件`;
    bar.append(inner);
    row.append(bar);
    list.append(row);
  });
  card.append(list);
  return card;
}

function createTagBreakdown(summary) {
  const card = createEl('section', { class: 'card' });
  card.append(createEl('h2', { text: 'タグ別内訳' }));
  if (!summary.tagStats.length) {
    card.append(createEl('p', { text: 'タグ付きのデータがありません。' }));
    return card;
  }
  const tableWrapper = createEl('div', { class: 'table-scroll' });
  const table = createEl('table');
  table.innerHTML = `
    <thead>
      <tr><th>タグ</th><th>件数</th><th>平均エネルギー</th></tr>
    </thead>
    <tbody>
      ${summary.tagStats.map((tag) => `<tr><td>${tag.tag}</td><td>${tag.count}</td><td>${tag.avgEnergy}</td></tr>`).join('')}
    </tbody>
  `;
  tableWrapper.append(table);
  card.append(tableWrapper);
  return card;
}

function createTimeline(entries) {
  const card = createEl('section', { class: 'card' });
  card.append(createEl('h2', { text: '最近の活動' }));
  if (!entries.length) {
    card.append(createEl('p', { text: 'データがありません。' }));
    return card;
  }
  const list = createEl('ul');
  entries.slice(0, 10).forEach((entry) => {
    list.append(createEl('li', { text: `${formatDate(entry.occurredAt)} / ${entry.title} / ${formatDuration(entry.durationMin)}` }));
  });
  card.append(list);
  return card;
}
