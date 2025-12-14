import React, { useState, useEffect } from 'react';
import { ArrowLeft, Save, Shield, HardDrive, Layout, Trash2, Archive } from 'lucide-react';
import { AppSettings, VaultRecord } from '../types';
import { getVaultHistory, removeVaultFromHistory } from '../services/vaultRegistry';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onBack: () => void;
  currentVaultId?: string;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onBack, currentVaultId }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'vaults'>('general');
  const [vaults, setVaults] = useState<VaultRecord[]>([]);

  useEffect(() => {
    setVaults(getVaultHistory());
  }, []);

  const handleSave = () => {
    onSave(formData);
  };

  const handleDeleteVault = (id: string) => {
    if (confirm('确定要从历史记录中删除此仓库记录吗？(不会删除本地文件)')) {
      const updated = removeVaultFromHistory(id);
      setVaults(updated);
    }
  };

  const SidebarItem = ({ id, icon: Icon, label }: { id: string, icon: any, label: string }) => (
    <button
      onClick={() => setActiveTab(id as any)}
      className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-colors mb-1
        ${activeTab === id ? 'bg-[#e6f7ff] text-[#00b96b]' : 'text-gray-600 hover:bg-gray-100'}
      `}
    >
      <Icon size={18} className="mr-3" />
      {label}
    </button>
  );

  return (
    <div className="flex flex-col h-full bg-white animate-fade-in">
      {/* 顶部导航 */}
      <div className="h-14 border-b border-gray-100 flex items-center px-4 bg-white shrink-0">
        <button 
          onClick={onBack}
          className="mr-4 p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold text-gray-800">设置中心</h1>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧设置菜单 */}
        <div className="w-64 border-r border-gray-100 p-4 bg-gray-50/50 hidden md:block">
          <div className="mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider px-4">系统管理</div>
          <SidebarItem id="general" icon={HardDrive} label="基础设置" />
          <SidebarItem id="vaults" icon={Archive} label="仓库管理" />
          <SidebarItem id="appearance" icon={Layout} label="界面与显示" />
        </div>

        {/* 右侧内容区 */}
        <div className="flex-1 overflow-y-auto p-8 max-w-3xl">
          {activeTab === 'general' && (
            <div className="space-y-8">
              <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                  <HardDrive size={24} className="mr-2 text-[#00b96b]" />
                  文件与附件
                </h2>
                <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm">
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    附件默认存放路径
                  </label>
                  <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                    设置图床或附件文件夹的相对路径。该文件夹将在左侧目录树中被隐藏，以保持文档列表整洁，但依然支持通过 Wiki Link 引用其中的资源。
                  </p>
                  <div className="flex gap-4">
                    <input
                      type="text"
                      value={formData.attachmentPath}
                      onChange={(e) => setFormData({ ...formData, attachmentPath: e.target.value })}
                      placeholder="例如: FigureBed 🌄"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00b96b] focus:border-transparent outline-none transition-all text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'vaults' && (
             <div className="space-y-8">
               <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Archive size={24} className="mr-2 text-[#00b96b]" />
                    仓库管理
                  </h2>
                  <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                     {vaults.length === 0 ? (
                       <div className="p-8 text-center text-gray-400">暂无历史记录</div>
                     ) : (
                       <ul className="divide-y divide-gray-100">
                         {vaults.map((vault) => (
                           <li key={vault.id} className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
                             <div>
                               <div className="flex items-center gap-2">
                                 <h3 className="font-medium text-gray-800">{vault.name}</h3>
                                 <span className={`text-[10px] px-1.5 py-0.5 rounded border ${vault.type === 'mock' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>
                                   {vault.type.toUpperCase()}
                                 </span>
                                 {vault.id === currentVaultId && (
                                   <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-50 text-green-600 border border-green-100">当前</span>
                                 )}
                               </div>
                               <p className="text-xs text-gray-400 mt-1">
                                 上次访问: {new Date(vault.lastAccessed).toLocaleString()}
                               </p>
                             </div>
                             {vault.id !== currentVaultId && (
                               <button 
                                 onClick={() => handleDeleteVault(vault.id)}
                                 className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                 title="删除记录"
                               >
                                 <Trash2 size={16} />
                               </button>
                             )}
                           </li>
                         ))}
                       </ul>
                     )}
                  </div>
                  <p className="text-xs text-gray-500 mt-3 px-1">
                    注：删除记录只会移除 Obsidian Reader 中的访问历史，不会删除您本地硬盘上的实际文件。
                  </p>
               </div>
             </div>
          )}

          {activeTab === 'appearance' && (
             <div className="space-y-8">
               <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Layout size={24} className="mr-2 text-[#00b96b]" />
                    界面定制
                  </h2>
                  <div className="bg-white p-6 border border-gray-200 rounded-xl shadow-sm text-center py-12">
                     <p className="text-gray-400">更多主题与外观设置开发中...</p>
                  </div>
               </div>
             </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="border-t border-gray-100 p-4 bg-white flex justify-end gap-3">
         <button
            onClick={onBack}
            className="px-5 py-2.5 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors text-sm"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center px-5 py-2.5 bg-[#00b96b] hover:bg-[#009456] text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <Save size={16} className="mr-2" />
            保存更改
          </button>
      </div>
    </div>
  );
};

export default SettingsPage;