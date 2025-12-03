import { useState } from 'react';
import { open } from '@tauri-apps/plugin-dialog';
import { invoke } from '@tauri-apps/api/core';

interface LoadResult {
  file_count: number;
  record_count: number;
  skipped_files: string[];
}

interface FolderSelectorProps {
  onDataLoaded: (result: LoadResult) => void;
}

export function FolderSelector({ onDataLoaded }: FolderSelectorProps) {
  const [folderPath, setFolderPath] = useState('');
  const [loadInfo, setLoadInfo] = useState<LoadResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectFolder = async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: '选择数据文件夹',
      });
      
      if (selected) {
        setFolderPath(selected as string);
        setError(null);
        // 自动加载数据
        await loadData(selected as string);
      }
    } catch (error) {
      console.error('选择文件夹失败:', error);
      setError('选择文件夹失败');
    }
  };

  const loadData = async (path: string) => {
    if (!path) {
      setError('请先选择文件夹');
      return;
    }
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await invoke<LoadResult>('load_data_folder', { folderPath: path });
      setLoadInfo(result);
      onDataLoaded(result);
      
      // 显示跳过的文件
      if (result.skipped_files.length > 0) {
        alert('部分文件加载失败:\n' + result.skipped_files.join('\n'));
      }
    } catch (error) {
      console.error('加载数据失败:', error);
      setError(String(error));
      setLoadInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReload = () => {
    if (folderPath) {
      loadData(folderPath);
    } else {
      setError('请先选择文件夹');
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-600 mb-2 font-medium">数据文件夹：</div>
      <div className="flex items-center gap-2 mb-3">
        <input
          type="text"
          value={folderPath}
          readOnly
          className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-white cursor-default"
          placeholder="请选择文件夹路径"
        />
        <button
          onClick={handleSelectFolder}
          disabled={loading}
          className="px-4 py-2 bg-[#4A90E2] text-white text-sm rounded hover:bg-[#3a7bc8] transition-colors whitespace-nowrap disabled:opacity-50"
        >
          选择文件夹
        </button>
      </div>
      <div className="flex items-center gap-4">
        <button
          onClick={handleReload}
          disabled={loading || !folderPath}
          className="px-4 py-2 bg-[#E0E0E0] text-gray-700 text-sm rounded hover:bg-[#d0d0d0] transition-colors disabled:opacity-50"
        >
          {loading ? '加载中...' : '重新加载'}
        </button>
        {error && (
          <span className="text-sm text-red-500">{error}</span>
        )}
        {!error && loadInfo && (
          <span className="text-sm text-gray-500">
            已加载: {loadInfo.file_count} 个文件（CSV/TXT/XLSX/XLS），{loadInfo.record_count.toLocaleString()} 条数据
          </span>
        )}
      </div>
    </div>
  );
}
