import { FileType, FileSystemNode } from '../types';

// 忽略的文件和文件夹列表
const IGNORED_NAMES = new Set(['.obsidian', '.git', '.trash', '.DS_Store', 'node_modules']);

/**
 * 打开目录选择器并开始解析 (Local Mode)
 */
export const openDirectory = async (): Promise<FileSystemNode> => {
  try {
    // @ts-ignore - File System Access API 类型可能不完整
    const dirHandle = await window.showDirectoryPicker();
    const rootNode = await scanDirectory(dirHandle, '');
    return rootNode;
  } catch (error) {
    console.error('无法打开目录:', error);
    throw error;
  }
};

/**
 * 加载 Mock 仓库 (Mock Mode)
 * 现在通过获取 vault/manifest.json 来模拟真实的文件系统结构
 */
export const openMockDirectory = async (): Promise<FileSystemNode> => {
  try {
    const response = await fetch('vault/manifest.json');
    if (!response.ok) {
      throw new Error(`Failed to load manifest: ${response.status} ${response.statusText}`);
    }
    const rootNode = await response.json();
    return rootNode;
  } catch (error) {
    console.error('Failed to load mock directory:', error);
    throw error;
  }
};

/**
 * 递归扫描目录
 */
const scanDirectory = async (dirHandle: any, currentPath: string): Promise<FileSystemNode> => {
  const children: FileSystemNode[] = [];

  for await (const entry of dirHandle.values()) {
    if (IGNORED_NAMES.has(entry.name) || entry.name.startsWith('.')) {
      continue;
    }

    const path = currentPath ? `${currentPath}/${entry.name}` : entry.name;
    
    if (entry.kind === 'directory') {
      const childDir = await scanDirectory(entry, path);
      children.push(childDir);
    } else if (entry.kind === 'file') {
      // 只显示 Markdown 文件
      if (entry.name.endsWith('.md')) {
        children.push({
          name: entry.name,
          kind: FileType.FILE,
          path,
          handle: entry,
        });
      }
    }
  }

  // 排序：文件夹在前，文件在后，按名称字母排序
  children.sort((a, b) => {
    if (a.kind === b.kind) {
      return a.name.localeCompare(b.name);
    }
    return a.kind === FileType.DIRECTORY ? -1 : 1;
  });

  return {
    name: dirHandle.name,
    kind: FileType.DIRECTORY,
    path: currentPath,
    handle: dirHandle,
    children,
    isOpen: false, // 默认折叠
  };
};

/**
 * 读取文件内容
 * 如果有 handle，使用 FileSystem API
 * 如果没有 handle，从 vault/ 目录 fetch
 */
export const readFileContent = async (node: FileSystemNode): Promise<string> => {
  if (node.handle) {
    // Local File System Access
    const file = await node.handle.getFile();
    return await file.text();
  } else {
    // Mock Mode: Fetch from static folder
    // 使用 encodeURI 处理路径中的空格和特殊字符
    const url = `vault/${node.path}`;
    try {
      const response = await fetch(encodeURI(url));
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.text();
    } catch (error) {
      console.error('Failed to fetch file:', url, error);
      throw error;
    }
  }
};
