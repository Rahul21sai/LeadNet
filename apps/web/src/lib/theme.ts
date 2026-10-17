export type ThemePref = 'light' | 'dark' | 'system';

const KEY = 'leadnet.theme';

function readPref(): ThemePref {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}

function resolve(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function apply(pref: ThemePref) {
  document.documentElement.dataset.theme = resolve(pref);
}

export function initTheme() {
  apply(readPref());
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readPref() === 'system') apply('system');
  });
}

export function setTheme(pref: ThemePref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, pref);
  } catch {
    /* storage unavailable — still apply for this session */
  }
  apply(pref);
}

export function getTheme(): ThemePref {
  return readPref();
}
