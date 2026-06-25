# Plugin / Plugins

> docs/language/ → **Plugins**
> ← [Modules](modules.md) · [Adapters](adapters.md) →

---

Plugin memungkinkan Anda memodifikasi output kompilasi di berbagai tahap pipeline. PromptJS menyediakan 4 hook transform yang dapat diimplementasikan plugin. Plugin dimuat melalui file konfigurasi proyek.

Plugins allow you to modify compilation output at various pipeline stages. PromptJS provides 4 transform hooks that plugins can implement. Plugins are loaded via the project configuration file.

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

## Penanganan Error / Error Handling

Error plugin bersifat non-fatal. Jika fungsi hook melempar exception, error ditulis ke `stderr` dan kompilasi dilanjutkan. Ini memastikan satu plugin bermasalah tidak menghentikan seluruh build.

Plugin errors are non-fatal. If a hook function throws an exception, the error is written to `stderr` and compilation continues. This ensures one problematic plugin doesn't halt the entire build.

```js
// Jika plugin melempar error:
// [PromptJS] Plugin "my-plugin" error in transformJS: TypeError: ...
// Kompilasi tetap berlanjut
```

---

← [Modules](modules.md) · [Adapters](adapters.md) →