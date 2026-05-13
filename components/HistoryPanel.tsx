import React, { useState, useEffect } from 'react';
import { ImageHistoryItem, getImageHistory } from '../services/apiService';
import { Language } from '../types';
import { t } from '../utils/i18n';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
  onSelectImage?: (image: ImageHistoryItem) => void;
  onReusePrompt?: (prompt: string) => void;
}

// 将存储的模型 ID（如 `fal-ai/nano-banana/edit`、`vertex/nano-banana-pro`）
// 转换成简洁可读的展示名，例如 “Nano Banana (Vertex, Edit)”。
const formatModelName = (raw: string | undefined | null): string => {
  if (!raw || typeof raw !== 'string') return '-';
  let id = raw.trim();
  if (!id) return '-';

  let source: 'fal' | 'vertex' | null = null;
  if (id.startsWith('vertex/')) {
    source = 'vertex';
    id = id.slice('vertex/'.length);
  } else if (id.startsWith('fal-ai/')) {
    source = 'fal';
    id = id.slice('fal-ai/'.length);
  }

  let isEdit = false;
  if (id.endsWith('/edit')) {
    isEdit = true;
    id = id.slice(0, -'/edit'.length);
  }

  const baseMap: Record<string, string> = {
    'nano-banana': 'Nano Banana',
    'nano-banana-pro': 'Nano Banana Pro',
    'nano-banana-2': 'Nano Banana 2',
    'gpt-image-1.5': 'GPT Image 1.5',
    'gpt-image-2': 'GPT Image 2',
  };
  const baseName = baseMap[id] || id;

  const tags: string[] = [];
  if (source === 'vertex') tags.push('Vertex');
  if (isEdit) tags.push('Edit');
  return tags.length > 0 ? `${baseName} (${tags.join(', ')})` : baseName;
};

const HistoryPanel: React.FC<HistoryPanelProps> = ({
  isOpen,
  onClose,
  lang,
  onSelectImage,
  onReusePrompt
}) => {
  const [images, setImages] = useState<ImageHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [onlyMine, setOnlyMine] = useState(false);
  const limit = 20;

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, page, onlyMine]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const result = await getImageHistory(page, limit, { onlyMine });
      setImages(result.images);
      setTotal(result.total);
    } catch (error) {
      console.error('Failed to load history:', error);
      alert('Failed to load history');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center gap-3 shrink-0">
          <h2 className="font-black text-white uppercase tracking-widest text-sm">
            {t(lang, 'history') || 'History'}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setOnlyMine((value) => !value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded text-xs font-bold border transition-colors ${
                onlyMine
                  ? 'bg-blue-600 border-blue-500 text-white hover:bg-blue-500'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white'
              }`}
              aria-pressed={onlyMine}
            >
              <i className={`fa-solid ${onlyMine ? 'fa-user-check' : 'fa-users'} mr-1.5`}></i>
              {onlyMine ? t(lang, 'historyShowAll') : t(lang, 'historyOnlyMine')}
            </button>
            <button onClick={onClose} className="text-slate-500 hover:text-white">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-t-transparent border-blue-500 rounded-full animate-spin"></div>
            </div>
          ) : images.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <i className="fa-solid fa-images text-4xl mb-4 opacity-50"></i>
              <p>{t(lang, 'noHistory') || 'No history yet'}</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map((image) => (
                <div
                  key={image.id}
                  className="bg-slate-800 rounded-lg overflow-hidden border border-slate-700 hover:border-blue-500 transition-all cursor-pointer group"
                  onClick={() => {
                    // 同时加载图片和提示词
                    onSelectImage?.(image);
                    if (onReusePrompt) {
                      onReusePrompt(image.prompt);
                    }
                  }}
                >
                  <div className="aspect-square relative overflow-hidden bg-slate-900">
                    <img
                      key={`${image.id}-${image.image_url}`}
                      src={`${image.thumbnail_url || image.image_url}?t=${Date.now()}`}
                      alt={image.prompt.substring(0, 20)}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      onError={(e) => {
                          console.error('Failed to load thumbnail:', image.thumbnail_url || image.image_url);
                          (e.target as HTMLImageElement).src = image.image_url;
                      }}
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                        {onReusePrompt && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // 只重新使用提示词，不加载图片
                              onReusePrompt(image.prompt);
                              onClose();
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded text-xs font-bold"
                            title={t(lang, 'reusePrompt') || 'Reuse Prompt Only'}
                          >
                            <i className="fa-solid fa-rotate-left mr-1"></i>
                            {t(lang, 'reusePrompt') || 'Reuse'}
                          </button>
                        )}
                        {onSelectImage && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // 只加载图片到画布，不重新使用提示词
                              onSelectImage(image);
                              onClose();
                            }}
                            className="bg-green-600 hover:bg-green-500 text-white px-3 py-1.5 rounded text-xs font-bold"
                            title="Load Image to Canvas"
                          >
                            <i className="fa-solid fa-image mr-1"></i>
                            Load
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="p-2">
                    <p className="text-xs text-slate-300 truncate mb-1" title={image.prompt}>
                      {image.prompt.substring(0, 30)}...
                    </p>
                    {typeof image.metadata?.generatedByDisplayName === 'string' &&
                      image.metadata.generatedByDisplayName.trim() !== '' && (
                        <p
                          className="text-[10px] text-slate-400 truncate mb-1"
                          title={image.metadata.generatedByDisplayName}
                        >
                          <span className="text-slate-500">{t(lang, 'historyGeneratedBy')}: </span>
                          {image.metadata.generatedByDisplayName.trim()}
                        </p>
                      )}
                    {image.model && (
                      <p
                        className="text-[10px] text-slate-400 truncate mb-1"
                        title={image.model}
                      >
                        <span className="text-slate-500">{t(lang, 'historyModel') || 'Model'}: </span>
                        {formatModelName(image.model)}
                      </p>
                    )}
                    <div className="flex justify-between items-center text-[10px] text-slate-500">
                      <span>${(typeof image.cost === 'number' ? image.cost : parseFloat(image.cost || '0')).toFixed(4)}</span>
                      <span>{new Date(image.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {total > limit && (
          <div className="p-4 border-t border-slate-800 flex justify-between items-center shrink-0">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white rounded"
            >
              Previous
            </button>
            <span className="text-sm text-slate-400">
              Page {page} of {Math.ceil(total / limit)}
            </span>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= Math.ceil(total / limit)}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm text-white rounded"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;

