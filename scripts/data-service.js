import { listActivities, addActivity, deleteActivity, getActivity, saveWeeklySelection, getWeeklySelection, saveWeeklyReflection, getWeeklyReflection, exportAll, importData } from './db.js';
import { startOfWeek, endOfWeek, isWithinRange, formatEnergy, formatDuration, getWeekKey, isoWeekInfo } from './utils/date.js';

export async function fetchEntries(filters = {}, settings) {
  const { weekStartsOn = 1 } = settings ?? {};
  const entries = await listActivities();
  let results = entries;
  if (filters.type && filters.type !== 'ALL') {
    results = results.filter((entry) => entry.type === filters.type);
  }
  if (filters.energy && filters.energy !== 'ALL') {
    const target = Number(filters.energy);
    results = results.filter((entry) => entry.energy === target);
  }
  if (filters.tags?.length) {
    results = results.filter((entry) => entry.tags && filters.tags.every((tag) => entry.tags.includes(tag)));
  }
  if (filters.search) {
    const keyword = filters.search.toLowerCase();
    results = results.filter((entry) => [entry.title, entry.note].some((text) => text?.toLowerCase().includes(keyword)));
  }
  if (filters.range && filters.range !== 'all') {
    const now = new Date();
    const days = Number(filters.range);
    const threshold = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    results = results.filter((entry) => new Date(entry.occurredAt) >= threshold);
  }
  if (filters.startDate && filters.endDate) {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    results = results.filter((entry) => isWithinRange(entry.occurredAt, start, end));
  }
  return results.sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
}

const randomId = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);

export async function createEntry(payload, settings) {
  const { weekStartsOn = 1 } = settings ?? {};
  const entry = {
    id: payload.id ?? randomId(),
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
    type: payload.type,
    title: payload.title,
    note: payload.note ?? '',
    energy: Number(payload.energy),
    durationMin: payload.durationMin ? Number(payload.durationMin) : undefined,
    tags: payload.tags?.filter(Boolean) ?? [],
    weekStartsOn,
  };
  return addActivity(entry);
}

export async function removeEntry(id) {
  return deleteActivity(id);
}

export async function loadEntry(id) {
  return getActivity(id);
}

export async function upsertWeeklySelection({ year, isoWeek, type, entryIds, notes }) {
  const weekKey = `${year}-${String(isoWeek).padStart(2, '0')}`;
  return saveWeeklySelection({ year, isoWeek, type, entryIds, notes, weekKey });
}

export async function loadWeeklySelection(year, isoWeek, type) {
  const weekKey = `${year}-${String(isoWeek).padStart(2, '0')}`;
  return getWeeklySelection(weekKey, type);
}

export async function upsertWeeklyReflection({ year, isoWeek, q1, q2, q3, summary }) {
  const weekKey = `${year}-${String(isoWeek).padStart(2, '0')}`;
  return saveWeeklyReflection({ year, isoWeek, q1, q2, q3, summary, weekKey });
}

export async function loadWeeklyReflection(year, isoWeek) {
  const weekKey = `${year}-${String(isoWeek).padStart(2, '0')}`;
  return getWeeklyReflection(weekKey);
}

export async function computeWeeklyDashboard(year, isoWeek, weekStartsOn = 1) {
  const weekKey = `${year}-${String(isoWeek).padStart(2, '0')}`;
  const entries = await fetchEntries({}, { weekStartsOn });
  const { start, end } = { start: startOfWeek(new Date(`${weekKey}-01`), weekStartsOn), end: endOfWeek(new Date(`${weekKey}-01`), weekStartsOn) };
  const withinWeek = entries.filter((entry) => isWithinRange(entry.occurredAt, start, end));
  return summariseEntries(withinWeek);
}

export function summariseEntries(entries) {
  const total = entries.length;
  if (!total) {
    return {
      total,
      greenCount: 0,
      redCount: 0,
      avgEnergy: 0,
      medianEnergy: 0,
      energyHistogram: { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 },
      tagStats: [],
      totalDuration: 0,
      avgDuration: 0,
    };
  }
  const greens = entries.filter((entry) => entry.type === 'GREEN');
  const reds = entries.filter((entry) => entry.type === 'RED');
  const energyValues = entries.map((entry) => Number(entry.energy)).sort((a, b) => a - b);
  const histogram = { '-2': 0, '-1': 0, '0': 0, '1': 0, '2': 0 };
  energyValues.forEach((value) => {
    histogram[String(value)] += 1;
  });
  const sumEnergy = energyValues.reduce((total, value) => total + value, 0);
  const medianEnergy = energyValues[Math.floor((energyValues.length - 1) / 2)];
  const tagMap = new Map();
  entries.forEach((entry) => {
    entry.tags?.forEach((tag) => {
      if (!tagMap.has(tag)) {
        tagMap.set(tag, { tag, count: 0, totalEnergy: 0 });
      }
      const stats = tagMap.get(tag);
      stats.count += 1;
      stats.totalEnergy += Number(entry.energy);
    });
  });
  const totalDuration = entries.reduce((total, entry) => total + (Number(entry.durationMin) || 0), 0);
  const tagStats = Array.from(tagMap.values()).map((item) => ({
    ...item,
    avgEnergy: Math.round((item.totalEnergy / item.count) * 10) / 10,
  })).sort((a, b) => b.count - a.count);
  return {
    total,
    greenCount: greens.length,
    redCount: reds.length,
    avgEnergy: Math.round((sumEnergy / entries.length) * 10) / 10,
    medianEnergy,
    energyHistogram: histogram,
    tagStats,
    totalDuration,
    avgDuration: totalDuration ? Math.round((totalDuration / entries.length) * 10) / 10 : 0,
  };
}

export function formatSummary(summary) {
  return {
    ...summary,
    totalDurationLabel: formatDuration(summary.totalDuration),
    histogramList: Object.entries(summary.energyHistogram).map(([energy, count]) => ({ energy, label: formatEnergy(energy), count })),
  };
}

export async function exportDataFile() {
  return exportAll();
}

export async function importDataFile(payload) {
  await importData(payload);
}

export function resolveWeekKeyFromDate(date, weekStartsOn = 1) {
  return getWeekKey(date, weekStartsOn);
}

export function deriveWeekFromDate(date, weekStartsOn = 1) {
  const weekKey = getWeekKey(date, weekStartsOn);
  const [year, week] = weekKey.split('-');
  return { year: Number(year), isoWeek: Number(week) };
}

export async function collectWeekCandidates({ year, isoWeek, type, weekStartsOn = 1 }) {
  const entries = await fetchEntries({ type: type === 'GREEN_BEST' ? 'GREEN' : 'RED' }, { weekStartsOn });
  const { start, end } = computeWeekBoundary({ year, isoWeek, weekStartsOn });
  return entries.filter((entry) => isWithinRange(entry.occurredAt, start, end));
}

export function computeWeekBoundary({ year, isoWeek, weekStartsOn = 1 }) {
  const january4 = new Date(Date.UTC(year, 0, 4));
  const start = startOfWeek(new Date(january4.getTime() + (isoWeek - 1) * 7 * 24 * 60 * 60 * 1000), weekStartsOn);
  const end = endOfWeek(start, weekStartsOn);
  return { start, end };
}

export function energyLabel(energy) {
  return formatEnergy(energy);
}

export function toCSV(entries) {
  const headers = ['id', 'occurredAt', 'type', 'title', 'note', 'energy', 'durationMin', 'tags'];
  const rows = entries.map((entry) => (
    headers.map((key) => {
      const value = entry[key];
      if (Array.isArray(value)) {
        return `"${value.join('|')}"`;
      }
      if (value == null) return '""';
      const safe = String(value).replace(/"/g, '""');
      return `"${safe}"`;
    }).join(',')
  ));
  return [headers.join(','), ...rows].join('\n');
}

export function parseJSONFile(text) {
  return JSON.parse(text);
}

export function parseCSV(text) {
  const [headerLine, ...lines] = text.trim().split(/\r?\n/);
  const headers = headerLine.split(',').map((col) => col.replace(/"/g, ''));
  return lines.map((line) => {
    const cells = line.split(',').map((cell) => cell.replace(/"/g, ''));
    const entry = {};
    headers.forEach((key, index) => {
      entry[key] = cells[index];
    });
    entry.tags = entry.tags ? entry.tags.split('|').filter(Boolean) : [];
    entry.energy = Number(entry.energy);
    entry.durationMin = entry.durationMin ? Number(entry.durationMin) : undefined;
    return entry;
  });
}
