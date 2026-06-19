/**
 * PromptJS v0.2 — LEXER (Tahap 1)
 * ============================================================================
 * Mengkonversi stream karakter mentah PromptJS (.pjs) menjadi stream token.
 *
 * Fitur:
 *   • Tokenisasi keyword bilingual (Buat/Create, Jika/If, Lainnya/Else, dll)
 *   • Indentasi 2-spasi → INDENT/DEDENT stack (adaptasi dari PromptJS)
 *   • Line-type detection: property, string, on_event, $external, block opener
 *   • Front-matter parsing (--- yaml-like block ---)
 *   • Operator standar langsung (>, <, +, *, ===, &&, ||)
 *   • Error reporting berkode dengan konteks baris:kolom + saran bilingual
 *
 * Murni JavaScript (ES2015), TANPA dependensi.
 */

(function (root, factory) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory({});
  } else {
    root.PromptJSLexer = factory(root.PromptJSLexer || {});
  }
})(typeof self !== 'undefined' ? self : this, function (exports) {
  'use strict';

  /* ==========================================================================
   * 1. KONSTANTA TIPE TOKEN
   * ========================================================================== */
  const TT = {
    // Struktur
    TK_BUAT: 'TK_BUAT', // Buat / Create
    TK_JIKA: 'TK_JIKA', // Jika / If
    TK_LAINNYA: 'TK_LAINNYA', // Lainnya / Else
    TK_ULANGI: 'TK_ULANGI', // Ulangi / Loop
    TK_UNTUK: 'TK_UNTUK', // Untuk / For
    TK_IN: 'TK_IN', // in
    TK_KALI: 'TK_KALI', // kali / times (counted-loop suffix)
    TK_PASS: 'TK_PASS', // pass / Lewati
    TK_DEFINSIKAN: 'TK_DEFINSIKAN', // Definisikan / Define
    TK_DATA: 'TK_DATA', // Data / State
    TK_TETAP: 'TK_TETAP', // Tetap / Const
    TK_UBAH: 'TK_UBAH', // Ubah / Let
    TK_TURUNAN: 'TK_TURUNAN', // Turunan / Derived
    TK_FUNGSI: 'TK_FUNGSI', // Fungsi / Func
    TK_SAAT: 'TK_SAAT', // Saat / When
    TK_KEMBALIKAN: 'TK_KEMBALIKAN', // Kembalikan / Return

    // Literals & Identifiers
    TK_STRING: 'TK_STRING',
    TK_NUMBER: 'TK_NUMBER',
    TK_IDENT: 'TK_IDENT',
    TK_EXT_REF: 'TK_EXT_REF', // $nama.path (external data reference)

    // Operators
    TK_ASSIGN: 'TK_ASSIGN', // =
    TK_EQ: 'TK_EQ', // ===
    TK_NEQ: 'TK_NEQ', // !==
    TK_GT: 'TK_GT', // >
    TK_GTE: 'TK_GTE', // >=
    TK_LT: 'TK_LT', // <
    TK_LTE: 'TK_LTE', // <=
    TK_PLUS: 'TK_PLUS', // +
    TK_MINUS: 'TK_MINUS', // -
    TK_STAR: 'TK_STAR', // *
    TK_SLASH: 'TK_SLASH', // /
    TK_MOD: 'TK_MOD', // %
    TK_AND: 'TK_AND', // &&
    TK_OR: 'TK_OR', // ||
    TK_NOT: 'TK_NOT', // !
    TK_DOT: 'TK_DOT', // .
    TK_HASH: 'TK_HASH', // #
    TK_LPAREN: 'TK_LPAREN', // (
    TK_RPAREN: 'TK_RPAREN', // )
    TK_LBRACKET: 'TK_LBRACKET', // [
    TK_RBRACKET: 'TK_RBRACKET', // ]
    TK_LBRACE: 'TK_LBRACE', // {
    TK_RBRACE: 'TK_RBRACE', // }
    TK_COMMA: 'TK_COMMA', // ,
    TK_COLON: 'TK_COLON', // :
    TK_ARROW: 'TK_ARROW', // =>

    // Event binding
    TK_ON_EVENT: 'TK_ON_EVENT', // on_klik, on_mouseover, dll

    // Struktur
    TK_INDENT: 'TK_INDENT',
    TK_DEDENT: 'TK_DEDENT',
    TK_NEWLINE: 'TK_NEWLINE',
    TK_EOF: 'TK_EOF',

    // Front-matter
    TK_FRONT_MATTER: 'TK_FRONT_MATTER',
  };

  /* ==========================================================================
   * 2. KEYWORD BILINGUAL MAP
   * ========================================================================== */
  const KEYWORDS = {
    // Indonesia
    buat: TT.TK_BUAT,
    jika: TT.TK_JIKA,
    lainnya: TT.TK_LAINNYA,
    ulangi: TT.TK_ULANGI,
    untuk: TT.TK_UNTUK,
    pass: TT.TK_PASS,
    lewati: TT.TK_PASS,
    definisikan: TT.TK_DEFINSIKAN,
    data: TT.TK_DATA,
    tetap: TT.TK_TETAP,
    ubah: TT.TK_UBAH,
    turunan: TT.TK_TURUNAN,
    fungsi: TT.TK_FUNGSI,
    saat: TT.TK_SAAT,
    kembalikan: TT.TK_KEMBALIKAN,
    in: TT.TK_IN,
    dari: TT.TK_IN,
    kali: TT.TK_KALI,
    halaman: TT.TK_BUAT, // Page root — synonym for Buat halaman
    komponen: TT.TK_DEFINSIKAN, // Component declaration (alias of Definisikan)

    // English
    create: TT.TK_BUAT,
    page: TT.TK_BUAT, // Page root — synonym for Create page
    component: TT.TK_DEFINSIKAN, // Component declaration (alias of Define)
    if: TT.TK_JIKA,
    else: TT.TK_LAINNYA,
    loop: TT.TK_ULANGI,
    for: TT.TK_UNTUK,
    from: TT.TK_IN,
    times: TT.TK_KALI,
    define: TT.TK_DEFINSIKAN,
    state: TT.TK_DATA,
    const: TT.TK_TETAP,
    let: TT.TK_UBAH,
    derived: TT.TK_TURUNAN,
    func: TT.TK_FUNGSI,
    when: TT.TK_SAAT,
    return: TT.TK_KEMBALIKAN,
    skip: TT.TK_PASS,
  };

  /* ==========================================================================
   * 3. EVENT ALIAS MAP (PromptJS on_x → PromptJS native event name)
   * ========================================================================== */
  const EVENT_ALIASES = {
    // Indonesia style
    on_klik: 'diklik',
    on_diklik: 'diklik',
    on_diketik: 'diketik',
    on_ditekan: 'ditekan',
    on_dilepas: 'dilepas',
    on_diubah: 'diubah',
    on_disubmit: 'disubmit',
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

  /* ==========================================================================
   * 4. TAG ALIASES (PromptJS tag → HTML tag, merged with PromptJS's)
   * ========================================================================== */
  const TAG_ALIASES = {
    tombol: 'button',
    button: 'button',
    ruang: 'div',
    div: 'div',
    judul: 'h1',
    h1: 'h1',
    subjudul: 'h2',
    h2: 'h2',
    paragraf: 'p',
    p: 'p',
    gambar: 'img',
    img: 'img',
    tautan: 'a',
    a: 'a',
    masukan: 'input',
    input: 'input',
    pilihan: 'select',
    select: 'select',
    kolom: 'textarea',
    textarea: 'textarea',
    tabel: 'table',
    table: 'table',
    artikel: 'article',
    article: 'article',
    kanvas: 'canvas',
    canvas: 'canvas',
    opsi: 'option',
    option: 'option',
    fragmen: 'fragment',
    fragment: 'fragment',
    wadah: 'div',
    pemisah: 'hr',
    hr: 'hr',
    form: 'form',
    frm: 'form',
    nav: 'nav',
    navigasi: 'nav',
    header: 'header',
    kepala: 'header',
    footer: 'footer',
    kaki: 'footer',
    section: 'section',
    bagian: 'section',
    main: 'main',
    utama: 'main',
    aside: 'aside',
    samping: 'aside',
    ul: 'ul',
    daftar: 'ul',
    ol: 'ol',
    daftarterurut: 'ol',
    li: 'li',
    item: 'li',
    span: 'span',
    rentang: 'span',
    label: 'label',
    h3: 'h3',
    h4: 'h4',
    h5: 'h5',
    h6: 'h6',
    video: 'video',
    audio: 'audio',
    iframe: 'iframe',
    bingkai: 'iframe',
  };

  /* ==========================================================================
   * 5. ERROR REPORTING
   * ========================================================================== */
  function createError(code, message, line, col, suggestion) {
    return {
      code: code,
      severity: 'error',
      message: message,
      line: line,
      column: col,
      suggestion: suggestion || '',
    };
  }

  /* ==========================================================================
   * 6. TOKEN OBJECT
   * ========================================================================== */
  function Token(type, value, line, col, raw) {
    this.type = type;
    this.value = value;
    this.line = line;
    this.col = col;
    this.raw = raw || value;
  }

  Token.prototype.toString = function () {
    return `Token(${this.type}, "${this.value}", ${this.line}:${this.col})`;
  };

  /* ==========================================================================
   * 7. LEXER ENGINE
   * ========================================================================== */
  function PromptJSLexer() {
    this.source = '';
    this.tokens = [];
    this.errors = [];
    this.frontMatter = null;

    // State
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.indentStack = [0];
    this.pendingDedents = 0;
    this.inFrontMatter = false;
  }

  // --- Entry Point ---
  PromptJSLexer.prototype.tokenize = function (source) {
    this.source = source;
    this.tokens = [];
    this.errors = [];
    this.frontMatter = null;
    this.pos = 0;
    this.line = 1;
    this.col = 1;
    this.indentStack = [0];
    this.pendingDedents = 0;
    this.inFrontMatter = false;

    const lines = source.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const rawLine = lines[i];
      const lineNum = i + 1;

      // --- Front-matter detection ---
      if (i === 0 && rawLine.trim() === '---') {
        this.inFrontMatter = true;
        continue;
      }
      if (this.inFrontMatter) {
        if (rawLine.trim() === '---') {
          this.inFrontMatter = false;
        } else {
          // Accumulate front-matter lines (parse later)
          if (!this.frontMatter) this.frontMatter = [];
          this.frontMatter.push(rawLine);
        }
        continue;
      }

      // --- Blank lines ---
      if (rawLine.trim() === '') {
        continue;
      }

      // --- Indentation handling ---
      const indent = this._measureIndent(rawLine);
      if (indent < 0) {
        this.errors.push(
          createError(
            'E1001',
            `Indentasi ganjil di baris ${lineNum}: ${indent} spasi (harus kelipatan 2)`,
            lineNum,
            1,
            'Gunakan kelipatan 2 spasi untuk indentasi.'
          )
        );
        continue;
      }
      if (indent > rawLine.length) continue; // all-whitespace line

      this._emitIndentDedent(indent, lineNum);

      // --- Tokenize the content of the line ---
      const content = rawLine.substring(indent);
      this._tokenizeLine(content, lineNum, indent);
    }

    // Emit remaining DEDENTs at EOF
    while (this.indentStack.length > 1) {
      this.indentStack.pop();
      this.tokens.push(new Token(TT.TK_DEDENT, '', this.line, 0));
    }

    this.tokens.push(new Token(TT.TK_EOF, '', this.line, 0));
    return { tokens: this.tokens, errors: this.errors, frontMatter: this.frontMatter };
  };

  // --- Indent measurement ---
  PromptJSLexer.prototype._measureIndent = function (line) {
    let count = 0;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === ' ') {
        count++;
      } else if (ch === '\t') {
        return -1; // Tab detected — error
      } else {
        break;
      }
    }
    if (count % 2 !== 0) return -1; // Odd indent
    return count;
  };

  // --- INDENT/DEDENT emission ---
  PromptJSLexer.prototype._emitIndentDedent = function (indent, lineNum) {
    const current = this.indentStack[this.indentStack.length - 1];
    if (indent > current) {
      this.indentStack.push(indent);
      this.tokens.push(new Token(TT.TK_INDENT, '', lineNum, 1));
    } else if (indent < current) {
      while (
        this.indentStack.length > 1 &&
        this.indentStack[this.indentStack.length - 1] > indent
      ) {
        this.indentStack.pop();
        this.tokens.push(new Token(TT.TK_DEDENT, '', lineNum, 1));
      }
      if (this.indentStack[this.indentStack.length - 1] !== indent) {
        this.errors.push(
          createError(
            'E1002',
            `Indentasi tidak konsisten di baris ${lineNum}: expected ${this.indentStack[this.indentStack.length - 1]}, got ${indent}`,
            lineNum,
            1,
            'Pastikan setiap blok menggunakan indentasi yang konsisten (kelipatan 2 spasi).'
          )
        );
      }
    }
  };

  // --- Line tokenization ---
  PromptJSLexer.prototype._tokenizeLine = function (content, lineNum, baseCol) {
    const trimmed = content.trim();

    // 1. Comment lines
    if (trimmed.startsWith('--') || trimmed.startsWith('//')) {
      return; // Skip comments
    }

    // 2. String-only lines: "text content"
    if (trimmed.startsWith('"') || trimmed.startsWith("'")) {
      this._tokenizeStringLine(trimmed, lineNum, baseCol);
      return;
    }

    // 3. on_event = expr lines
    if (/^on[_\w]+\s*=/.test(trimmed)) {
      this._tokenizeEventLine(trimmed, lineNum, baseCol);
      return;
    }

    // 4. $external.ref lines (as property value or standalone)
    if (/^\$\w/.test(trimmed)) {
      this._tokenizeExternalRefLine(trimmed, lineNum, baseCol);
      return;
    }

    // 5. Block openers: Buat/Create/Definisikan/Define/Halaman/Page/Komponen/Component keyword
    const blockMatch = trimmed.match(
      /^(Buat|buat|Create|create|Definisikan|definisikan|Define|define|Halaman|halaman|Page|page|Komponen|komponen|Component|component)\b/
    );
    if (blockMatch) {
      this._tokenizeBlockOpener(trimmed, lineNum, baseCol, blockMatch[1]);
      return;
    }

    // 6. Control flow: Jika/If, Lainnya/Else, Ulangi/Loop
    const ctrlMatch = trimmed.match(
      /^(Jika|jika|If|if|Lainnya|lainnya|Else|else|Ulangi|ulangi|Loop|loop)\b/
    );
    if (ctrlMatch) {
      this._tokenizeControlFlow(trimmed, lineNum, baseCol, ctrlMatch[1]);
      return;
    }

    // 7. Data declarations: Data/State, Tetap/Const, Ubah/Let, Turunan/Derived, Fungsi/Func
    const declMatch = trimmed.match(
      /^(Data|data|State|state|Tetap|tetap|Const|const|Ubah|ubah|Let|let|Turunan|turunan|Derived|derived|Fungsi|fungsi|Func|func|Saat|saat|When|when|Kembalikan|kembalikan|Return|return)\b/
    );
    if (declMatch) {
      this._tokenizeDeclaration(trimmed, lineNum, baseCol, declMatch[1]);
      return;
    }

    // 8. pass/Lewati/Skip
    if (/^(pass|lewati|Lewati|skip|Skip)$/.test(trimmed)) {
      this.tokens.push(new Token(TT.TK_PASS, trimmed, lineNum, baseCol + 1));
      return;
    }

    // 9. Property lines: key = value (fallback — most generic)
    if (/^\w[\w-]*\s*=/.test(trimmed)) {
      this._tokenizePropertyLine(trimmed, lineNum, baseCol);
      return;
    }

    // 10. Expression / fallback
    this._tokenizeExpression(trimmed, lineNum, baseCol);
  };

  // --- String line tokenization ---
  PromptJSLexer.prototype._tokenizeStringLine = function (content, lineNum, baseCol) {
    const quote = content[0];
    const endIdx = content.length - 1;
    // Find matching closing quote
    if (content[endIdx] === quote) {
      const text = content.substring(1, endIdx);
      this.tokens.push(new Token(TT.TK_STRING, text, lineNum, baseCol + 1, content));
    } else {
      // Unterminated string
      const text = content.substring(1);
      this.tokens.push(new Token(TT.TK_STRING, text, lineNum, baseCol + 1, content));
      this.errors.push(
        createError(
          'E1003',
          `String tidak tertutup di baris ${lineNum}`,
          lineNum,
          baseCol + 1,
          `Pastikan string diakhiri dengan ${quote}.`
        )
      );
    }
  };

  // --- Event line tokenization ---
  PromptJSLexer.prototype._tokenizeEventLine = function (content, lineNum, baseCol) {
    const eqIdx = content.indexOf('=');
    const eventName = content.substring(0, eqIdx).trim();
    const expr = content.substring(eqIdx + 1).trim();

    this.tokens.push(new Token(TT.TK_ON_EVENT, eventName, lineNum, baseCol + 1));

    // Look up PromptJS event name
    this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));

    // Tokenize the expression part
    this._tokenizeExpression(expr, lineNum, baseCol + eqIdx + 2);
  };

  // --- External reference line tokenization ---
  PromptJSLexer.prototype._tokenizeExternalRefLine = function (content, lineNum, baseCol) {
    // Handle: $name.path = ... or just $name.path
    const eqIdx = content.indexOf('=');
    if (eqIdx > 0) {
      // It's a property with external ref as value: key = $ext.ref
      const key = content.substring(0, eqIdx).trim();
      const val = content.substring(eqIdx + 1).trim();

      this.tokens.push(new Token(TT.TK_IDENT, key, lineNum, baseCol + 1));
      this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));
      this._tokenizeExpression(val, lineNum, baseCol + eqIdx + 2);
    } else {
      // Standalone external reference
      this._tokenizeExpression(content, lineNum, baseCol);
    }
  };

  // --- Block opener tokenization ---
  // Keywords that ARE the element name (not just a prefix like Buat)
  const SELF_NAMED_KEYWORDS = new Set(['halaman', 'page']);

  PromptJSLexer.prototype._tokenizeBlockOpener = function (content, lineNum, baseCol, keyword) {
    const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_BUAT;
    this.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

    // For self-named keywords like Halaman/Page, the keyword itself is the tag name.
    // e.g. "Halaman:" means Buat halaman: (page root element)
    const kwLower = keyword.toLowerCase();
    const isSelfNamed = SELF_NAMED_KEYWORDS.has(kwLower);

    // Parse selector: tag.class#id or just identifier
    // The colon separates the selector from inline content (e.g. Buat h1: "text")
    // or opens a block body (e.g. Buat div:)
    let afterKeyword;
    if (isSelfNamed) {
      // === Self-named block opener: pages (and the component synonym) ===
      // "Halaman:" / "Page:"          -> anonymous page (no id)
      // "Halaman Beranda:" / "Page Home:" -> named page; the name becomes the
      //                                   root element's id (e.g. id="beranda").
      const selectorTag = kwLower; // 'halaman' | 'page' | 'komponen' | 'component'
      let rest = content.substring(keyword.length).trim();
      // Tolerate a repeated tag, e.g. "Halaman halaman:".
      if (rest.toLowerCase().startsWith(selectorTag)) {
        rest = rest.substring(selectorTag.length).trim();
      }
      let namePart = rest;
      const restColon = rest.indexOf(':');
      if (restColon >= 0) namePart = rest.slice(0, restColon);
      namePart = namePart.trim();
      const pageId = namePart ? namePart.replace(/^#/, '').toLowerCase() : null;

      this.tokens.push(
        new Token(TT.TK_IDENT, selectorTag, lineNum, baseCol + keyword.length + 1, {
          type: 'Selector',
          tag: selectorTag,
          classes: [],
          id: pageId,
        })
      );

      const sColon = content.indexOf(':', keyword.length);
      if (sColon >= 0) {
        this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + sColon + 1));
        const inlineContent = content.substring(sColon + 1).trim();
        if (inlineContent) {
          this._tokenizeExpression(inlineContent, lineNum, baseCol + sColon + 2);
        }
      } else {
        this.errors.push(
          createError(
            'E1004',
            `Block opener tanpa colon di baris ${lineNum}: "${content}"`,
            lineNum,
            baseCol + 1,
            'Tambahkan : di akhir baris untuk membuka blok. Contoh: Halaman Beranda:'
          )
        );
      }
      return;
    } else {
      afterKeyword = content.substring(keyword.length).trim();
    }

    // === Component declaration: "Komponen Name(p1, p2):" / "Definisikan Name(p1):" ===
    if (kwToken === TT.TK_DEFINSIKAN) {
      const declNameMatch = afterKeyword.match(/^([A-Za-z_]\w*)/);
      const declName = declNameMatch ? declNameMatch[1] : '';
      const nameCol = baseCol + keyword.length + 2;
      this.tokens.push(new Token(TT.TK_IDENT, declName, lineNum, nameCol));
      const declRest = afterKeyword.substring(declName.length).trim();
      if (declRest.startsWith('(')) {
        const closeIdx = declRest.indexOf(')');
        const paramStr = closeIdx >= 0 ? declRest.substring(1, closeIdx) : declRest.substring(1);
        const parenCol = nameCol + declName.length;
        this.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, parenCol));
        if (paramStr.trim()) {
          this._tokenizeExpression(paramStr, lineNum, parenCol + 1);
        }
        this.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, parenCol + paramStr.length + 1));
      }
      const declColon = content.indexOf(':', keyword.length);
      if (declColon >= 0) {
        this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + declColon + 1));
      } else {
        this.errors.push(
          createError(
            'E1004',
            `Block opener tanpa colon di baris ${lineNum}: "${content}"`,
            lineNum,
            baseCol + 1,
            'Tambahkan : di akhir baris. Contoh: Komponen Kartu(judul):'
          )
        );
      }
      return;
    }

    // === Component invocation: "Buat Name(arg: val, ...)" (no colon, no body) ===
    if (kwToken === TT.TK_BUAT) {
      const invMatch = afterKeyword.match(/^([A-Za-z_]\w*)\s*\((.*)\)$/);
      if (invMatch) {
        const invName = invMatch[1];
        const invArgs = invMatch[2];
        const invNameCol = baseCol + keyword.length + 2;
        this.tokens.push(
          new Token(TT.TK_IDENT, invName, lineNum, invNameCol, {
            type: 'Selector',
            tag: invName,
            classes: [],
            id: null,
          })
        );
        const invParenCol = invNameCol + invName.length;
        this.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, invParenCol));
        if (invArgs.trim()) {
          this._tokenizeExpression(invArgs, lineNum, invParenCol + 1);
        }
        this.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, invParenCol + invArgs.length + 1));
        return;
      }
    }

    // Find the first colon that is NOT inside a string literal
    let colonIdx = -1;
    let inString = false;
    let stringChar = '';
    for (let i = 0; i < afterKeyword.length; i++) {
      const ch = afterKeyword[i];
      if (inString) {
        if (ch === stringChar && afterKeyword[i - 1] !== '\\') {
          inString = false;
        }
      } else {
        if (ch === '"' || ch === "'") {
          inString = true;
          stringChar = ch;
        } else if (ch === ':') {
          colonIdx = i;
          break;
        }
      }
    }

    if (colonIdx >= 0) {
      const selector = afterKeyword.substring(0, colonIdx).trim();
      const inlineContent = afterKeyword.substring(colonIdx + 1).trim();

      if (selector) {
        this._tokenizeSelector(selector, lineNum, baseCol + keyword.length + 1);
      }
      // Emit colon token
      const contentColonIdx = content.indexOf(':', keyword.length);
      this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + contentColonIdx + 1));

      // Tokenize inline content after colon (if any)
      if (inlineContent) {
        this._tokenizeExpression(inlineContent, lineNum, baseCol + contentColonIdx + 2);
      }
    } else if (afterKeyword) {
      // No colon at all — this is an error for block openers
      this._tokenizeSelector(afterKeyword, lineNum, baseCol + keyword.length + 1);
      this.errors.push(
        createError(
          'E1004',
          `Block opener tanpa colon di baris ${lineNum}: "${content}"`,
          lineNum,
          baseCol + 1,
          'Tambahkan : di akhir baris untuk membuka blok. Contoh: Buat card:'
        )
      );
    }
  };

  // --- Selector tokenization: tag.class1.class2#id ---
  PromptJSLexer.prototype._tokenizeSelector = function (selector, lineNum, baseCol) {
    // Parse selector into components
    let pos = 0;
    let tag = '';
    const classes = [];
    let id = null;

    // First segment: tag name (can include underscore for component names like card_produk)
    while (pos < selector.length && selector[pos] !== '.' && selector[pos] !== '#') {
      tag += selector[pos];
      pos++;
    }

    // Subsequent segments
    while (pos < selector.length) {
      if (selector[pos] === '.') {
        pos++; // skip dot
        let cls = '';
        while (pos < selector.length && selector[pos] !== '.' && selector[pos] !== '#') {
          cls += selector[pos];
          pos++;
        }
        if (cls) classes.push(cls);
      } else if (selector[pos] === '#') {
        pos++; // skip hash
        let idStr = '';
        while (pos < selector.length && selector[pos] !== '.' && selector[pos] !== '#') {
          idStr += selector[pos];
          pos++;
        }
        id = idStr || null;
      } else {
        pos++;
      }
    }

    // Emit selector as structured token value
    this.tokens.push(
      new Token(TT.TK_IDENT, tag, lineNum, baseCol, {
        type: 'Selector',
        tag: tag,
        classes: classes,
        id: id,
      })
    );

    // Also emit class and id tokens for parser convenience
    for (const cls of classes) {
      this.tokens.push(new Token(TT.TK_DOT, cls, lineNum, baseCol));
    }
    if (id) {
      this.tokens.push(new Token(TT.TK_HASH, id, lineNum, baseCol));
    }
  };

  // --- Control flow tokenization ---
  PromptJSLexer.prototype._tokenizeControlFlow = function (content, lineNum, baseCol, keyword) {
    const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_IDENT;
    this.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

    const afterKeyword = content.substring(keyword.length).trim();

    if (keyword.toLowerCase() === 'lainnya' || keyword.toLowerCase() === 'else') {
      // Lainnya:/Else: — just a colon
      if (afterKeyword.trim() === ':' || afterKeyword.trim() === '') {
        if (afterKeyword.trim() === ':') {
          this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + content.length));
        }
        return;
      }
    }

    // Jika/If/Ulangi/Loop with condition
    if (afterKeyword.endsWith(':')) {
      const condition = afterKeyword.substring(0, afterKeyword.length - 1).trim();
      if (condition) {
        this._tokenizeExpression(condition, lineNum, baseCol + keyword.length + 1);
      }
      this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + content.indexOf(':') + 1));
    } else {
      if (afterKeyword) {
        this._tokenizeExpression(afterKeyword, lineNum, baseCol + keyword.length + 1);
      }
    }
  };

  // --- Declaration tokenization ---
  PromptJSLexer.prototype._tokenizeDeclaration = function (content, lineNum, baseCol, keyword) {
    const kwToken = KEYWORDS[keyword.toLowerCase()] || TT.TK_IDENT;
    this.tokens.push(new Token(kwToken, keyword, lineNum, baseCol + 1));

    const afterKeyword = content.substring(keyword.length).trim();
    if (afterKeyword) {
      this._tokenizeExpression(afterKeyword, lineNum, baseCol + keyword.length + 1);
    }
  };

  // --- Property line tokenization ---
  PromptJSLexer.prototype._tokenizePropertyLine = function (content, lineNum, baseCol) {
    const eqIdx = content.indexOf('=');
    const key = content.substring(0, eqIdx).trim();
    const value = content.substring(eqIdx + 1).trim();

    this.tokens.push(new Token(TT.TK_IDENT, key, lineNum, baseCol + 1));
    this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + eqIdx + 1));

    // Check if value starts with $ (external ref)
    if (value.startsWith('$')) {
      this._tokenizeExpression(value, lineNum, baseCol + eqIdx + 2);
    } else {
      this._tokenizeExpression(value, lineNum, baseCol + eqIdx + 2);
    }
  };

  // --- Expression tokenization (recursive descent for inline expressions) ---
  PromptJSLexer.prototype._tokenizeExpression = function (expr, lineNum, baseCol) {
    if (!expr || expr.trim() === '') return;
    expr = expr.trim();

    let pos = 0;
    const len = expr.length;

    while (pos < len) {
      const ch = expr[pos];

      // Whitespace
      if (ch === ' ' || ch === '\t') {
        pos++;
        continue;
      }

      // String literal
      if (ch === '"' || ch === "'") {
        const quote = ch;
        let str = '';
        pos++; // skip opening quote
        while (pos < len && expr[pos] !== quote) {
          if (expr[pos] === '\\' && pos + 1 < len) {
            str += expr[pos + 1];
            pos += 2;
          } else {
            str += expr[pos];
            pos++;
          }
        }
        if (pos < len) pos++; // skip closing quote
        this.tokens.push(new Token(TT.TK_STRING, str, lineNum, baseCol + pos - str.length - 2));
        continue;
      }

      // Number literal
      if (
        (ch >= '0' && ch <= '9') ||
        (ch === '-' && pos + 1 < len && expr[pos + 1] >= '0' && expr[pos + 1] <= '9')
      ) {
        let num = '';
        if (ch === '-') {
          num += '-';
          pos++;
        }
        while (pos < len && ((expr[pos] >= '0' && expr[pos] <= '9') || expr[pos] === '.')) {
          num += expr[pos];
          pos++;
        }
        this.tokens.push(
          new Token(TT.TK_NUMBER, parseFloat(num), lineNum, baseCol + pos - num.length)
        );
        continue;
      }

      // External reference: $name.path
      if (ch === '$') {
        let ref = '$';
        pos++;
        while (
          pos < len &&
          (expr[pos] === '_' ||
            expr[pos] === '.' ||
            (expr[pos] >= 'a' && expr[pos] <= 'z') ||
            (expr[pos] >= 'A' && expr[pos] <= 'Z') ||
            (expr[pos] >= '0' && expr[pos] <= '9'))
        ) {
          ref += expr[pos];
          pos++;
        }
        this.tokens.push(new Token(TT.TK_EXT_REF, ref, lineNum, baseCol + pos - ref.length + 1));
        continue;
      }

      // Multi-char operators
      if (pos + 2 < len) {
        const triple = expr.substring(pos, pos + 3);
        if (triple === '===' || triple === '!==' || triple === '...') {
          const ttype = triple === '===' ? TT.TK_EQ : triple === '!==' ? TT.TK_NEQ : TT.TK_IDENT;
          this.tokens.push(new Token(ttype, triple, lineNum, baseCol + pos + 1));
          pos += 3;
          continue;
        }
      }
      if (pos + 1 < len) {
        const pair = expr.substring(pos, pos + 2);
        if (pair === '>=' || pair === '<=' || pair === '&&' || pair === '||' || pair === '=>') {
          let ttype;
          switch (pair) {
            case '>=':
              ttype = TT.TK_GTE;
              break;
            case '<=':
              ttype = TT.TK_LTE;
              break;
            case '&&':
              ttype = TT.TK_AND;
              break;
            case '||':
              ttype = TT.TK_OR;
              break;
            case '=>':
              ttype = TT.TK_ARROW;
              break;
          }
          this.tokens.push(new Token(ttype, pair, lineNum, baseCol + pos + 1));
          pos += 2;
          continue;
        }
      }

      // Single-char operators & symbols
      switch (ch) {
        case '=':
          this.tokens.push(new Token(TT.TK_ASSIGN, '=', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '>':
          this.tokens.push(new Token(TT.TK_GT, '>', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '<':
          this.tokens.push(new Token(TT.TK_LT, '<', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '+':
          this.tokens.push(new Token(TT.TK_PLUS, '+', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '-':
          this.tokens.push(new Token(TT.TK_MINUS, '-', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '*':
          this.tokens.push(new Token(TT.TK_STAR, '*', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '/':
          this.tokens.push(new Token(TT.TK_SLASH, '/', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '%':
          this.tokens.push(new Token(TT.TK_MOD, '%', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '!':
          this.tokens.push(new Token(TT.TK_NOT, '!', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '.':
          this.tokens.push(new Token(TT.TK_DOT, '.', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '#':
          this.tokens.push(new Token(TT.TK_HASH, '#', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case ':':
          this.tokens.push(new Token(TT.TK_COLON, ':', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case ',':
          this.tokens.push(new Token(TT.TK_COMMA, ',', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '(':
          this.tokens.push(new Token(TT.TK_LPAREN, '(', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case ')':
          this.tokens.push(new Token(TT.TK_RPAREN, ')', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '[':
          this.tokens.push(new Token(TT.TK_LBRACKET, '[', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case ']':
          this.tokens.push(new Token(TT.TK_RBRACKET, ']', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '{':
          this.tokens.push(new Token(TT.TK_LBRACE, '{', lineNum, baseCol + pos + 1));
          pos++;
          continue;
        case '}':
          this.tokens.push(new Token(TT.TK_RBRACE, '}', lineNum, baseCol + pos + 1));
          pos++;
          continue;
      }

      // Identifier or keyword
      if ((ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z') || ch === '_') {
        let ident = '';
        while (
          pos < len &&
          (expr[pos] === '_' ||
            (expr[pos] >= 'a' && expr[pos] <= 'z') ||
            (expr[pos] >= 'A' && expr[pos] <= 'Z') ||
            (expr[pos] >= '0' && expr[pos] <= '9'))
        ) {
          ident += expr[pos];
          pos++;
        }

        // Check if it's a keyword
        const kwType = KEYWORDS[ident.toLowerCase()];
        if (kwType) {
          this.tokens.push(new Token(kwType, ident, lineNum, baseCol + pos - ident.length + 1));
        } else {
          this.tokens.push(
            new Token(TT.TK_IDENT, ident, lineNum, baseCol + pos - ident.length + 1)
          );
        }
        continue;
      }

      // Unknown character
      this.errors.push(
        createError(
          'E1005',
          `Karakter tidak dikenali di baris ${lineNum}: '${ch}'`,
          lineNum,
          baseCol + pos + 1,
          `Hapus atau ganti karakter '${ch}'.`
        )
      );
      pos++;
    }
  };

  // --- Front-matter parser (simple YAML-like) ---
  PromptJSLexer.parseFrontMatter = function (lines) {
    if (!lines || lines.length === 0) return null;
    const result = {};
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue; // skip comments
      const colonIdx = trimmed.indexOf(':');
      if (colonIdx < 0) continue;
      const key = trimmed.substring(0, colonIdx).trim();
      const value = trimmed.substring(colonIdx + 1).trim();

      // File reference: starts with ./ or /
      if (value.startsWith('./') || value.startsWith('/')) {
        result[key] = { type: 'file', path: value };
      }
      // Inline JSON object: starts with {
      else if (value.startsWith('{')) {
        // Try strict JSON first; if fails, try lenient (unquoted keys)
        try {
          result[key] = { type: 'inline', value: JSON.parse(value) };
        } catch {
          try {
            // Lenient: wrap keys in quotes for unquoted YAML-like objects
            const fixed = value.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
            result[key] = { type: 'inline', value: JSON.parse(fixed) };
          } catch {
            result[key] = { type: 'inline', value: value };
          }
        }
      }
      // Simple string value
      else {
        // Try as JSON first (numbers, booleans, etc)
        try {
          const parsed = JSON.parse(value);
          result[key] = { type: 'inline', value: parsed };
        } catch {
          result[key] = { type: 'inline', value: value };
        }
      }
    }
    return result;
  };

  /* ==========================================================================
   * 8. EXPORTS
   * ========================================================================== */
  exports.TT = TT;
  exports.KEYWORDS = KEYWORDS;
  exports.EVENT_ALIASES = EVENT_ALIASES;
  exports.TAG_ALIASES = TAG_ALIASES;
  exports.Token = Token;
  exports.PromptJSLexer = PromptJSLexer;
  exports.parseFrontMatter = PromptJSLexer.parseFrontMatter;

  exports.tokenize = function (source) {
    const lexer = new PromptJSLexer();
    return lexer.tokenize(source);
  };

  return exports;
});
