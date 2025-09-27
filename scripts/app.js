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
const modalShell = document.getElementById('modalContainer');
const nav = document.getElementById('appNav');
const navToggle = document.getElementById('navToggle');
const addEntryBtn = document.getElementById('addEntryBtn');
const installButton = document.getElementById('installButton');
let deferredPrompt = null;

init();

function init() {
  if (modalShell) {
    modalShell.hidden = true;
    modalShell.innerHTML = '';
  }

  initState();
  setupNavigation();
  setupAddEntry();
  setupInstallPrompt();
  setupServiceWorker();

  on(EVENTS.TOAST, (message) => showToast(message));
  on(EVENTS.ROUTE_CHANGE, () => renderCurrentRoute());
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
        notify('蜈･蜉帙ｒ菫晏ｭ倥＠縺ｾ縺励◆');
        renderCurrentRoute();
      },
    });
  });
}

async function renderCurrentRoute() {
  forceCloseEntryModal();
  highlightActiveNav();
  const state = getState();
  const route = state.currentRoute ?? 'home';
  const renderer = views[route] ?? views.home;
  viewContainer.setAttribute('aria-busy', 'true');
  try {
    await renderer(viewContainer, state);
    viewContainer.scrollTop = 0;
  } catch (error) {
    console.error(error);
    viewContainer.innerHTML = '<p>逕ｻ髱｢縺ｮ謠冗判縺ｧ繧ｨ繝ｩ繝ｼ縺檎匱逕溘＠縺ｾ縺励◆縲・/p>';
  } finally {
    viewContainer.removeAttribute('aria-busy');
  }
}

function highlightActiveNav() {
  const state = getState();
  const current = state.currentRoute;
  const tabs = Array.from(document.querySelectorAll('#appNav .nav-item'));
  tabs.forEach((item) => {
    const active = item.dataset.route === current;
    item.classList.toggle('active', active);
    item.setAttribute('aria-selected', String(active));
    item.setAttribute('tabindex', active ? '0' : '-1');
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
      notify('繧､繝ｳ繧ｹ繝医・繝ｫ縺碁幕蟋九＆繧後∪縺励◆');
    }
    deferredPrompt = null;
    installButton.hidden = true;
  });
}

function setupServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      navigator.serviceWorker.register('./service-worker.js').then((reg) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          window.location.reload();
        });
      }).catch((error) => {
        console.error('ServiceWorker registration failed', error);
      });
    } catch (error) {
      console.error('ServiceWorker registration failed', error);
    }
  }
});
  }
}

// Keyboard navigation for tabs
(function setupTabNavigation(){
  const nav = document.getElementById('appNav');
  if (!nav) return;
  nav.addEventListener('keydown', (e) => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return;
    const tabs = Array.from(nav.querySelectorAll('.nav-item'));
    const currentEl = document.activeElement && document.activeElement.closest('.nav-item');
    const idx = tabs.indexOf(currentEl);
    if (idx === -1) return;
    e.preventDefault();
    let nextIdx = idx;
    if (e.key === 'ArrowRight') nextIdx = (idx + 1) % tabs.length;
    if (e.key === 'ArrowLeft') nextIdx = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === 'Home') nextIdx = 0;
    if (e.key === 'End') nextIdx = tabs.length - 1;
    tabs[nextIdx].focus();
  });
})();