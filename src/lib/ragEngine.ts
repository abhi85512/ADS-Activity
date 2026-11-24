import { EvalQuestion } from '../data/academicCorpus';

export interface TextChunk {
  id: number;
  doc: string;
  page: number;
  text: string;
}

export interface RetrievalHit {
  chunk: TextChunk;
  score: number;
  rank: number;
}

export interface RetrievalMetrics {
  'hit@1': number;
  'hit@3': number;
  'hit@5': number;
  MRR: number;
}

export const REFUSAL_TEXT = 'I could not find this in the provided documents.';

export const INJECTION_REGEX =
  /ignore (all |any )?(previous|prior|above) (instructions|rules)|forget (all |any )?(previous|prior) (instructions|rules)|system prompt|you are now|jailbreak/i;

export function preprocessAcademicText(raw: string): string {
  const lines = raw.replace(/\r\n/g, '\n').split('\n');
  const filtered = lines.filter((line) => {
    const trimmed = line.trim();
    if (!trimmed) return true;
    if (/^page\s+\d+\s+of\s+\d+$/i.test(trimmed)) return false;
    if (/^department of information technology\s+—\s+(r2024 handbook|syllabus r2024|academic regulations r2024)$/i.test(trimmed)) {
      return false;
    }
    return true;
  });

  return filtered
    .join('\n')
    // De-hyphenate line-break split words
    .replace(/([a-zA-Z])-\n([a-zA-Z])/g, '$1$2')
    // Collapse multiple blank lines / whitespace cleanly
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function makeChunks(
  pages: Array<{ doc: string; page: number; text: string }>,
  size = 180,
  overlap = 40
): TextChunk[] {
  const chunks: TextChunk[] = [];
  const step = Math.max(1, size - overlap);

  for (const pg of pages) {
    const words = pg.text.split(/\s+/).filter(Boolean);
    for (let s = 0; s < words.length; s += step) {
      const piece = words.slice(s, s + size);
      if (piece.length < 20 && s > 0) break;
      chunks.push({
        id: chunks.length,
        doc: pg.doc,
        page: pg.page,
        text: piece.join(' '),
      });
      if (s + size >= words.length) break;
    }
  }
  return chunks;
}

export function normTokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []);
}

export function evidenceHit(evidence: string, chunkText: string, thr = 0.8): boolean {
  const et = normTokens(evidence);
  if (et.length === 0) return false;
  const ts = new Set(normTokens(chunkText));
  let matched = 0;
  for (const tok of et) {
    if (ts.has(tok)) matched++;
  }
  return matched / et.length >= thr;
}

export function answerRecall(gold: string, ans: string): number | null {
  const g = new Set(normTokens(gold));
  if (g.size === 0) return null;
  const a = new Set(normTokens(ans));
  let overlap = 0;
  for (const tok of g) {
    if (a.has(tok)) overlap++;
  }
  return overlap / g.size;
}

function tokenizeNgrams(text: string): string[] {
  const unigrams = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  const tokens = [...unigrams];
  for (let i = 0; i < unigrams.length - 1; i++) {
    tokens.push(`${unigrams[i]} ${unigrams[i + 1]}`);
  }
  return tokens;
}

export class TfidfRetriever {
  readonly name = 'tfidf';
  readonly chunks: TextChunk[];
  private idf = new Map<string, number>();
  private docVecs: Array<Map<string, number>> = [];

  constructor(chunks: TextChunk[]) {
    this.chunks = chunks;
    const nDocs = chunks.length;
    const df = new Map<string, number>();
    const rawTfs: Array<Map<string, number>> = [];

    for (const chunk of chunks) {
      const tf = new Map<string, number>();
      const seen = new Set<string>();
      for (const tok of tokenizeNgrams(chunk.text)) {
        tf.set(tok, (tf.get(tok) ?? 0) + 1);
        if (!seen.has(tok)) {
          seen.add(tok);
          df.set(tok, (df.get(tok) ?? 0) + 1);
        }
      }
      rawTfs.push(tf);
    }

    for (const [term, count] of df.entries()) {
      this.idf.set(term, Math.log((1 + nDocs) / (1 + count)) + 1);
    }

    this.docVecs = rawTfs.map((tf) => {
      const vec = new Map<string, number>();
      let normSq = 0;
      for (const [term, count] of tf.entries()) {
        const sublinearTf = 1 + Math.log(count);
        const w = sublinearTf * (this.idf.get(term) ?? 1);
        vec.set(term, w);
        normSq += w * w;
      }
      const norm = Math.sqrt(normSq) || 1;
      for (const [term, w] of vec.entries()) {
        vec.set(term, w / norm);
      }
      return vec;
    });
  }

  search(query: string, k = 5): RetrievalHit[] {
    const qtf = new Map<string, number>();
    for (const tok of tokenizeNgrams(query)) {
      qtf.set(tok, (qtf.get(tok) ?? 0) + 1);
    }
    const qvec = new Map<string, number>();
    let qNormSq = 0;
    for (const [term, count] of qtf.entries()) {
      const idf = this.idf.get(term);
      if (idf === undefined) continue;
      const w = (1 + Math.log(count)) * idf;
      qvec.set(term, w);
      qNormSq += w * w;
    }
    const qNorm = Math.sqrt(qNormSq) || 1;
    for (const [term, w] of qvec.entries()) {
      qvec.set(term, w / qNorm);
    }

    const scored: Array<{ idx: number; score: number }> = [];
    for (let i = 0; i < this.docVecs.length; i++) {
      const dvec = this.docVecs[i];
      let dot = 0;
      for (const [term, qw] of qvec.entries()) {
        const dw = dvec.get(term);
        if (dw !== undefined) dot += qw * dw;
      }
      scored.push({ idx: i, score: dot });
    }

    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map((item, rank) => ({
      chunk: this.chunks[item.idx],
      score: item.score,
      rank: rank + 1,
    }));
  }
}

export function normalizeVector(vec: number[]): number[] {
  let normSq = 0;
  for (const v of vec) normSq += v * v;
  const norm = Math.sqrt(normSq) || 1;
  return vec.map((v) => v / norm);
}

export function dotProduct(a: number[], b: number[]): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) sum += a[i] * b[i];
  return sum;
}

export class DenseVectorRetriever {
  readonly name = 'dense';
  readonly chunks: TextChunk[];
  readonly vectors: number[][];

  constructor(chunks: TextChunk[], vectors: number[][]) {
    this.chunks = chunks;
    this.vectors = vectors.map(normalizeVector);
  }

  searchByVector(queryVector: number[], k = 5): RetrievalHit[] {
    const q = normalizeVector(queryVector);
    const scored = this.vectors.map((vec, idx) => ({
      idx,
      score: dotProduct(q, vec),
    }));
    scored.sort((a, b) => b.score - a.score);
    return scored.slice(0, k).map((item, rank) => ({
      chunk: this.chunks[item.idx],
      score: item.score,
      rank: rank + 1,
    }));
  }
}

export function reciprocalRankFusion(
  chunks: TextChunk[],
  tfidfHits: RetrievalHit[],
  denseHits: RetrievalHit[],
  k = 5,
  kRrf = 60
): RetrievalHit[] {
  const scores = new Map<number, number>();
  for (const list of [tfidfHits, denseHits]) {
    list.forEach((hit, idx) => {
      const prev = scores.get(hit.chunk.id) ?? 0;
      scores.set(hit.chunk.id, prev + 1 / (kRrf + idx + 1));
    });
  }
  const chunkMap = new Map(chunks.map((c) => [c.id, c]));
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, k)
    .map(([id, score], rank) => ({
      chunk: chunkMap.get(id)!,
      score,
      rank: rank + 1,
    }));
}

export function evalRetrievalResults(
  questions: EvalQuestion[],
  searchFn: (question: string, maxK: number) => RetrievalHit[],
  ks: number[] = [1, 3, 5]
): RetrievalMetrics {
  const answerableQs = questions.filter((q) => q.answerable === 1);
  const firstRanks: Array<number | null> = [];
  const maxK = Math.max(...ks);

  for (const q of answerableQs) {
    const hits = searchFn(q.question, maxK);
    let first: number | null = null;
    for (let idx = 0; idx < hits.length; idx++) {
      const c = hits[idx].chunk;
      const docMatch = !q.gold_doc || c.doc === q.gold_doc;
      if (docMatch && evidenceHit(q.gold_evidence, c.text)) {
        first = idx + 1;
        break;
      }
    }
    firstRanks.push(first);
  }

  const n = Math.max(1, firstRanks.length);
  const hitAt = (k: number) =>
    firstRanks.filter((r) => r !== null && r <= k).length / n;
  const mrr =
    firstRanks.reduce<number>((acc, r) => acc + (r !== null ? 1 / r : 0), 0) / n;

  return {
    'hit@1': Number(hitAt(1).toFixed(3)),
    'hit@3': Number(hitAt(3).toFixed(3)),
    'hit@5': Number(hitAt(5).toFixed(3)),
    MRR: Number(mrr.toFixed(3)),
  };
}
