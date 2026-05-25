import fs from 'node:fs';
import path from 'node:path';
import type { GoldenCategory, GoldenFixture } from './types';

const FIXTURES_DIR = path.join(__dirname, '..', 'fixtures');

export function loadFixturesByCategory(category: GoldenCategory): GoldenFixture[] {
  const dir = path.join(FIXTURES_DIR, category);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const raw = fs.readFileSync(path.join(dir, file), 'utf8');
      return JSON.parse(raw) as GoldenFixture;
    });
}

export function loadAllFixtures(): GoldenFixture[] {
  const categories: GoldenCategory[] = [
    'clarify',
    'no-clarify',
    'no-hallucination',
    'multi-turn',
    'tool-use',
    'sub-agent',
  ];
  return categories.flatMap((cat) => loadFixturesByCategory(cat));
}
