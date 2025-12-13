export enum FileType {
  FILE = 'file',
  DIRECTORY = 'directory',
}

export interface FileSystemNode {
  name: string;
  kind: FileType;
  path: string; // 相对路径
  handle?: any; // 浏览器原生句柄 (可选，Mock模式或静态托管下为空)
  children?: FileSystemNode[];
  isOpen?: boolean; // 文件夹是否展开（UI状态）
}

export interface Breadcrumb {
  name: string;
  path: string;
}

export interface AppSettings {
  attachmentPath: string;
}
