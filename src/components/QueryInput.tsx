import { useState } from 'react';

interface QueryInputProps {
  onQuery: (queryKey: string) => void;
  disabled?: boolean;
}

export function QueryInput({ onQuery, disabled }: QueryInputProps) {
  const [queryKey, setQueryKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleQuery = () => {
    if (!queryKey.trim()) {
      setError('请输入指定数字后查询');
      return;
    }
    setError(null);
    onQuery(queryKey.trim());
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 支持 Enter 和 Ctrl+Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      handleQuery();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQueryKey(e.target.value);
    if (error) setError(null);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-600 mb-2 font-medium">指定数字查询：</div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={queryKey}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          className={`flex-1 px-3 py-2 border rounded text-sm focus:outline-none focus:border-blue-500 disabled:bg-gray-100 ${
            error ? 'border-red-400' : 'border-gray-300'
          }`}
          placeholder="请输入指定数字（支持数字/字母，区分大小写）"
        />
        <button
          onClick={handleQuery}
          disabled={disabled}
          className="px-6 py-2 bg-[#2C3E50] text-white text-sm rounded hover:bg-[#1a252f] transition-colors disabled:opacity-50"
        >
          查询
        </button>
      </div>
      {error && (
        <div className="mt-2 text-sm text-red-500">{error}</div>
      )}
    </div>
  );
}
