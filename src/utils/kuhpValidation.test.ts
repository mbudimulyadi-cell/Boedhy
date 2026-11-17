import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extractPasalNumber,
  findRelevantCorpusArticles,
  isPasalSpecificQuery,
  validatePasalInput,
} from '../data/kuhpCorpus.ts';

test('extractPasalNumber parses Pasal prefixes and plain digits', () => {
  assert.equal(extractPasalNumber('Pasal 458'), 458);
  assert.equal(extractPasalNumber('pasal 79 ayat 1'), 79);
  assert.equal(extractPasalNumber('476'), 476);
  assert.equal(extractPasalNumber('kasus pencurian di malam hari'), null);
});

test('isPasalSpecificQuery distinguishes article numbers from topic keywords', () => {
  assert.equal(isPasalSpecificQuery('Pasal 458'), true);
  assert.equal(isPasalSpecificQuery('458'), true);
  assert.equal(isPasalSpecificQuery('Pembunuhan'), false);
  assert.equal(isPasalSpecificQuery('Berita Bohong'), false);
});

test('validatePasalInput rejects out-of-range pasal > 624 politely', () => {
  const res = validatePasalInput('Pasal 999', 'bedah-pasal');
  assert.equal(res.valid, false);
  assert.ok(res.message?.includes('tidak ditemukan dalam korpus UU No. 1 Tahun 2023'));
  assert.ok(res.suggestions.length > 0);
});

test('validatePasalInput identifies WvS legacy numbers like Pasal 362 and suggests Pasal 476', () => {
  const res = validatePasalInput('Pasal 362', 'bedah-pasal');
  assert.equal(res.valid, true);
  assert.equal(res.wvsMatch?.pasal, 'Pasal 476');
  assert.ok(res.message?.includes('KUHP Lama (WvS)'));
});

test('findRelevantCorpusArticles retrieves multiple Pembunuhan articles by keyword', () => {
  const matches = findRelevantCorpusArticles('Pembunuhan', 8);
  assert.ok(matches.some((m) => m.pasal === 'Pasal 458'));
  assert.ok(matches.some((m) => m.pasal === 'Pasal 459'));
  assert.ok(matches.some((m) => m.pasal === 'Pasal 460'));
  assert.ok(matches.some((m) => m.pasal === 'Pasal 462'));
});
