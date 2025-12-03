import { useState, useEffect, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { TitleBar } from './components/TitleBar';
import { FolderSelector } from './components/FolderSelector';
import { QueryInput } from './components/QueryInput';
import { DataDisplay } from './components/DataDisplay';
import { HistoryTable } from './components/HistoryTable';
import type { DataRecord, HistoryRecord, QueryResult, LoadResult } from './types';

function App() {
  const [currentRecord, setCurrentRecord] = useState<DataRecord | null>(null);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isDataLoaded, setIsDataLoaded] = useState(false);

  const loadHistory = useCallback(async () => {
    try {
      const data = await invoke<HistoryRecord[]>('get_history');
      setHistory(data);
    } catch (error) {
      console.error('加载历史记录失败:', error);
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // 全局快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+S 保存二维码
      if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        if (currentRecord?.link) {
          saveQRCode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentRecord]);

  const saveQRCode = () => {
    const svg = document.querySelector('.qr-container svg');
    if (!svg || !currentRecord) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 200;
      canvas.height = 200;
      ctx?.drawImage(img, 0, 0, 200, 200);
      
      const link = document.createElement('a');
      link.download = `qrcode_${currentRecord.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const handleDataLoaded = (result: LoadResult) => {
    setIsDataLoaded(result.file_count > 0);
    setCurrentRecord(null);
  };

  const handleQuery = async (queryKey: string) => {
    try {
      const result = await invoke<QueryResult>('query_data', { queryKey });
      
      if (result.found && result.record) {
        setCurrentRecord(result.record);
        
        // 如果是重复数据，显示提示
        if (result.is_duplicate) {
          alert('注意：存在重复数据，返回第一条');
        }
      } else {
        setCurrentRecord(null);
        alert('未查询到数据');
      }
      loadHistory();
    } catch (error) {
      console.error('查询失败:', error);
      alert('查询失败: ' + error);
    }
  };

  const handleVerify = (record: DataRecord) => {
    setCurrentRecord(record);
    loadHistory();
  };

  return (
    <div className="h-screen flex flex-col bg-[#e8ecef]">
      <TitleBar />
      
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-4">
          {/* 上部区域：文件夹选择 + 查询输入 */}
          <div className="grid grid-cols-2 gap-4">
            <FolderSelector onDataLoaded={handleDataLoaded} />
            <QueryInput onQuery={handleQuery} disabled={!isDataLoaded} />
          </div>

          {/* 中部区域：数据展示 */}
          <div className={!isDataLoaded ? 'opacity-50 pointer-events-none' : ''}>
            <div className="qr-container">
              <DataDisplay record={currentRecord} onVerify={handleVerify} />
            </div>
          </div>

          {/* 下部区域：历史记录 */}
          <div className={!isDataLoaded ? 'opacity-50 pointer-events-none' : ''}>
          <HistoryTable 
            history={history} 
            onRefresh={loadHistory}
          />
          </div>
        </div>
      </div>

      {/* 底部提示 */}
      <div className="bg-yellow-50 border-t border-yellow-200 px-4 py-2">
        <div className="flex items-center gap-2 text-sm text-yellow-700">
          <svg className="w-4 h-4 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>快捷键：Enter 查询 | Ctrl+S 保存二维码 | 右键二维码可保存</span>
        </div>
      </div>
    </div>
  );
}

export default App;
