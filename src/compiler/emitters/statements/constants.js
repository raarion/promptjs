'use strict';

/**
 * Shared constant maps for the statement emitters.
 *
 * These were previously declared inline inside individual visitor methods in
 * `src/compiler/emitters/statements.js`. They are moved here VERBATIM — no
 * key/value was changed — so there is a single source of truth and the emitter
 * modules import them. This is a pure refactor; the emitted code is unchanged.
 */

// Tag alias mapping for BuatStatement (kept byte-identical to original inline map).
const tagAliases = {
  // Original aliases
  tombol: 'button',
  ruang: 'div',
  judul: 'h1',
  subjudul: 'h2',
  paragraf: 'p',
  gambar: 'img',
  tautan: 'a',
  masukan: 'input',
  pilihan: 'select',
  kolom: 'textarea',
  tabel: 'table',
  artikel: 'article',
  kanvas: 'canvas',
  opsi: 'option',
  fragmen: 'fragment',
  wadjud: 'h1',
  wadah: 'div',
  kotak: 'div',
  frm: 'form',
  frmMasuk: 'form',
  // PromptJS extended aliases (bilingual + additional)
  halaman: 'div',
  card: 'div',
  page: 'div',
  pemisah: 'hr',
  container: 'div',
  button: 'button',
  div: 'div',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  p: 'p',
  img: 'img',
  a: 'a',
  input: 'input',
  select: 'select',
  textarea: 'textarea',
  table: 'table',
  article: 'article',
  canvas: 'canvas',
  option: 'option',
  fragment: 'fragment',
  form: 'form',
  hr: 'hr',
  nav: 'nav',
  header: 'header',
  footer: 'footer',
  section: 'section',
  main: 'main',
  aside: 'aside',
  ul: 'ul',
  ol: 'ol',
  li: 'li',
  span: 'span',
  label: 'label',
  video: 'video',
  audio: 'audio',
  iframe: 'iframe',
  navigasi: 'nav',
  kepala: 'header',
  kaki: 'footer',
  bagian: 'section',
  utama: 'main',
  samping: 'aside',
  daftar: 'ul',
  item: 'li',
  rentang: 'span',
  bingkai: 'iframe',
  formulir: 'form',
  daftarterurut: 'ol',
};

// Event name map for KetikaStatement.
const eventMap = {
  diklik: 'click',
  diketik: 'input',
  disubmit: 'submit',
  diubah: 'change',
  ditekan: 'keydown',
  dilepas: 'keyup',
  muat: 'DOMContentLoaded',
  dimuat: 'DOMContentLoaded',
  difokus: 'focus',
  diblur: 'blur',
  ditinggal: 'blur',
  diarahkan: 'mouseover',
  'ditinggal-kursor': 'mouseout',
  digulir: 'scroll',
  diseret: 'dragstart',
  diubahukuran: 'resize',
  dipindah: 'drag',
  dikirim: 'submit',
  direset: 'reset',
  dikonteks: 'contextmenu',
  dilewat: 'paste',
  masuk: 'mouseenter',
  keluar: 'mouseleave',
  aktif: 'focus',
  nonaktif: 'blur',
  salah: 'error',
  dipasang: '__promptjs_mounted',
  'dilepas-dari-dom': '__promptjs_unmounted',
};

// Event modifier map for KetikaStatement (.cegah/.prevent/.hentikan/.stop).
const MODIFIER_MAP = {
  cegah: 'preventDefault',
  prevent: 'preventDefault',
  hentikan: 'stopPropagation',
  stop: 'stopPropagation',
};

// propertyMap for PerbaruiStatement (teks/html/nilai/kelas/gaya/...).
const propertyMap = {
  teks: 'innerText',
  html: 'innerHTML',
  nilai: 'value',
  kelas: 'className',
  gaya: 'style.cssText',
  sumber: 'src',
  src: 'src',
  tautan: 'href',
  href: 'href',
  tipe: 'type',
  nama: 'name',
  ditandai: 'checked',
  nonaktif: 'disabled',
  placeholder: 'placeholder',
  atribut: 'setAttribute',
};

// Direct DOM property assignment allow-list for visitPropertyNode.
const directProps = new Set([
  'src',
  'href',
  'alt',
  'title',
  'id',
  'name',
  'value',
  'placeholder',
  'width',
  'height',
  'type',
  'for',
  'checked',
  'disabled',
  'readonly',
  'required',
  'min',
  'max',
  'step',
  'pattern',
  'maxlength',
  'colspan',
  'rowspan',
  'target',
  'rel',
]);

// URL-bearing attributes that must route through __safeAttr.
const urlBearing = new Set(['src', 'href']);

// kindMap for AmbilDomStatement (nilai/teks/html/tinggi/lebar/atribut).
const kindMap = {
  nilai: 'value',
  teks: 'innerText',
  html: 'innerHTML',
  tinggi: 'offsetHeight',
  lebar: 'offsetWidth',
  atribut: null, // khusus — pakai getAttribute
};

// Fetch option key map for AmbilLuarStatement (metode/isi/header/mode/kredensial).
const keyMap = {
  metode: 'method',
  isi: 'body',
  header: 'headers',
  mode: 'mode',
  kredensial: 'credentials',
};

module.exports = {
  tagAliases,
  eventMap,
  MODIFIER_MAP,
  propertyMap,
  directProps,
  urlBearing,
  kindMap,
  keyMap,
};
