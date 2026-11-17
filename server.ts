import 'dotenv/config';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  KUHP_CORPUS,
  TOTAL_PASAL_UU_1_2023,
  findRelevantCorpusArticles,
} from './src/data/kuhpCorpus.ts';
import {
  runBedahPasalLocal,
  runKomparatorLocal,
  runSimulatorKasusLocal,
  runSocraticTurnLocal,
} from './src/utils/legalAnalysisEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DAILY_LIMIT = 200;

// In-memory daily quota tracker per IP
const quotaStore = new Map<string, { dateKey: string; count: number }>();

function getQuotaStatus(ip: string) {
  const dateKey = new Date().toISOString().slice(0, 10);
  const current = quotaStore.get(ip);
  if (!current || current.dateKey !== dateKey) {
    return { used: 0, limit: DAILY_LIMIT, remaining: DAILY_LIMIT, dateKey };
  }
  return {
    used: current.count,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - current.count),
    dateKey,
  };
}

function consumeQuota(ip: string) {
  const status = getQuotaStatus(ip);
  const nextCount = status.used + 1;
  quotaStore.set(ip, { dateKey: status.dateKey, count: nextCount });
  return {
    allowed: true,
    used: nextCount,
    limit: DAILY_LIMIT,
    remaining: Math.max(0, DAILY_LIMIT - nextCount),
    dateKey: status.dateKey,
  };
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '1mb' }));

  app.get('/api/kuhp/quota', (req, res) => {
    const ip = req.ip || 'local';
    res.json(getQuotaStatus(ip));
  });

  app.post('/api/kuhp/analyze', (req, res) => {
    try {
      const { module, query } = req.body as {
        module?: string;
        query?: string;
      };

      const safeQuery = typeof query === 'string' ? query.trim() : '';
      const ip = req.ip || 'local';
      const quota = consumeQuota(ip);

      if (module === 'bedah-pasal') {
        const result = runBedahPasalLocal(safeQuery || 'Pembunuhan');
        res.json({ result, quota });
        return;
      }

      if (module === 'komparator') {
        const result = runKomparatorLocal(safeQuery || 'Pembunuhan');
        res.json({ result, quota });
        return;
      }

      if (module === 'simulator-kasus') {
        const result = runSimulatorKasusLocal(safeQuery);
        res.json({ result, quota });
        return;
      }

      const fallback = runBedahPasalLocal(safeQuery || 'Pasal 476');
      res.json({ result: fallback, quota });
    } catch (err) {
      console.error('[Klinik KUHP Analyze]', err);
      const ip = req.ip || 'local';
      res.json({
        result: runBedahPasalLocal('Pasal 476'),
        quota: getQuotaStatus(ip),
      });
    }
  });

  app.post('/api/kuhp/socratic', (req, res) => {
    try {
      const { messages } = req.body as {
        messages?: { role: 'user' | 'assistant'; content: string }[];
      };
      const safeMessages =
        Array.isArray(messages) && messages.length > 0
          ? messages
          : [{ role: 'user' as const, content: 'Pasal 1 dan Pasal 2 UU 1/2023' }];

      const ip = req.ip || 'local';
      const quota = consumeQuota(ip);
      const reply = runSocraticTurnLocal(safeMessages);
      res.json({ reply, quota });
    } catch (err) {
      console.error('[Klinik KUHP Socratic]', err);
      const ip = req.ip || 'local';
      res.json({
        reply: runSocraticTurnLocal([{ role: 'user', content: 'Pasal 1 dan Pasal 2 UU 1/2023' }]),
        quota: getQuotaStatus(ip),
      });
    }
  });

  // Lookup corpus endpoint for Sanction Calculator auto-fill & Korpus Directory
  app.get('/api/kuhp/corpus', (req, res) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    if (!q) {
      res.json({ articles: KUHP_CORPUS, totalPasalUU: TOTAL_PASAL_UU_1_2023 });
      return;
    }
    res.json({
      articles: findRelevantCorpusArticles(q, 8),
      totalPasalUU: TOTAL_PASAL_UU_1_2023,
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Klinik KUHP server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start Klinik KUHP server:', err);
  process.exit(1);
});
