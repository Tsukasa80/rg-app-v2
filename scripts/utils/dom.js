export function qs(selector, context = document) {
  return context.querySelector(selector);
}

export function qsa(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

export function createEl(tag, options = {}) {
  const el = document.createElement(tag);
  Object.entries(options).forEach(([key, value]) => {
    if (value == null) return;
    if (key === 'class') {
      el.className = value;
    } else if (key === 'text') {
      el.textContent = value;
    } else if (key === 'html') {
      el.innerHTML = value;
    } else if (key === 'dataset') {
      Object.assign(el.dataset, value);
    } else if (key === 'children') {
      value.forEach((child) => child && el.append(child));
    } else {
      el.setAttribute(key, value);
    }
  });
  return el;
}

export function clearChildren(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

export function renderTo(container, content) {
  clearChildren(container);
  if (Array.isArray(content)) {
    content.forEach((item) => container.append(item));
  } else if (content instanceof Node) {
    container.append(content);
  } else if (typeof content === 'string') {
    container.innerHTML = content;
  }
}

let toastContainer;

export function showToast(message, duration = 3000) {
  if (!toastContainer) {
    toastContainer = createEl('div', { class: 'toast-container' });
    document.body.append(toastContainer);
  }
  const toast = createEl('div', { class: 'toast', text: message });
  toastContainer.append(toast);
  setTimeout(() => {
    const remove = () => toast.remove();
    toast.classList.add('fade-out');
    toast.addEventListener('transitionend', remove, { once: true });
    setTimeout(remove, 500);
  }, duration);
}

export function trapFocus(modal) {
  const selectors = 'a[href], button, textarea, input, select, [tabindex]:not([tabindex="-1"])';
  const focusable = qsa(selectors, modal).filter((el) => !el.hasAttribute('disabled'));
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  modal.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab') return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  first.focus();
}
