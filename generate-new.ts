import { AI_GENERATED_QUESTIONS } from './src/data/ai_questions';
import * as fs from 'fs';

function escapeSql(str: string | undefined | null): string {
  if (str === undefined || str === null) return 'NULL';
  return "'" + (str as string).replace(/'/g, "''") + "'";
}

const values = AI_GENERATED_QUESTIONS.map((q: any) => `(
  ${escapeSql(q.text)},
  ${escapeSql(q.referenceAnswer)},
  ${escapeSql(q.unit)},
  ${escapeSql(q.unitPlural)},
  ${escapeSql(q.category)},
  ${escapeSql(q.difficulty)},
  ${escapeSql(q.explanation)},
  ${escapeSql(q.estimationApproach)},
  ${escapeSql(q.hint)},
  ${escapeSql(q.source)},
  ${escapeSql(q.sourceName)},
  ${escapeSql(q.referencePeriod)},
  ${q.uncertaintyLow || 'NULL'},
  ${q.uncertaintyHigh || 'NULL'},
  ARRAY[${Array.isArray(q.tags) ? q.tags.map((t: string) => escapeSql(t)).join(', ') : ''}]::text[],
  'active'
)`);

const sql = `INSERT INTO questions (text, reference_answer, unit, unit_plural, category, difficulty, explanation, estimation_approach, hint, source, source_name, reference_period, uncertainty_low, uncertainty_high, tags, status) VALUES \n${values.join(',\n')};\n`;

fs.writeFileSync('./supabase/seed_new_only.sql', sql);
console.log('Done!');
