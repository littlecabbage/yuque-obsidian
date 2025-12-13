import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronDown, File, Folder, Search, Book, Settings } from 'lucide-react';
import { FileSystemNode, FileType } from '../types';

interface SidebarProps {
  rootNode: FileSystemNode | null;
  selectedFile: FileSystemNode | null;
  onSelectFile: (node: FileSystemNode) => void;
  onOpenSettings: () => void;
  hiddenPaths: string[]; // 新增：需要隐藏的路径列表
}

const Sidebar: React.FC<SidebarProps> = ({ rootNode, selectedFile, onSelectFile, onOpenSettings, hiddenPaths }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

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

  // 递归过滤搜索和隐藏路径
  const filterNodes = (nodes: FileSystemNode[]): FileSystemNode[] => {
    const result: FileSystemNode[] = [];
    
    for (const node of nodes) {
      // 检查是否在隐藏列表中 (匹配名称或完整路径)
      if (hiddenPaths.some(hidden => node.name === hidden || node.path === hidden)) {
        continue;
      }

      if (!searchTerm) {
        // 无搜索词时，递归处理子节点（为了过滤子节点中的隐藏项）
        let children = node.children;
        if (node.kind === FileType.DIRECTORY && node.children) {
            children = filterNodes(node.children);
        }
        
        result.push({
            ...node,
            children
        });
        continue;
      }

      // 有搜索词时的逻辑
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

  const renderTree = (nodes: FileSystemNode[], depth: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedPaths.has(node.path) || searchTerm.length > 0;
      const isSelected = selectedFile?.path === node.path;
      const paddingLeft = `${depth * 16 + 12}px`;

      if (node.kind === FileType.DIRECTORY) {
        return (
          <div key={node.path}>
            <div
              className={`flex items-center py-2 pr-4 cursor-pointer select-none text-sm text-[#585a5a] hover:bg-[#efefef] transition-colors rounded-r-full mr-2`}
              style={{ paddingLeft }}
              onClick={(e) => toggleFolder(node.path, e)}
            >
              <span className="mr-1 text-gray-400 shrink-0">
                {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </span>
              <Folder size={16} className="mr-2 text-gray-400 shrink-0 fill-gray-100" />
              <span className="truncate font-medium">{node.name}</span>
            </div>
            {isExpanded && node.children && (
              <div>{renderTree(node.children, depth + 1)}</div>
            )}
          </div>
        );
      } else {
        return (
          <div
            key={node.path}
            className={`flex items-center py-2 pr-4 cursor-pointer select-none text-sm transition-colors rounded-r-full mr-2 mb-0.5
              ${isSelected ? 'bg-[#e6f7ff] text-[#00b96b] font-medium' : 'text-[#585a5a] hover:bg-[#efefef]'}
            `}
            style={{ paddingLeft: `${depth * 16 + 28}px` }}
            onClick={() => onSelectFile(node)}
          >
            <span className="truncate">{node.name.replace('.md', '')}</span>
          </div>
        );
      }
    });
  };

  useEffect(() => {
      if (rootNode && expandedPaths.size === 0 && !searchTerm) {
          setExpandedPaths(new Set(['root']));
      }
  }, [rootNode]);

  if (!rootNode) return null;

  const displayNodes = filterNodes(rootNode.children || []);

  return (
    <div className="h-full flex flex-col bg-[#fafafa] border-r border-[#e9e9e9]">
      {/* 侧边栏头部 */}
      <div className="h-14 flex items-center px-4 border-b border-[#f0f0f0] shrink-0">
        <div className="flex items-center text-[#262626] font-semibold text-lg">
           <Book className="w-5 h-5 mr-2 text-[#00b96b]" />
           <span className="truncate w-48">{rootNode.name}</span>
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
          renderTree(displayNodes)
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
