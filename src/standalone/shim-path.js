// PromptJS Standalone — Browser Shim: path
// Minimal browser-compatible path utilities.
module.exports = {
  basename(p) { return p ? String(p).split('/').pop() : ''; },
  dirname(p) { return p ? String(p).split('/').slice(0, -1).join('/') || '.' : '.'; },
  extname(p) {
    const b = String(p || '').split('/').pop() || '';
    const i = b.lastIndexOf('.');
    return i > 0 ? b.slice(i) : '';
  },
  resolve(...args) { return args.filter(Boolean).join('/').replace(/\/+/g, '/'); },
  join(...args) { return args.filter(Boolean).join('/').replace(/\/+/g, '/'); },
  relative(from, to) {
    const f = String(from || '').split('/').filter(Boolean);
    const t = String(to || '').split('/').filter(Boolean);
    let i = 0;
    while (i < f.length && i < t.length && f[i] === t[i]) i++;
    const ups = f.length - i;
    const downs = t.slice(i);
    return [...Array(ups).fill('..'), ...downs].join('/') || '.';
  },
  sep: '/',
};
