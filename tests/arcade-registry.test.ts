import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ARCADE_GAMES,
  getGameById,
  getPlayableGames,
  getComingSoonGames,
} from '../src/lib/games/registry.ts';
import {
  hslToRgb,
  rgbToHex,
  hslToHex,
  rgbToLab,
  calculateDeltaE,
  calculateColorAccuracy,
  generateRandomTargetColor,
  circularHueDistance,
} from '../src/lib/games/color-recall/color-utils.ts';

describe('Arcade Game Registry', () => {
  it('registers exactly 6 planned arcade games', () => {
    assert.equal(ARCADE_GAMES.length, 6);
  });

  it('contains all 6 arcade games as playable modes', () => {
    const playable = getPlayableGames();
    assert.equal(playable.length, 6);
    const playableIds = playable.map((g) => g.id);
    assert.ok(playableIds.includes('fermi'));
    assert.ok(playableIds.includes('color-recall'));
    assert.ok(playableIds.includes('pattern-recall'));
    assert.ok(playableIds.includes('sound-match'));
    assert.ok(playableIds.includes('rare-answer'));
    assert.ok(playableIds.includes('order-of-magnitude'));
  });

  it('has zero upcoming games remaining with coming-soon status', () => {
    const upcoming = getComingSoonGames();
    assert.equal(upcoming.length, 0);
  });

  it('provides working lookup via getGameById', () => {
    const fermi = getGameById('fermi');
    assert.ok(fermi);
    assert.equal(fermi.name, 'Fermi Estimate');
    assert.equal(fermi.route, '/game/play');

    const colorRecall = getGameById('color-recall');
    assert.ok(colorRecall);
    assert.equal(colorRecall.name, 'Color Recall');
    assert.equal(colorRecall.route, '/games/color-recall');

    const soundMatch = getGameById('sound-match');
    assert.ok(soundMatch);
    assert.equal(soundMatch.name, 'Sound Match');
    assert.equal(soundMatch.route, '/games/sound-match');
    assert.equal(soundMatch.status, 'playable');

    const rareAnswer = getGameById('rare-answer');
    assert.ok(rareAnswer);
    assert.equal(rareAnswer.name, 'Rare Answer');
    assert.equal(rareAnswer.route, '/games/rare-answer');
    assert.equal(rareAnswer.status, 'playable');

    const orderOfMagnitude = getGameById('order-of-magnitude');
    assert.ok(orderOfMagnitude);
    assert.equal(orderOfMagnitude.name, 'Order of Magnitude');
    assert.equal(orderOfMagnitude.route, '/games/order-of-magnitude');
    assert.equal(orderOfMagnitude.status, 'playable');

    assert.equal(getGameById('nonexistent'), undefined);
  });
});

describe('Color Recall Utilities & Accuracy Math', () => {
  it('converts pure primary HSL colors accurately to RGB and Hex', () => {
    // Red: 0°, 100%, 50%
    const redRgb = hslToRgb({ h: 0, s: 100, l: 50 });
    assert.equal(redRgb.r, 255);
    assert.equal(redRgb.g, 0);
    assert.equal(redRgb.b, 0);
    assert.equal(rgbToHex(redRgb), '#FF0000');
    assert.equal(hslToHex({ h: 0, s: 100, l: 50 }), '#FF0000');

    // Green: 120°, 100%, 50%
    const greenRgb = hslToRgb({ h: 120, s: 100, l: 50 });
    assert.equal(greenRgb.r, 0);
    assert.equal(greenRgb.g, 255);
    assert.equal(greenRgb.b, 0);

    // Blue: 240°, 100%, 50%
    const blueRgb = hslToRgb({ h: 240, s: 100, l: 50 });
    assert.equal(blueRgb.r, 0);
    assert.equal(blueRgb.g, 0);
    assert.equal(blueRgb.b, 255);
  });

  it('correctly calculates circular shortest hue distance across 360 boundary', () => {
    assert.equal(circularHueDistance(10, 20), 10);
    assert.equal(circularHueDistance(350, 10), 20);
    assert.equal(circularHueDistance(5, 355), 10);
    assert.equal(circularHueDistance(0, 180), 180);
  });

  it('awards 100% accuracy and 1000 points for an exact match', () => {
    const target = { h: 210, s: 75, l: 50 };
    const result = calculateColorAccuracy(target, target);
    assert.equal(result.deltaE, 0);
    assert.equal(result.accuracy, 100);
    assert.equal(result.score, 1000);
    assert.equal(result.ratingLabel, 'Chameleon Vision');
  });

  it('awards high accuracy for nearly imperceptible differences (Delta E <= 2)', () => {
    const target = { h: 200, s: 70, l: 50 };
    const closeGuess = { h: 201, s: 71, l: 50 };
    const result = calculateColorAccuracy(target, closeGuess);
    assert.ok(result.deltaE < 3);
    assert.ok(result.accuracy >= 95);
    assert.ok(result.score >= 950);
  });

  it('penalizes opposing colors fairly while keeping scores bounded', () => {
    const red = { h: 0, s: 100, l: 50 };
    const cyan = { h: 180, s: 100, l: 50 };
    const result = calculateColorAccuracy(red, cyan);
    assert.ok(result.deltaE > 50);
    assert.ok(result.accuracy < 30);
    assert.ok(result.score < 300);
    assert.ok(result.score >= 0);
  });

  it('generates random target colors within safe visual bounds', () => {
    for (let i = 0; i < 20; i++) {
      const color = generateRandomTargetColor();
      assert.ok(color.h >= 0 && color.h <= 360);
      assert.ok(color.s >= 40 && color.s <= 100);
      assert.ok(color.l >= 30 && color.l <= 80);
    }
  });
});
