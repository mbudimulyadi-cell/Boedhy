import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { LogicNode } from '../types/kuhp.ts';

interface LogicTreeViewProps {
  nodes: LogicNode[];
  title?: string;
}

function TreeNodeItem({ node, depth = 0 }: { node: LogicNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = Boolean(node.children && node.children.length > 0);

  const statusTone =
    node.statusSyarat === 'Pengecualian / Alasan Penghapus'
      ? 'text-amber-800 dark:text-amber-300'
      : node.statusSyarat === 'Alternatif'
      ? 'text-sky-800 dark:text-sky-300'
      : 'text-[#000080] dark:text-[#FFD700]';

  return (
    <li className="space-y-2">
      <div
        className={`rounded-lg border border-slate-200 bg-white px-4 py-3 transition-colors dark:border-slate-800 dark:bg-[#111830] ${
          depth > 0 ? 'ml-5 sm:ml-7' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            {hasChildren ? (
              <button
                type="button"
                onClick={() => setExpanded((prev) => !prev)}
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Tutup' : 'Buka'} cabang ${node.label}`}
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded border border-slate-200 text-slate-600 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-[#000080] dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              </button>
            ) : (
              <span
                aria-hidden="true"
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-slate-400 dark:bg-slate-500 ml-2 mr-1.5"
              />
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{node.label}</p>
              <p className="mt-1 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{node.kriteria}</p>
            </div>
          </div>
          <span className={`shrink-0 text-xs font-medium whitespace-nowrap ${statusTone}`}>
            {node.statusSyarat}
          </span>
        </div>
      </div>

      {hasChildren && expanded && (
        <ul className="space-y-2 border-l border-slate-200 pl-2 dark:border-slate-800">
          {node.children!.map((child) => (
            <TreeNodeItem key={child.id} node={child} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export function LogicTreeView({ nodes, title = 'Logika Pohon Pembuktian Unsur' }: LogicTreeViewProps) {
  if (!nodes || nodes.length === 0) return null;

  return (
    <section aria-label={title} className="space-y-3">
      <h4 className="font-display text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h4>
      <ul className="space-y-2.5">
        {nodes.map((node) => (
          <TreeNodeItem key={node.id} node={node} />
        ))}
      </ul>
    </section>
  );
}
