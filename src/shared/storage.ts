import type { Settings, MistakesStore } from './types';

const STORAGE_KEYS = {
  SETTINGS: 'settings',
  MISTAKES_V1: 'mistakes_v1',
} as const;

const DEFAULT_SETTINGS: Settings = {
  bailianApiKey: '',
  bailianAppId: '',
  defaultSourceRegion: 'SH',
};

const DEFAULT_MISTAKES: MistakesStore = {
  schemaVersion: 1,
  itemsById: {},
  itemOrder: [],
  exportSelection: [],
};

export async function loadSettings(): Promise<Settings> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(STORAGE_KEYS.SETTINGS, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve({ ...DEFAULT_SETTINGS, ...(result[STORAGE_KEYS.SETTINGS] ?? {}) });
    });
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}

export async function loadMistakes(): Promise<MistakesStore> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(STORAGE_KEYS.MISTAKES_V1, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      const stored = result[STORAGE_KEYS.MISTAKES_V1] as MistakesStore | undefined;
      if (!stored || stored.schemaVersion !== 1) {
        resolve({ ...DEFAULT_MISTAKES });
      } else {
        resolve({ ...DEFAULT_MISTAKES, ...stored });
      }
    });
  });
}

export async function saveMistakes(store: MistakesStore): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [STORAGE_KEYS.MISTAKES_V1]: store }, () => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve();
    });
  });
}
