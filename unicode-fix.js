(function () {
  'use strict';

  const ESCAPED = {
    '\\u2026': '…',
    '\\u2018': '‘',
    '\\u2019': '’',
    '\\u201C': '“',
    '\\u201D': '”',
    '\\u2013': '–',
    '\\u2014': '—',
    '\\u00a0': ' ',
    '\\u00ad': ''
  };

  function normalizeText(value) {
    if (typeof value !== 'string') return value;
    let out = value;
    Object.keys(ESCAPED).forEach(function (pattern) {
      out = out.replace(new RegExp(pattern, 'g'), ESCAPED[pattern]);
    });
    return out;
  }

  function walk(node) {
    if (!node) return;
    if (node.nodeType === 3) {
      const text = node.nodeValue || '';
      if (text && /\\u(?:2026|2018|2019|201C|201D|2013|2014|00a0|00ad)/i.test(text)) {
        node.nodeValue = normalizeText(text);
      }
      return;
    }

    if (node.nodeType !== 1) return;
    if (node.tagName && /^(SCRIPT|STYLE)$/i.test(node.tagName)) return;

    for (const child of node.childNodes || []) {
      walk(child);
    }
  }

  function normalizePage() {
    const root = document.body || document.documentElement;
    if (!root) return;
    walk(root);

    const nodes = document.querySelectorAll('[data-i18n], [placeholder], [aria-label], [title]');
    nodes.forEach(function (item) {
      ['data-i18n', 'placeholder', 'aria-label', 'title'].forEach(function (attr) {
        const value = item.getAttribute(attr);
        if (value) {
          item.setAttribute(attr, normalizeText(value));
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', normalizePage, { once: true });
  } else {
    normalizePage();
  }
})();
