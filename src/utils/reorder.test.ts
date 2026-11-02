import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reorderArray,
  moveToFirst,
  moveToLast,
  moveEarlier,
  moveLater,
  clampPosition,
} from './reorder';

test('reorderArray moves item from one index to another correctly', () => {
  const list = ['A', 'B', 'C', 'D'];
  const res = reorderArray(list, 1, 3);
  assert.deepEqual(res, ['A', 'C', 'D', 'B']);
});

test('reorderArray ignores out-of-bounds or identity operations safely', () => {
  const list = ['A', 'B', 'C'];
  assert.deepEqual(reorderArray(list, 0, 0), list);
  assert.deepEqual(reorderArray(list, -1, 2), list);
  assert.deepEqual(reorderArray(list, 0, 5), list);
});

test('moveToFirst moves target item to index 0', () => {
  const list = ['Page 1', 'Page 2', 'Page 3', 'Page 4'];
  const res = moveToFirst(list, 2);
  assert.deepEqual(res, ['Page 3', 'Page 1', 'Page 2', 'Page 4']);
});

test('moveToLast moves target item to final index', () => {
  const list = ['Page 1', 'Page 2', 'Page 3', 'Page 4'];
  const res = moveToLast(list, 1);
  assert.deepEqual(res, ['Page 1', 'Page 3', 'Page 4', 'Page 2']);
});

test('moveEarlier swaps item with predecessor', () => {
  const list = ['P1', 'P2', 'P3'];
  const res = moveEarlier(list, 2);
  assert.deepEqual(res, ['P1', 'P3', 'P2']);
  // edge case: already first
  assert.deepEqual(moveEarlier(list, 0), list);
});

test('moveLater swaps item with successor', () => {
  const list = ['P1', 'P2', 'P3'];
  const res = moveLater(list, 0);
  assert.deepEqual(res, ['P2', 'P1', 'P3']);
  // edge case: already last
  assert.deepEqual(moveLater(list, 2), list);
});

test('clampPosition clamps 1-indexed page positions correctly', () => {
  assert.equal(clampPosition(0, 10), 1);
  assert.equal(clampPosition(5, 10), 5);
  assert.equal(clampPosition(99, 10), 10);
  assert.equal(clampPosition(-4, 5), 1);
  assert.equal(clampPosition(NaN, 5), 1);
});
