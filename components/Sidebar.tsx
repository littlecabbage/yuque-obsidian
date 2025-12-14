import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Search, Book, Settings, Plus, FilePlus, FolderPlus, Trash2, MoreVertical } from 'lucide-react';
import { FileSystemNode, FileType } from '../types';

interface SidebarProps {
  rootNode: FileSystemNode | null;
  selectedFile: FileSystemNode | null;
  onSelectFile: (node: FileSystemNode) => void;
  onOpenSettings: () => void;
  hiddenPaths: string[];
  onCreateFile: (parent: FileSystemNode, name: string) => Promise<void>;
  onCreateFolder: (parent: FileSystemNode, name: string) => Promise<void>;
  onDeleteNode: (parent: FileSystemNode, node: FileSystemNode) => Promise<void>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  rootNode, 
  selectedFile, 
  onSelectFile, 
  onOpenSettings, 
  hiddenPaths,
  onCreateFile,
  onCreateFolder,
  onDeleteNode
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  const [activeMenuPath, setActiveMenuPath] = useState<string | null>(null);

  const toggleFolder = (path: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleCreate = async (e: React.MouseEvent, parent: FileSystemNode, type: 'file' | 'folder') => {
    e.stopPropagation();
    setActiveMenuPath(null);
    const name = prompt(type === 'file' ? '输入文件名 (不需要 .md):' : '输入文件夹名:');
    if (!name) return;
    
    const finalName = type === 'file' && !name.endsWith('.md') ? `${name}.md` : name;
    
    try {
        if (type === 'file') {
            await onCreateFile(parent, finalName);
        } else {
            await onCreateFolder(parent, finalName);
            // Auto expand
            const newExpanded = new Set(expandedPaths);
            newExpanded.add(parent.path ? `${parent.path}/${finalName}` : finalName);
            setExpandedPaths(newExpanded);
        }
    } catch (err: any) {
        alert(err.message || '操作失败');
    }
  };

  const handleDelete = async (e: React.MouseEvent, parent: FileSystemNode, node: FileSystemNode) => {
      e.stopPropagation();
      setActiveMenuPath(null);
      if (confirm(`确定要删除 ${node.name} 吗? 此操作不可恢复。`)) {
          try {
            await onDeleteNode(parent, node);
          } catch(err: any) {
             alert(err.message || '删除失败');
          }
      }
  };

  // 递归过滤搜索和隐藏路径
  const filterNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
    const result: FileSystemNode[] = [];
    
    for (const node of nodes) {
      if (hiddenPaths.some(hidden => node.name === hidden || node.path === hidden)) {
        continue;
      }

      if (!searchTerm) {
        let children = node.children;
        if (node.kind === FileType.DIRECTORY && node.children) {
            children = filterNodes(node.children);
        }
        result.push({ ...node, children });
        continue;
      }

      if (node.kind === FileType.FILE) {
        if (node.name.toLowerCase().includes(searchTerm.toLowerCase())) {
          result.push(node);
        }
      } else if (node.kind === FileType.DIRECTORY && node.children) {
        const filteredChildren = filterNodes(node.children);
        if (node.name.toLowerCase().includes(searchTerm.toLowerCase()) || filteredChildren.length > 0) {
          result.push({
            ...node,
            children: filteredChildren,
          });
        }
      }
    }
    return result;
  };

  const renderContextMenu = (parent: FileSystemNode | null, node: FileSystemNode) => {
    if (activeMenuPath !== node.path) return null;

    return (
        <div className="absolute right-0 top-6 w-32 bg-white shadow-lg rounded-lg border border-gray-100 py-1 z-50 text-xs text-gray-700 animate-fade-in">
            {node.kind === FileType.DIRECTORY && (
                <>
                    <button 
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center"
                        onClick={(e) => handleCreate(e, node, 'file')}
                    >
                        <FilePlus size={12} className="mr-2 text-[#00b96b]"/> 新建笔记
                    </button>
                    <button 
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center"
                        onClick={(e) => handleCreate(e, node, 'folder')}
                    >
                        <FolderPlus size={12} className="mr-2 text-blue-500"/> 新建文件夹
                    </button>
                    <div className="h-px bg-gray-100 my-1"></div>
                </>
            )}
            {parent && (
                <button 
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 text-red-500 flex items-center"
                    onClick={(e) => handleDelete(e, parent, node)}
                >
                    <Trash2 size={12} className="mr-2"/> 删除
                </button>
            )}
        </div>
    );
  };

  const renderTree = (nodes: FileSystemNode[], parent: FileSystemNode | null = null, depth: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedPaths.has(node.path) || searchTerm.length > 0;
      const isSelected = selectedFile?.path === node.path;
      const paddingLeft = `${depth * 16 + 12}px`;

      if (node.kind === FileType.DIRECTORY) {
        return (
          <div key={node.path} className="relative group/row">
            <div
              className={`flex items-center py-2 pr-2 cursor-pointer select-none text-sm text-[#585a5a] hover:bg-[#efefef] transition-colors rounded-r-full mr-2`}
              style={{ paddingLeft }}
              onClick={(e) => toggleFolder(node.path, e)}
            >
              <span className="mr-1 text-gray-400 shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <Folder size={16} className="mr-2 text-gray-400 shrink-0 fill-gray-100" />
              <span className="truncate font-medium flex-1">{node.name}</span>
              
              <button 
                className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-400"
                onClick={(e) => { e.stopPropagation(); setActiveMenuPath(activeMenuPath === node.path ? null : node.path); }}
              >
                 <MoreVertical size={14} />
              </button>
            </div>
            {renderContextMenu(parent, node)}

            {isExpanded && node.children && (
              <div>{renderTree(node.children, node, depth + 1)}</div>
            )}
          </div>
        );
      } else {
        return (
          <div key={node.path} className="relative group/row">
             <div
                className={`flex items-center py-2 pr-2 cursor-pointer select-none text-sm transition-colors rounded-r-full mr-2 mb-0.5
                ${isSelected ? 'bg-[#e6f7ff] text-[#00b96b] font-medium' : 'text-[#585a5a] hover:bg-[#efefef]'}
                `}
                style={{ paddingLeft: `${depth * 16 + 28}px` }}
                onClick={() => onSelectFile(node)}
            >
                <span className="truncate flex-1">{node.name.replace('.md', '')}</span>
                <button 
                    className="opacity-0 group-hover/row:opacity-100 p-1 hover:bg-gray-200 rounded text-gray-400"
                    onClick={(e) => { e.stopPropagation(); setActiveMenuPath(activeMenuPath === node.path ? null : node.path); }}
                >
                    <MoreVertical size={14} />
                </button>
            </div>
            {renderContextMenu(parent, node)}
          </div>
        );
      }
    });
  };

  // Close menus when clicking outside
  useEffect(() => {
    const closeMenu = () => setActiveMenuPath(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // Update logic same as before...
  useEffect(() => {
    if (selectedFile) {
      const parts = selectedFile.path.split('/');
      parts.pop(); 
      const newExpanded = new Set(expandedPaths);
      let currentPath = '';
      let needsUpdate = false;
      parts.forEach((part, index) => {
        currentPath = index === 0 ? part : `${currentPath}/${part}`;
        if (!newExpanded.has(currentPath)) {
          newExpanded.add(currentPath);
          needsUpdate = true;
        }
      });
      if (needsUpdate) setExpandedPaths(newExpanded);
    }
  }, [selectedFile]);

  if (!rootNode) return null;

  const displayNodes = filterNodes(rootNode.children || []);

  return (
    <div className="h-full flex flex-col bg-[#fafafa] border-r border-[#e9e9e9]">
      {/* 侧边栏头部 */}
      <div className="h-14 flex items-center px-4 border-b border-[#f0f0f0] shrink-0 justify-between group">
        <div className="flex items-center text-[#262626] font-semibold text-lg overflow-hidden">
           <Book className="w-5 h-5 mr-2 text-[#00b96b] shrink-0" />
           <span className="truncate" title={rootNode.name}>{rootNode.name}</span>
        </div>
        <div className="relative">
             <button 
                onClick={(e) => { e.stopPropagation(); setActiveMenuPath(rootNode.path); }}
                className="p-1 hover:bg-gray-200 rounded text-gray-400"
                title="添加文件/文件夹"
             >
                <Plus size={18} />
             </button>
             {/* Root Menu */}
             {activeMenuPath === rootNode.path && (
                 <div className="absolute right-0 top-8 w-32 bg-white shadow-lg rounded-lg border border-gray-100 py-1 z-50 text-xs text-gray-700">
                    <button 
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center"
                        onClick={(e) => handleCreate(e, rootNode, 'file')}
                    >
                        <FilePlus size={12} className="mr-2 text-[#00b96b]"/> 新建笔记
                    </button>
                    <button 
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center"
                        onClick={(e) => handleCreate(e, rootNode, 'folder')}
                    >
                        <FolderPlus size={12} className="mr-2 text-blue-500"/> 新建文件夹
                    </button>
                 </div>
             )}
        </div>
      </div>

      {/* 搜索框 */}
      <div className="px-3 py-3 shrink-0">
        <div className="relative group">
          <input
            type="text"
            placeholder="搜索文档..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 text-sm bg-white border border-gray-200 rounded-md focus:outline-none focus:border-[#00b96b] focus:ring-1 focus:ring-[#00b96b] transition-all placeholder-gray-400 text-gray-700"
          />
          <Search className="absolute left-3 top-2.5 text-gray-400 group-focus-within:text-[#00b96b]" size={15} />
        </div>
      </div>

      {/* 文件树列表 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar py-2">
        {displayNodes.length > 0 ? (
          renderTree(displayNodes, rootNode)
        ) : (
           <div className="text-center text-gray-400 text-sm mt-8">
             没有找到相关文档
           </div>
        )}
      </div>
      
      {/* 底部信息与设置 */}
      <div className="p-3 border-t border-[#f0f0f0] shrink-0 flex items-center justify-between">
         <span className="text-xs text-gray-400 px-2">共 {displayNodes.length} 项</span>
         <button 
           onClick={onOpenSettings}
           className="p-2 text-gray-500 hover:bg-gray-200 rounded-md transition-colors"
           title="管理员控制台"
         >
           <Settings size={16} />
         </button>
      </div>
    </div>
  );
};

export default Sidebar;