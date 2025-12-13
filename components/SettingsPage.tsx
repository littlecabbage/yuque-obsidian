import React, { useState } from 'react';
import { ArrowLeft, Save, Shield, HardDrive, Layout, Code } from 'lucide-react';
import { AppSettings } from '../types';

interface SettingsPageProps {
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
  onBack: () => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ settings, onSave, onBack }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [activeTab, setActiveTab] = useState<'general' | 'appearance' | 'advanced'>('general');

  const handleSave = () => {
    onSave(formData);
    // 这里可以添加保存成功的提示
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
          <SidebarItem id="appearance" icon={Layout} label="界面与显示" />
          <SidebarItem id="advanced" icon={Shield} label="权限与安全" />
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

          {activeTab === 'advanced' && (
             <div className="space-y-8">
               <div>
                  <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                    <Shield size={24} className="mr-2 text-[#00b96b]" />
                    权限控制
                  </h2>
                  <div className="bg-yellow-50 p-6 border border-yellow-100 rounded-xl shadow-sm">
                     <h3 className="text-yellow-800 font-medium mb-2">管理员权限</h3>
                     <p className="text-sm text-yellow-700 mb-4">
                       当前处于单机模式，默认拥有所有权限。接入后端服务后，此处将管理用户角色与 Vault 访问权限。
                     </p>
                     <div className="opacity-50 pointer-events-none">
                       <label className="flex items-center space-x-2 text-sm text-gray-600 mb-2">
                         <input type="checkbox" checked readOnly className="rounded text-[#00b96b]" />
                         <span>允许编辑文件</span>
                       </label>
                       <label className="flex items-center space-x-2 text-sm text-gray-600">
                         <input type="checkbox" checked readOnly className="rounded text-[#00b96b]" />
                         <span>允许删除文件</span>
                       </label>
                     </div>
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
