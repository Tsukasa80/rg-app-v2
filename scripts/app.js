import { initState, onReady, setRoute, getState, on, EVENTS, notify } from './state.js';
import { renderHome } from './ui/home.js';
import { renderHistory } from './ui/history.js';
import { renderWeekly } from './ui/weekly.js';
import { renderDashboard } from './ui/dashboard.js';
import { renderSettings } from './ui/settings.js';
import { openEntryModal, forceCloseEntryModal } from './ui/entry-modal.js';
import { createEntry } from './data-service.js';
import { showToast, qsa } from './utils/dom.js';

const views = {
  home: renderHome,
  history: renderHistory,
  weekly: renderWeekly,
  dashboard: renderDashboard,
  settings: renderSettings,
};

const viewContainer = document.getElementById('viewContainer');
const nav = document.getElementById('appNav');
const navToggle = document.getElementById('navToggle');
const addEntryBtn = document.getElementById('addEntryBtn');
const installButton = document.getElementById('installButton');
let deferredPrompt = null;

init();

function init() {
  initState();
  setupNavigation();
  setupAddEntry();
  setupInstallPrompt();
  setupServiceWorker();

  on(EVENTS.TOAST, (message) => showToast(message));
  on(EVENTS.ROUTE_CHANGE, () => highlightActiveNav());
  on(EVENTS.DATA_CHANGE, () => renderCurrentRoute());
  on(EVENTS.FILTER_CHANGE, () => renderCurrentRoute());
  on(EVENTS.SETTINGS_CHANGE, () => renderCurrentRoute());

  onReady(() => {
    highlightActiveNav();
    renderCurrentRoute();
  });
}

function setupNavigation() {
  nav.addEventListener('click', (event) => {
    const button = event.target.closest('button[data-route]');
    if (!button) return;
    const route = button.dataset.route;
    setRoute(route);
    if (nav.classList.contains('open')) {
      nav.classList.remove('open');
    }
    renderCurrentRoute();
  });

  navToggle.addEventListener('click', () => {
    nav.classList.toggle('open');
  });
}

function setupAddEntry() {
  addEntryBtn.addEventListener('click', () => {
    openEntryModal({
      onSubmit: async (payload) => {
        await createEntry(payload, getState().settings);
        notify('入力を保存しました');
        renderCurrentRoute();
      },
    });
  });
}

async function renderCurrentRoute() {
  forceCloseEntryModal();
  const state = getState();
  const route = state.currentRoute ?? 'home';
  const renderer = views[route] ?? views.home;
  viewContainer.setAttribute('aria-busy', 'true');
  try {
    await renderer(viewContainer, state);
    viewContainer.scrollTop = 0;
  } catch (error) {
    console.error(error);
    viewContainer.innerHTML = '<p>画面の描画でエラーが発生しました。</p>';
  } finally {
    viewContainer.removeAttribute('aria-busy');
  }
}

function highlightActiveNav() {
  const state = getState();
  const current = state.currentRoute;
  qsa('.nav-item', nav).forEach((item) => {
    item.classList.toggle('active', item.dataset.route === current);
  });
}

function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault();
    deferredPrompt = event;
    installButton.hidden = false;
  });
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;
    if (choice.outcome === 'accepted') {
      notify('インストールが開始されました');
    }
    deferredPrompt = null;
    installButton.hidden = true;
  });
}

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.error('ServiceWorker registration failed', error);
    });
  }
}

