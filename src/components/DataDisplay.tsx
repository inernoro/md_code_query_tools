import { useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { invoke } from '@tauri-apps/api/core';
import { ask } from '@tauri-apps/plugin-dialog';

interface DataRecord {
  id: string;
  link: string;
  all_columns: string[];
  query_count: number;
  is_verified: boolean;
  verify_time: string | null;
}

interface DataDisplayProps {
  record: DataRecord | null;
  onVerify: (record: DataRecord) => void;
}

export function DataDisplay({ record, onVerify }: DataDisplayProps) {
  const qrRef = useRef<HTMLDivElement>(null);

  const handleCopy = async () => {
    if (record?.link) {
      try {
        await navigator.clipboard.writeText(record.link);
        alert('复制成功');
      } catch {
        const textArea = document.createElement('textarea');
        textArea.value = record.link;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        alert('复制成功');
      }
    }
  };

  const handleVerify = async () => {
    if (record && !record.is_verified) {
      // 二次确认弹窗
      const confirmed = await ask('是否确认核销？此操作不可撤销。', {
        title: '确认核销',
        kind: 'warning',
      });
      if (!confirmed) return;

      try {
        const updated = await invoke<DataRecord>('verify_record', { recordId: record.id });
        onVerify(updated);
      } catch (error) {
        console.error('核销失败:', error);
        alert('核销失败: ' + error);
      }
    }
  };

  // 保存二维码为PNG
  const handleSaveQRCode = useCallback(() => {
    if (!qrRef.current || !record?.link) return;

    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = 200;
      canvas.height = 200;
      ctx?.drawImage(img, 0, 0, 200, 200);
      
      const link = document.createElement('a');
      link.download = `qrcode_${record.id}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  }, [record]);

  // 右键菜单保存
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (record?.link) {
      handleSaveQRCode();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="text-sm text-gray-500 mb-3">数据</div>
      <div className="flex gap-6">
        {/* 二维码区域 - 200x200px */}
        <div 
          ref={qrRef}
          className="w-[200px] h-[200px] border border-gray-300 rounded flex items-center justify-center bg-gray-50/50 cursor-pointer"
          onContextMenu={handleContextMenu}
          title={record?.link ? '右键点击保存二维码' : ''}
        >
          {record?.link ? (
            <QRCodeSVG 
              value={record.link} 
              size={200}
              level="M"
              includeMargin={false}
            />
          ) : (
            <span className="text-gray-400 text-xs text-center px-2">
              无对应二维码
            </span>
          )}
        </div>

        {/* 数据信息区域 */}
        <div className="flex-1 space-y-4">
          {/* 关联链接 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20 shrink-0">关联链接：</span>
            <input
              type="text"
              value={record?.link || ''}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm bg-[#F5F5F5]"
              placeholder="--"
            />
            <button
              onClick={handleCopy}
              disabled={!record?.link}
              className="px-4 py-1.5 border border-gray-300 text-gray-700 text-sm rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
            >
              复制
            </button>
          </div>

          {/* 查询次数 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20 shrink-0">查询次数：</span>
            <span className="text-sm">
              {record ? (
                <>第 <span className="font-bold">{record.query_count}</span> 次查询</>
              ) : (
                '--'
              )}
            </span>
          </div>

          {/* 核销状态 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20 shrink-0">核销状态：</span>
            <span className={`text-sm ${record?.is_verified ? 'text-[#27AE60]' : 'text-gray-500'}`}>
              {record ? (record.is_verified ? '已核销' : '未核销') : '--'}
            </span>
          </div>

          {/* 核销时间 */}
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 w-20 shrink-0">核销时间：</span>
            <span className="text-sm text-gray-700">
              {record?.verify_time || '--'}
            </span>
          </div>

          {/* 确认核销按钮 - 绿色 */}
          <button
            onClick={handleVerify}
            disabled={!record || record.is_verified}
            className={`px-8 py-2 text-white text-sm rounded transition-colors ${
              record && !record.is_verified
                ? 'bg-[#27AE60] hover:bg-[#219a52]'
                : 'bg-gray-400 cursor-not-allowed'
            }`}
          >
            确认核销
          </button>
        </div>
      </div>
    </div>
  );
}
