// @ts-check

/**
 * Tag aliases: PromptJS tag → HTML tag.
 *
 * @module lexer/maps/tags
 */

'use strict';

const TAG_ALIASES = {
  // ─── Teks & Heading ──────────────────────────────────────
  tombol: 'button',
  button: 'button',
  judul: 'h1',
  h1: 'h1',
  subjudul: 'h2',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  paragraf: 'p',
  p: 'p',
  rentang: 'span',
  span: 'span',
  tautan: 'a',
  a: 'a',

  // ─── Kontainer ───────────────────────────────────────────
  ruang: 'div',
  div: 'div',
  wadah: 'div',
  artikel: 'article',
  article: 'article',
  bagian: 'section',
  section: 'section',
  utama: 'main',
  main: 'main',
  samping: 'aside',
  aside: 'aside',
  fragmen: 'fragment',
  fragment: 'fragment',

  // ─── Navigasi ────────────────────────────────────────────
  navigasi: 'nav',
  nav: 'nav',
  kepala: 'header',
  header: 'header',
  kaki: 'footer',
  footer: 'footer',

  // ─── Form & Masukan ──────────────────────────────────────
  masukan: 'input',
  input: 'input',
  pilihan: 'select',
  select: 'select',
  opsi: 'option',
  option: 'option',
  kolom: 'textarea',
  textarea: 'textarea',
  label: 'label',
  formulir: 'form',
  form: 'form',
  frm: 'form',

  // ─── Daftar ──────────────────────────────────────────────
  daftar: 'ul',
  ul: 'ul',
  daftarterurut: 'ol',
  ol: 'ol',
  item: 'li',
  li: 'li',

  // ─── Media ───────────────────────────────────────────────
  gambar: 'img',
  img: 'img',
  kanvas: 'canvas',
  canvas: 'canvas',
  video: 'video',
  audio: 'audio',
  bingkai: 'iframe',
  iframe: 'iframe',

  // ─── Lainnya ─────────────────────────────────────────────
  tabel: 'table',
  table: 'table',
  pemisah: 'hr',
  hr: 'hr',
};

module.exports = TAG_ALIASES;
