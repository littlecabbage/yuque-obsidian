import React, { useState } from 'react';
import { X, Save, Settings } from 'lucide-react';
import { AppSettings } from '../types';

interface AdminConsoleProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSave: (newSettings: AppSettings) => void;
}

const AdminConsole: React.FC<AdminConsoleProps> = ({ isOpen, onClose, settings, onSave }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden border border-gray-100 transform transition-all scale-100">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div className="flex items-center space-x-2 text-gray-800">
            <Settings className="w-5 h-5 text-[#00b96b]" />
            <h2 className="text-lg font-bold">管理员控制台</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-1 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              附件默认存放路径
            </label>
            <p className="text-xs text-gray-500 mb-3">
              设置后，该文件夹将在左侧目录树中被隐藏，但依然可以通过双链引用其中的图片。
            </p>
            <input
              type="text"
              value={formData.attachmentPath}
              onChange={(e) => setFormData({ ...formData, attachmentPath: e.target.value })}
              placeholder="例如: FigureBed 🌄"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00b96b] focus:border-transparent outline-none transition-all text-sm"
            />
          </div>

          <div className="bg-blue-50 p-4 rounded-lg text-xs text-blue-700 leading-5">
            <strong>提示：</strong> 支持 Obsidian 风格的双链语法。
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>引用文章：<code>[[文章标题]]</code></li>
              <li>引用图片：<code>![[图片名称.png]]</code> (将从附件路径查找)</li>
            </ul>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center px-5 py-2.5 bg-[#00b96b] hover:bg-[#009456] text-white rounded-lg font-medium shadow-sm transition-colors text-sm"
          >
            <Save size={16} className="mr-2" />
            保存设置
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminConsole;
