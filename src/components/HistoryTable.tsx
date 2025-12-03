import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';

interface HistoryRecord {
  id: string;
  query_time: string;
  query_key: string;
  query_result: string | null;
  is_verified: boolean;
}

interface HistoryTableProps {
  history: HistoryRecord[];
  onRefresh: () => void;
}

export function HistoryTable({ history, onRefresh }: HistoryTableProps) {
  const handleClearHistory = async () => {
    const confirmed = await ask('确认清空所有历史记录？此操作不可撤销。', {
      title: '确认清空',
      kind: 'warning',
    });
    
    if (confirmed) {
      try {
        await invoke('clear_history');
        onRefresh();
      } catch (error) {
        console.error('清空历史失败:', error);
      }
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await invoke('delete_history_item', { id });
      onRefresh();
    } catch (error) {
      console.error('删除失败:', error);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm text-gray-800 font-bold">
          查询历史（最近 100 条）
        </div>
        <button
          onClick={handleClearHistory}
          disabled={history.length === 0}
          className="px-4 py-1.5 bg-[#E74C3C] text-white text-xs rounded hover:bg-[#c0392b] transition-colors disabled:opacity-50"
        >
          清空记录
        </button>
      </div>

      <div className="border border-gray-200 rounded overflow-hidden">
        <div className="max-h-[180px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#F5F5F5]">
              <tr className="border-b border-gray-200">
                <th className="py-2 px-3 text-left font-medium text-gray-600 w-40">查询时间</th>
                <th className="py-2 px-3 text-left font-medium text-gray-600 w-28">指定数字</th>
                <th className="py-2 px-3 text-left font-medium text-gray-600">查询结果</th>
                <th className="py-2 px-3 text-left font-medium text-gray-600 w-20">核销状态</th>
                <th className="py-2 px-3 text-center font-medium text-gray-600 w-20">操作</th>
              </tr>
            </thead>
            <tbody>
              {history.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    暂无查询记录
                  </td>
                </tr>
              ) : (
                history.map((item) => (
                  <tr key={item.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-3 text-gray-700">{item.query_time}</td>
                    <td className="py-2 px-3 text-gray-700">{item.query_key}</td>
                    <td className="py-2 px-3">
                      {item.query_result ? (
                        <a 
                          href={item.query_result} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-500 hover:underline truncate block max-w-[200px]"
                          title={item.query_result}
                        >
                          {item.query_result}
                        </a>
                      ) : (
                        <span className="text-red-500">未查询到数据</span>
                      )}
                    </td>
                    <td className="py-2 px-3">
                      <span className={item.is_verified ? 'text-[#27AE60]' : 'text-gray-500'}>
                        {item.is_verified ? '已核销' : '未核销'}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-center">
                      <button
                        onClick={() => handleDelete(item.id)}
                        className="px-3 py-1 bg-[#E74C3C] text-white text-xs rounded hover:bg-[#c0392b] transition-colors"
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
