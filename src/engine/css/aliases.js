'use strict';

/**
 * CSS tag-alias map + selector translation.
 *
 * Behavior-preserving extraction from the former monolithic
 * `src/engine/css.js`. Logic is unchanged; only the file layout moved.
 */

const TAG_ALIAS_TO_HTML = {
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

function translateCSSSelector(selector) {
  // Split into comma-separated groups, process each
  return selector
    .split(',')
    .map((part) => {
      return part
        .trim()
        .split(/\s+/)
        .map((token) => {
          // Extract pure tag name (strip pseudo-classes, attributes, classes, ids)
          // e.g., "tombol.primary:hover" → tag="tombol", suffix=".primary:hover"
          const clean = token.replace(/[:[].*$/, '').replace(/[.#].*$/, '');
          if (TAG_ALIAS_TO_HTML[clean]) {
            return token.replace(clean, TAG_ALIAS_TO_HTML[clean]);
          }
          return token;
        })
        .join(' ');
    })
    .join(', ');
}

module.exports = { TAG_ALIAS_TO_HTML, translateCSSSelector };
