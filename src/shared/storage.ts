import type { Settings, MistakesStore } from './types';
import { saveImage, loadImage } from './imageStore'

const STORAGE_KEYS = {
  SETTINGS: 'settings',
  MISTAKES_V1: 'mistakes_v1',
} as const;

const DEFAULT_SETTINGS: Settings = {
  defaultSourceRegion: 'SH',
  arkApiKey: '',
  modelId: '',
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
        // fallback to localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS)
          if (raw) {
            const parsed = JSON.parse(raw)
            resolve({ ...DEFAULT_SETTINGS, ...parsed })
            return
          }
        } catch (e) {
          /* ignore */
        }
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      try {
        const fromStore = result[STORAGE_KEYS.SETTINGS]
        if (fromStore === undefined) {
          // fallback to localStorage if available
          const raw = localStorage.getItem(STORAGE_KEYS.SETTINGS)
          if (raw) {
            const parsed = JSON.parse(raw)
            resolve({ ...DEFAULT_SETTINGS, ...parsed })
            return
          }
        }
        resolve({ ...DEFAULT_SETTINGS, ...(fromStore ?? {}) });
      } catch (e) {
        resolve({ ...DEFAULT_SETTINGS })
      }
    });
  });
}

export async function saveSettings(settings: Settings): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings }, () => {
        if (chrome.runtime.lastError) {
          // fallback to localStorage
          try {
            localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
            resolve()
            return
          } catch (e) {
            reject(new Error(chrome.runtime.lastError.message))
            return
          }
        }
        resolve()
      })
    } catch (e) {
      // if chrome.storage API throws, fallback to localStorage
      try {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings))
        resolve()
      } catch (err) {
        reject(err instanceof Error ? err : new Error(String(err)))
      }
    }
  });
}

export async function loadMistakes(): Promise<MistakesStore> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.get(STORAGE_KEYS.MISTAKES_V1, (result) => {
      if (chrome.runtime.lastError) {
        // fallback to localStorage
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES_V1)
          if (raw) {
            const parsed = JSON.parse(raw) as MistakesStore
            if (parsed && parsed.schemaVersion === 1) {
              // attempt to populate images from IndexedDB before resolving
              const merged = { ...DEFAULT_MISTAKES, ...parsed }
              ;(async () => {
                try {
                  for (const id of Object.keys(merged.itemsById)) {
                    const it = merged.itemsById[id]
                    if (!it.imageDataUrl) {
                      try {
                        const img = await loadImage(id)
                        if (img) it.imageDataUrl = img
                      } catch (e) {
                        /* ignore image load errors */
                      }
                    }
                  }
                } finally {
                  resolve(merged)
                }
              })()
              return
            }
          }
        } catch (e) {
          /* ignore */
        }
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      try {
        const stored = result[STORAGE_KEYS.MISTAKES_V1] as MistakesStore | undefined;
        if (!stored || stored.schemaVersion !== 1) {
          // fallback to localStorage
          const raw = localStorage.getItem(STORAGE_KEYS.MISTAKES_V1)
          if (raw) {
            try {
              const parsed = JSON.parse(raw) as MistakesStore
              if (parsed && parsed.schemaVersion === 1) {
                const merged = { ...DEFAULT_MISTAKES, ...parsed }
                ;(async () => {
                  try {
                    for (const id of Object.keys(merged.itemsById)) {
                      const it = merged.itemsById[id]
                      if (!it.imageDataUrl) {
                        try {
                          const img = await loadImage(id)
                          if (img) it.imageDataUrl = img
                        } catch (e) {
                          /* ignore */
                        }
                      }
                    }
                  } finally {
                    resolve(merged)
                  }
                })()
                return
              }
            } catch {}
          }
          resolve({ ...DEFAULT_MISTAKES });
        } else {
          const merged = { ...DEFAULT_MISTAKES, ...stored }
          ;(async () => {
            try {
              for (const id of Object.keys(merged.itemsById)) {
                const it = merged.itemsById[id]
                if (!it.imageDataUrl) {
                  try {
                    const img = await loadImage(id)
                    if (img) it.imageDataUrl = img
                  } catch (e) {
                    /* ignore */
                  }
                }
              }
            } finally {
              resolve(merged)
            }
          })()
        }
      } catch (e) {
        resolve({ ...DEFAULT_MISTAKES })
      }
    });
  });
}

export async function saveMistakes(store: MistakesStore): Promise<void> {
  return new Promise((resolve, reject) => {
    (async () => {
      try {
        // Save images to IndexedDB separately and strip imageDataUrl before persisting
        const copy: MistakesStore = {
          ...store,
          itemsById: {},
        }
        for (const [id, item] of Object.entries(store.itemsById)) {
          // if there's an image, save it to imageStore and omit from the persisted object
          if (item.imageDataUrl) {
            try {
              await saveImage(id, item.imageDataUrl)
            } catch (e) {
              // ignore image save errors but continue
              console.warn('Failed to save image to IndexedDB for', id, e)
            }
          }
          const shallow = { ...item, imageDataUrl: '' }
          ;(copy.itemsById as any)[id] = shallow
        }

        chrome.storage.local.set({ [STORAGE_KEYS.MISTAKES_V1]: copy }, () => {
          if (chrome.runtime.lastError) {
            try {
              // fallback to localStorage (will store stripped images only)
              localStorage.setItem(STORAGE_KEYS.MISTAKES_V1, JSON.stringify(copy))
              resolve()
              return
            } catch (e) {
              reject(new Error(chrome.runtime.lastError.message))
              return
            }
          }
          resolve()
        })
      } catch (err) {
        try {
          // final fallback: store stripped copy into localStorage
          const copy2: MistakesStore = {
            ...store,
            itemsById: {},
          }
          for (const [id, item] of Object.entries(store.itemsById)) {
            ;(copy2.itemsById as any)[id] = { ...item, imageDataUrl: '' }
          }
          localStorage.setItem(STORAGE_KEYS.MISTAKES_V1, JSON.stringify(copy2))
          resolve()
        } catch (err2) {
          reject(err2 instanceof Error ? err2 : new Error(String(err2)))
        }
      }
    })()
  });
}
