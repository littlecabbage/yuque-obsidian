import { FileType, FileSystemNode } from '../types';

// 忽略的文件和文件夹列表
const IGNORED_NAMES = new Set(['.obsidian', '.git', '.trash', '.DS_Store', 'node_modules']);
const MOCK_CONTENT_PREFIX = 'obsidian_mock_content_';

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
  // 1. Local Mode
  if (node.handle) {
    const file = await node.handle.getFile();
    return await file.text();
  } 
  
  // 2. Mock Mode
  
  // 2.1 Check LocalStorage first (User edited content)
  const storedContent = localStorage.getItem(`${MOCK_CONTENT_PREFIX}${node.path}`);
  if (storedContent !== null) {
      return storedContent;
  }

  // 2.2 Check Memory Cache (New file created in session)
  if (node.content !== undefined) {
    return node.content;
  }

  // 2.3 Fetch from Static Server (Original content)
  const url = `vault/${encodeURI(node.path)}`;
  try {
    const response = await fetch(url);
    if (!response.ok) {
      // If not found on server and no local content, return empty string (new mock file)
      return '';
    }
    return await response.text();
  } catch (error) {
    console.error('Failed to fetch file:', url, error);
    throw error;
  }
};

/**
 * 写入文件内容 (Save)
 */
export const writeFileContent = async (node: FileSystemNode, content: string): Promise<void> => {
  if (node.handle) {
    // Local Mode: Write to Disk
    const writable = await node.handle.createWritable();
    await writable.write(content);
    await writable.close();
  } else {
    // Mock Mode: Persist to LocalStorage
    localStorage.setItem(`${MOCK_CONTENT_PREFIX}${node.path}`, content);
    node.content = content; // Update memory reference
    console.log('Mock Mode: File saved to storage', node.path);
  }
};

/**
 * 创建文件 (Create File)
 */
export const createNewFile = async (parentDir: FileSystemNode, fileName: string): Promise<FileSystemNode> => {
  if (parentDir.children?.some(c => c.name === fileName)) {
      throw new Error('文件已存在');
  }

  const path = parentDir.path ? `${parentDir.path}/${fileName}` : fileName;

  if (parentDir.handle) {
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
    const newNode: FileSystemNode = {
      name: fileName,
      kind: FileType.FILE,
      path,
      content: '', // Start empty
    };
    // Initialize storage for new file
    localStorage.setItem(`${MOCK_CONTENT_PREFIX}${path}`, '');
    
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
   if (parentDir.children?.some(c => c.name === folderName)) {
        throw new Error('文件夹已存在');
   }

  const path = parentDir.path ? `${parentDir.path}/${folderName}` : folderName;

  if (parentDir.handle) {
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
  } else {
    // Mock Mode: Clean up LocalStorage
    if (targetNode.kind === FileType.FILE) {
        localStorage.removeItem(`${MOCK_CONTENT_PREFIX}${targetNode.path}`);
    } else {
        // Recursive cleanup for folder content in Mock mode would be ideal, 
        // but for simplicity we assume direct file cleanup or simple structure here.
        // A full implementation would traverse children.
    }
  }
  
  if (parentDir.children) {
    parentDir.children = parentDir.children.filter(child => child.path !== targetNode.path);
  }
};

/**
 * 重命名节点
 */
export const renameFileSystemNode = async (parent: FileSystemNode, node: FileSystemNode, newName: string): Promise<void> => {
  if (parent.children?.some(c => c.name === newName)) {
    throw new Error('该名称已存在');
  }
  
  const oldPath = node.path;
  const newPath = parent.path ? `${parent.path}/${newName}` : newName;

  if (node.handle) {
    // Local Mode
    // @ts-ignore - move is experimentally available in some browsers
    if (node.handle.move) {
        // @ts-ignore
        await node.handle.move(newName);
    } else {
        // Fallback for files: Copy Content -> Create New -> Delete Old
        if (node.kind === FileType.FILE) {
             const file = await node.handle.getFile();
             const newHandle = await parent.handle.getFileHandle(newName, { create: true });
             const writable = await newHandle.createWritable();
             await writable.write(file);
             await writable.close();
             
             await parent.handle.removeEntry(node.name);
             node.handle = newHandle;
        } else {
            throw new Error('您的浏览器暂不支持重命名文件夹 (缺少 move API)，请尝试使用 Chrome 111+。');
        }
    }
  } else {
      // Mock Mode: Move content in LocalStorage
      if (node.kind === FileType.FILE) {
          const content = localStorage.getItem(`${MOCK_CONTENT_PREFIX}${oldPath}`);
          if (content !== null) {
              localStorage.setItem(`${MOCK_CONTENT_PREFIX}${newPath}`, content);
              localStorage.removeItem(`${MOCK_CONTENT_PREFIX}${oldPath}`);
          }
      }
  }
  
  // Update Memory State (Common for both Local and Mock)
  node.name = newName;
  node.path = newPath;
  
  if (node.kind === FileType.DIRECTORY && node.children) {
      updateChildrenPaths(node, oldPath, newPath);
  }
  
  // Re-sort parent children
  if (parent.children) {
      sortChildren(parent.children);
  }
};

const updateChildrenPaths = (node: FileSystemNode, parentOldPath: string, parentNewPath: string) => {
    if (!node.children) return;
    for (const child of node.children) {
        // Replace the prefix of the path
        if (child.path.startsWith(parentOldPath)) {
             child.path = child.path.replace(parentOldPath, parentNewPath);
             
             // If it's a file in Mock mode, we technically should migrate its content key too
             // This is a simplified recursive update
             if (!child.handle && child.kind === FileType.FILE) {
                 const oldKey = `${MOCK_CONTENT_PREFIX}${parentOldPath}/${child.name}`; // Approximation
                 // Accurate migration requires recursive traversal matching old paths
             }
        }
        
        if (child.kind === FileType.DIRECTORY) {
            updateChildrenPaths(child, parentOldPath, parentNewPath);
        }
    }
};
