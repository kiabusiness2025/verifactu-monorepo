'use client';

import { Download, X } from 'lucide-react';
import type { IsaakArtifact } from '@/app/lib/isaak-artifact';
import { ARTIFACT_ICON, ARTIFACT_LABEL } from '@/app/lib/isaak-artifact';
import IsaakArtifactChart from './IsaakArtifactChart';

export default function IsaakArtifactPanel({
  artifact,
  onClose,
}: {
  artifact: IsaakArtifact;
  onClose: () => void;
}) {
  const icon = ARTIFACT_ICON[artifact.type];
  const label = ARTIFACT_LABEL[artifact.type];

  return (
    <div className="flex h-full flex-col bg-white">
      {/* Header */}
      <div className="flex shrink-0 items-center gap-2.5 border-b border-slate-100 px-4 py-3">
        <span className="text-base">{icon}</span>
        <div className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-[13px] font-semibold text-slate-900">
            {artifact.title}
          </span>
          <span className="text-[11px] text-slate-400">{label}</span>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar panel"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {artifact.type === 'visual' ? (
          <VisualBody artifact={artifact} />
        ) : (
          <DownloadBody artifact={artifact} />
        )}
      </div>
    </div>
  );
}

function VisualBody({ artifact }: { artifact: IsaakArtifact }) {
  return (
    <div className="space-y-4">
      {/* Chart */}
      <IsaakArtifactChart artifact={artifact} />

      {/* Summary */}
      {artifact.summary && (
        <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3">
          <p className="text-[12px] text-blue-800 leading-relaxed">{artifact.summary}</p>
        </div>
      )}

      {/* Table */}
      {artifact.tableHeaders && artifact.tableRows && artifact.tableRows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="bg-slate-50">
                {artifact.tableHeaders.map((h, i) => (
                  <th
                    key={i}
                    className="px-3 py-2 text-left font-semibold text-slate-600 whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {artifact.tableRows.map((row, ri) => (
                <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-3 py-2 text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function DownloadBody({ artifact }: { artifact: IsaakArtifact }) {
  const icon = ARTIFACT_ICON[artifact.type];
  const label = ARTIFACT_LABEL[artifact.type];

  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 text-3xl">
        {icon}
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-slate-800">{artifact.title}</p>
        <p className="mt-0.5 text-[12px] text-slate-400">{label}</p>
      </div>
      {artifact.downloadUrl && (
        <a
          href={artifact.downloadUrl}
          download={artifact.filename ?? true}
          className="inline-flex items-center gap-2 rounded-xl bg-[#2361d8] px-5 py-2.5 text-[13px] font-semibold text-white shadow-sm transition hover:bg-[#1d55c2]"
        >
          <Download size={14} />
          Descargar {label}
        </a>
      )}
    </div>
  );
}
