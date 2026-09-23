import { SEED_QUESTIONS } from '../src/data/questions';
import * as fs from 'fs';
import * as path from 'path';

function escapeSql(str: string | undefined): string {
  if (str === undefined || str === null) return 'NULL';
  return `'${str.replace(/'/g, "''")}'`;
}

function generateSeed() {
  const values = SEED_QUESTIONS.map(q => {
    return `(
      ${escapeSql(q.text)},
      ${q.referenceAnswer},
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
      ARRAY[${q.tags.map(t => escapeSql(t)).join(', ')}]::text[],
      'active'
    )`;
  });

  const sql = `
-- Insert Seed Questions
INSERT INTO questions (
  text,
  reference_answer,
  unit,
  unit_plural,
  category,
  difficulty,
  explanation,
  estimation_approach,
  hint,
  source,
  source_name,
  reference_period,
  uncertainty_low,
  uncertainty_high,
  tags,
  status
) VALUES 
${values.join(',\n')};
`;

  fs.writeFileSync(path.join(__dirname, '../supabase/seed.sql'), sql.trim());
  console.log('Successfully generated supabase/seed.sql');
}

generateSeed();
