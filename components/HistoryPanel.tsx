import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
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

const PAGE_SIZE_OPTIONS = [20, 40, 60] as const;

type PageToken = number | 'ellipsis';

function buildVisiblePages(current: number, totalPages: number): PageToken[] {
  if (totalPages <= 1) return [1];
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: PageToken[] = [1];
  const windowStart = Math.max(2, current - 1);
  const windowEnd = Math.min(totalPages - 1, current + 1);

  if (windowStart > 2) pages.push('ellipsis');
  for (let i = windowStart; i <= windowEnd; i++) pages.push(i);
  if (windowEnd < totalPages - 1) pages.push('ellipsis');
  if (totalPages > 1) pages.push(totalPages);

  return pages;
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
    'bytedance/seedream/v5/lite': 'Seedream 5 Lite',
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
  const [limit, setLimit] = useState<number>(PAGE_SIZE_OPTIONS[0]);
  const [total, setTotal] = useState(0);
  const [onlyMine, setOnlyMine] = useState(false);
  const [jumpInput, setJumpInput] = useState('');
  const listRef = useRef<HTMLDivElement>(null);

  const totalPages = Math.max(1, Math.ceil(total / limit));
  const visiblePages = useMemo(() => buildVisiblePages(page, totalPages), [page, totalPages]);

  const loadHistory = useCallback(async () => {
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
  }, [page, limit, onlyMine]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  }, [page, limit]);

  useEffect(() => {
    setJumpInput(String(page));
  }, [page]);

  const goToPage = (target: number) => {
    const next = Math.min(Math.max(1, target), totalPages);
    setPage(next);
    setJumpInput(String(next));
  };

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(jumpInput, 10);
    if (!Number.isNaN(parsed)) {
      goToPage(parsed);
    }
  };

  const rangeStart = total === 0 ? 0 : (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-5 border-b border-slate-800 flex justify-between items-center gap-3 shrink-0">
          <div>
            <h2 className="font-black text-white uppercase tracking-widest text-sm">
              {t(lang, 'history') || 'History'}
            </h2>
            {total > 0 && (
              <p className="text-[10px] text-slate-500 mt-1">
                {lang === 'zh'
                  ? `共 ${total} ${t(lang, 'historyTotalItems')} · 第 ${rangeStart}–${rangeEnd} 条`
                  : `${total} ${t(lang, 'historyTotalItems')} · showing ${rangeStart}–${rangeEnd}`}
              </p>
            )}
          </div>
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
        
        <div ref={listRef} className="flex-1 overflow-y-auto p-4 custom-scrollbar">
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

        {total > 0 && (
          <div className="p-3 md:p-4 border-t border-slate-800 shrink-0 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-slate-400">
                <span>{t(lang, 'historyPerPage')}</span>
                <select
                  value={limit}
                  onChange={(e) => {
                    setLimit(Number(e.target.value));
                    setPage(1);
                  }}
                  className="bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </label>

              <form onSubmit={handleJumpSubmit} className="flex items-center gap-2 text-xs text-slate-400">
                <span>{t(lang, 'historyJumpTo')}</span>
                <input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={jumpInput}
                  onChange={(e) => setJumpInput(e.target.value)}
                  placeholder={String(page)}
                  className="w-14 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-white text-xs text-center"
                />
                <span className="text-slate-500">/ {totalPages}</span>
                <button
                  type="submit"
                  className="px-2 py-1 rounded bg-slate-700 hover:bg-slate-600 text-white"
                >
                  OK
                </button>
              </form>
            </div>

            {totalPages > 1 && (
              <div className="flex flex-wrap items-center justify-center gap-1">
                <button
                  type="button"
                  onClick={() => goToPage(1)}
                  disabled={page === 1}
                  title={t(lang, 'historyFirst')}
                  className="min-w-[2rem] px-2 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                >
                  <i className="fa-solid fa-angles-left"></i>
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(page - 1)}
                  disabled={page === 1}
                  className="px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                >
                  {t(lang, 'historyPrev')}
                </button>

                {visiblePages.map((token, idx) =>
                  token === 'ellipsis' ? (
                    <span key={`ellipsis-${idx}`} className="px-1 text-slate-600 text-xs select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={token}
                      type="button"
                      onClick={() => goToPage(token)}
                      className={`min-w-[2rem] px-2 py-1.5 rounded text-xs font-mono transition-colors ${
                        token === page
                          ? 'bg-blue-600 text-white ring-1 ring-blue-400/50'
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                      }`}
                    >
                      {token}
                    </button>
                  )
                )}

                <button
                  type="button"
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= totalPages}
                  className="px-3 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                >
                  {t(lang, 'historyNext')}
                </button>
                <button
                  type="button"
                  onClick={() => goToPage(totalPages)}
                  disabled={page >= totalPages}
                  title={t(lang, 'historyLast')}
                  className="min-w-[2rem] px-2 py-1.5 rounded text-xs bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-300"
                >
                  <i className="fa-solid fa-angles-right"></i>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryPanel;
