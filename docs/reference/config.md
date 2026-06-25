# Konfigurasi / Configuration

> docs/reference/ → **Configuration**
> ← [CLI](cli.md) · [Plugins](../language/plugins.md) →

---

PromptJS memuat konfigurasi dari file JavaScript. Konfigurasi mendukung CommonJS dan ESM default export. File dicari secara berurutan dengan berjalan ke atas dari `startDir`.

PromptJS loads configuration from a JavaScript file. Config supports CommonJS and ESM default exports. Files are searched in order, walking up from `startDir`.

---

## Nama File Konfigurasi / Config File Names

Diperiksa secara berurutan / Searched in order:

1. `pjs.config.js`
2. `promptjs.config.js`

Hanya format JavaScript yang didukung. Tidak ada dukungan untuk JSON, YAML, atau TOML.

Only JavaScript format is supported. No JSON, YAML, or TOML support.

---

## Skema Konfigurasi / Config Schema

Sumber: `src/engine/config.js`

```js
{
  adapter: "static" | "node" | "vercel" | null,
  plugins: Function[],
  outDir: string,
  rootDir: string,
  pagesDir: string,
  assetsDir: string,
  baseUrl: string,
  meta: {
    title: string,
    description: string,
    ogImage: string,
    // ... properti meta lainnya
  },
  siteUrl: string,
  apiUrl: string
}
```

**Penjelasan properti / Property descriptions:**

| Properti / Property | Tipe / Type | Default | Deskripsi / Description |
|---------------------|-------------|---------|------------------------|
| `adapter` | `string \| null` | `null` | Strategi deployment: `static`, `node`, atau `vercel` / Deployment adapter |
| `plugins` | `Function[]` | `[]` | Array fungsi plugin / Plugin function array |
| `outDir` | `string` | `"dist"` | Direktori output build / Build output directory |
| `rootDir` | `string` | - | Direktori root proyek / Project root directory |
| `pagesDir` | `string` | `"pages"` | Direktori halaman / Pages directory |
| `assetsDir` | `string` | `"assets"` | Direktori aset / Assets directory |
| `baseUrl` | `string` | - | Base URL untuk routing / Base URL for routing |
| `meta` | `object` | `{}` | Tag meta HTML (title, description, ogImage, ...) / HTML meta tags |
| `siteUrl` | `string` | - | URL situs, untuk pembuatan sitemap (adapter static) / Site URL for sitemap generation |
| `apiUrl` | `string` | - | URL API, untuk proxy adapter Node / API URL for Node adapter proxy |

---

## Format Ekspor / Export Formats

Konfigurasi mendukung dua format ekspor:

Config supports two export formats:

**CommonJS:**

```js
// pjs.config.js
module.exports = {
  outDir: "public",
  adapter: "static",
  meta: {
    title: "My App",
    description: "A PromptJS application"
  }
}
```

**ESM default export:**

```js
// pjs.config.js
export default {
  outDir: "public",
  adapter: "static",
  meta: {
    title: "My App",
    description: "A PromptJS application"
  }
}
```

Kedua format dimuat via `require()` — bukan `import()`.

Both formats are loaded via `require()` — not `import()`.

---

## Plugin / Plugins

Properti `plugins` harus berupa array. Setiap entri divalidasi:

The `plugins` property must be an array. Each entry is validated:

- **Fungsi** (Function): dipanggil tanpa argumen, harus mengembalikan objek plugin
- **Objek** (Object): harus memiliki properti `name` bertipe string

- **Function**: called with no arguments, must return a plugin object
- **Object**: must have a `name` string property

Jika `plugins` bukan array, nilai direset ke `[]`.

If `plugins` is not an array, the value is reset to `[]`.

```js
// pjs.config.js
module.exports = {
  plugins: [
    // Fungsi yang mengembalikan plugin object
    function myPlugin() {
      return {
        name: "my-plugin",
        // ... hook functions
      }
    },
    // Objek plugin langsung
    {
      name: "another-plugin"
    }
  ]
}
```

Entri plugin yang tidak valid menghasilkan peringatan.

Invalid plugin entries produce a warning.

---

## Prioritas Argumen CLI / CLI Args Priority

Argumen CLI hanya mengubah properti `outDir` dan `adapter` dari konfigurasi file. Properti lainnya tidak dapat di-override dari CLI.

CLI arguments only override `outDir` and `adapter` from the config file. Other properties cannot be overridden from the CLI.

```bash
# adapter dan outDir dari CLI meng-override config file
pjs build --out-dir public/ --adapter static
```

---

## Adapter / Adapters

Nama adapter yang tidak dikenali menghasilkan peringatan `W0000` (peringatan sistem).

Unknown adapter names produce a `W0000` system warning.

| Adapter | Deskripsi / Description |
|---------|------------------------|
| `static` | Situs statis, mendukung sitemap via `siteUrl` / Static site, supports sitemap via `siteUrl` |
| `node` | Server Node.js dengan proxy API via `apiUrl` / Node.js server with API proxy via `apiUrl` |
| `vercel` | Deploy ke Vercel / Deploy to Vercel |

---

## Contoh Lengkap / Complete Example

```js
// pjs.config.js
module.exports = {
  adapter: "static",
  outDir: "dist",
  rootDir: ".",
  pagesDir: "src/pages",
  assetsDir: "public/assets",
  baseUrl: "/my-app",
  siteUrl: "https://example.com",
  meta: {
    title: "PromptJS App",
    description: "Aplikasi web dengan PromptJS",
    ogImage: "/og-image.png"
  },
  plugins: [
    function customPlugin() {
      return {
        name: "custom-plugin"
      }
    }
  ]
}
```

---

← [CLI](cli.md) · [Plugins](../language/plugins.md) →