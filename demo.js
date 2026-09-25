import { createWordCloud } from './claper-wordcloud.js';
import { demoWords } from './words.js';

const $ = selector => document.querySelector(selector);
const cloud = createWordCloud('#claper-wc', demoWords);
// Retain live-word history so removal reveals the next most recently touched word.
let recentIds = [];

function sync() {
  const settings = cloud.getOptions();
  $('#highlightColor').value = settings.highlightColor;
  $('#textColor').value = settings.textColor ?? '#202020';
  $('#autoTextColor').disabled = settings.textColor === null;
  $('#animationEnabled').checked = settings.animation;
  const words = cloud.getWords();
  const total = words.reduce((sum, word) => sum + word.count, 0);
  $('#wordCount').textContent = `${words.length} words · ${total} mentions`;
  $('#emptyState').hidden = words.length > 0;
  $('#clearButton').disabled = !words.length;
  const wordsById = new Map();
  for (const word of words) wordsById.set(word.id, word);
  const recentWords = [];
  for (let i = recentIds.length - 1; i >= 0 && recentWords.length < 4; i--) {
    const word = wordsById.get(recentIds[i]);
    if (word) recentWords.push(word);
  }
  for (let i = words.length - 1; i >= 0 && recentWords.length < 4; i--) {
    if (!recentWords.includes(words[i])) recentWords.push(words[i]);
  }
  $('#recentWords').replaceChildren(...recentWords.map(word => {
    const item = document.createElement('li');
    item.className = 'flex items-center gap-2 py-1.5 text-xs';
    const label = document.createElement('span');
    label.className = 'min-w-0 flex-1 truncate text-neutral-600';
    label.textContent = word.name;
    label.title = word.name;
    const weight = document.createElement('span');
    weight.className = 'font-mono text-[10px] text-neutral-400';
    weight.textContent = `${word.count}× · ${(word.p * 100).toFixed(1)}%`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'px-1.5 text-neutral-400 hover:text-red-600';
    remove.textContent = '×';
    remove.setAttribute('aria-label', `Remove ${word.name}`);
    remove.addEventListener('click', () => {
      cloud.remove(word.id);
      $('#status').textContent = `Removed “${word.name}”.`;
    });
    item.append(label, weight, remove);
    return item;
  }));
}

// Keep the playground controls in sync with console calls, too.
for (const method of ['add', 'remove', 'setWords', 'clear', 'setOptions']) {
  const original = cloud[method];
  cloud[method] = (...args) => {
    const result = original(...args);
    if (method === 'add') recentIds = [...recentIds.filter(id => id !== result), result];
    if (method === 'remove') recentIds = recentIds.filter(id => id !== args[0]);
    if (method === 'clear' || method === 'setWords') recentIds = [];
    sync();
    return result;
  };
}
window.cloud = cloud;

$('#highlightColor').addEventListener('input', event => {
  cloud.setOptions({ highlightColor: event.target.value });
});
$('#textColor').addEventListener('input', event => {
  cloud.setOptions({ textColor: event.target.value });
});
$('#autoTextColor').addEventListener('click', () => {
  cloud.setOptions({ textColor: null });
});
$('#animationEnabled').addEventListener('change', event => {
  cloud.setOptions({ animation: event.target.checked });
});

$('#wordForm').addEventListener('submit', event => {
  event.preventDefault();
  const name = $('#wordInput').value.trim();
  if (!name) return $('#wordInput').focus();
  const count = cloud.getWords().length;
  const id = cloud.add(name);
  const word = cloud.getWords().find(word => word.id === id);
  $('#status').textContent = cloud.getWords().length === count
    ? `“${word.name}” now has ${word.count} mentions (${(word.p * 100).toFixed(1)}%).`
    : `Added “${name}”.`;
  $('#wordInput').value = '';
  $('#wordInput').focus();
});
$('#resetButton').addEventListener('click', () => {
  cloud.setWords(demoWords);
  $('#status').textContent = 'Demo restored.';
});
$('#clearButton').addEventListener('click', () => {
  cloud.clear();
  $('#status').textContent = 'Cloud cleared. Add your first word.';
  $('#wordInput').focus();
});
sync();
