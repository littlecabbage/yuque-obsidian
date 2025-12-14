import { VaultRecord } from '../types';

const STORAGE_KEY = 'obsidian_reader_vaults';

export const getVaultHistory = (): VaultRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to read vault history', e);
    return [];
  }
};

export const addOrUpdateVault = (vault: Omit<VaultRecord, 'handle'>) => {
  const history = getVaultHistory();
  const existingIndex = history.findIndex(v => v.id === vault.id);
  
  const record: VaultRecord = {
    ...vault,
    lastAccessed: Date.now(),
  };

  if (existingIndex >= 0) {
    history[existingIndex] = { ...history[existingIndex], ...record };
  } else {
    history.push(record as VaultRecord);
  }

  // Sort by recent
  history.sort((a, b) => b.lastAccessed - a.lastAccessed);
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  return history;
};

export const removeVaultFromHistory = (id: string) => {
  const history = getVaultHistory();
  const newHistory = history.filter(v => v.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newHistory));
  return newHistory;
};
