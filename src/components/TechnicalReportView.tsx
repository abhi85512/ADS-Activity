import React, { useState } from 'react';
import { Printer, Download } from 'lucide-react';
import {
  EvaluationSnapshot,
  SummaryMetricsRow,
  generateTechnicalReportMarkdown,
} from '../lib/deliverablesGenerator';
import {
  RetrievalBarChart,
  AblationLineChart,
  FaithfulnessVsHallucinationChart,
} from './Charts';

interface TechnicalReportViewProps {
  snapshot: EvaluationSnapshot;
  documentCount: number;
  pageCount: number;
}

const TOC_ITEMS = [
  { id: 'sec-doc-structure', label: 'Document Structure' },
  { id: 'sec-abstract', label: 'Abstract' },
  { id: 'sec-problem', label: '1. Problem Understanding' },
  { id: 'sec-literature', label: '2. Literature Survey' },
  { id: 'sec-methodology', label: '3. Methodology' },
  { id: 'sec-setup', label: '4. Experimental Setup' },
  { id: 'sec-results', label: '5. Experiments' },
  { id: 'sec-ethics', label: '6. Responsible AI & Integrity' },
  { id: 'sec-conclusion', label: '7. Conclusion & Future Scope' },
  { id: 'sec-references', label: '8. References' },
];

interface StructureSectionCard {
  index: string;
  id: string;
  title: string;
  pageRange: string;
  focus: string;
  artifacts: string;
  colSpan?: string;
}

export function TechnicalReportView({
  snapshot,
  documentCount,
  pageCount,
}: TechnicalReportViewProps) {
  const [layoutMode, setLayoutMode] = useState<'a4' | 'fluid'>('a4');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('sec-methodology');

  const handleDownloadMd = () => {
    const md = generateTechnicalReportMarkdown(snapshot);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Technical_Report_RAG_Academic_Assistant.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const jumpToSection = (id: string) => {
    setSelectedSectionId(id);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const rowOf = (list: SummaryMetricsRow[], cfg: string) =>
    list.find((r) => r.config === cfg) ?? {
      config: cfg,
      faithfulness: null,
      answerRecall: null,
      hallucinationRate: null,
      falseRefusalRate: null,
    };

  const cb = rowOf(snapshot.generationTest, 'closed_book');
  const naive = rowOf(snapshot.generationTest, 'rag_naive');
  const eng = rowOf(snapshot.generationTest, 'rag_engineered');
  const guard = rowOf(snapshot.generationTest, 'rag_eng+guardrails');
  const fmt = (v: number | null) => (v === null || Number.isNaN(v) ? 'N/A' : v.toFixed(3));

  const structureSections: StructureSectionCard[] = [
    {
      index: '00',
      id: 'sec-abstract',
      title: 'Abstract & Problem Understanding',
      pageRange: 'pp. 1–2',
      focus: 'Institutional syllabus/regulation bottleneck, closed-book hallucination risks, and project scope.',
      artifacts: 'Executive summary · Sec. 1',
    },
    {
      index: '02',
      id: 'sec-literature',
      title: 'Literature Survey',
      pageRange: 'p. 3',
      focus: 'TF-IDF baselines, BGE/Gemini dense embeddings, FAISS MIPS, Hybrid RRF (k=60), and NLI guardrails.',
      artifacts: 'Prior art synthesis · Sec. 2',
    },
    {
      index: '03',
      id: 'sec-methodology',
      title: 'Methodology',
      pageRange: 'pp. 4–5',
      focus: 'Page-aware preprocessing, 180w sliding chunks, 3 retrievers, engineered prompt, and 4-layer guardrails.',
      artifacts: 'Fig. 1 Pipeline · Sec. 3',
    },
    {
      index: '04',
      id: 'sec-setup',
      title: 'Experimental Setup',
      pageRange: 'p. 6',
      focus: `${snapshot.totalQuestions}-question benchmark (${snapshot.answerableCount} answerable, ${snapshot.unanswerableCount} unanswerable), 40/60 dev-test split.`,
      artifacts: 'Metric definitions · Sec. 4',
    },
    {
      index: '05',
      id: 'sec-results',
      title: 'Experiments',
      pageRange: 'pp. 6–8',
      focus: `Hit@3=${snapshot.retrieval.hybrid['hit@3'].toFixed(3)}, 80–260w chunk ablation, test faithfulness=${fmt(guard.faithfulness)}, hallucination=${fmt(guard.hallucinationRate)}.`,
      artifacts: 'Tables 1–3 · Charts · Sec. 5',
    },
    {
      index: '06',
      id: 'sec-ethics',
      title: 'Responsible AI & Integrity',
      pageRange: 'p. 9',
      focus: 'Citation verifiability, asymmetric refusal safety, privacy, prompt injection defense, and AI usage log.',
      artifacts: 'Table 4 AI Declaration · Sec. 6',
    },
    {
      index: '07',
      id: 'sec-conclusion',
      title: 'Future Scope',
      pageRange: 'pp. 9–10',
      focus: 'Key findings synthesis, table-aware parsing, bge-reranker-base, multilingual queries, and R2024 diffing.',
      artifacts: 'Conclusion & Roadmap · Sec. 7',
      colSpan: 'sm:col-span-2 lg:col-span-2 print:col-span-2',
    },
    {
      index: '08',
      id: 'sec-references',
      title: 'References',
      pageRange: 'p. 10',
      focus: 'Academic papers, Hugging Face model cards, and R2024 Department of IT sources.',
      artifacts: '9 cited sources · Sec. 8',
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Sticky TOC & A4 Print Controls (Hidden when printing) */}
      <aside className="lg:col-span-3 lg:sticky lg:top-20 space-y-4 no-print">
        <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-3">
          <div className="text-xs font-semibold text-slate-900">Report Contents (A4 · 8–10 Pages)</div>
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md">
            <button
              type="button"
              onClick={() => setLayoutMode('a4')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                layoutMode === 'a4' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              A4 Sheet
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('fluid')}
              className={`px-2 py-1 text-xs font-medium rounded transition-colors whitespace-nowrap shrink-0 ${
                layoutMode === 'fluid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Fluid Width
            </button>
          </div>

          <nav className="space-y-1">
            {TOC_ITEMS.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => jumpToSection(item.id)}
                className={`block w-full text-left py-1 text-xs transition-colors ${
                  selectedSectionId === item.id
                    ? 'font-semibold text-slate-900'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="pt-3 border-t border-slate-100 space-y-2">
            <button
              type="button"
              onClick={handlePrintPdf}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 / Save PDF</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMd}
              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Markdown</span>
            </button>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            A4 print margins: <span className="font-mono text-slate-700 tabular-nums">18mm × 20mm</span>
            <br />
            Data: <span className="font-mono text-slate-700">{snapshot.ranAt}</span>
          </p>
        </div>
      </aside>

      {/* Main Academic Paper Body */}
      <article
        className={`lg:col-span-9 bg-white border border-slate-200 rounded-lg print-report font-serif text-slate-800 leading-relaxed space-y-8 ${
          layoutMode === 'a4' ? 'a4-sheet' : 'p-8 sm:p-12'
        }`}
      >
        {/* Title Block */}
        <header className="border-b border-slate-200 pb-6 space-y-3 text-center">
          <p className="font-sans text-xs font-medium text-slate-500 tracking-wide">
            Department of Information Technology · Course Project Technical Report · A4 Format
          </p>
          <h1 className="font-sans text-2xl sm:text-3xl font-bold text-slate-900 leading-tight max-w-3xl mx-auto">
            Domain-Specific Retrieval-Augmented Generation (RAG) Assistant for Academic Syllabi and Regulations
          </h1>
          <div className="font-sans text-sm text-slate-600 pt-1">
            <span>Abhishek Harde</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Advanced Data Science Laboratory (IT301)</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>November 2026</span>
          </div>
        </header>

        {/* Structured Document Structure CSS Grid Preview */}
        <section
          id="sec-doc-structure"
          className="border border-slate-200 rounded-md p-4 sm:p-5 bg-slate-50/70 space-y-3 print-avoid-break"
        >
          <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2.5 font-sans">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Document Structure</h2>
              <p className="text-xs text-slate-500">
                Demarcated section blueprint organized across 10 A4 pages (click any block to inspect section)
              </p>
            </div>
            <span className="text-xs font-mono tabular-nums text-slate-600">
              210mm × 297mm · 8 Sections
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 a4-structure-grid font-sans">
            {structureSections.map((sec) => {
              const isSelected = selectedSectionId === sec.id;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => jumpToSection(sec.id)}
                  className={`text-left p-3 rounded border transition-colors flex flex-col justify-between gap-2 bg-white ${
                    sec.colSpan ?? ''
                  } ${
                    isSelected
                      ? 'border-slate-900 ring-1 ring-slate-900/10'
                      : 'border-slate-200 hover:border-slate-400'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2 text-[11px] font-mono tabular-nums text-slate-500">
                      <span>{sec.index}</span>
                      <span>{sec.pageRange}</span>
                    </div>
                    <div className="text-xs font-semibold text-slate-900">{sec.title}</div>
                    <p className="text-[11px] leading-snug text-slate-600">{sec.focus}</p>
                  </div>
                  <div className="pt-1.5 border-t border-slate-100 text-[11px] font-mono text-slate-500 truncate">
                    {sec.artifacts}
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Abstract */}
        <section id="sec-abstract" className="space-y-3">
          <h2 className="font-sans text-lg font-bold text-slate-900">Abstract</h2>
          <p className="text-[15px]">
            Academic departments govern student progression through dense, multi-page regulation handbooks and
            semester-wise course syllabi. Critical decisions—such as verifying the 75% attendance cutoff, applying for
            medical condonation between 65% and 74%, computing Allowed To Keep Terms (ATKT) promotion limits, or
            confirming End-Semester Examination (ESE) passing thresholds—require exact clause-level lookup across
            multiple PDF documents. General-purpose Large Language Models (LLMs) queried without external context
            exhibit severe parametric hallucination on institutional policies, fabricating rules with high fluency and no
            traceable provenance.
          </p>
          <p className="text-[15px]">
            In this project, we design, implement, and rigorously evaluate a domain-specific Retrieval-Augmented
            Generation (RAG) assistant over Department of Information Technology syllabi and R2024 academic regulations.
            Our pipeline combines page-aware preprocessing (header/footer stripping, cross-line de-hyphenation, and
            sliding-window chunking), sparse lexical retrieval (unigram/bigram sublinear TF-IDF), dense semantic
            retrieval with a vector store, and Hybrid Reciprocal Rank Fusion (RRF, <span className="font-mono text-xs">k=60</span>).
            On a self-constructed {snapshot.totalQuestions}-question benchmark ({snapshot.answerableCount} answerable,{' '}
            {snapshot.unanswerableCount} unanswerable and adversarial), Hybrid RRF achieves Hit@3 ={' '}
            <span className="font-mono text-xs tabular-nums">{snapshot.retrieval.hybrid['hit@3'].toFixed(3)}</span> and MRR ={' '}
            <span className="font-mono text-xs tabular-nums">{snapshot.retrieval.hybrid.MRR.toFixed(3)}</span>, outperforming
            the TF-IDF baseline (Hit@3 ={' '}
            <span className="font-mono text-xs tabular-nums">{snapshot.retrieval.tfidf['hit@3'].toFixed(3)}</span>).
            Furthermore, combining structured citation prompting with a four-layer runtime guardrail stack raises
            test-split faithfulness from{' '}
            <span className="font-mono text-xs tabular-nums">{fmt(naive.faithfulness)}</span> (naive RAG) to{' '}
            <span className="font-mono text-xs tabular-nums">{fmt(guard.faithfulness)}</span> while reducing unanswerable
            hallucinations from{' '}
            <span className="font-mono text-xs tabular-nums">{fmt(cb.hallucinationRate)}</span> (closed-book) to{' '}
            <span className="font-mono text-xs tabular-nums">{fmt(guard.hallucinationRate)}</span>.
          </p>
        </section>

        {/* 1. Problem Understanding */}
        <section id="sec-problem" className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="font-sans text-lg font-bold text-slate-900">1. Problem Understanding and Motivation</h2>
          <h3 className="font-sans text-base font-semibold text-slate-900">1.1 Institutional Information Bottleneck</h3>
          <p className="text-[15px]">
            Undergraduate engineering programs distribute academic policies across separate statutory documents:
            program-wide regulations, examination ordinances, and individual course syllabi. Students frequently phrase
            queries in conversational or scenario-driven terms—such as asking whether scoring 22 out of 60 in an
            end-semester paper allows passing if internal marks are high—whereas the governing handbook states the rule
            formally as a dual 40% threshold across ESE and aggregate marks. Traditional keyword search fails whenever
            query terminology diverges from statutory vocabulary, while manual PDF browsing across dozens of pages is
            error-prone.
          </p>
          <h3 className="font-sans text-base font-semibold text-slate-900">1.2 Failure Modes of Unconstrained LLMs</h3>
          <p className="text-[15px]">
            Deploying a standalone LLM directly as an academic advisor introduces three unacceptable operational risks:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-[15px]">
            <li>
              <strong>Parametric Hallucination on Institutional Constants:</strong> LLMs guess plausible-sounding
              academic numbers (such as 70% attendance or 50% passing cutoffs) drawn from unrelated universities in their
              pretraining corpus.
            </li>
            <li>
              <strong>Lack of Auditable Provenance:</strong> Without document and page citations, neither students nor
              academic coordinators can verify whether an answer reflects the current R2024 ordinance or an outdated
              syllabus.
            </li>
            <li>
              <strong>Vulnerability to Out-of-Scope & Adversarial Prompts:</strong> Unconstrained assistants answer
              unrelated trivia, invent instructor names absent from syllabi, or comply with prompt-injection attempts
              seeking to override system policies.
            </li>
          </ul>
          <h3 className="font-sans text-base font-semibold text-slate-900">1.3 Project Scope and Objectives</h3>
          <p className="text-[15px]">
            Our objective is to engineer a verifiable, reproducible RAG prototype with: (i) clean text preprocessing and
            page-bounded chunking; (ii) quantitative comparison between a TF-IDF baseline, dense vector search, and
            Hybrid RRF; (iii) prompt engineering with few-shot abstention exemplars; (iv) a{' '}
            {snapshot.totalQuestions}-question evaluation suite measuring retrieval hit-rate, MRR, NLI faithfulness, and
            hallucination rate; (v) a chunk-size ablation study; and (vi) multi-layer runtime guardrails.
          </p>
        </section>

        {/* 2. Literature Survey */}
        <section id="sec-literature" className="space-y-3 pt-4 border-t border-slate-100 print-page-break">
          <h2 className="font-sans text-lg font-bold text-slate-900">2. Literature Survey</h2>
          <h3 className="font-sans text-base font-semibold text-slate-900">2.1 Sparse Lexical Retrieval</h3>
          <p className="text-[15px]">
            Term Frequency–Inverse Document Frequency (TF-IDF) and BM25 remain foundational baselines in Information
            Retrieval (Manning, Raghavan, &amp; Schütze, 2008). By weighting rare domain terms (such as course codes{' '}
            <span className="font-mono text-xs">IT301</span>, <span className="font-mono text-xs">ATKT</span>, or{' '}
            <span className="font-mono text-xs">DX</span>) with sublinear TF scaling and bigram phrases, sparse
            retrievers achieve high precision on exact symbolic identifiers. However, they suffer from vocabulary
            mismatch when synonyms or paraphrases are used.
          </p>
          <h3 className="font-sans text-base font-semibold text-slate-900">2.2 Dense Bi-Encoder Embeddings & Vector Stores</h3>
          <p className="text-[15px]">
            Dense retrieval maps queries and document chunks into normalized continuous embeddings via pretrained
            Transformer encoders such as BGE (<span className="font-mono text-xs">BAAI/bge-small-en-v1.5</span>, Xiao et
            al., 2023) and Gemini Embedding models, enabling efficient inner-product similarity search in vector stores
            like FAISS (Johnson et al., 2019). Dense vectors bridge lexical gaps (e.g., mapping <em>"medical leave"</em>{' '}
            to <em>"condonation on documented medical grounds"</em>) but can occasionally dilute exact numeric tokens.
          </p>
          <h3 className="font-sans text-base font-semibold text-slate-900">2.3 Hybrid Reciprocal Rank Fusion (RRF)</h3>
          <p className="text-[15px]">
            Cormack, Clarke, and Buettcher (2009) demonstrated that Reciprocal Rank Fusion robustly combines sparse and
            dense rankings without needing fragile score normalization across disparate similarity scales. Using a
            smoothing constant <span className="font-mono text-xs">k_rrf = 60</span>, documents ranked highly by either
            lexical or semantic signals rise cleanly into the final context window.
          </p>
          <h3 className="font-sans text-base font-semibold text-slate-900">2.4 Grounded RAG, Hallucination & NLI Guardrails</h3>
          <p className="text-[15px]">
            Lewis et al. (2020) introduced Retrieval-Augmented Generation to ground parametric language models in
            non-parametric evidence. Subsequent hallucination taxonomies (Ji et al., 2023) classify failures into
            intrinsic contradictions and extrinsic fabrications. Recent guardrail architectures combine retrieval
            confidence thresholds with Natural Language Inference (NLI) entailment checking (e.g., DeBERTa-v3, He et
            al., 2021) and OWASP LLM prompt-injection defenses to verify claim-level grounding before displaying answers.
          </p>
        </section>

        {/* 3. Methodology */}
        <section id="sec-methodology" className="space-y-4 pt-4 border-t border-slate-100">
          <h2 className="font-sans text-lg font-bold text-slate-900">3. System Methodology and Architecture</h2>

          {/* Architecture SVG Diagram */}
          <div className="border border-slate-200 rounded-md p-4 bg-slate-50 print-avoid-break">
            <div className="font-sans text-xs font-semibold text-slate-700 mb-3 text-center">
              Figure 1: End-to-End Guarded Academic RAG Pipeline
            </div>
            <svg viewBox="0 0 760 140" className="w-full h-auto font-sans" role="img" aria-label="RAG pipeline architecture diagram">
              {[
                { x: 10, w: 120, title: '1. Ingestion', sub: 'PDF/TXT -> Clean' },
                { x: 155, w: 130, title: '2. Dual Index', sub: 'TF-IDF + Dense' },
                { x: 310, w: 120, title: '3. Hybrid RRF', sub: 'k_rrf=60, Top-4' },
                { x: 455, w: 135, title: '4. Prompt + Gate', sub: 'Inj + tau Gate + LLM' },
                { x: 615, w: 135, title: '5. NLI Audit', sub: 'Entailment + Cite' },
              ].map((box, idx) => (
                <g key={box.title}>
                  <rect x={box.x} y={30} width={box.w} height={72} rx={6} fill="#ffffff" stroke="#cbd5e1" strokeWidth="1.5" />
                  <text x={box.x + box.w / 2} y={58} textAnchor="middle" className="fill-slate-900 text-[12px] font-semibold">
                    {box.title}
                  </text>
                  <text x={box.x + box.w / 2} y={78} textAnchor="middle" className="fill-slate-500 text-[10px]">
                    {box.sub}
                  </text>
                  {idx < 4 && (
                    <line x1={box.x + box.w + 2} y1={66} x2={box.x + box.w + 22} y2={66} stroke="#475569" strokeWidth="1.5" markerEnd="url(#arrow)" />
                  )}
                </g>
              ))}
              <defs>
                <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                  <path d="M0,0 L6,3 L0,6 Z" fill="#475569" />
                </marker>
              </defs>
            </svg>
          </div>

          <h3 className="font-sans text-base font-semibold text-slate-900">3.1 Corpus & Page-Aware Preprocessing</h3>
          <p className="text-[15px]">
            The knowledge base consists of {documentCount} core Department of Information Technology documents spanning{' '}
            {pageCount} pages (<span className="font-mono text-xs">IT_Academic_Regulations_2024.pdf</span>,{' '}
            <span className="font-mono text-xs">IT301_Advanced_Data_Science_Lab_Syllabus.pdf</span>,{' '}
            <span className="font-mono text-xs">IT302_Machine_Learning_and_NLP_Syllabus.pdf</span>, and{' '}
            <span className="font-mono text-xs">IT401_Cloud_and_Information_Security_Syllabus.pdf</span>). Before
            indexing, each page passes through three preprocessing transformations: (1) removal of running headers and{' '}
            <span className="font-mono text-xs">Page X of Y</span> footers, (2) cross-line de-hyphenation, and (3)
            whitespace normalization. We segment each page independently using a sliding word window (default{' '}
            <span className="font-mono text-xs">chunk_words = 180</span>,{' '}
            <span className="font-mono text-xs">overlap_words = 40</span>). Keeping chunks within page boundaries
            guarantees exact <span className="font-mono text-xs">(document, page)</span> citation provenance.
          </p>

          <h3 className="font-sans text-base font-semibold text-slate-900">3.2 Retrieval Baselines & Vector Store</h3>
          <p className="text-[15px]">
            We implement three retrievers over identical chunk sets: (a) a sparse TF-IDF baseline using lowercased
            unigrams and bigrams with sublinear TF scaling (<span className="font-mono text-xs">1 + log(tf)</span>); (b)
            a dense vector store using L2-normalized semantic embeddings (<span className="font-mono text-xs">BAAI/bge-small-en-v1.5</span>{' '}
            in the offline notebook and <span className="font-mono text-xs">gemini-embedding-2</span> in the live web
            workbench) queried via inner-product similarity; and (c) Hybrid RRF fusing the top-20 candidates from both
            retrievers with <span className="font-mono text-xs">k_rrf = 60</span>.
          </p>

          <h3 className="font-sans text-base font-semibold text-slate-900">3.3 Prompt Engineering & Multi-Layer Guardrails</h3>
          <p className="text-[15px]">
            To isolate the impact of prompt design and safety checks, we evaluate four generation modes: Closed-Book,
            Naive RAG, Engineered Prompt (facts-only system rules, 3-sentence cap, inline{' '}
            <span className="font-mono text-xs">[1]</span>/<span className="font-mono text-xs">[2]</span> citations,
            instruction-hierarchy defense, and two few-shot abstention exemplars), and Engineered + Guardrails. The
            guardrail layer enforces: (1) input prompt-injection regex screening; (2) a retrieval-confidence gate
            rejecting queries whose dense top-1 cosine similarity falls below dev-calibrated{' '}
            <span className="font-mono text-xs">tau = {snapshot.tau.toFixed(3)}</span>; (3) post-generation sentence-level
            NLI faithfulness verification; and (4) deterministic source-page appending.
          </p>
        </section>

        {/* 4. Experimental Setup */}
        <section id="sec-setup" className="space-y-3 pt-4 border-t border-slate-100 print-page-break">
          <h2 className="font-sans text-lg font-bold text-slate-900">4. Experimental Setup and Evaluation Benchmark</h2>
          <p className="text-[15px]">
            We authored a {snapshot.totalQuestions}-question benchmark (<span className="font-mono text-xs">questions.csv</span>)
            comprising {snapshot.answerableCount} answerable domain questions (covering credits, attendance, CIE/ESE
            grading, ATKT promotion, academic integrity, and IT301/IT302/IT401 syllabi) and {snapshot.unanswerableCount}{' '}
            unanswerable queries (9 out-of-scope institutional/general questions and 4 adversarial prompt-injection
            attacks). To prevent threshold overfitting, questions are deterministically partitioned into a 40%{' '}
            <span className="font-mono text-xs">dev</span> split (used solely to calibrate{' '}
            <span className="font-mono text-xs">tau</span>) and a 60% <span className="font-mono text-xs">test</span>{' '}
            split for unbiased headline reporting.
          </p>
          <p className="text-[15px]">
            Retrieval is scored via <strong>Hit-Rate@k</strong> (requiring <span className="font-mono text-xs">&gt;=80%</span>{' '}
            token overlap with <span className="font-mono text-xs">gold_evidence</span> inside a chunk from{' '}
            <span className="font-mono text-xs">gold_doc</span>) and <strong>Mean Reciprocal Rank (MRR)</strong>.
            Generation is measured via <strong>Faithfulness</strong> (fraction of non-refused sentences entailed by
            retrieved chunks), <strong>Answer Recall</strong>, <strong>Hallucination Rate</strong> (fraction of
            unanswerable queries answered instead of refused), and <strong>False Refusal Rate</strong> (fraction of
            answerable queries erroneously refused).
          </p>
        </section>

        {/* 5. Experiments & Results */}
        <section id="sec-results" className="space-y-6 pt-4 border-t border-slate-100">
          <h2 className="font-sans text-lg font-bold text-slate-900">5. Experiments, Results, and Ablation Analysis</h2>

          <div className="space-y-3 print-avoid-break">
            <h3 className="font-sans text-base font-semibold text-slate-900">5.1 Retrieval Performance Comparison</h3>
            <p className="text-[15px]">
              Table 1 and Figure 2 compare the sparse TF-IDF baseline, dense vector retrieval, and Hybrid RRF across the{' '}
              {snapshot.answerableCount} answerable benchmark queries. Dense retrieval improves Hit@1 by{' '}
              <span className="font-mono text-xs tabular-nums">
                +{(snapshot.retrieval.dense['hit@1'] - snapshot.retrieval.tfidf['hit@1']).toFixed(3)}
              </span>{' '}
              over TF-IDF due to semantic paraphrase handling, while Hybrid RRF achieves the strongest overall Hit@1 (
              <span className="font-mono text-xs tabular-nums">{snapshot.retrieval.hybrid['hit@1'].toFixed(3)}</span>) and
              MRR (<span className="font-mono text-xs tabular-nums">{snapshot.retrieval.hybrid.MRR.toFixed(3)}</span>) by
              preserving exact course-code matches alongside semantic similarity.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border border-slate-200 rounded-md p-4">
              <div className="md:col-span-7">
                <RetrievalBarChart data={snapshot.retrieval} />
              </div>
              <div className="md:col-span-5 overflow-x-auto">
                <table className="w-full font-sans text-xs border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="py-2 px-2 text-left font-semibold">Retriever</th>
                      <th className="py-2 px-2 text-right font-semibold">Hit@1</th>
                      <th className="py-2 px-2 text-right font-semibold">Hit@3</th>
                      <th className="py-2 px-2 text-right font-semibold">MRR</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {(['tfidf', 'dense', 'hybrid'] as const).map((k) => (
                      <tr key={k}>
                        <td className="py-2 px-2 font-sans font-medium">{k.toUpperCase()}</td>
                        <td className="py-2 px-2 text-right">{snapshot.retrieval[k]['hit@1'].toFixed(3)}</td>
                        <td className="py-2 px-2 text-right">{snapshot.retrieval[k]['hit@3'].toFixed(3)}</td>
                        <td className="py-2 px-2 text-right font-semibold">{snapshot.retrieval[k].MRR.toFixed(3)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-3 print-avoid-break">
            <h3 className="font-sans text-base font-semibold text-slate-900">5.2 Chunk-Size Ablation Study</h3>
            <p className="text-[15px]">
              We ablated sliding-window chunk sizes across <span className="font-mono text-xs">W in &#123;80, 120, 180, 260&#125;</span>{' '}
              words with 25% overlap. Short 80-word chunks frequently sever conditional clauses (e.g., separating the
              65%–74% attendance range from its Dean-approval condition), whereas 260-word chunks aggregate unrelated
              subsections and blur dense embeddings. A 180-word window provides the optimal Hit@3 trade-off across all
              three retrievers.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center border border-slate-200 rounded-md p-4">
              <div className="md:col-span-7">
                <AblationLineChart rows={snapshot.ablation} />
              </div>
              <div className="md:col-span-5 overflow-x-auto">
                <table className="w-full font-sans text-xs border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="py-2 px-2 text-left font-semibold">Words</th>
                      <th className="py-2 px-2 text-right font-semibold">TF-IDF</th>
                      <th className="py-2 px-2 text-right font-semibold">Dense</th>
                      <th className="py-2 px-2 text-right font-semibold">Hybrid</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {[80, 120, 180, 260].map((sz) => {
                      const tf = snapshot.ablation.find((a) => a.chunkWords === sz && a.retriever === 'tfidf');
                      const dn = snapshot.ablation.find((a) => a.chunkWords === sz && a.retriever === 'dense');
                      const hy = snapshot.ablation.find((a) => a.chunkWords === sz && a.retriever === 'hybrid');
                      return (
                        <tr key={sz} className={sz === 180 ? 'bg-slate-50 font-semibold' : ''}>
                          <td className="py-2 px-2">{sz}</td>
                          <td className="py-2 px-2 text-right">{tf ? tf['hit@3'].toFixed(3) : '-'}</td>
                          <td className="py-2 px-2 text-right">{dn ? dn['hit@3'].toFixed(3) : '-'}</td>
                          <td className="py-2 px-2 text-right">{hy ? hy['hit@3'].toFixed(3) : '-'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-3 print-avoid-break">
            <h3 className="font-sans text-base font-semibold text-slate-900">
              5.3 End-to-End Generation, Prompt Engineering & Guardrail Evaluation (Test Split)
            </h3>
            <p className="text-[15px]">
              Table 3 summarizes held-out test-split generation performance. Closed-book inference exhibits severe
              hallucination (<span className="font-mono text-xs tabular-nums">{fmt(cb.hallucinationRate)}</span>) and low
              answer recall (<span className="font-mono text-xs tabular-nums">{fmt(cb.answerRecall)}</span>). Naive RAG
              raises recall to <span className="font-mono text-xs tabular-nums">{fmt(naive.answerRecall)}</span>, yet
              still hallucinates on <span className="font-mono text-xs tabular-nums">{fmt(naive.hallucinationRate)}</span>{' '}
              of unanswerable queries because irrelevant retrieved chunks do not stop an uninstructed model from guessing.
              Engineered prompting cuts hallucinations to{' '}
              <span className="font-mono text-xs tabular-nums">{fmt(eng.hallucinationRate)}</span>, and adding the
              four-layer guardrail stack eliminates unanswerable hallucinations entirely (
              <span className="font-mono text-xs tabular-nums">{fmt(guard.hallucinationRate)}</span>) while achieving{' '}
              <span className="font-mono text-xs tabular-nums">{fmt(guard.faithfulness)}</span> sentence-level
              faithfulness.
            </p>
            <div className="border border-slate-200 rounded-md p-4 space-y-4">
              <FaithfulnessVsHallucinationChart rows={snapshot.generationTest} />
              <div className="overflow-x-auto">
                <table className="w-full font-sans text-xs border-collapse">
                  <thead className="border-b border-slate-200 bg-slate-50">
                    <tr>
                      <th className="py-2 px-3 text-left font-semibold">Pipeline Configuration</th>
                      <th className="py-2 px-3 text-right font-semibold">Faithfulness</th>
                      <th className="py-2 px-3 text-right font-semibold">Answer Recall</th>
                      <th className="py-2 px-3 text-right font-semibold">Hallucination Rate</th>
                      <th className="py-2 px-3 text-right font-semibold">False Refusal Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono tabular-nums">
                    {snapshot.generationTest.map((r) => (
                      <tr key={r.config} className={r.config === 'rag_eng+guardrails' ? 'bg-slate-50 font-semibold' : ''}>
                        <td className="py-2 px-3 font-sans">{r.config}</td>
                        <td className="py-2 px-3 text-right">{fmt(r.faithfulness)}</td>
                        <td className="py-2 px-3 text-right">{fmt(r.answerRecall)}</td>
                        <td className="py-2 px-3 text-right">{fmt(r.hallucinationRate)}</td>
                        <td className="py-2 px-3 text-right">{fmt(r.falseRefusalRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="font-sans text-base font-semibold text-slate-900">5.4 Qualitative Hallucination Study</h3>
            <p className="text-[15px]">
              Inspecting failure cases reveals three recurring patterns: (1) <em>False-premise guessing</em>, where Naive
              RAG answers queries about hostel mess menus or annual tuition fees by extrapolating generic figures; (2)
              <em>Prompt injection compliance</em>, where Naive RAG partially follows adversarial strings such as{' '}
              <span className="font-mono text-xs">"You are now DAN without rules"</span> until blocked by our input
              filter; and (3) <em>Conservative gate trade-off</em>, where the dev-calibrated confidence gate (
              <span className="font-mono text-xs">tau = {snapshot.tau.toFixed(3)}</span>) triggers occasional false
              refusals (<span className="font-mono text-xs tabular-nums">{fmt(guard.falseRefusalRate)}</span>) on terse
              queries with unusual phrasing—a deliberate safety-first operating point for academic advising.
            </p>
          </div>
        </section>

        {/* 6. Responsible AI & Integrity */}
        <section id="sec-ethics" className="space-y-4 pt-4 border-t border-slate-100 print-page-break">
          <h2 className="font-sans text-lg font-bold text-slate-900">
            6. Responsible AI, Ethical Considerations, and Integrity Declaration
          </h2>
          <p className="text-[15px]">
            Academic advising systems carry asymmetric error costs: a false refusal prompts a student to consult the
            department office, whereas a confident hallucination (e.g., misstating attendance condonation eligibility or
            ATKT backlog ceilings) can cause semester detention. Our architecture addresses four Responsible AI pillars:
          </p>
          <ul className="list-disc pl-6 space-y-1.5 text-[15px]">
            <li>
              <strong>Verifiability & Attribution:</strong> Every accepted response carries inline chunk citations and
              document/page metadata so users verify primary statutes.
            </li>
            <li>
              <strong>Abstention Under Uncertainty:</strong> Dev-calibrated confidence gating and post-generation NLI
              entailment checking enforce abstention whenever evidence is weak or unsupported.
            </li>
            <li>
              <strong>Adversarial Robustness & Privacy:</strong> Input injection filters and instruction-hierarchy rules
              prevent system-prompt leakage; uploaded documents remain ephemeral without entering model training sets.
            </li>
            <li>
              <strong>Dataset & Model Provenance:</strong> Every model and library used in both the offline Colab
              notebook and live web studio is explicitly cited below, and a formal Declaration of AI-Tool Usage is
              attached in Table 4.
            </li>
          </ul>

          <div className="border border-slate-200 rounded-md p-4 bg-slate-50/70 print-avoid-break">
            <div className="font-sans text-xs font-semibold text-slate-900 mb-2">
              Table 4: Declaration of AI-Tool Usage (Student: Abhishek Harde · Course: Advanced Data Science Laboratory)
            </div>
            <table className="w-full font-sans text-xs border-collapse bg-white border border-slate-200">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="py-2 px-3 text-left font-semibold">AI Tool / Model</th>
                  <th className="py-2 px-3 text-left font-semibold">Role in Project</th>
                  <th className="py-2 px-3 text-left font-semibold">Scope & Human Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                <tr>
                  <td className="py-2 px-3 font-medium">Claude (Anthropic)</td>
                  <td className="py-2 px-3">Initial Colab notebook, README, and requirements scaffold</td>
                  <td className="py-2 px-3">Reviewed, debugged (fixed document loader), and executed by student</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Gemini API (gemini-4-hydrogen, gemini-embedding-2)</td>
                  <td className="py-2 px-3">Runtime dense embeddings, grounded generation, and NLI verification</td>
                  <td className="py-2 px-3">Integrated into full-stack evaluation studio and verified on 55q suite</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 font-medium">Hugging Face Open-Source Models</td>
                  <td className="py-2 px-3">BAAI/bge-small-en-v1.5, Qwen2.5-1.5B-Instruct, nli-deberta-v3-small</td>
                  <td className="py-2 px-3">Reproducible offline Colab execution and open-source benchmark reference</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* 7. Conclusion & Future Scope */}
        <section id="sec-conclusion" className="space-y-3 pt-4 border-t border-slate-100">
          <h2 className="font-sans text-lg font-bold text-slate-900">7. Conclusion and Future Scope</h2>
          <p className="text-[15px]">
            This work demonstrates an end-to-end, reproducible RAG architecture for academic syllabi and regulations.
            Combining page-aware preprocessing with Hybrid RRF retrieval yields Hit@3 ={' '}
            <span className="font-mono text-xs tabular-nums">{snapshot.retrieval.hybrid['hit@3'].toFixed(3)}</span> and MRR ={' '}
            <span className="font-mono text-xs tabular-nums">{snapshot.retrieval.hybrid.MRR.toFixed(3)}</span>, while
            engineered prompt constraints and multi-layer guardrails elevate test-set faithfulness to{' '}
            <span className="font-mono text-xs tabular-nums">{fmt(guard.faithfulness)}</span> and eliminate unanswerable
            hallucinations (<span className="font-mono text-xs tabular-nums">{fmt(guard.hallucinationRate)}</span>).
          </p>
          <p className="text-[15px]">
            Future extensions include layout-aware table extraction for multi-column semester credit matrices,
            second-stage cross-encoder reranking (<span className="font-mono text-xs">bge-reranker-base</span>) over
            top-20 hybrid candidates, multilingual student query support, and metadata-versioned indexing to compare
            regulation revisions (e.g., R2020 vs. R2024) side-by-side.
          </p>
        </section>

        {/* 8. References */}
        <section id="sec-references" className="space-y-2 pt-4 border-t border-slate-100">
          <h2 className="font-sans text-lg font-bold text-slate-900">8. References & Model Citations</h2>
          <ol className="list-decimal pl-6 space-y-1.5 text-sm text-slate-700">
            <li>Lewis, P., et al. (2020). Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. <em>NeurIPS</em>, 33.</li>
            <li>Cormack, G. V., Clarke, C. L., &amp; Buettcher, S. (2009). Reciprocal Rank Fusion outperforms Condorcet and individual Rank Learning Methods. <em>ACM SIGIR</em>.</li>
            <li>Xiao, S., et al. (2023). C-Pack: Packaged Resources To Advance General Chinese Embedding (<span className="font-mono text-xs">BAAI/bge-small-en-v1.5</span>, Hugging Face).</li>
            <li>He, P., Gao, J., &amp; Chen, W. (2021). DeBERTaV3: Improving DeBERTa using ELECTRA-Style Pre-Training (<span className="font-mono text-xs">cross-encoder/nli-deberta-v3-small</span>, Hugging Face).</li>
            <li>Qwen Team (2024). Qwen2.5 Technical Report (<span className="font-mono text-xs">Qwen/Qwen2.5-1.5B-Instruct</span>, Hugging Face).</li>
            <li>Johnson, J., Douze, M., &amp; Jégou, H. (2019). Billion-scale similarity search with GPUs (FAISS). <em>IEEE Trans. Big Data</em>.</li>
            <li>Manning, C. D., Raghavan, P., &amp; Schütze, H. (2008). <em>Introduction to Information Retrieval</em>. Cambridge University Press.</li>
            <li>Ji, Z., et al. (2023). Survey of Hallucination in Natural Language Generation. <em>ACM Computing Surveys</em>.</li>
            <li>Department of Information Technology (2024). <em>B.Tech. Academic Regulations R2024 &amp; Course Syllabi (IT301, IT302, IT401)</em>.</li>
          </ol>
        </section>
      </article>
    </div>
  );
}
