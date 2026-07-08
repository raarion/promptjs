// @ts-check

/**
 * Event alias map: on_x pattern → PromptJS native event name.
 *
 * @module lexer/maps/events
 */

'use strict';

const EVENT_ALIASES = {
  // Indonesia style
  on_klik: 'diklik',
  on_diklik: 'diklik',
  on_diketik: 'diketik',
  on_ditekan: 'ditekan',
  on_dilepas: 'dilepas',
  on_diubah: 'diubah',
  on_disubmit: 'disubmit',
  on_dikirim: 'dikirim',
  on_difokus: 'difokus',
  on_ditinggal: 'ditinggal',
  on_diarahkan: 'diarahkan',
  on_dimuat: 'dimuat',
  on_digulir: 'digulir',

  // English style
  on_click: 'diklik',
  on_input: 'diketik',
  on_keydown: 'ditekan',
  on_keyup: 'dilepas',
  on_change: 'diubah',
  on_submit: 'disubmit',
  on_focus: 'difokus',
  on_blur: 'ditinggal',
  on_mouseover: 'diarahkan',
  on_mouseout: 'ditinggal-kursor',
  on_load: 'dimuat',
  on_scroll: 'digulir',
  on_dragstart: 'diseret',
  on_contextmenu: 'dikonteks',
  on_paste: 'dilewat',
  on_mouseenter: 'masuk',
  on_mouseleave: 'keluar',
  on_resize: 'diubahukuran',
  on_error: 'salah',
};

module.exports = EVENT_ALIASES;
