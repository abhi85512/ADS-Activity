import React from 'react';
import { RetrievalMetrics } from '../lib/ragEngine';
import { AblationRow, SummaryMetricsRow } from '../lib/deliverablesGenerator';

export function RetrievalBarChart({
  data,
}: {
  data: Record<'tfidf' | 'dense' | 'hybrid', RetrievalMetrics>;
}) {
  const retrievers: Array<{ key: 'tfidf' | 'dense' | 'hybrid'; label: string }> = [
    { key: 'tfidf', label: 'TF-IDF Baseline' },
    { key: 'dense', label: 'Dense Vector' },
    { key: 'hybrid', label: 'Hybrid RRF' },
  ];
  const metrics: Array<{ key: keyof RetrievalMetrics; label: string; color: string }> = [
    { key: 'hit@1', label: 'Hit@1', color: '#475569' },
    { key: 'hit@3', label: 'Hit@3', color: '#2563eb' },
    { key: 'hit@5', label: 'Hit@5', color: '#0f766e' },
    { key: 'MRR', label: 'MRR', color: '#0f172a' },
  ];

  const width = 560;
  const height = 240;
  const padL = 44;
  const padR = 16;
  const padT = 20;
  const padB = 42;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const groupW = plotW / retrievers.length;
  const barW = 24;
  const barGap = 6;

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Retrieval metrics comparison bar chart">
        {[0, 0.25, 0.5, 0.75, 1.0].map((tick) => {
          const y = padT + plotH * (1 - tick);
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono tabular-nums">
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}
        {retrievers.map((ret, gIdx) => {
          const groupCenter = padL + groupW * gIdx + groupW / 2;
          const totalBarsW = metrics.length * barW + (metrics.length - 1) * barGap;
          const startX = groupCenter - totalBarsW / 2;
          return (
            <g key={ret.key}>
              {metrics.map((m, mIdx) => {
                const val = data[ret.key][m.key];
                const barH = Math.max(2, val * plotH);
                const x = startX + mIdx * (barW + barGap);
                const y = padT + plotH - barH;
                return (
                  <g key={m.key}>
                    <rect x={x} y={y} width={barW} height={barH} rx={2} fill={m.color} />
                    <text
                      x={x + barW / 2}
                      y={y - 5}
                      textAnchor="middle"
                      className="fill-slate-700 text-[9px] font-mono tabular-nums"
                    >
                      {val.toFixed(2)}
                    </text>
                  </g>
                );
              })}
              <text
                x={groupCenter}
                y={height - 14}
                textAnchor="middle"
                className="fill-slate-800 text-[11px] font-medium"
              >
                {ret.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-5 mt-2 text-xs text-slate-600">
        {metrics.map((m) => (
          <span key={m.key} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 inline-block rounded-xs" style={{ backgroundColor: m.color }} />
            <span>{m.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function AblationLineChart({ rows }: { rows: AblationRow[] }) {
  const sizes = Array.from(new Set(rows.map((r) => r.chunkWords))).sort((a, b) => a - b);
  const series: Array<{ key: 'tfidf' | 'dense' | 'hybrid'; label: string; color: string }> = [
    { key: 'tfidf', label: 'TF-IDF Hit@3', color: '#64748b' },
    { key: 'dense', label: 'Dense Hit@3', color: '#2563eb' },
    { key: 'hybrid', label: 'Hybrid RRF Hit@3', color: '#0f766e' },
  ];

  const width = 560;
  const height = 240;
  const padL = 44;
  const padR = 24;
  const padT = 22;
  const padB = 42;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const minY = 0.6;
  const maxY = 1.0;

  const getX = (idx: number) =>
    sizes.length <= 1 ? padL + plotW / 2 : padL + (idx / (sizes.length - 1)) * plotW;
  const getY = (val: number) => {
    const clamped = Math.max(minY, Math.min(maxY, val));
    return padT + plotH * (1 - (clamped - minY) / (maxY - minY));
  };

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Chunk size ablation chart">
        {[0.6, 0.7, 0.8, 0.9, 1.0].map((tick) => {
          const y = getY(tick);
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono tabular-nums">
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}

        {sizes.map((sz, idx) => (
          <text
            key={sz}
            x={getX(idx)}
            y={height - 14}
            textAnchor="middle"
            className="fill-slate-700 text-[11px] font-mono tabular-nums"
          >
            {sz}w
          </text>
        ))}

        {series.map((s) => {
          const pts = sizes.map((sz, idx) => {
            const match = rows.find((r) => r.chunkWords === sz && r.retriever === s.key);
            const val = match ? match['hit@3'] : 0.75;
            return { x: getX(idx), y: getY(val), val };
          });
          const pathD = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
          return (
            <g key={s.key}>
              <path d={pathD} fill="none" stroke={s.color} strokeWidth="2.2" />
              {pts.map((p, i) => (
                <g key={i}>
                  <circle cx={p.x} cy={p.y} r={4} fill="#ffffff" stroke={s.color} strokeWidth="2" />
                  <text
                    x={p.x}
                    y={p.y - 8}
                    textAnchor="middle"
                    className="fill-slate-700 text-[9px] font-mono tabular-nums"
                  >
                    {p.val.toFixed(2)}
                  </text>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center justify-center gap-5 mt-2 text-xs text-slate-600">
        {series.map((s) => (
          <span key={s.key} className="inline-flex items-center gap-1.5">
            <span className="w-3 h-0.5 inline-block" style={{ backgroundColor: s.color }} />
            <span>{s.label}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export function FaithfulnessVsHallucinationChart({ rows }: { rows: SummaryMetricsRow[] }) {
  const width = 560;
  const height = 240;
  const padL = 44;
  const padR = 16;
  const padT = 20;
  const padB = 46;
  const plotW = width - padL - padR;
  const plotH = height - padT - padB;
  const groupW = plotW / Math.max(1, rows.length);
  const barW = 26;
  const barGap = 8;

  const labels: Record<string, string> = {
    closed_book: 'Closed-Book',
    rag_naive: 'Naive RAG',
    rag_engineered: 'Engineered',
    'rag_eng+guardrails': 'Eng + Guardrails',
  };

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="Faithfulness vs Hallucination comparison">
        {[0, 0.25, 0.5, 0.75, 1.0].map((tick) => {
          const y = padT + plotH * (1 - tick);
          return (
            <g key={tick}>
              <line x1={padL} x2={width - padR} y1={y} y2={y} stroke="#e2e8f0" strokeWidth="1" />
              <text x={padL - 8} y={y + 4} textAnchor="end" className="fill-slate-500 text-[10px] font-mono tabular-nums">
                {tick.toFixed(2)}
              </text>
            </g>
          );
        })}

        {rows.map((row, idx) => {
          const center = padL + groupW * idx + groupW / 2;
          const faith = row.faithfulness ?? 0;
          const hall = row.hallucinationRate ?? 0;
          const x1 = center - barW - barGap / 2;
          const x2 = center + barGap / 2;
          const h1 = faith * plotH;
          const h2 = hall * plotH;
          return (
            <g key={row.config}>
              {row.faithfulness !== null ? (
                <>
                  <rect x={x1} y={padT + plotH - h1} width={barW} height={Math.max(2, h1)} rx={2} fill="#0f766e" />
                  <text x={x1 + barW / 2} y={padT + plotH - h1 - 5} textAnchor="middle" className="fill-slate-700 text-[9px] font-mono tabular-nums">
                    {faith.toFixed(2)}
                  </text>
                </>
              ) : (
                <text x={x1 + barW / 2} y={padT + plotH - 6} textAnchor="middle" className="fill-slate-400 text-[9px] font-mono">
                  N/A
                </text>
              )}

              <rect x={x2} y={padT + plotH - h2} width={barW} height={Math.max(2, h2)} rx={2} fill="#dc2626" />
              <text x={x2 + barW / 2} y={padT + plotH - h2 - 5} textAnchor="middle" className="fill-slate-700 text-[9px] font-mono tabular-nums">
                {hall.toFixed(2)}
              </text>

              <text x={center} y={height - 14} textAnchor="middle" className="fill-slate-800 text-[10.5px] font-medium">
                {labels[row.config] ?? row.config}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex items-center justify-center gap-6 mt-2 text-xs text-slate-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block rounded-xs bg-teal-700" />
          <span>Faithfulness (higher is better)</span>
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 inline-block rounded-xs bg-red-600" />
          <span>Unanswerable Hallucination Rate (lower is better)</span>
        </span>
      </div>
    </div>
  );
}
