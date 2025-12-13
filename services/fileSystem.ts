import { FileType, FileSystemNode } from '../types';
import { getMockRoot, getMockFileContent } from './mockVault';

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
 */
export const openMockDirectory = async (): Promise<FileSystemNode> => {
  // 模拟异步加载延迟
  await new Promise(resolve => setTimeout(resolve, 600)); 
  return getMockRoot();
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
      // 只有非空目录或者我们确实想显示的目录才加进去
      // 这里简化处理，全部加入
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
 * 如果没有 handle，尝试使用 Mock 数据或 Fetch (未来扩展)
 */
export const readFileContent = async (node: FileSystemNode): Promise<string> => {
  if (node.handle) {
    // Local File System Access
    const file = await node.handle.getFile();
    return await file.text();
  } else {
    // Mock Mode
    return getMockFileContent(node.path);
    
    // Future Deployment Mode:
    // 如果部署在同一文件夹，逻辑将类似：
    // const response = await fetch(node.path);
    // return await response.text();
  }
};
