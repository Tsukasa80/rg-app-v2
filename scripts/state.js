const SETTINGS_KEY = 'rgx-settings-v1';

const defaultSettings = {
  weekStartsOn: 1,
  locale: 'ja-JP',
  enableNotifications: false,
  enableWeeklyReminder: false,
};

const state = {
  ready: false,
  currentRoute: 'home',
  settings: { ...defaultSettings },
  filters: {
    type: 'ALL',
    energy: 'ALL',
    tags: [],
    range: '7',
    search: '',
  },
};

const listeners = new Map();

function emit(event, payload) {
  const subs = listeners.get(event);
  if (!subs) return;
  subs.forEach((handler) => handler(payload));
}

export function on(event, handler) {
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event).add(handler);
  return () => listeners.get(event)?.delete(handler);
}

export function initState() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      state.settings = { ...defaultSettings, ...parsed };
    } catch (err) {
      console.warn('設定の読み込みに失敗しました', err);
    }
  }
  state.ready = true;
  emit('state:ready', state);
  return state;
}

export function getState() {
  return state;
}

export function setRoute(route) {
  if (state.currentRoute === route) return;
  state.currentRoute = route;
  emit('route:change', route);
}

export function updateSettings(next) {
  state.settings = { ...state.settings, ...next };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings));
  emit('settings:change', state.settings);
  return state.settings;
}

export function updateFilters(next) {
  state.filters = { ...state.filters, ...next };
  emit('filters:change', state.filters);
  return state.filters;
}

export function resetFilters() {
  state.filters = {
    type: 'ALL',
    energy: 'ALL',
    tags: [],
    range: '7',
    search: '',
  };
  emit('filters:change', state.filters);
}

export function onReady(handler) {
  if (state.ready) {
    handler(state);
  } else {
    on('state:ready', handler);
  }
}

export const EVENTS = {
  ROUTE_CHANGE: 'route:change',
  FILTER_CHANGE: 'filters:change',
  SETTINGS_CHANGE: 'settings:change',
  DATA_CHANGE: 'data:change',
  TOAST: 'toast',
};

export function notify(message) {
  emit(EVENTS.TOAST, message);
}

export function emitDataChange(payload) {
  emit(EVENTS.DATA_CHANGE, payload);
}
