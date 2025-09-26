const DAY_MS = 24 * 60 * 60 * 1000;

export function toDate(value) {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  return new Date(value);
}

export function formatDate(value, locale = 'ja-JP') {
  return toDate(value).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
}

export function formatDateTime(value, locale = 'ja-JP') {
  return toDate(value).toLocaleString(locale, { year: 'numeric', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function formatTime(value, locale = 'ja-JP') {
  return toDate(value).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
}

export function toInputDateTimeLocal(value) {
  const date = toDate(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function parseDateFromInput(value) {
  if (!value) return new Date();
  const [datePart, timePart] = value.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour = 0, minute = 0] = timePart ? timePart.split(':').map(Number) : [0, 0];
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

export function getWeekYear(date, weekStartsOn = 1) {
  const target = startOfWeek(date, weekStartsOn);
  return target.getFullYear();
}

export function getWeekNumber(date, weekStartsOn = 1) {
  const firstDay = new Date(Date.UTC(date.getFullYear(), 0, 1));
  const firstWeekStart = startOfWeek(firstDay, weekStartsOn);
  const diff = startOfWeek(date, weekStartsOn) - firstWeekStart;
  return Math.floor(diff / DAY_MS / 7) + 1;
}

export function getWeekKey(date, weekStartsOn = 1) {
  const week = getWeekNumber(date, weekStartsOn);
  const year = getWeekYear(date, weekStartsOn);
  return `${year}-${String(week).padStart(2, '0')}`;
}

export function startOfWeek(value, weekStartsOn = 1) {
  const date = toDate(value);
  const day = date.getDay();
  const diff = (day < weekStartsOn ? 7 : 0) + day - weekStartsOn;
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - diff);
  return start;
}

export function endOfWeek(value, weekStartsOn = 1) {
  const start = startOfWeek(value, weekStartsOn);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

export function getWeekRange(year, week, weekStartsOn = 1) {
  const base = new Date(Date.UTC(year, 0, 1));
  const firstWeekStart = startOfWeek(base, weekStartsOn);
  const start = new Date(firstWeekStart.getTime() + (week - 1) * 7 * DAY_MS);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

export function isoWeekInfo(value) {
  const date = toDate(value);
  const tmp = new Date(date.getTime());
  tmp.setHours(0, 0, 0, 0);
  tmp.setDate(tmp.getDate() + 4 - (tmp.getDay() || 7));
  const yearStart = new Date(Date.UTC(tmp.getFullYear(), 0, 1));
  const week = Math.ceil(((tmp - yearStart) / DAY_MS + 1) / 7);
  return { year: tmp.getFullYear(), isoWeek: week };
}

export function diffInMinutes(a, b) {
  return Math.round((toDate(a) - toDate(b)) / (60 * 1000));
}

export function isWithinRange(value, start, end) {
  const time = toDate(value).getTime();
  return time >= start.getTime() && time <= end.getTime();
}

export function formatDuration(minutes) {
  if (!minutes || Number.isNaN(minutes)) return '-';
  if (minutes < 60) return `${minutes}分`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}時間${rest}分` : `${hours}時間`;
}

export function formatEnergy(energy) {
  const map = { '-2': '--', '-1': '-', '0': '0', '1': '+', '2': '++' };
  return map[String(energy)] ?? '0';
}
