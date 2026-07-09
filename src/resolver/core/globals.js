// ============================================================================
// JS GLOBAL IDENTIFIERS — PromptJS patch
// These identifiers are available in browser/Node and should not trigger E3001.
// ============================================================================
const JS_GLOBALS = new Set([
  // Browser globals
  'window',
  'document',
  'navigator',
  'location',
  'history',
  'screen',
  'localStorage',
  'sessionStorage',
  'console',
  'alert',
  'confirm',
  'prompt',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'FormData',
  'URL',
  'URLSearchParams',
  'MutationObserver',
  'IntersectionObserver',
  'ResizeObserver',
  'Event',
  'CustomEvent',
  'MessageChannel',
  // JS built-in constructors
  'Object',
  'Array',
  'String',
  'Number',
  'Boolean',
  'Symbol',
  'Function',
  'Date',
  'RegExp',
  'Error',
  'TypeError',
  'RangeError',
  'Map',
  'Set',
  'WeakMap',
  'WeakSet',
  'Promise',
  'Proxy',
  'Reflect',
  'JSON',
  'Math',
  'Intl',
  'AbortController',
  'parseInt',
  'parseFloat',
  'isNaN',
  'isFinite',
  'encodeURI',
  'decodeURI',
  'encodeURIComponent',
  'decodeURIComponent',
  'undefined',
  'NaN',
  'Infinity',
  // Node.js globals (for SSR/build)
  'global',
  'process',
  'Buffer',
  'require',
  'module',
  '__dirname',
  '__filename',
  // v0.7: Compiler-generated variables from Ambil dari (AmbilLuarStatement)
  '__data',
  '__error',
  '__response',
]);

// ============================================================================
// FUNGSI BAWAAN (Builtins) — Indonesian function names → JS equivalents
// Digunakan saat nama fungsi dipanggil sebagai CallExpression: panjang(arr)
// Tidak sama dengan ALIAS_PROPERTI yang hanya bekerja di MemberExpression.
// ============================================================================
const BUILTIN_FUNCTIONS = {
  // Array/string utilities
  panjang: { jsName: '__promptjs_panjang', helper: true },
  tipeData: { jsName: 'typeof', helper: false, prefix: true },
  apakahArray: { jsName: 'Array.isArray', helper: false },
  keTeks: { jsName: 'String', helper: false },
  keAngka: { jsName: 'Number', helper: false },
  keTeksAngka: { jsName: 'parseInt', helper: false },
  keAngkaDesimal: { jsName: 'parseFloat', helper: false },
  apakahKosong: { jsName: '__promptjs_apakahKosong', helper: true },
  gabung: { jsName: '__promptjs_gabung', helper: true },
  saring: { jsName: '__promptjs_saring', helper: true },
  pilih: { jsName: '__promptjs_pilih', helper: true },
  urutkan: { jsName: '__promptjs_urutkan', helper: true },
  balik: { jsName: '__promptjs_balik', helper: true },
  temukan: { jsName: '__promptjs_temukan', helper: true },
  apakahAda: { jsName: '__promptjs_apakahAda', helper: true },
};

// ============================================================================
// EVENT NAMES yang valid untuk ketika (dari spesifikasi PromptJS)
// ============================================================================
const VALID_EVENT_NAMES = new Set([
  'diklik',
  'diketik',
  'ditekan',
  'dilepas',
  'dilewat',
  'ditinggal',
  'difokus',
  'diblur',
  'diubah',
  'diseret',
  'diubahukuran',
  'dipindah',
  'dikirim',
  'direset',
  'digulir',
  'dikonteks',
  'masuk',
  'keluar',
  'aktif',
  'nonaktif',
  'muat',
  'salah',
  'disubmit',
  'dimuat',
  'diarahkan',
  'ditinggal-kursor',
  'dipasang',
  'dilepas-dari-dom',
  // BUG-17: Reactive class binding — not real DOM events but valid PromptJS reactive bindings
  'on_kelas',
  'on_class',
  'kelas',
  'class',
]);

// ============================================================================
// PROPERTI PERBARUI yang valid
// ============================================================================
const VALID_PERBARUI_PROPERTIES = new Set([
  'teks',
  'html',
  'kelas',
  'src',
  'href',
  'nilai',
  'tipe',
  'nama',
  'ditandai',
  'nonaktif',
  'placeholder',
  'gaya',
  'atribut',
]);

module.exports = {
  JS_GLOBALS,
  BUILTIN_FUNCTIONS,
  VALID_EVENT_NAMES,
  VALID_PERBARUI_PROPERTIES,
};
