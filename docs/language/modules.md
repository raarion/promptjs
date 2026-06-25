# Modul / Modules

> docs/language/ → **Modules**
> ← [Auth](auth.md) · [Plugins](plugins.md) →

---

Sistem modul PromptJS memungkinkan berbagi simbol antar file `.pjs` melalui direktif front-matter. Satu file mengekspor simbol, file lain mengimpor. Ini adalah sistem statis pada waktu kompilasi — bukan runtime module loader.

The PromptJS module system allows sharing symbols between `.pjs` files via front-matter directives. One file exports a symbol, another imports it. This is a static system at compile time — not a runtime module loader.

---

## Ekspor / Export

Gunakan `kirim` (atau `share`) di dalam front-matter eksplisit. Dua bentuk tersedia:

Use `kirim` (or `share`) inside explicit front-matter. Two forms are available:

### Inline Value / Nilai Inline

```pjs
---
kirim: apiKey = "abc123"
kirim: versi = 2
---

Halaman:
    Buat span: $apiKey
```

Nilai string di-parse sebagai JSON jika memungkinkan, jika tidak tetap sebagai string.

String values are parsed as JSON if possible, otherwise kept as strings.

### Re-ekspor / Re-export

```pjs
---
kirim: formatTanggal dari "utils.pjs"
---

Halaman:
    Buat span: $formatTanggal
```

Simbol `formatTanggal` dari `utils.pjs` akan di-resolve secara rekursif dan tersedia sebagai `$formatTanggal`.

The `formatTanggal` symbol from `utils.pjs` will be resolved recursively and available as `$formatTanggal`.

---

## Impor / Import

Gunakan `terima` (atau `get`) di front-matter eksplisit:

Use `terima` (or `get`) in explicit front-matter:

```pjs
---
terima: apiKey dari "config.pjs"
terima: baseUrl dari "config.pjs"
---

Halaman:
    Buat span: $baseUrl
```

Path relatif terhadap file yang mengimpor. Simbol yang diimpor tersedia sebagai `$nama` di seluruh file.

Paths are relative to the importing file. Imported symbols are available as `$name` throughout the file.

---

## Resolusi / Resolution

Alur resolusi modul:

Module resolution flow:

1. Ekstrak direktif `kirim`/`terima` dari front-matter
2. Untuk setiap `terima`, baca file sumber
3. Ekstrak front-matter file sumber
4. Cari simbol yang diminta dalam `kirim` file sumber
5. Jika simbol adalah re-ekspor, resolve secara rekursif
6. Merge nilai yang di-resolve ke front-matter konsumen sebagai `$external`

Kedalaman maksimum resolusi rekursif adalah 10 level. Melebihi itu menghasilkan error.

Maximum recursive resolution depth is 10 levels. Exceeding this produces an error.

---

## Deteksi Siklus / Cycle Detection

Sistem menggunakan `Set` untuk melacak file yang sudah dikunjungi. Jika file yang sama ditemukan lagi, peringatan W0000 dipancang dan impor dilewati:

The system uses a `Set` to track visited files. If the same file is encountered again, warning W0000 is emitted and the import is skipped:

```pjs
# config.pjs
kirim: apiKey dari "helper.pjs"

# helper.pjs
terima: apiKey dari "config.pjs"
# → W0000: Circular dependency detected
```

---

## Penanganan Error / Error Handling

| Kondisi / Condition | Perilaku / Behavior |
|---------------------|---------------------|
| File sumber tidak ditemukan / Source file not found | Warning W0000, simbol menjadi `undefined` saat runtime |
| Simbol tidak ditemukan di file sumber / Symbol not found in source | Warning W0000, impor dilewati |
| Siklus terdeteksi / Cycle detected | Warning W0000, impor dilewati |
| Kedalaman melebihi 10 / Depth exceeds 10 | Error E0000, kompilasi dihentikan |
| File sumber tanpa front-matter / Source file without front-matter | Warning W0000, tidak ada simbol untuk dibagikan |

---

## Batasan / Limitations

- Hanya berbagi simbol pada level front-matter. Tidak ada runtime module system.
- Hanya file `.pjs` yang dapat dirujuk. Tidak bisa mengimpor dari `.js` atau `.json` secara langsung.
- Tidak ada named export — seluruh simbol di file sumber tersedia untuk diimpor.
- Nilai yang dibagikan harus serialisasi sebagai JSON atau string sederhana.

Only shares symbols at the front-matter level. No runtime module system exists.

Only `.pjs` files can be referenced. Cannot import from `.js` or `.json` files directly.

No named exports — all symbols in the source file are available for import.

Shared values must be serializable as JSON or simple strings.

---

← [Auth](auth.md) · [Plugins](plugins.md) →