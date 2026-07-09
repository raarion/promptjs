// ============================================================================
// Universal property aliases — apply to ALL contexts (arrays, data, DOM)
// ============================================================================
const UNIVERSAL_PROPERTI = {
  panjang: 'length',
};

// ============================================================================
// DOM-only property aliases — only apply when object is a DOM element
// ============================================================================
const DOM_ONLY_PROPERTI = {
  nilai: 'value',
  teks: 'innerText',
  html: 'innerHTML',
  tipe: 'type',
  nama: 'name',
  ditandai: 'checked',
  nonaktif: 'disabled',
  anak: 'children',
  induk: 'parentElement',
  fokus: 'focus',
  atribut: 'getAttribute',
  sumber: 'src',
  tautan: 'href',
  kelas: 'className',
  gaya: 'style',
  placeholder: 'placeholder',
};

module.exports = {
  UNIVERSAL_PROPERTI,
  DOM_ONLY_PROPERTI,
};
