import React, { useCallback, useEffect, useState } from 'react';
import { DocumentPage, EvalQuestion } from './data/academicCorpus';
import { TextChunk } from './lib/ragEngine';
import { BASELINE_EVAL_SNAPSHOT, EvaluationSnapshot } from './lib/deliverablesGenerator';
import { AssistantView, CorpusDocSummary } from './components/AssistantView';
import { RetrievalLabView } from './components/RetrievalLabView';
import { EvaluationView } from './components/EvaluationView';
import { TechnicalReportView } from './components/TechnicalReportView';
import { DeliverablesView } from './components/DeliverablesView';

type TabKey = 'assistant' | 'retrieval' | 'evaluation' | 'report' | 'deliverables';

interface CorpusPayload {
  documents: Array<CorpusDocSummary & { pages: DocumentPage[] }>;
  chunkWords: number;
  overlapWords: number;
  chunks: TextChunk[];
  questions: EvalQuestion[];
  latestEval: EvaluationSnapshot | null;
}

const NAV_ITEMS: Array<{ key: TabKey; label: string }> = [
  { key: 'assistant', label: 'Assistant' },
  { key: 'retrieval', label: 'Retrieval Lab' },
  { key: 'evaluation', label: 'Evaluation' },
  { key: 'report', label: 'Technical Report' },
  { key: 'deliverables', label: 'Deliverables' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('assistant');
  const [corpus, setCorpus] = useState<CorpusPayload | null>(null);
  const [snapshot, setSnapshot] = useState<EvaluationSnapshot>(BASELINE_EVAL_SNAPSHOT);
  const [loadingCorpus, setLoadingCorpus] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchCorpus = useCallback(async () => {
    try {
      const resp = await fetch('/api/corpus');
      if (!resp.ok) throw new Error('Failed to load workspace corpus.');
      const data = (await resp.json()) as CorpusPayload;
      setCorpus(data);
      if (data.latestEval) {
        setSnapshot(data.latestEval);
      }
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Unable to reach backend.');
    } finally {
      setLoadingCorpus(false);
    }
  }, []);

  useEffect(() => {
    fetchCorpus();
  }, [fetchCorpus]);

  const allPages: DocumentPage[] = corpus
    ? corpus.documents.flatMap((d) => d.pages)
    : [];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900">
      {/* Top Bar Contract: 3 zones separated by gap-8 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 no-print">
        <div className="max-w-[1360px] mx-auto px-6 h-16 flex items-center justify-between gap-8">
          {/* Zone 1: Single-line brand wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('assistant')}
            className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 text-left"
          >
            AcademicRAG Studio
          </button>

          {/* Zone 2: 5 clean single-line text navigation links */}
          <nav className="hidden md:flex items-center gap-6" aria-label="Primary navigation">
            {NAV_ITEMS.map((item) => {
              const active = activeTab === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setActiveTab(item.key)}
                  className={`py-2 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                    active
                      ? 'text-slate-900 border-slate-900'
                      : 'text-slate-500 border-transparent hover:text-slate-900'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="shrink-0">
            {activeTab === 'report' ? (
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Print / Save PDF
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setActiveTab('report')}
                className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                Open 8–10p Report
              </button>
            )}
          </div>
        </div>

        {/* Mobile navigation row */}
        <div className="md:hidden border-t border-slate-100 px-4 py-2 flex items-center gap-4 overflow-x-auto">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setActiveTab(item.key)}
              className={`text-xs font-medium whitespace-nowrap shrink-0 py-1 border-b-2 ${
                activeTab === item.key
                  ? 'text-slate-900 border-slate-900'
                  : 'text-slate-500 border-transparent'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-[1360px] w-full mx-auto px-6 py-6">
        {loadingCorpus ? (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-sm text-slate-500">
            Loading Department of Information Technology corpus and evaluation suite...
          </div>
        ) : loadError || !corpus ? (
          <div className="bg-white border border-red-200 rounded-lg p-6 text-sm text-red-700">
            {loadError || 'Unable to initialize workspace.'}
          </div>
        ) : (
          <>
            {activeTab === 'assistant' && (
              <AssistantView
                documents={corpus.documents}
                chunkCount={corpus.chunks.length}
                chunkWords={corpus.chunkWords}
                overlapWords={corpus.overlapWords}
                calibratedTau={snapshot.tau}
                onCorpusChanged={fetchCorpus}
              />
            )}

            {activeTab === 'retrieval' && (
              <RetrievalLabView
                pages={allPages}
                chunks={corpus.chunks}
                chunkWords={corpus.chunkWords}
                overlapWords={corpus.overlapWords}
                onCorpusChanged={fetchCorpus}
              />
            )}

            {activeTab === 'evaluation' && (
              <EvaluationView
                questions={corpus.questions}
                snapshot={snapshot}
                onUpdateSnapshot={setSnapshot}
                onCorpusChanged={fetchCorpus}
              />
            )}

            {activeTab === 'report' && (
              <TechnicalReportView
                snapshot={snapshot}
                documentCount={corpus.documents.length}
                pageCount={allPages.length}
              />
            )}

            {activeTab === 'deliverables' && (
              <DeliverablesView
                questions={corpus.questions}
                snapshot={snapshot}
                onNavigateReport={() => setActiveTab('report')}
              />
            )}
          </>
        )}
      </main>

      <footer className="border-t border-slate-200 bg-white no-print">
        <div className="max-w-[1360px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
          <span>Department of Information Technology · Advanced Data Science Laboratory</span>
          <span>55-Question RAG Benchmark · Guarded Grounding &amp; NLI Verification</span>
        </div>
      </footer>
    </div>
  );
}
