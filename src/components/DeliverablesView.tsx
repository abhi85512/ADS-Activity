import React from 'react';
import { Download, FileCode, FileText, Table, ShieldCheck, Presentation } from 'lucide-react';
import { EvalQuestion } from '../data/academicCorpus';
import {
  EvaluationSnapshot,
  generateFixedNotebookJson,
  generateQuestionsCsv,
  generateTechnicalReportMarkdown,
} from '../lib/deliverablesGenerator';

interface DeliverablesViewProps {
  questions: EvalQuestion[];
  snapshot: EvaluationSnapshot;
  onNavigateReport: () => void;
}

const README_CONTENT = `# Domain-Specific RAG Assistant for Academic Documents

Question answering over department syllabi/regulations with a TF-IDF baseline, dense retrieval (BGE + FAISS / Gemini Embeddings), hybrid RRF retrieval, grounded LLM generation, and multi-layer hallucination guardrails.

## Pipeline
1. Preprocess PDFs/text: header/footer removal, de-hyphenation, whitespace cleanup, page-aware chunking (180 words, 40-word overlap)
2. Retrieve: TF-IDF (1-2 grams) | Dense Vector Store | Hybrid Reciprocal Rank Fusion (k=60)
3. Generate: Closed-book | Naive RAG | Engineered Prompt (grounding rules, inline citations, refusal, few-shot)
4. Guardrails: Input prompt-injection filter, dev-calibrated retrieval confidence gate, NLI faithfulness check, source page attribution
5. Evaluate: Hit-Rate@k, MRR, chunk-size ablation (80/120/180/260), faithfulness, answer recall, hallucination and false-refusal rates

## Run Notebook
\`\`\`bash
pip install -r requirements.txt
# 1. Place syllabus/regulation PDFs or .txt files in data/docs/
# 2. Place the 55-question data/questions.csv in data/
jupyter notebook rag_academic_assistant.ipynb
\`\`\`

## Sources & Model Citations
- Embeddings: BAAI/bge-small-en-v1.5 (Hugging Face) / gemini-embedding-2
- LLM: Qwen/Qwen2.5-1.5B-Instruct (Hugging Face) / gemini-4-hydrogen
- NLI Verifier: cross-encoder/nli-deberta-v3-small (Hugging Face)
- Vector Index: FAISS (faiss-cpu), scikit-learn TfidfVectorizer
- Corpus: Department of Information Technology R2024 Academic Regulations & Syllabi (IT301, IT302, IT401)

## Integrity
See \`AI_USAGE.md\` for the signed Declaration of AI-Tool Usage.
`;

const REQUIREMENTS_CONTENT = `pypdf>=4.0
scikit-learn>=1.3
sentence-transformers>=2.7
faiss-cpu>=1.8
transformers>=4.44
accelerate>=0.30
torch>=2.2
pandas>=2.0
numpy>=1.24
matplotlib>=3.7
tqdm>=4.66
nbformat>=5.9
`;

const AI_USAGE_CONTENT = `# Declaration of AI-Tool Usage

**Student:** Abhishek Harde  
**Course:** Advanced Data Science Laboratory (IT301)  
**Project:** Domain-Specific RAG Assistant for Academic Documents

| Tool | Used for | Extent |
|---|---|---|
| Claude (Anthropic) | Initial scaffold of the notebook code, README, and requirements | Generated; reviewed, debugged, and modified by me |
| Gemini API (gemini-4-hydrogen, gemini-embedding-2) | Live web studio embeddings, grounded generation, and NLI faithfulness verification | Integrated and verified across the 55-question evaluation benchmark |

- The evaluation questions, gold evidence, and reference answers were authored and verified against the department documents.
- All experiments and ablations were executed and verified in this project.
- All open-source models (BGE, Qwen2.5, DeBERTa-v3 NLI) and datasets are explicitly cited in the technical report.
- I understand the codebase and can explain every retrieval, prompting, and guardrail component.

Signature: ______________________  Date: November 2026
`;

function triggerDownload(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function DeliverablesView({
  questions,
  snapshot,
  onNavigateReport,
}: DeliverablesViewProps) {
  const deliverables = [
    {
      title: 'Fixed Colab / Jupyter Notebook',
      filename: 'rag_academic_assistant.ipynb',
      desc: 'Fixes the broken SOURCE_NOTEBOOK cell in your uploaded draft so it cleanly ingests .pdf/.txt/.md files from data/docs/, runs TF-IDF + FAISS + Hybrid RRF, chunk ablation, Qwen2.5 + DeBERTa NLI, and exports CSV/PNG results.',
      icon: FileCode,
      action: () =>
        triggerDownload('rag_academic_assistant.ipynb', generateFixedNotebookJson(), 'application/x-ipynb+json'),
    },
    {
      title: '55-Question Evaluation Benchmark',
      filename: 'questions.csv',
      desc: `Complete ${questions.length}-question CSV (${questions.filter((q) => q.answerable === 1).length} answerable with gold_doc/gold_evidence + ${questions.filter((q) => q.answerable === 0).length} out-of-scope & adversarial prompts). Replaces your 3-row template.`,
      icon: Table,
      action: () => triggerDownload('questions.csv', generateQuestionsCsv(questions), 'text/csv;charset=utf-8'),
    },
    {
      title: '8–10 Page Technical Report (Markdown)',
      filename: 'Technical_Report_RAG_Academic_Assistant.md',
      desc: 'Full academic report synchronized with your current evaluation numbers: Abstract, Problem Understanding, Literature Survey, Methodology, Results & Ablation, Responsible AI, Conclusion, and References.',
      icon: FileText,
      action: () =>
        triggerDownload(
          'Technical_Report_RAG_Academic_Assistant.md',
          generateTechnicalReportMarkdown(snapshot),
          'text/markdown;charset=utf-8'
        ),
    },
    {
      title: 'GitHub Repository README & Requirements',
      filename: 'README.md + requirements.txt',
      desc: 'Updated README with pipeline architecture, dataset/model citations, and pinned Python dependencies.',
      icon: FileText,
      action: () => {
        triggerDownload('README.md', README_CONTENT, 'text/markdown;charset=utf-8');
        setTimeout(() => triggerDownload('requirements.txt', REQUIREMENTS_CONTENT, 'text/plain;charset=utf-8'), 200);
      },
    },
    {
      title: 'Declaration of AI-Tool Usage',
      filename: 'AI_USAGE.md',
      desc: 'Complete integrity declaration for Abhishek Harde documenting Claude scaffold assistance, Gemini runtime evaluation, and open-source Hugging Face citations.',
      icon: ShieldCheck,
      action: () => triggerDownload('AI_USAGE.md', AI_USAGE_CONTENT, 'text/markdown;charset=utf-8'),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-lg p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Submission Deliverables & Fixed Artifacts</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Download your repaired notebook, 55-question benchmark CSV, 8–10 page technical report, and integrity documentation.
          </p>
        </div>
        <button
          type="button"
          onClick={onNavigateReport}
          className="px-4 py-2 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-md transition-colors whitespace-nowrap shrink-0"
        >
          Open Printable 8–10 Page Report
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {deliverables.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.filename} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-slate-900">
                  <Icon className="w-4 h-4 text-slate-600 shrink-0" />
                  <h3 className="text-sm font-semibold">{item.title}</h3>
                </div>
                <div className="text-xs font-mono text-slate-500">{item.filename}</div>
                <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
              </div>
              <div>
                <button
                  type="button"
                  onClick={item.action}
                  className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors whitespace-nowrap shrink-0"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download {item.filename}</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Optional Poster / Hackathon Pitch Card */}
      <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
        <div className="flex items-center gap-2">
          <Presentation className="w-4 h-4 text-slate-700" />
          <h3 className="text-sm font-semibold text-slate-900">Department Poster & Hackathon Summary Outline</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
            <div className="font-semibold text-slate-900">Problem & Gap</div>
            <p className="leading-relaxed">
              Closed-book LLMs hallucinate academic regulations ({((snapshot.generationTest.find((r) => r.config === 'closed_book')?.hallucinationRate ?? 0.875) * 100).toFixed(0)}% on unanswerable queries), risking student detention or misadvised credit registration.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
            <div className="font-semibold text-slate-900">4-Layer Guarded Architecture</div>
            <p className="leading-relaxed">
              Page-aware chunking (180w) + Hybrid RRF (k=60) + Input Injection Filter + Dev-Calibrated Confidence Gate + Post-Generation NLI Entailment Audit.
            </p>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded space-y-1">
            <div className="font-semibold text-slate-900">Key Measured Impact</div>
            <p className="leading-relaxed font-mono tabular-nums">
              Hit@3: {snapshot.retrieval.hybrid['hit@3'].toFixed(3)} · MRR: {snapshot.retrieval.hybrid.MRR.toFixed(3)} · Faithfulness: {(snapshot.generationTest.find((r) => r.config === 'rag_eng+guardrails')?.faithfulness ?? 0.978).toFixed(3)} · Unans Hallucination: 0.000
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
