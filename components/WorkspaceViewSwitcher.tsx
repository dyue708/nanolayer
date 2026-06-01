import React from 'react';
import { Language, WorkspaceViewMode } from '../types';
import { t } from '../utils/i18n';

interface WorkspaceViewSwitcherProps {
  viewMode: WorkspaceViewMode;
  onViewModeChange: (mode: WorkspaceViewMode) => void;
  lang: Language;
}

const WorkspaceViewSwitcher: React.FC<WorkspaceViewSwitcherProps> = ({
  viewMode,
  onViewModeChange,
  lang,
}) => {
  const baseBtn =
    'flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all';

  return (
    <div
      className="flex items-center rounded-xl border border-slate-600 bg-slate-900/95 backdrop-blur-md shadow-lg p-1 pointer-events-auto"
      role="tablist"
      aria-label={t(lang, 'workspaceViewSwitcherLabel')}
    >
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'canvas'}
        onClick={() => onViewModeChange('canvas')}
        className={`${baseBtn} ${
          viewMode === 'canvas'
            ? 'bg-blue-600 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
      >
        <i className="fa-solid fa-layer-group text-[10px]" />
        <span>{t(lang, 'workspaceViewCanvas')}</span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={viewMode === 'overview'}
        onClick={() => onViewModeChange('overview')}
        className={`${baseBtn} ${
          viewMode === 'overview'
            ? 'bg-amber-600 text-white shadow-md'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
        }`}
      >
        <i className="fa-solid fa-table-cells-large text-[10px]" />
        <span>{t(lang, 'workspaceViewOverview')}</span>
      </button>
    </div>
  );
};

export default WorkspaceViewSwitcher;
