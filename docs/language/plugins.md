# Plugin / Plugins

> docs/language/ → **Plugins**
> ← [Modules](modules.md) · [Adapters](adapters.md) →

---

Plugin memungkinkan Anda memodifikasi output kompilasi di berbagai tahap pipeline. PromptJS menyediakan 4 hook transform yang dapat diimplementasikan plugin. Plugin dimuat melalui file konfigurasi proyek.

Plugins allow you to modify compilation output at various pipeline stages. PromptJS provides 4 transform hooks that plugins can implement. Plugins are loaded via the project configuration file.

> Verifikasi sumber / Source verification: `src/engine/plugins.js` — `applyHook()` (iterasi semua plugin, error non-fatal via `process.stderr`), `transformSource`/`transformJS`/`transformCSS`/`transformHTML`. Zero-dependency.

---

## Kontrak Plugin / Plugin Contract

Setiap plugin adalah objek JavaScript dengan properti `name` (wajib) dan fungsi hook (opsional):

Each plugin is a JavaScript object with a `name` property (required) and hook functions (optional):

```js
// my-plugin.js
module.exports = {
    name: 'my-plugin',
    transformSource(source, filename) {
        // Hook 1: modifikasi sumber .pjs sebelum kompilasi
        return source;
    },
    transformJS(js, filename) {
        // Hook 2: modifikasi JS setelah kompilasi
        return js;
    },
    transformCSS(css, filename) {
        // Hook 3: modifikasi CSS setelah kompilasi
        return css;
    },
    transformHTML(html, filename) {
        // Hook 4: modifikasi HTML setelah generate
        return html;
    }
};
```

Setiap hook **wajib mengembalikan string** hasil transform. Hook yang tidak diimplementasikan cukup dihilangkan — `applyHook` melewati plugin yang tidak punya fungsi hook tersebut (`typeof plugin[hookName] === 'function'`).

Each hook **must return the transformed string**. Unimplemented hooks are simply omitted — `applyHook` skips any plugin lacking that hook function (`typeof plugin[hookName] === 'function'`).

---

## 4 Hook Transform / 4 Transform Hooks

| # | Hook | Dipanggil saat / Called When | Argumen / Arguments |
|---|------|---------------------------|-------------------|
| 1 | `transformSource` | Sebelum kompilasi / Before compile | `(source: string, filename: string) → string` |
| 2 | `transformJS` | Setelah kompilasi JS / After JS compile | `(js: string, filename: string) → string` |
| 3 | `transformCSS` | Setelah kompilasi CSS / After CSS compile | `(css: string, filename: string) → string` |
| 4 | `transformHTML` | Setelah generate HTML per file / After HTML generation | `(html: string, filename: string) → string` |

Hook 1-3 dijalankan di dalam `PromptJSEngine.compile()`. Hook 4 dijalankan di `Builder.buildProject()` per file `.html`.

Hooks 1-3 run inside `PromptJSEngine.compile()`. Hook 4 runs in `Builder.buildProject()` per `.html` file.

---

## Urutan Eksekusi Multi-Plugin / Multi-Plugin Execution Order

Untuk satu hook, `applyHook` menjalankan plugin **berurutan sesuai urутan di array** `plugins`. Output satu plugin menjadi input plugin berikutnya — ini rantai transform (pipeline) per-hook.

For a single hook, `applyHook` runs plugins **in array order** of `plugins`. One plugin's output becomes the next plugin's input — a per-hook transform chain (pipeline).

```js
// plugins: [A, B]  pada hook transformJS:
// js0 → A.transformJS(js0) → js1 → B.transformJS(js1) → js2 (final)
```

Karena itu, susunan plugin penting: letakkan plugin yang menambah kode sebelum plugin yang memadatkan (minify).

Therefore plugin order matters: place plugins that add code before plugins that minify.

---

## Memuat Plugin / Loading Plugins

Plugin dimuat melalui `pjs.config.js` (atau `promptjs.config.js`):

Plugins are loaded via `pjs.config.js` (or `promptjs.config.js`):

```js
// pjs.config.js
module.exports = {
    adapter: 'static',
    plugins: [
        require('./my-plugin'),
        {
            name: 'inline-plugin',
            transformJS(js, filename) {
                return js.replace(/console\.log/g, '/* removed */');
            }
        }
    ]
};
```

Setiap entri di `plugins` bisa berupa fungsi (dipanggil tanpa argumen untuk mendapatkan objek plugin) atau objek langsung dengan `name: string`. Lihat [Config](../reference/config.md) untuk detail validasi.

Each entry in `plugins` can be a function (called with no args to get the plugin object) or a direct object with `name: string`. See [Config](../reference/config.md) for validation details.

---

## Contoh Plugin Nyata / Real Plugin Examples

### 1. Banner header pada JS / JS banner header

```js
// banner-plugin.js
module.exports = {
    name: 'banner',
    transformJS(js, filename) {
        const banner = '/* Dibangun dengan PromptJS — ' + filename + ' */\n';
        return banner + js;
    }
};
```

### 2. Hapus komentar CSS / Strip CSS comments

```js
// strip-css-comments.js
module.exports = {
    name: 'strip-css-comments',
    transformCSS(css, filename) {
        return css.replace(/\/\*[\s\S]*?\*\//g, '');
    }
};
```

### 3. Sisipkan meta viewport ke HTML / Inject meta viewport into HTML

```js
// meta-viewport.js
module.exports = {
    name: 'meta-viewport',
    transformHTML(html, filename) {
        const meta = '<meta name="viewport" content="width=device-width, initial-scale=1">';
        return html.replace('</head>', meta + '</head>');
    }
};
```

---

## Penanganan Error / Error Handling

Error plugin bersifat **non-fatal**. Jika fungsi hook melempar exception, error ditulis ke `stderr` (mencantumkan `plugin.name`) dan kompilasi dilanjutkan. Ini memastikan satu plugin bermasalah tidak menghentikan seluruh build.

Plugin errors are **non-fatal**. If a hook function throws, the error is written to `stderr` (including `plugin.name`) and compilation continues. This ensures one problematic plugin doesn't halt the entire build.

```text
[PromptJS] Plugin "my-plugin" error in transformJS: TypeError: ...
# Kompilasi tetap berlanjut / Compilation continues
```

Jika `plugin.name` tidak ada, log memakai `"unknown"`.

If `plugin.name` is missing, the log uses `"unknown"`.

---

← [Modules](modules.md) · [Adapters](adapters.md) →
