import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePageRanges,
  calculatePageDimensions,
  calculateImagePlacement,
  PAGE_SIZES,
} from './pdfEngine';

test('parsePageRanges parses single pages and ranges properly', () => {
  const result = parsePageRanges('1-3, 5, 8-10', 10);
  assert.deepEqual(result, [0, 1, 2, 4, 7, 8, 9]);
});

test('parsePageRanges handles out of bounds safely', () => {
  const result = parsePageRanges('0, 2, 15, 8-12', 10);
  // page 0 is invalid (1-indexed input), 15 is clamped, 8-12 clamps to 8-10
  assert.deepEqual(result, [1, 7, 8, 9]);
});

test('parsePageRanges defaults to all pages when empty', () => {
  const result = parsePageRanges('', 4);
  assert.deepEqual(result, [0, 1, 2, 3]);
});

test('calculatePageDimensions handles standard A4, Letter, and Fit', () => {
  const a4Portrait = calculatePageDimensions('A4', 'portrait', 800, 600);
  assert.equal(a4Portrait.width, PAGE_SIZES.A4.width);
  assert.equal(a4Portrait.height, PAGE_SIZES.A4.height);

  const a4Landscape = calculatePageDimensions('A4', 'landscape', 800, 600);
  assert.equal(a4Landscape.width, PAGE_SIZES.A4.height);
  assert.equal(a4Landscape.height, PAGE_SIZES.A4.width);

  const fitMode = calculatePageDimensions('Fit', 'portrait', 1234, 567);
  assert.equal(fitMode.width, 1234);
  assert.equal(fitMode.height, 567);
});

test('calculatePageDimensions auto orientation respects aspect ratio', () => {
  const autoLandscape = calculatePageDimensions('A4', 'auto', 1200, 800);
  assert.ok(autoLandscape.width > autoLandscape.height);

  const autoPortrait = calculatePageDimensions('A4', 'auto', 800, 1200);
  assert.ok(autoPortrait.height > autoPortrait.width);
});

test('calculateImagePlacement centers and scales in fit mode without distorting', () => {
  const placement = calculateImagePlacement(600, 800, 300, 200, 20, 'fit');
  // available width: 560, height: 760. Scale = min(560/300, 760/200) = 1.866...
  assert.ok(placement.width <= 560);
  assert.ok(placement.height <= 760);
  assert.ok(placement.x >= 20);
  assert.ok(placement.y >= 20);
});
