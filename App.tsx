import React, { useState, useEffect } from 'react';
import { FolderOpen, Menu, X, Box } from 'lucide-react';
import Sidebar from './components/Sidebar';
import MarkdownViewer from './components/MarkdownViewer';
import SettingsPage from './components/SettingsPage';
import { 
  openDirectory, 
  openMockDirectory, 
  readFileContent, 
  writeFileContent, 
  createNewFile, 
  createNewFolder, 
  deleteFileSystemNode,
  renameFileSystemNode
} from './services/fileSystem';
import { addOrUpdateVault, saveVaultManifest, getVaultManifest } from './services/vaultRegistry';
import { FileSystemNode, FileType, AppSettings, VaultRecord } from './types';

const App: React.FC = () => {
  const [rootNode, setRootNode] = useState<FileSystemNode | null>(null);
  const [selectedFile, setSelectedFile] = useState<FileSystemNode | null>(null);
  const [fileContent, setFileContent] = useState<string>('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [currentVaultId, setCurrentVaultId] = useState<string | null>(null);
  
  // View State
  const [currentView, setCurrentView] = useState<'reader' | 'settings'>('reader');
  
  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    attachmentPath: 'Attachments' 
  });

  // Helper to sync manifest to local storage whenever rootNode changes
  const syncManifest = (id: string, root: FileSystemNode) => {
    saveVaultManifest(id, root);
  };

  const handleOpenDirectory = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const root = await openDirectory();
      setRootNode(root);
      setIsSidebarOpen(true);
      
      // Add to history
      const id = `local-${root.name}`;
      setCurrentVaultId(id);
      addOrUpdateVault({
        id,
        name: root.name,
        type: 'local',
        lastAccessed: Date.now()
      });
      
      // Automatically create/update manifest
      syncManifest(id, root);

    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setErrorMsg('无法打开文件夹，请确保浏览器支持 File System Access API (推荐使用 Chrome/Edge 且在 HTTPS 或 localhost 环境下运行)。');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenMock = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const id = 'mock-demo';
      
      // 1. Try to load from local storage first (Persist structure across reloads)
      const cachedManifest = getVaultManifest(id);
      
      let root: FileSystemNode;
      if (cachedManifest) {
          console.log('Loaded mock vault from local persistence');
          root = cachedManifest;
      } else {
          console.log('Loaded mock vault from static source');
          root = await openMockDirectory();
      }

      setRootNode(root);
      setIsSidebarOpen(true);
      setCurrentVaultId(id);
      
      addOrUpdateVault({
        id,
        name: root.name,
        type: 'mock',
        lastAccessed: Date.now()
      });

      // Update manifest (or re-save it)
      syncManifest(id, root);

      if (!cachedManifest && root.children && root.children.length > 0) {
        const welcomeFile = root.children.find(c => c.name === 'Welcome.md');
        if (welcomeFile) {
           handleSelectFile(welcomeFile);
        }
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('加载演示仓库失败，请检查 vault/manifest.json 是否存在。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectFile = async (node: FileSystemNode) => {
    setSelectedFile(node);
    setCurrentView('reader'); 
    try {
      const content = await readFileContent(node);
      setFileContent(content);
      if (window.innerWidth < 768) {
        setIsSidebarOpen(false);
      }
    } catch (err: any) {
      console.error('读取文件失败', err);
      setFileContent(`# Error\n\n读取文件内容失败。\n\n> **Technical Details:**\n> ${err.message || err}`);
    }
  };

  const handleSaveFile = async (newContent: string) => {
    if (!selectedFile) return;
    try {
      await writeFileContent(selectedFile, newContent);
      setFileContent(newContent);
      
      // Sync structure if needed (Mock mode might update internal content ref)
      if (!selectedFile.handle && currentVaultId && rootNode) {
         // Although content is in LS, we might want to trigger a sync just in case
         syncManifest(currentVaultId, rootNode);
      }

    } catch (err) {
      console.error('保存失败', err);
      alert('保存文件失败');
    }
  };

  const refreshRoot = () => {
      // Force React to re-render tree by creating a new reference
      // And sync manifest
      if (rootNode && currentVaultId) {
          const newRoot = { ...rootNode };
          setRootNode(newRoot);
          syncManifest(currentVaultId, newRoot);
      }
  };

  const handleCreateFile = async (parent: FileSystemNode, name: string) => {
    try {
      const newNode = await createNewFile(parent, name);
      refreshRoot();
      handleSelectFile(newNode);
    } catch (e: any) {
      console.error(e);
      alert('创建文件失败: ' + e.message);
    }
  };

  const handleCreateFolder = async (parent: FileSystemNode, name: string) => {
    try {
      await createNewFolder(parent, name);
      refreshRoot();
    } catch (e: any) {
      console.error(e);
      alert('创建文件夹失败: ' + e.message);
    }
  };

  const handleDeleteNode = async (parent: FileSystemNode, node: FileSystemNode) => {
    try {
       await deleteFileSystemNode(parent, node);
       if (selectedFile?.path === node.path) {
           setSelectedFile(null);
           setFileContent('');
       }
       refreshRoot();
    } catch (e: any) {
      console.error(e);
      alert('删除失败: ' + e.message);
    }
  };
  
  const handleRenameNode = async (parent: FileSystemNode, node: FileSystemNode, newName: string) => {
    try {
       await renameFileSystemNode(parent, node, newName);
       if (selectedFile?.path === node.path) {
           // Update selected file reference if we renamed the active file
           // Note: Path inside selectedFile must be updated, which is done by renameFileSystemNode modifying the object reference
           setSelectedFile({...node}); 
       }
       refreshRoot();
    } catch (e: any) {
       console.error(e);
       throw e; // Let sidebar handle alert
    }
  };

  // 递归查找文件节点
  const findNodeByName = (nodes: FileSystemNode[], targetName: string, isImage: boolean = false): FileSystemNode | null => {
    const normalize = (str: string) => str.toLowerCase().replace(/\\/g, '/');
    const target = normalize(targetName);
    
    for (const node of nodes) {
      if (node.kind === FileType.FILE) {
        const nodeName = normalize(node.name);
        const nodePath = normalize(node.path);
        
        // 1. 尝试完全匹配路径
        if (nodePath === target) return node;
        
        // 2. 如果是图片或双链引用，尝试匹配文件名
        if (isImage || !target.includes('/')) {
           if (nodeName === target) return node;
        }
        
        // 3. 尝试移除扩展名匹配 (for WikiLinks like [[Specs]])
        const cleanNodeName = nodeName.replace(/\.md$/, '');
        const cleanNodePath = nodePath.replace(/\.md$/, '');
        if (target.includes('/')) {
           if (cleanNodePath === target) return node;
        } else {
           if (cleanNodeName === target) return node;
        }
      }
      
      if (node.kind === FileType.DIRECTORY && node.children) {
        const found = findNodeByName(node.children, targetName, isImage);
        if (found) return found;
      }
    }
    return null;
  };

  const handleLinkClick = (href: string) => {
    if (!href.startsWith('wikilink:')) return;
    const rawTarget = href.replace('wikilink:', '');
    const targetName = decodeURIComponent(rawTarget);
    
    if (rootNode && rootNode.children) {
      const targetNode = findNodeByName(rootNode.children, targetName);
      if (targetNode) {
        handleSelectFile(targetNode);
      } else {
        alert(`未找到文档: ${targetName}`);
      }
    }
  };

  const handleResolveImage = async (imageName: string): Promise<string | null> => {
    if (!rootNode || !rootNode.children) return null;
    const targetName = decodeURIComponent(imageName);
    const targetNode = findNodeByName(rootNode.children, targetName, true);

    if (!targetNode) {
        console.warn(`Image node not found: ${targetName}`);
        return null;
    }

    try {
      if (targetNode.handle) {
        const file = await targetNode.handle.getFile();
        return URL.createObjectURL(file);
      } else {
        // Mock Mode Image
        if (targetNode.content) {
            // If we supported image uploads in mock mode, it would be base64 here
        }
        
        const cleanPath = targetNode.path.startsWith('/') ? targetNode.path.slice(1) : targetNode.path;
        const url = `vault/${encodeURI(cleanPath)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Image fetch failed: ${response.status}`);
        let blob = await response.blob();
        if (targetName.toLowerCase().endsWith('.svg') && !blob.type.includes('svg')) {
            blob = new Blob([blob], { type: 'image/svg+xml' });
        }
        return URL.createObjectURL(blob);
      }
    } catch (e) {
      console.error('加载图片失败', e);
      return null;
    }
  };

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsSidebarOpen(true);
      } else {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!rootNode) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-[#e6f7ff] text-[#00b96b] rounded-full flex items-center justify-center mx-auto mb-6">
             <FolderOpen size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Obsidian Reader</h1>
          <p className="text-gray-500 mb-8">
            打开你的本地 Obsidian 仓库 (Vault)，享受类似语雀的阅读体验。支持创建、编辑和管理笔记。
          </p>
          
          <div className="space-y-4">
            <button
              onClick={handleOpenDirectory}
              disabled={isLoading}
              className="w-full bg-[#00b96b] hover:bg-[#009456] text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-sm"
            >
              {isLoading ? '加载中...' : '打开本地仓库'}
            </button>
            
            <button
              onClick={handleOpenMock}
              disabled={isLoading}
              className="w-full bg-white hover:bg-gray-50 text-[#00b96b] font-medium py-3 px-6 rounded-lg border border-[#00b96b] transition-colors flex items-center justify-center gap-2"
            >
              <Box size={18} />
              {isLoading ? '加载中...' : '尝试演示仓库 (Mock)'}
            </button>
          </div>

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 text-red-600 text-sm rounded-md text-left">
              {errorMsg}
            </div>
          )}
          
          <div className="mt-8 text-xs text-gray-400 border-t pt-4">
            推荐使用 Chrome, Edge 或 Opera 浏览器以获得最佳兼容性。
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-white">
      {/* 移动端遮罩层 */}
      {isSidebarOpen && window.innerWidth < 768 && (
        <div 
          className="fixed inset-0 bg-black/20 z-20"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <div 
        className={`fixed md:relative z-30 h-full w-[280px] shrink-0 transition-transform duration-300 ease-in-out transform bg-[#fafafa] border-r border-[#e9e9e9]
          ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
          ${!isSidebarOpen && 'md:hidden'}
        `}
      >
        <Sidebar 
          rootNode={rootNode} 
          selectedFile={selectedFile} 
          onSelectFile={handleSelectFile}
          onOpenSettings={() => setCurrentView('settings')}
          hiddenPaths={settings.attachmentPath ? [settings.attachmentPath] : []}
          onCreateFile={handleCreateFile}
          onCreateFolder={handleCreateFolder}
          onDeleteNode={handleDeleteNode}
          onRenameNode={handleRenameNode}
        />
      </div>

      {/* 主内容区域 */}
      <div className="flex-1 flex flex-col h-full min-w-0 bg-white relative">
        <div className="h-14 border-b border-gray-100 flex items-center px-4 shrink-0 md:hidden">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-md"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <span className="ml-2 font-medium text-gray-700 truncate">
              {selectedFile ? selectedFile.name.replace('.md', '') : 'Obsidian Reader'}
            </span>
        </div>

        {currentView === 'settings' ? (
          <SettingsPage 
            settings={settings}
            onSave={(newSettings) => {
              setSettings(newSettings);
              setCurrentView('reader');
            }}
            onBack={() => setCurrentView('reader')}
            currentVaultId={currentVaultId || undefined}
          />
        ) : (
          <MarkdownViewer 
             content={fileContent} 
             fileName={selectedFile?.name || ''} 
             onLinkClick={handleLinkClick}
             onResolveImage={handleResolveImage}
             onSave={handleSaveFile}
             isEditable={!!selectedFile && selectedFile.kind === FileType.FILE}
           />
        )}
      </div>
    </div>
  );
};

export default App;