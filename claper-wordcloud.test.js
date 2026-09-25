import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWordCloud } from './claper-wordcloud.js';

// Only the mounting shell is mocked; these tests exercise the public data API.
class Element {
  style = {};
  append() {}
  setAttribute() {}
  remove() {}
}
globalThis.CSS = { supports: (property, value) => /^#[0-9a-f]{6}$/i.test(value) };
globalThis.HTMLElement = Element;
globalThis.document = { createElement: () => new Element() };
globalThis.ResizeObserver = class { observe() {} disconnect() {} };
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};

test('frequency weights update after repeated adds, removal, and clearing', () => {
  const cloud = createWordCloud(new Element(), ['Design', ' design ', 'Engineering']);
  const [design, engineering] = cloud.getWords();
  assert.equal(design.count, 2);
  assert.equal(design.p, 2 / 3);
  assert.equal(engineering.p, 1 / 3);
  assert.equal(cloud.add('ＤＥＳＩＧＮ'), design.id);
  assert.equal(cloud.getWords().length, 2);
  assert.equal(cloud.getWords()[0].p, 3 / 4);
  cloud.add('Engineering', 2);
  assert.deepEqual(cloud.getWords().map(word => word.p), [0.5, 0.5]);
  cloud.remove(design.id);
  assert.equal(cloud.getWords()[0].p, 1);
  cloud.clear();
  assert.deepEqual(cloud.getWords(), []);
  cloud.add('Fresh start');
  assert.equal(cloud.getWords()[0].p, 1);
  cloud.destroy();
});

test('bulk counts merge and returned snapshots cannot modify internal counts', () => {
  const cloud = createWordCloud(new Element(), [
    { id: 'design', name: 'Design', count: 5 },
    { name: 'design', count: 2 },
    { name: 'Engineering', count: 3 },
  ]);
  const snapshot = cloud.getWords();
  assert.equal(snapshot[0].id, 'design');
  assert.equal(snapshot[0].count, 7);
  assert.equal(snapshot[0].p, 0.7);
  snapshot[0].count = 100;
  assert.equal(cloud.getWords()[0].count, 7);
  cloud.destroy();
});

test('invalid counts and conflicting IDs do not partially change the cloud', () => {
  const cloud = createWordCloud(new Element(), ['Design']);
  const before = cloud.getWords();
  for (const count of [0, -1, 0.5, NaN, Infinity, '2']) {
    assert.throws(() => cloud.add('Design', count), TypeError);
  }
  assert.throws(() => cloud.setWords(['Valid', { name: 'Invalid', count: 0 }]), TypeError);
  assert.throws(() => cloud.setWords([
    { id: 'same', name: 'A' }, { id: 'same', name: 'B' },
  ]), TypeError);
  assert.throws(() => cloud.add('Overflow', Number.MAX_SAFE_INTEGER), RangeError);
  assert.deepEqual(cloud.getWords(), before);
  cloud.destroy();
});


test('options are per instance, merge on updates, and reject invalid values atomically', () => {
  const cloud = createWordCloud(new Element(), [], { highlightColor: '#ffcc00', animation: false });
  const other = createWordCloud(new Element());
  const otherOptions = other.getOptions();
  assert.deepEqual(cloud.getOptions(), { highlightColor: '#ffcc00', textColor: null, animation: false });
  cloud.setOptions({ animation: true });
  assert.equal(cloud.getOptions().highlightColor, '#ffcc00');
  const snapshot = cloud.getOptions();
  snapshot.animation = false;
  assert.equal(cloud.getOptions().animation, true);
  assert.throws(() => cloud.setOptions({ highlightColor: 'invalid', animation: false }), TypeError);
  assert.throws(() => cloud.setOptions({ animation: 'false' }), TypeError);
  assert.equal(cloud.getOptions().animation, true);
  assert.deepEqual(other.getOptions(), otherOptions);
  cloud.destroy();
  other.destroy();
});


test('text color can be customized, updated and reset to automatic shades', () => {
  const cloud = createWordCloud(new Element(), ['Design'], { textColor: '#123456' });
  assert.equal(cloud.getOptions().textColor, '#123456');
  cloud.setOptions({ highlightColor: '#ffffff' });
  assert.equal(cloud.getOptions().textColor, '#123456');
  assert.throws(() => cloud.setOptions({ textColor: 'invalid' }), TypeError);
  assert.equal(cloud.getOptions().textColor, '#123456');
  cloud.setOptions({ textColor: null });
  assert.equal(cloud.getOptions().textColor, null);
  cloud.destroy();
});

test('replacement, overflow rollback, removal and clear keep counts consistent', () => {
  const cloud = createWordCloud(new Element(), [{ id: 'old', name: 'Alpha', count: 7 }]);
  const max = Number.MAX_SAFE_INTEGER;
  cloud.setWords([
    { id: 'alpha', name: 'Alpha', count: max - 2 },
    { id: 'beta', name: 'Beta' },
  ]);
  assert.equal(cloud.add('ＡＬＰＨＡ'), 'alpha');
  const before = cloud.getWords();
  assert.deepEqual(before, [
    { id: 'alpha', name: 'Alpha', count: max - 1, p: (max - 1) / max },
    { id: 'beta', name: 'Beta', count: 1, p: 1 / max },
  ]);
  assert.throws(() => cloud.add('Alpha'), RangeError);
  assert.throws(() => cloud.setWords([
    { name: 'Alpha', count: max }, 'alpha',
  ]), RangeError);
  assert.deepEqual(cloud.getWords(), before);
  cloud.remove('alpha');
  cloud.remove('missing');
  assert.deepEqual(cloud.getWords(), [{ id: 'beta', name: 'Beta', count: 1, p: 1 }]);
  const newId = cloud.add('Alpha', 2);
  assert.notEqual(newId, 'alpha');
  assert.deepEqual(cloud.getWords().map(({ name, count, p }) => ({ name, count, p })), [
    { name: 'Beta', count: 1, p: 1 / 3 },
    { name: 'Alpha', count: 2, p: 2 / 3 },
  ]);
  cloud.clear();
  cloud.add('Beta', 3);
  assert.deepEqual(cloud.getWords().map(({ name, count, p }) => ({ name, count, p })), [
    { name: 'Beta', count: 3, p: 1 },
  ]);
  cloud.destroy();
});

test('destroy releases words and prevents subsequent mutations', () => {
  const cloud = createWordCloud(new Element(), ['Private word']);
  cloud.destroy();
  cloud.destroy();
  assert.deepEqual(cloud.getWords(), []);
  for (const mutate of [
    () => cloud.add('Another word'),
    () => cloud.setWords(['Replacement']),
    () => cloud.remove('missing'),
    () => cloud.clear(),
    () => cloud.setOptions({ animation: false }),
  ]) {
    assert.throws(mutate, Error);
  }
  assert.deepEqual(cloud.getWords(), []);
});
