/*!
 * @claperco/wordcloud.js
 * Copyright (c) 2026 Claper
 * SPDX-License-Identifier: MIT
 * See LICENSE for the full license text.
 */
/** A responsive, dependency-free word cloud. Styling inherits from its container. */
export function createWordCloud(target, initialWords = [], options = {}) {
  const element = typeof target === 'string' ? document.querySelector(target) : target;
  if (!(element instanceof HTMLElement)) throw new TypeError('A word-cloud container is required.');

  let settings = { highlightColor: '#24AFEA', textColor: null, animation: true };

  const isColor = value =>
    typeof value === 'string' && CSS.supports('color', value);

  function configure(next) {
    const { highlightColor, textColor, animation } = { ...settings, ...next };

    if (!isColor(highlightColor)) {
      throw new TypeError('highlightColor must be a valid CSS color.');
    }

    if (textColor !== null && !isColor(textColor)) {
      throw new TypeError('textColor must be a valid CSS color or null for automatic shades.');
    }

    if (typeof animation !== 'boolean') {
      throw new TypeError('animation must be a boolean.');
    }

    settings = { highlightColor, textColor, animation };
  }

  configure(options);

  let words = [];
  let byName = new Map();
  let mentionCount = 0;
  let frame;
  let highlightTimer;
  let renderedWidth;
  let destroyed = false;
  const highlights = new Map();
  const highlightedNodes = new Map();
  const nameKey = name => name.normalize('NFKC').toLowerCase();
  const content = document.createElement('div');
  content.setAttribute('role', 'list');
  content.setAttribute('aria-label', 'Word cloud');
  Object.assign(content.style, {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', gap: '5px', width: '100%', minWidth: '0',
  });
  element.append(content);

  function normalize(word) {
    if (typeof word === 'string') word = { name: word };
    const name = String(word?.name ?? '').trim();
    const count = word?.count ?? 1;
    if (!name || !Number.isSafeInteger(count) || count < 1) {
      throw new TypeError('Each word needs a name and a positive integer count.');
    }
    const id = word.id;
    return { id: id == null ? undefined : String(id), name, count };
  }

  function checkedTotal(total) {
    if (!Number.isSafeInteger(total)) throw new RangeError('Total count exceeds the safe integer limit.');
    return total;
  }

  function assertActive() {
    if (destroyed) throw new Error('This word cloud has been destroyed.');
  }

  function schedule() {
    if (destroyed || frame !== undefined) return;
    frame = requestAnimationFrame(render);
  }

  function expireHighlights() {
    clearTimeout(highlightTimer);
    highlightTimer = undefined;
    if (destroyed) return;
    const now = performance.now();
    let remaining = Infinity;
    for (const [id, highlight] of highlights) {
      const expiresIn = 800 - (now - highlight.start);
      if (expiresIn <= 0) highlights.delete(id);
      else remaining = Math.min(remaining, expiresIn);
    }
    for (const [id, { node, animation }] of highlightedNodes) {
      if (highlights.has(id)) continue;
      animation?.cancel();
      node.style.backgroundColor = '';
      node.style.boxShadow = '';
      node.style.borderRadius = '';
      highlightedNodes.delete(id);
    }
    if (remaining !== Infinity) highlightTimer = setTimeout(expireHighlights, remaining);
  }

  function render() {
    frame = undefined;
    if (destroyed) return;
    const width = content.clientWidth;
    renderedWidth = width;
    for (const { animation } of highlightedNodes.values()) animation?.cancel();
    highlightedNodes.clear();
    content.replaceChildren();
    if (!width || !words.length) {
      if (!words.length) highlights.clear();
      expireHighlights();
      return;
    }

    const sorted = api.getWords().sort((a, b) => b.p - a.p);
    const min = sorted.at(-1).p;
    const max = sorted[0].p;
    const gap = Math.min(16, Math.max(8, width * 0.015));
    const largest = Math.min(68, Math.max(28, width * 0.068));
    const nodes = sorted.map(word => {
      const weight = max === min ? 1 : ((word.p - min) / (max - min)) ** 1.15;
      const node = document.createElement('span');
      node.textContent = word.name;
      node.dataset.wordId = word.id;
      node.setAttribute('role', 'listitem');
      node.setAttribute('aria-label', `${word.name}, ${word.count} occurrences, ${(word.p * 100).toFixed(1)} percent`);
      node.title = `${word.name} · ${word.count} occurrences · ${(word.p * 100).toFixed(1)}%`;
      Object.assign(node.style, {
        fontSize: `${13 + weight * (largest - 13)}px`,
        color: settings.textColor
          ? `color-mix(in srgb, ${settings.textColor} ${48 + weight * 52}%, white)`
          : `hsl(240 4% ${57 - weight * 47}%)`,
        fontWeight: '750', lineHeight: '1.15', letterSpacing: '-0.045em',
        whiteSpace: 'nowrap', display: 'inline-block', flexShrink: '0',
      });
      return node;
    });

    // Measure real glyphs so rows also fit after a font or container changes.
    const measure = document.createElement('div');
    Object.assign(measure.style, { height: '0', overflow: 'hidden', visibility: 'hidden' });
    for (const node of nodes) measure.append(node);
    content.append(measure);
    const sizes = nodes.map(node => node.getBoundingClientRect().width);
    const shrunk = [];
    for (let i = 0; i < nodes.length; i++) {
      if (sizes[i] <= width) continue;
      nodes[i].style.fontSize = `${parseFloat(nodes[i].style.fontSize) * width / sizes[i]}px`;
      shrunk.push(i);
    }
    // Keep reads separate from writes: shrinking any number of words costs one layout.
    for (const i of shrunk) sizes[i] = nodes[i].getBoundingClientRect().width;

    const rows = [];
    let row = [];
    let used = 0;
    nodes.forEach((node, i) => {
      // The outer rows taper gently, giving the cloud a centered silhouette.
      const limit = width * Math.max(0.7, 1 - rows.length * 0.025);
      if (row.length && used + gap + sizes[i] > limit) {
        rows.push(row);
        row = [];
        used = 0;
      }
      used += (row.length ? gap : 0) + sizes[i];
      row.push(node);
    });
    if (row.length) rows.push(row);

    const centered = new Array(rows.length);
    let left = Math.floor(rows.length / 2);
    let right = left;
    centered[left] = rows[0];
    for (let i = 1; i < rows.length; i++) centered[i % 2 ? --left : ++right] = rows[i];
    const fragment = document.createDocumentFragment();
    centered.forEach(items => {
      const line = document.createElement('div');
      Object.assign(line.style, { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: `${gap}px`, maxWidth: '100%' });
      for (const node of items) line.append(node);
      fragment.append(line);
    });
    content.replaceChildren(fragment);
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    for (const node of nodes) {
      const highlight = highlights.get(node.dataset.wordId);
      if (!highlight) continue;
      const elapsed = performance.now() - highlight.start;
      if (elapsed >= 800) {
        highlights.delete(node.dataset.wordId);
        continue;
      }
      node.style.borderRadius = '4px';
      const color = settings.highlightColor;
      const visual = { node, animation: null };
      highlightedNodes.set(node.dataset.wordId, visual);
      if (!settings.animation || reducedMotion) {
        node.style.backgroundColor = color;
        node.style.boxShadow = `0 0 0 3px ${color}`;
        continue;
      }
      const bounce = highlight.isNew;
      const animation = node.animate([
        { offset: 0, opacity: highlight.isNew ? 0 : 1,
          transform: bounce ? 'scale(0.35)' : 'none', easing: 'ease-out',
          backgroundColor: color, boxShadow: `0 0 0 3px ${color}` },
        { offset: 0.18, opacity: 1, transform: bounce ? 'scale(1.18)' : 'none', easing: 'ease-in-out',
          backgroundColor: color, boxShadow: `0 0 0 3px ${color}` },
        { offset: 0.29, opacity: 1, transform: bounce ? 'scale(0.92)' : 'none', easing: 'ease-in-out',
          backgroundColor: color, boxShadow: `0 0 0 3px ${color}` },
        { offset: 0.38, opacity: 1, transform: bounce ? 'scale(1.05)' : 'none', easing: 'ease-in-out',
          backgroundColor: color, boxShadow: `0 0 0 3px ${color}` },
        { offset: 0.46, opacity: 1, transform: 'none',
          backgroundColor: color, boxShadow: `0 0 0 3px ${color}` },
        { offset: 0.65, opacity: 1, transform: 'none',
          backgroundColor: color, boxShadow: `0 0 0 3px ${color}` },
        { offset: 1, opacity: 1, transform: 'none',
          backgroundColor: 'transparent', boxShadow: '0 0 0 3px transparent' },
      ], { duration: 800, easing: 'linear' });
      // Preserve progress when a resize or another add rebuilds the rows.
      animation.currentTime = elapsed;
      visual.animation = animation;
    }
    expireHighlights();
  }

  const observer = new ResizeObserver(() => {
    if (content.clientWidth !== renderedWidth) schedule();
  });
  observer.observe(element);
  document.fonts?.ready.then(schedule);
  document.fonts?.addEventListener('loadingdone', schedule);

  const api = {
    setOptions(next) { assertActive(); configure(next); schedule(); },
    getOptions() { return { ...settings }; },
    add(name, count = 1) {
      assertActive();
      const word = normalize({ name, count });
      const total = checkedTotal(mentionCount + word.count);
      const key = nameKey(word.name);
      const existing = byName.get(key);
      if (existing) existing.count += word.count;
      else {
        word.id = crypto.randomUUID();
        words.push(word);
        byName.set(key, word);
      }
      mentionCount = total;
      const id = existing?.id ?? word.id;
      highlights.set(id, { start: performance.now(), isNew: !existing });
      schedule();
      return id;
    },
    remove(id) {
      assertActive();
      const index = words.findIndex(word => word.id === id);
      if (index === -1) return;
      const word = words[index];
      mentionCount -= word.count;
      byName.delete(nameKey(word.name));
      words.splice(index, 1);
      highlights.delete(id);
      schedule();
    },
    setWords(next) {
      assertActive();
      if (!Array.isArray(next)) throw new TypeError('Words must be an array.');
      const grouped = new Map();
      const ids = new Set();
      let total = 0;
      for (const entry of next) {
        const word = normalize(entry);
        total = checkedTotal(total + word.count);
        const key = nameKey(word.name);
        const existing = grouped.get(key);
        if (existing) existing.count += word.count;
        else {
          word.id ??= crypto.randomUUID();
          if (ids.has(word.id)) throw new TypeError('Word IDs must be unique.');
          ids.add(word.id);
          grouped.set(key, word);
        }
      }
      words = [...grouped.values()];
      byName = grouped;
      mentionCount = total;
      highlights.clear();
      schedule();
    },
    clear() {
      assertActive();
      words = [];
      byName.clear();
      mentionCount = 0;
      highlights.clear();
      schedule();
    },
    getWords() {
      return words.map(word => ({ ...word, p: word.count / mentionCount }));
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      clearTimeout(highlightTimer);
      highlightTimer = undefined;
      highlights.clear();
      for (const { animation } of highlightedNodes.values()) animation?.cancel();
      highlightedNodes.clear();
      words = [];
      byName.clear();
      mentionCount = 0;
      cancelAnimationFrame(frame);
      frame = undefined;
      observer.disconnect();
      document.fonts?.removeEventListener('loadingdone', schedule);
      content.remove();
    },
  };
  try { api.setWords(initialWords); } catch (error) { api.destroy(); throw error; }
  return api;
}
