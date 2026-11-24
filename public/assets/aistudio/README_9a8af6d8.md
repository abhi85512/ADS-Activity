# Domain-Specific RAG Assistant for Academic Documents

Question answering over department syllabi/regulations with a TF-IDF baseline, dense retrieval (BGE + FAISS), hybrid RRF retrieval, grounded LLM generation (Qwen2.5-1.5B-Instruct), and hallucination guardrails.

## Pipeline
1. Preprocess PDFs/text: header/footer removal, de-hyphenation, whitespace cleanup, page-aware chunking
2. Retrieve: TF-IDF (1-2 grams) | dense (bge-small-en-v1.5 + FAISS) | hybrid (reciprocal rank fusion)
3. Generate: closed-book | naive RAG | engineered prompt (grounding rules, citations, refusal, few-shot)
4. Guardrails: input injection filter, retrieval-confidence gate (threshold tuned on dev split), NLI faithfulness check, source citation
5. Evaluate: hit-rate@k, MRR, chunk-size ablation, faithfulness, answer recall, hallucination and false-refusal rates

## Run
```bash
pip install -r requirements.txt
# 1. put syllabus/regulation PDFs in data/docs/
# 2. fill data/questions.csv (>=50 questions, >=10 with answerable=0)
jupyter notebook rag_academic_assistant.ipynb      # or open in Colab with a GPU runtime
```
Outputs (CSV tables and `summary.png`) are written to `results/`.

## questions.csv schema
| column | meaning |
|---|---|
| question | self-written question |
| answerable | 1 if the docs contain the answer, 0 otherwise |
| gold_doc | file name holding the evidence (answerable only) |
| gold_evidence | short verbatim phrase from the source |
| gold_answer | short reference answer |
| category | e.g. syllabus, credits, exam, attendance, out-of-scope, adversarial |

## Sources and citations
List every document and model here before submission (document name, issuing body, year, URL/provenance).
- Embeddings: BAAI/bge-small-en-v1.5 (Hugging Face)
- LLM: Qwen/Qwen2.5-1.5B-Instruct (Hugging Face)
- NLI: cross-encoder/nli-deberta-v3-small (Hugging Face)
- Documents: <add yours>

## Integrity
See `AI_USAGE.md` for the AI-tool usage declaration.
