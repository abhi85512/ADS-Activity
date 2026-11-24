import React, { useState } from 'react';
import { Search, SlidersHorizontal, AlertTriangle } from 'lucide-react';
import { DocumentPage } from '../data/academicCorpus';
import { RetrievalHit, TextChunk } from '../lib/ragEngine';

interface RetrievalLabViewProps {
  pages: DocumentPage[];
  chunks: TextChunk[];
  chunkWords: number;
  overlapWords: number;
  onCorpusChanged: () => Promise<void>;
}

interface CompareResponse {
  query: string;
  topK: number;
  tfidf: RetrievalHit[];
  dense: RetrievalHit[];
  hybrid: RetrievalHit[];
}

export function RetrievalLabView({
  pages,
  chunks,
  chunkWords,
  overlapWords,
  onCorpusChanged,
}: RetrievalLabViewProps) {
  const [query, setQuery] = useState('What grade is awarded when attendance drops below 65% and can a detained student take the ESE?');
  const [topK, setTopK] = useState(4);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [compare, setCompare] = useState<CompareResponse | null>(null);

  const [editChunkWords, setEditChunkWords] = useState(chunkWords);
  const [editOverlap, setEditOverlap] = useState(overlapWords);
  const [updatingChunks, setUpdatingChunks] = useState(false);
  const [selectedDocFilter, setSelectedDocFilter] = useState<string>('ALL');
  const [showRawPreprocess, setShowRawPreprocess] = useState(false);

  const handleCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/retrieve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, topK }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Retrieval failed.');
      setCompare(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieval error.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyChunkConfig = async () => {
    setUpdatingChunks(true);
    try {
      await fetch('/api/corpus/chunk-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chunkWords: editChunkWords, overlapWords: editOverlap }),
      });
      await onCorpusChanged();
    } finally {
      setUpdatingChunks(false);
    }
  };

  const docNames = Array.from(new Set(pages.map((p) => p.doc)));
  const visibleChunks =
    selectedDocFilter === 'ALL' ? chunks : chunks.filter((c) => c.doc === selectedDocFilter);

  return (
    <div className="space-y-6">
      {/* Side-by-side Retriever Comparison */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Retriever Comparison Lab</h2>
            <p className="text-xs text-slate-500">
              Compare sparse TF-IDF (1–2 grams), dense vector embeddings, and Hybrid Reciprocal Rank Fusion (k=60).
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label htmlFor="lab-topk" className="text-xs text-slate-500">
              Top-k:
            </label>
            <select
              id="lab-topk"
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
              className="px-2.5 py-1.5 text-xs font-mono tabular-nums bg-white border border-slate-200 rounded-md"
            >
              {[3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
        </div>

        <form onSubmit={handleCompare} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter a test query to inspect ranking differences across retrievers..."
            className="flex-1 px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white"
          />
          <button
            type="submit"
            disabled={loading || !query.trim()}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Search className="w-4 h-4" />
            <span>{loading ? 'Searching...' : 'Compare Retrievers'}</span>
          </button>
        </form>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {compare && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 pt-2">
            {(
              [
                ['TF-IDF Baseline (1–2 grams)', compare.tfidf],
                ['Dense Vector Store (Embeddings)', compare.dense],
                ['Hybrid RRF (k = 60)', compare.hybrid],
              ] as const
            ).map(([title, hits]) => (
              <div key={title} className="border border-slate-200 rounded-md p-3.5 bg-slate-50/70 space-y-2.5">
                <div className="text-xs font-semibold text-slate-900 pb-2 border-b border-slate-200">{title}</div>
                {hits.map((hit, idx) => (
                  <div key={`${title}-${hit.chunk.id}-${idx}`} className="bg-white border border-slate-200 rounded p-2.5 space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono">
                      <span className="font-semibold text-slate-800 truncate">
                        #{idx + 1} · {hit.chunk.doc} (p.{hit.chunk.page})
                      </span>
                      <span className="tabular-nums text-blue-700 shrink-0">{hit.score.toFixed(4)}</span>
                    </div>
                    <p className="text-xs text-slate-600 line-clamp-4 leading-relaxed">{hit.chunk.text}</p>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Preprocessing & Chunking Inspector */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-600" />
            <h3 className="text-base font-semibold text-slate-900">Preprocessing & Sliding-Window Chunking</h3>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">Chunk Words:</span>
              <select
                value={editChunkWords}
                onChange={(e) => setEditChunkWords(Number(e.target.value))}
                className="px-2 py-1 border border-slate-200 rounded font-mono tabular-nums bg-white"
              >
                {[80, 120, 180, 260].map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-600">Overlap:</span>
              <select
                value={editOverlap}
                onChange={(e) => setEditOverlap(Number(e.target.value))}
                className="px-2 py-1 border border-slate-200 rounded font-mono tabular-nums bg-white"
              >
                {[20, 30, 40, 60].map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={handleApplyChunkConfig}
              disabled={updatingChunks}
              className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded transition-colors whitespace-nowrap shrink-0"
            >
              {updatingChunks ? 'Re-chunking...' : 'Apply Chunking'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-500">Filter document:</span>
            <select
              value={selectedDocFilter}
              onChange={(e) => setSelectedDocFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md text-slate-800"
            >
              <option value="ALL">All Documents ({chunks.length} chunks)</option>
              {docNames.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowRawPreprocess((v) => !v)}
            className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded transition-colors whitespace-nowrap shrink-0"
          >
            {showRawPreprocess ? 'Show Chunked Index' : 'Inspect Raw vs Cleaned Page Text'}
          </button>
        </div>

        {showRawPreprocess ? (
          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pages
              .filter((p) => selectedDocFilter === 'ALL' || p.doc === selectedDocFilter)
              .slice(0, 6)
              .map((p) => (
                <div key={`${p.doc}-${p.page}`} className="grid grid-cols-1 md:grid-cols-2 gap-3 border border-slate-200 rounded-md p-3">
                  <div>
                    <div className="text-[11px] font-mono font-semibold text-slate-500 mb-1">
                      RAW EXTRACTED · {p.doc} p.{p.page}
                    </div>
                    <pre className="text-[11px] font-mono text-slate-600 whitespace-pre-wrap leading-relaxed">{p.rawText}</pre>
                  </div>
                  <div>
                    <div className="text-[11px] font-mono font-semibold text-emerald-700 mb-1">
                      PREPROCESSED (Headers stripped · De-hyphenated)
                    </div>
                    <pre className="text-[11px] font-mono text-slate-800 whitespace-pre-wrap leading-relaxed">{p.text}</pre>
                  </div>
                </div>
              ))}
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 w-16">ID</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 w-56">Source & Page</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Chunk Text</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 text-right w-20">Words</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleChunks.map((ch) => (
                  <tr key={ch.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">{ch.id}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-800">
                      {ch.doc} · p.{ch.page}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 leading-relaxed">{ch.text}</td>
                    <td className="py-2.5 px-3 font-mono tabular-nums text-right text-slate-700">
                      {ch.text.split(/\s+/).filter(Boolean).length}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
