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
    // 检查权限
    const options = { mode: 'readwrite' };
    if ((await dirHandle.queryPermission(options)) !== 'granted') {
      if ((await dirHandle.requestPermission(options)) !== 'granted') {
         throw new Error('Permission denied');
      }
    }
    const rootNode = await scanDirectory(dirHandle, '');
    return rootNode;
  } catch (error) {
    console.error('无法打开目录:', error);
    throw error;
  }
};

/**
 * 加载 Mock 仓库 (Mock Mode)
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
      // 只显示 Markdown 文件 和 图片
      if (entry.name.endsWith('.md') || entry.name.match(/\.(png|jpg|jpeg|svg|gif)$/i)) {
        children.push({
          name: entry.name,
          kind: FileType.FILE,
          path,
          handle: entry,
        });
      }
    }
  }

  // 排序
  sortChildren(children);

  return {
    name: dirHandle.name,
    kind: FileType.DIRECTORY,
    path: currentPath,
    handle: dirHandle,
    children,
    isOpen: false, // 默认折叠
  };
};

const sortChildren = (children: FileSystemNode[]) => {
  children.sort((a, b) => {
    if (a.kind === b.kind) {
      return a.name.localeCompare(b.name);
    }
    return a.kind === FileType.DIRECTORY ? -1 : 1;
  });
};

/**
 * 读取文件内容
 */
export const readFileContent = async (node: FileSystemNode): Promise<string> => {
  if (node.content !== undefined) {
    // Return cached/modified content for Mock mode
    return node.content;
  }

  if (node.handle) {
    // Local File System Access
    const file = await node.handle.getFile();
    return await file.text();
  } else {
    // Mock Mode: Fetch from static folder
    const url = `vault/${encodeURI(node.path)}`;
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} (${url})`);
      }
      return await response.text();
    } catch (error) {
      console.error('Failed to fetch file:', url, error);
      throw error;
    }
  }
};

/**
 * 写入文件内容 (Save)
 */
export const writeFileContent = async (node: FileSystemNode, content: string): Promise<void> => {
  if (node.handle) {
    // Local Mode
    const writable = await node.handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    // Mock Mode: Update memory cache only
    node.content = content;
    console.log('Mock Mode: File saved to memory', node.path);
  }
};

/**
 * 创建文件 (Create File)
 */
export const createNewFile = async (parentDir: FileSystemNode, fileName: string): Promise<FileSystemNode> => {
  const path = parentDir.path ? `${parentDir.path}/${fileName}` : fileName;

  if (parentDir.handle) {
    // Local Mode
    const fileHandle = await parentDir.handle.getFileHandle(fileName, { create: true });
    const newNode: FileSystemNode = {
      name: fileName,
      kind: FileType.FILE,
      path,
      handle: fileHandle,
    };
    if (!parentDir.children) parentDir.children = [];
    parentDir.children.push(newNode);
    sortChildren(parentDir.children);
    return newNode;
  } else {
    // Mock Mode
    const newNode: FileSystemNode = {
      name: fileName,
      kind: FileType.FILE,
      path,
      content: '', // Start empty
    };
    if (!parentDir.children) parentDir.children = [];
    parentDir.children.push(newNode);
    sortChildren(parentDir.children);
    return newNode;
  }
};

/**
 * 创建文件夹 (Create Directory)
 */
export const createNewFolder = async (parentDir: FileSystemNode, folderName: string): Promise<FileSystemNode> => {
  const path = parentDir.path ? `${parentDir.path}/${folderName}` : folderName;

  if (parentDir.handle) {
    // Local Mode
    const dirHandle = await parentDir.handle.getDirectoryHandle(folderName, { create: true });
    const newNode: FileSystemNode = {
      name: folderName,
      kind: FileType.DIRECTORY,
      path,
      handle: dirHandle,
      children: [],
      isOpen: true
    };
    if (!parentDir.children) parentDir.children = [];
    parentDir.children.push(newNode);
    sortChildren(parentDir.children);
    return newNode;
  } else {
    // Mock Mode
    const newNode: FileSystemNode = {
      name: folderName,
      kind: FileType.DIRECTORY,
      path,
      children: [],
      isOpen: true
    };
    if (!parentDir.children) parentDir.children = [];
    parentDir.children.push(newNode);
    sortChildren(parentDir.children);
    return newNode;
  }
};

/**
 * 删除文件/文件夹
 */
export const deleteFileSystemNode = async (parentDir: FileSystemNode, targetNode: FileSystemNode): Promise<void> => {
  if (parentDir.handle) {
    // Local Mode
    await parentDir.handle.removeEntry(targetNode.name, { recursive: targetNode.kind === FileType.DIRECTORY });
  } 
  
  // Update Tree in Memory (both Mock and Local)
  if (parentDir.children) {
    parentDir.children = parentDir.children.filter(child => child.path !== targetNode.path);
  }
};
