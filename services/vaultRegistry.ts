import { VaultRecord, FileSystemNode } from '../types';

const STORAGE_KEY = 'obsidian_reader_vaults';
const MANIFEST_PREFIX = 'obsidian_reader_manifest_';

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
  
  // Also remove the associated manifest
  deleteVaultManifest(id);
  
  return newHistory;
};

// --- Manifest Management ---

/**
 * Helper to strip non-serializable fields (like handles) before saving to JSON
 */
const serializeNode = (node: FileSystemNode): FileSystemNode => {
  const { handle, ...rest } = node;
  const serialized: FileSystemNode = { ...rest };
  
  if (node.children) {
    serialized.children = node.children.map(serializeNode);
  }
  
  return serialized;
};

export const saveVaultManifest = (id: string, rootNode: FileSystemNode) => {
  try {
    const serializedRoot = serializeNode(rootNode);
    localStorage.setItem(`${MANIFEST_PREFIX}${id}`, JSON.stringify(serializedRoot));
    console.log(`[VaultRegistry] Manifest saved for ${id}`);
  } catch (e) {
    console.error(`[VaultRegistry] Failed to save manifest for ${id}`, e);
  }
};

export const getVaultManifest = (id: string): FileSystemNode | null => {
  try {
    const raw = localStorage.getItem(`${MANIFEST_PREFIX}${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error(`[VaultRegistry] Failed to get manifest for ${id}`, e);
    return null;
  }
};

export const deleteVaultManifest = (id: string) => {
  localStorage.removeItem(`${MANIFEST_PREFIX}${id}`);
};
