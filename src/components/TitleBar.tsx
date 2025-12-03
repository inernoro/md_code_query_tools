import { useState, useEffect } from 'react';
import { getCurrentWindow } from '@tauri-apps/api/window';
import { getVersion } from '@tauri-apps/api/app';

export function TitleBar() {
  const appWindow = getCurrentWindow();
  const [version, setVersion] = useState('');

  useEffect(() => {
    getVersion().then(v => setVersion(v));
  }, []);

  const handleMinimize = () => {
    appWindow.minimize();
  };

  const handleMaximize = async () => {
    const isMaximized = await appWindow.isMaximized();
    if (isMaximized) {
      appWindow.unmaximize();
    } else {
      appWindow.maximize();
    }
  };

  const handleClose = () => {
    appWindow.close();
  };

  // 双击标题栏最大化/还原
  const handleDoubleClick = () => {
    handleMaximize();
  };

  // 拖动窗口
  const handleMouseDown = async (e: React.MouseEvent) => {
    // 只在标题栏区域（非按钮）触发拖动
    if ((e.target as HTMLElement).closest('button')) return;
    if (e.buttons === 1) {
      await appWindow.startDragging();
    }
  };

  return (
    <div 
      className="h-9 bg-gradient-to-r from-slate-500 to-slate-600 flex items-center justify-between px-3 select-none shadow-sm cursor-default"
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
    >
      <div className="flex items-center gap-2">
        <span className="text-white font-medium text-sm tracking-wide">
          数据查询与二维码生成工具 {version ? `V${version}` : ''}
        </span>
      </div>
      
      <div className="flex items-center gap-1">
        <button
          onClick={handleMinimize}
          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="最小化"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>
        <button
          onClick={handleMaximize}
          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors"
          title="最大化"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="5" y="5" width="14" height="14" rx="1" strokeWidth={2} />
          </svg>
        </button>
        <button
          onClick={handleClose}
          className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-white hover:bg-red-500 rounded transition-colors"
          title="关闭"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

