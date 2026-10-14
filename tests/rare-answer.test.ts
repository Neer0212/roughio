// tests/rare-answer.test.ts
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import {
  RARE_ANSWER_PROMPTS,
  getPromptById,
  getRandomSessionPrompts,
} from '../src/lib/games/rare-answer/prompts.ts';
import {
  normalizeAnswer,
  checkLocalAnswer,
  createUnlistedValidResult,
  createUnlistedInvalidResult,
  createUnrecognizedResult,
  getTierInfo,
  UNLISTED_RARE_POINTS,
} from '../src/lib/games/rare-answer/validator.ts';

describe('Rare Answer - Normalization Logic', () => {
  it('converts uppercase to lowercase and trims surrounding whitespace', () => {
    assert.equal(normalizeAnswer('  PLATYPUS  '), 'platypus');
    assert.equal(normalizeAnswer('TURTLE'), 'turtle');
  });

  it('strips accents and diacritics cleanly', () => {
    assert.equal(normalizeAnswer("Côte d'Ivoire"), 'cote divoire');
    assert.equal(normalizeAnswer('Français'), 'francais');
    assert.equal(normalizeAnswer('São Tomé'), 'sao tome');
  });

  it('strips leading English articles (the, a, an)', () => {
    assert.equal(normalizeAnswer('The Platypus'), 'platypus');
    assert.equal(normalizeAnswer('a sea turtle'), 'sea turtle');
    assert.equal(normalizeAnswer('an echidna'), 'echidna');
    // Does not strip "an" or "the" in the middle of words
    assert.equal(normalizeAnswer('ant'), 'ant');
  });

  it('replaces hyphens with spaces and strips non-alphanumeric punctuation', () => {
    assert.equal(normalizeAnswer('duck-billed platypus'), 'duck billed platypus');
    assert.equal(normalizeAnswer('Snake!'), 'snake');
    assert.equal(normalizeAnswer('C++...'), 'c');
  });

  it('collapses multiple internal whitespace', () => {
    assert.equal(normalizeAnswer('short   beaked   echidna'), 'short beaked echidna');
  });

  it('handles empty or non-string input safely', () => {
    assert.equal(normalizeAnswer(''), '');
    assert.equal(normalizeAnswer('   '), '');
  });
});

describe('Rare Answer - Prompt Pool & Data Integrity', () => {
  it('contains at least 15 distinct prompts across varied categories', () => {
    assert.ok(RARE_ANSWER_PROMPTS.length >= 15);
    const ids = new Set(RARE_ANSWER_PROMPTS.map((p) => p.id));
    assert.equal(ids.size, RARE_ANSWER_PROMPTS.length);
  });

  it('ensures each prompt has non-empty reference answers with valid tiers and points', () => {
    for (const prompt of RARE_ANSWER_PROMPTS) {
      assert.ok(prompt.id.length > 0);
      assert.ok(prompt.prompt.length > 0);
      assert.ok(prompt.category.length > 0);
      assert.ok(prompt.referenceAnswers.length >= 4);

      for (const ref of prompt.referenceAnswers) {
        assert.ok(ref.canonical.length > 0);
        assert.ok(['common', 'uncommon', 'rare'].includes(ref.tier));
        assert.ok(ref.points >= 300 && ref.points <= 1000);
      }
    }
  });

  it('looks up prompt by ID or returns undefined', () => {
    const eggPrompt = getPromptById('animals-egg-layers-no-birds');
    assert.ok(eggPrompt);
    assert.equal(eggPrompt.category, 'Animals & Biology');

    const nonExistent = getPromptById('non-existent-prompt-id');
    assert.equal(nonExistent, undefined);
  });

  it('selects unique session prompts via getRandomSessionPrompts', () => {
    const sessionPrompts = getRandomSessionPrompts(5);
    assert.equal(sessionPrompts.length, 5);
    const ids = new Set(sessionPrompts.map((p) => p.id));
    assert.equal(ids.size, 5);
  });
});

describe('Rare Answer - Local Validation & Scoring Tiers', () => {
  const eggPrompt = getPromptById('animals-egg-layers-no-birds')!;

  it('recognizes common reference answers and awards common tier points (350 pts)', () => {
    const snakeResult = checkLocalAnswer(eggPrompt, 'Snake');
    assert.ok(snakeResult);
    assert.equal(snakeResult.valid, true);
    assert.equal(snakeResult.tier, 'common');
    assert.equal(snakeResult.score, 350);
    assert.equal(snakeResult.canonicalAnswer, 'Snake');

    const turtleResult = checkLocalAnswer(eggPrompt, 'turtle');
    assert.ok(turtleResult);
    assert.equal(turtleResult.valid, true);
    assert.equal(turtleResult.score, 350);
  });

  it('recognizes uncommon reference answers and awards uncommon tier points (650 pts)', () => {
    const platypusResult = checkLocalAnswer(eggPrompt, 'Platypus');
    assert.ok(platypusResult);
    assert.equal(platypusResult.valid, true);
    assert.equal(platypusResult.tier, 'uncommon');
    assert.equal(platypusResult.score, 650);
    assert.equal(platypusResult.canonicalAnswer, 'Platypus');
  });

  it('recognizes rare reference answers and awards rare tier points (950 pts)', () => {
    const echidnaResult = checkLocalAnswer(eggPrompt, 'Echidna');
    assert.ok(echidnaResult);
    assert.equal(echidnaResult.valid, true);
    assert.equal(echidnaResult.tier, 'rare');
    assert.equal(echidnaResult.score, 950);
    assert.equal(echidnaResult.canonicalAnswer, 'Echidna');

    const tuataraResult = checkLocalAnswer(eggPrompt, 'tuatara');
    assert.ok(tuataraResult);
    assert.equal(tuataraResult.valid, true);
    assert.equal(tuataraResult.tier, 'rare');
    assert.equal(tuataraResult.score, 950);
  });

  it('resolves aliases to canonical answers accurately', () => {
    const duckBilled = checkLocalAnswer(eggPrompt, 'The Duck-Billed Platypus');
    assert.ok(duckBilled);
    assert.equal(duckBilled.valid, true);
    assert.equal(duckBilled.canonicalAnswer, 'Platypus');
    assert.equal(duckBilled.tier, 'uncommon');

    const spinyAnteater = checkLocalAnswer(eggPrompt, 'spiny anteater');
    assert.ok(spinyAnteater);
    assert.equal(spinyAnteater.valid, true);
    assert.equal(spinyAnteater.canonicalAnswer, 'Echidna');
    assert.equal(spinyAnteater.tier, 'rare');
  });

  it('rejects known invalid answers with 0 score and clear reason', () => {
    const chickenResult = checkLocalAnswer(eggPrompt, 'Chicken');
    assert.ok(chickenResult);
    assert.equal(chickenResult.valid, false);
    assert.equal(chickenResult.score, 0);
    assert.ok(chickenResult.reason.includes('birds'));

    const penguinResult = checkLocalAnswer(eggPrompt, 'emperor penguin');
    assert.ok(penguinResult);
    assert.equal(penguinResult.valid, false);
    assert.equal(penguinResult.score, 0);
  });

  it('returns null for unlisted answers so they can be processed via AI/fallback', () => {
    const unlisted = checkLocalAnswer(eggPrompt, 'Clown Tree Frog of Borneo');
    assert.equal(unlisted, null);
  });
});

describe('Rare Answer - Unlisted & Graceful Fallback Scenarios', () => {
  it('creates an unlisted valid result with 850 pts (deterministic score)', () => {
    const res = createUnlistedValidResult(
      'animals-egg-layers-no-birds',
      'Leatherback Sea Turtle',
      'Valid reptile'
    );
    assert.equal(res.valid, true);
    assert.equal(res.tier, 'unlisted-rare');
    assert.equal(res.score, UNLISTED_RARE_POINTS);
    assert.equal(res.score, 850);
    assert.equal(res.status, 'ai_valid');
  });

  it('creates an unlisted invalid result with 0 points', () => {
    const res = createUnlistedInvalidResult(
      'animals-egg-layers-no-birds',
      'Golden Retriever',
      'Mammal that gives live birth'
    );
    assert.equal(res.valid, false);
    assert.equal(res.score, 0);
    assert.equal(res.status, 'ai_invalid');
  });

  it('creates an unrecognized graceful fallback with 0 points', () => {
    const res = createUnrecognizedResult(
      'animals-egg-layers-no-birds',
      'Zebra Flounder'
    );
    assert.equal(res.valid, false);
    assert.equal(res.score, 0);
    assert.equal(res.status, 'unrecognized');
    assert.ok(res.reason.includes('not found'));
  });

  it('provides correct tier badges and colors via getTierInfo', () => {
    const rareInfo = getTierInfo('rare');
    assert.equal(rareInfo.badge, '💎');
    assert.equal(rareInfo.label, 'Ultra Rare');

    const unlistedInfo = getTierInfo('unlisted-rare');
    assert.equal(unlistedInfo.badge, '🌟');

    const commonInfo = getTierInfo('common');
    assert.equal(commonInfo.badge, '⚪');

    const invalidInfo = getTierInfo(undefined);
    assert.equal(invalidInfo.badge, '❌');
  });
});
