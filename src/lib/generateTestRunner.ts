const FUNC_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-test`;
const ANON = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export type Difficulty = 'easy' | 'moderate' | 'hard' | 'very_hard';

export interface Bucket {
  subject?: string;
  chapters?: string[];
  topics?: string[];
  classLevel?: string;
  count: number;
}

interface RunOptions {
  examType: 'JEE' | 'NEET';
  difficulty: Difficulty;
  includeInteger: boolean;
  duration: number;
  title: string;
  classLevel?: string;
  subject?: string;
  chapter?: string;
  userId: string;
  buckets: Bucket[];
  onProgress: (done: number) => void;
}

const post = async (body: unknown) => {
  const resp = await fetch(FUNC_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${ANON}` },
    body: JSON.stringify(body),
  });
  const data = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(data?.error || 'Generation request failed');
  return data;
};

const BATCH_SIZE = 8;
const CONCURRENCY = 5;

/** Splits the work into small parallel batches so big papers generate fast and report progress. */
export const runTestGeneration = async (opts: RunOptions) => {
  const totalQuestions = opts.buckets.reduce((s, b) => s + b.count, 0);

  const { testId } = await post({
    phase: 'create',
    title: opts.title,
    examType: opts.examType,
    subject: opts.subject || null,
    chapter: opts.chapter || null,
    classLevel: opts.classLevel || null,
    duration: opts.duration,
    marks: totalQuestions * 4,
    difficulty: opts.difficulty,
    includeInteger: opts.includeInteger,
    userId: opts.userId,
  });

  // Build batch jobs
  type Job = Record<string, unknown> & { count: number };
  const jobs: Job[] = [];
  let cursor = 1;
  for (const bucket of opts.buckets) {
    let remaining = bucket.count;
    while (remaining > 0) {
      const count = Math.min(BATCH_SIZE, remaining);
      const integerCount = opts.includeInteger ? Math.max(1, Math.round(count * 0.2)) : 0;
      jobs.push({
        phase: 'batch',
        testId,
        startNumber: cursor,
        count,
        integerCount: Math.min(integerCount, count),
        examType: opts.examType,
        difficulty: opts.difficulty,
        subject: bucket.subject,
        chapters: bucket.chapters || [],
        topics: bucket.topics || [],
        classLevel: bucket.classLevel,
      });
      cursor += count;
      remaining -= count;
    }
  }

  let done = 0;
  let failures = 0;
  let index = 0;

  const worker = async () => {
    while (index < jobs.length) {
      const job = jobs[index++];
      try {
        const res = await post(job);
        done += res?.inserted ?? job.count;
      } catch {
        failures += 1;
      }
      opts.onProgress(done);
    }
  };

  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, jobs.length) }, worker));

  const final = await post({ phase: 'finalize', testId });
  if (!final?.questionCount) throw new Error('AI could not generate any questions. Please try again.');

  return { testId, questionCount: final.questionCount as number, failures };
};
