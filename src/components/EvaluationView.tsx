import React, { useState } from 'react';
import { Play, Upload, Download, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { EvalQuestion } from '../data/academicCorpus';
import {
  EvaluationSnapshot,
  generateQuestionsCsv,
} from '../lib/deliverablesGenerator';
import {
  RetrievalBarChart,
  AblationLineChart,
  FaithfulnessVsHallucinationChart,
} from './Charts';

interface PerQuestionEvalRow {
  config: string;
  id: number;
  split: 'dev' | 'test';
  answerable: 0 | 1;
  category: string;
  question: string;
  answer: string;
  refused: boolean;
  blocked: string;
  faithfulness: number | null;
  recall: number | null;
}

interface EvaluationViewProps {
  questions: EvalQuestion[];
  snapshot: EvaluationSnapshot;
  onUpdateSnapshot: (snap: EvaluationSnapshot) => void;
  onCorpusChanged: () => Promise<void>;
}

export function EvaluationView({
  questions,
  snapshot,
  onUpdateSnapshot,
  onCorpusChanged,
}: EvaluationViewProps) {
  const [runningRet, setRunningRet] = useState(false);
  const [runningGen, setRunningGen] = useState(false);
  const [genSampleLimit, setGenSampleLimit] = useState<number>(16);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [perQuestionRows, setPerQuestionRows] = useState<PerQuestionEvalRow[]>([]);
  const [qFilter, setQFilter] = useState<'all' | 'answerable' | 'unanswerable' | 'adversarial' | 'hallucinations' | 'false_refusals'>('all');

  const handleRunRetrieval = async () => {
    setRunningRet(true);
    setError(null);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/evaluate/retrieval', { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Retrieval evaluation failed.');

      const updated: EvaluationSnapshot = {
        ...snapshot,
        ranAt: `Live Retrieval Run · ${new Date().toLocaleTimeString()}`,
        totalQuestions: questions.length,
        answerableCount: questions.filter((q) => q.answerable === 1).length,
        unanswerableCount: questions.filter((q) => q.answerable === 0).length,
        retrieval: data.retrieval,
        ablation: data.ablation,
      };
      onUpdateSnapshot(updated);
      await fetch('/api/evaluation/save-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: updated }),
      });
      setStatusMsg('Live Retrieval Comparison and Chunk-Size Ablation completed and synchronized with Technical Report.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Retrieval evaluation failed.');
    } finally {
      setRunningRet(false);
    }
  };

  const handleRunGeneration = async () => {
    setRunningGen(true);
    setError(null);
    setStatusMsg(null);
    try {
      const resp = await fetch('/api/evaluate/generation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleLimit: genSampleLimit }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Generation evaluation failed.');

      const updated: EvaluationSnapshot = {
        ...snapshot,
        ranAt: `Live Full Evaluation (${genSampleLimit}q) · ${new Date().toLocaleTimeString()}`,
        tau: data.tau,
        devBalancedAcc: data.devBalancedAcc,
        generationAll: data.generationAll,
        generationTest: data.generationTest,
      };
      setPerQuestionRows(data.perQuestion ?? []);
      onUpdateSnapshot(updated);
      await fetch('/api/evaluation/save-snapshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: updated }),
      });
      setStatusMsg(
        `Live Generation & Guardrail benchmark complete (dev tau=${data.tau.toFixed(3)}, dev balanced acc=${data.devBalancedAcc.toFixed(3)}).`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Generation evaluation failed.');
    } finally {
      setRunningGen(false);
    }
  };

  const handleUploadQuestionsCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    try {
      const csvText = await file.text();
      const resp = await fetch('/api/questions/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvText }),
      });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'CSV upload failed.');
      setStatusMsg(`Loaded ${data.questionCount} questions from ${file.name}.`);
      await onCorpusChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'CSV upload failed.');
    } finally {
      e.target.value = '';
    }
  };

  const handleDownloadCsv = () => {
    const csv = generateQuestionsCsv(questions);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'questions.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredQuestions = questions.filter((q) => {
    if (qFilter === 'answerable') return q.answerable === 1;
    if (qFilter === 'unanswerable') return q.answerable === 0;
    if (qFilter === 'adversarial') return q.category === 'adversarial';
    return true;
  });

  const hallucinations = perQuestionRows.filter((r) => r.answerable === 0 && !r.refused);
  const falseRefusals = perQuestionRows.filter((r) => r.config === 'rag_eng+guardrails' && r.answerable === 1 && r.refused);

  return (
    <div className="space-y-6">
      {/* KPI Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Benchmark Size</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {questions.length}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {questions.filter((q) => q.answerable === 1).length} answerable · {questions.filter((q) => q.answerable === 0).length} unanswerable
          </div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Hybrid RRF Hit@3 / MRR</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {snapshot.retrieval.hybrid['hit@3'].toFixed(3)} / {snapshot.retrieval.hybrid.MRR.toFixed(3)}
          </div>
          <div className="text-xs text-slate-500 mt-1">vs TF-IDF Hit@3 {snapshot.retrieval.tfidf['hit@3'].toFixed(3)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Dev-Calibrated Gate tau</div>
          <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
            {snapshot.tau.toFixed(3)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Dev balanced acc {snapshot.devBalancedAcc.toFixed(3)}</div>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="text-xs text-slate-500">Guarded Test Hallucination</div>
          <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
            {((snapshot.generationTest.find((r) => r.config === 'rag_eng+guardrails')?.hallucinationRate ?? 0) * 100).toFixed(1)}%
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Faithfulness {snapshot.generationTest.find((r) => r.config === 'rag_eng+guardrails')?.faithfulness?.toFixed(3) ?? 'N/A'}
          </div>
        </div>
      </div>

      {/* Live Evaluation Runner Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-slate-900">Live Evaluation Harness</div>
          <div className="text-xs text-slate-500 font-mono">{snapshot.ranAt}</div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleRunRetrieval}
            disabled={runningRet || runningGen}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningRet ? 'Running Retrieval + Ablation...' : 'Run Retrieval & Ablation (55q)'}</span>
          </button>

          <select
            value={genSampleLimit}
            onChange={(e) => setGenSampleLimit(Number(e.target.value))}
            className="px-2.5 py-2 text-xs font-mono bg-white border border-slate-200 rounded-md text-slate-700"
            aria-label="Generation evaluation sample size"
          >
            <option value={16}>Fast Eval (16q stratified)</option>
            <option value={questions.length}>Full Benchmark ({questions.length}q)</option>
          </select>

          <button
            type="button"
            onClick={handleRunGeneration}
            disabled={runningRet || runningGen}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-md transition-colors whitespace-nowrap shrink-0"
          >
            <Play className="w-3.5 h-3.5" />
            <span>{runningGen ? 'Evaluating LLM + NLI...' : 'Run Live Generation Eval'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-700 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{statusMsg}</span>
        </div>
      )}

      {/* Charts & Tables Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Retrieval Comparison (Hit-Rate@k & MRR)</h3>
          <RetrievalBarChart data={snapshot.retrieval} />
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold text-slate-700">Retriever</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Hit@1</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Hit@3</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Hit@5</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">MRR</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {(['tfidf', 'dense', 'hybrid'] as const).map((k) => (
                  <tr key={k}>
                    <td className="py-2 px-3 font-sans font-medium text-slate-900">{k.toUpperCase()}</td>
                    <td className="py-2 px-3 text-right">{snapshot.retrieval[k]['hit@1'].toFixed(3)}</td>
                    <td className="py-2 px-3 text-right">{snapshot.retrieval[k]['hit@3'].toFixed(3)}</td>
                    <td className="py-2 px-3 text-right">{snapshot.retrieval[k]['hit@5'].toFixed(3)}</td>
                    <td className="py-2 px-3 text-right font-semibold">{snapshot.retrieval[k].MRR.toFixed(3)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-900">Ablation: Chunk Size vs. Hit@3</h3>
          <AblationLineChart rows={snapshot.ablation} />
          <div className="overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 font-semibold text-slate-700">Chunk Words</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Chunks</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">TF-IDF Hit@3</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Dense Hit@3</th>
                  <th className="py-2 px-3 font-semibold text-slate-700 text-right">Hybrid Hit@3</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {[80, 120, 180, 260].map((sz) => {
                  const tf = snapshot.ablation.find((a) => a.chunkWords === sz && a.retriever === 'tfidf');
                  const dn = snapshot.ablation.find((a) => a.chunkWords === sz && a.retriever === 'dense');
                  const hy = snapshot.ablation.find((a) => a.chunkWords === sz && a.retriever === 'hybrid');
                  return (
                    <tr key={sz} className={sz === 180 ? 'bg-slate-50/80 font-semibold' : ''}>
                      <td className="py-2 px-3 text-slate-900">{sz}</td>
                      <td className="py-2 px-3 text-right">{tf?.nChunks ?? '-'}</td>
                      <td className="py-2 px-3 text-right">{tf ? tf['hit@3'].toFixed(3) : '-'}</td>
                      <td className="py-2 px-3 text-right">{dn ? dn['hit@3'].toFixed(3) : '-'}</td>
                      <td className="py-2 px-3 text-right">{hy ? hy['hit@3'].toFixed(3) : '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Generation & Hallucination Study */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold text-slate-900">
              Generation Faithfulness & Hallucination Study (Held-Out Test Split)
            </h3>
            <p className="text-xs text-slate-500">
              Threshold tau={snapshot.tau.toFixed(3)} was calibrated strictly on the 40% dev split to prevent leakage.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-6">
            <FaithfulnessVsHallucinationChart rows={snapshot.generationTest} />
          </div>
          <div className="lg:col-span-6 overflow-x-auto border border-slate-200 rounded">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Configuration</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Faithfulness</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Ans Recall</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Hallucination</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">False Refusal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                {snapshot.generationTest.map((row) => (
                  <tr key={row.config} className={row.config === 'rag_eng+guardrails' ? 'bg-emerald-50/40 font-semibold' : ''}>
                    <td className="py-2.5 px-3 text-slate-900">{row.config}</td>
                    <td className="py-2.5 px-3 text-right">{row.faithfulness === null ? 'N/A' : row.faithfulness.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right">{row.answerRecall === null ? 'N/A' : row.answerRecall.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-right text-red-700">
                      {row.hallucinationRate === null ? 'N/A' : row.hallucinationRate.toFixed(3)}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      {row.falseRefusalRate === null ? 'N/A' : row.falseRefusalRate.toFixed(3)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Benchmark Questions & Error Analysis Browser */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-900">Self-Made Question Suite & Error Analysis</h3>
            <div className="inline-flex items-center p-1 bg-slate-100 rounded-md">
              {(
                [
                  ['all', `All (${questions.length})`],
                  ['answerable', `Answerable (${questions.filter((q) => q.answerable === 1).length})`],
                  ['unanswerable', `Unanswerable (${questions.filter((q) => q.answerable === 0).length})`],
                  ['adversarial', 'Adversarial'],
                  ...(perQuestionRows.length > 0
                    ? ([
                        ['hallucinations', `Hallucinations (${hallucinations.length})`],
                        ['false_refusals', `False Refusals (${falseRefusals.length})`],
                      ] as const)
                    : []),
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setQFilter(val)}
                  className={`px-2.5 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                    qFilter === val ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer transition-colors whitespace-nowrap shrink-0">
              <Upload className="w-3.5 h-3.5" />
              <span>Upload questions.csv</span>
              <input type="file" accept=".csv" onChange={handleUploadQuestionsCsv} className="hidden" />
            </label>
            <button
              type="button"
              onClick={handleDownloadCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {qFilter === 'hallucinations' || qFilter === 'false_refusals' ? (
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Config</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Question</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Model Output</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 text-right">Blocked</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(qFilter === 'hallucinations' ? hallucinations : falseRefusals).map((r, idx) => (
                  <tr key={`${r.config}-${r.id}-${idx}`}>
                    <td className="py-2.5 px-3 font-mono text-slate-700">{r.config}</td>
                    <td className="py-2.5 px-3 text-slate-900">{r.question}</td>
                    <td className="py-2.5 px-3 text-slate-600">{r.answer}</td>
                    <td className="py-2.5 px-3 font-mono text-right">{r.blocked || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto max-h-96 overflow-y-auto border border-slate-200 rounded">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 w-12">ID</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700 w-24">Split · Cat</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Question</th>
                  <th className="py-2.5 px-3 font-semibold text-slate-700">Gold Doc & Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredQuestions.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-3 font-mono tabular-nums text-slate-500">{q.id}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      <span className="font-mono">{q.split ?? 'test'}</span> · {q.category}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900 font-medium">{q.question}</td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {q.answerable === 1 ? (
                        <div>
                          <div className="font-mono text-[11px] text-slate-800">{q.gold_doc}</div>
                          <div className="text-[11px] text-slate-500">{q.gold_evidence}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">Unanswerable (Expected Refusal)</span>
                      )}
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
