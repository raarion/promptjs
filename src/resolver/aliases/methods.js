// ============================================================================
// Universal method aliases — Indonesian → JavaScript method names
// These apply to ALL contexts: arrays, data objects, DOM elements.
// ============================================================================
const UNIVERSAL_METHOD = {
  // Array methods
  untukSetiap: 'forEach',
  untukSetiapItem: 'forEach',
  sisip: 'push',
  sisipAkhir: 'push',
  ambilAkhir: 'pop',
  ambilAwal: 'shift',
  sisipAwal: 'unshift',
  gabung: 'join',
  saring: 'filter',
  pilih: 'map',
  kurangi: 'reduce',
  temukan: 'find',
  temukanIndex: 'findIndex',
  apakahAda: 'includes',
  urutkan: 'sort',
  balik: 'reverse',
  potong: 'slice',
  sambung: 'splice',
  isi: 'fill',
  setiap: 'every',
  beberapa: 'some',
  indeksDari: 'indexOf',
  indeksTerakhir: 'lastIndexOf',
  datar: 'flat',
  petakanDatar: 'flatMap',
  keTeks: 'toString',
  gabungTeks: 'join',
  // BUG-15 FIX: String methods — these must be translated everywhere
  keBesar: 'toUpperCase',
  keKecil: 'toLowerCase',
  keKecilAwal: 'toLocaleLowerCase',
  keBesarAwal: 'toLocaleUpperCase',
  pangkas: 'trim',
  pangkasAwal: 'trimStart',
  pangkasAkhir: 'trimEnd',
  ulang: 'repeat',
  ganti: 'replace',
  gantiSemua: 'replaceAll',
  cocok: 'match',
  cari: 'search',
  bagi: 'split',
  mulaiDengan: 'startsWith',
  akhiriDengan: 'endsWith',
  subTeks: 'substring',
  potongTeks: 'substr',
  normalisasi: 'normalize',
  ulangi: 'repeat',
  charDi: 'charAt',
  kodeCharDi: 'charCodeAt',
  teksBerulang: 'concat',
};

// ============================================================================
// Mutating methods — array methods that mutate the original array in-place.
// ============================================================================
const MUTATING_METHODS = new Set([
  'push',
  'pop',
  'shift',
  'unshift',
  'splice',
  'sort',
  'reverse',
  'fill',
]);

module.exports = {
  UNIVERSAL_METHOD,
  MUTATING_METHODS,
};
