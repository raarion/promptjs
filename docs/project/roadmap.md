# Roadmap

> docs/project/ > Roadmap

Timeline pengembangan PromptJS dari v0.5 hingga v1.0 dan seterusnya. Di-*ground* ke `doc-dev/v0.x/roadmap/ROADMAP-FULLSTACK-REALISTIS-FIXED.md`.

PromptJS development timeline from v0.5 to v1.0 and beyond. Grounded in `doc-dev/v0.x/roadmap/ROADMAP-FULLSTACK-REALISTIS-FIXED.md`.

---

## Versi yang Sudah Selesai / Completed Versions

| Versi | Fase | Fitur Utama / Key Features |
|---|---|---|
| **v0.5.0** | FASE 0 | Source Maps V3, Tree Shaking runtime, Error Boundaries |
| **v0.6.0** | FASE 1 | Lifecycle mount/unmount, SPA Router (opt-in) |
| **v0.7.0** | FASE 2 | `Ambil dari` diperkuat (auto async/await), Event modifier `.cegah` |
| **v0.8.0** | FASE 3 | Plugin system (4 hooks), Config loader, Adapter Static/Node/Vercel |
| **v0.9.0** | FASE 4 | `butuhAuth`, auth guard, login pattern, `hapus localStorage.x` |
| **v0.9.9** | Maturation | `peran` role check, `tokenKey`, 6 init templates, doc-dev restructure |
| **v1.0.0** | FASE 5 | Demo apps (todo, dashboard), `hapus...dari`, web storage lowering, npm publish, 880 tests |

---

## Timeline Visual

```
v0.5 ──────► v0.6 ──────► v0.7 ──────► v0.8 ──────► v0.9 ──► v0.9.9 ──► v1.0.0
Source maps  SPA router   Data fetch    Plugins      Auth      Role check   Stable
Tree shake   Lifecycle    .cegah        Adapters     guard     Templates    Release
Error bound  Mount/unmt   Auto-async    Config       Pattern   Docs restru  npm publish
```

---

## v1.0.0 — Yang Tercakup / What's Included

- ✅ **Demo Apps:** `examples/todo-app/` (CRUD + localStorage), `examples/dashboard-app/` (SPA + auth + peran + 5 halaman)
- ✅ **`hapus <item> dari <array>`** — statement & expression lowering
- ✅ **`simpan`/`hapus` localStorage/sessionStorage** — expression path lowering
- ✅ **`arahkan`** — expression path fix
- ✅ **Package name** `@raarion/prompt-js`, npm publish, release workflow
- ✅ **CI/CD** — Node 22.x + 24.x, format + typecheck + lint + test + demo compile
- ✅ **880 tests**, 84.8% coverage, 63.91% mutation score
- ✅ **30+ docs files** di `docs/`

---

## Post-v1.0.0 (Planned)

| Versi | Fokus | Detail |
|---|---|---|
| **v1.1** | Hydration | SSR + client-side rehydration, marker-based |
| **v1.2** | LSP | Language Server Protocol — autocomplete, go-to-def, hover docs |
| **v1.3** | Multi-peran | `peran: admin,editor` — comma-separated roles |
| **v1.5** | Component Library | Komponen bawaan ditulis di `.pjs` (Dialog, Toast, Form, Table) |
| **v2.0** | Compiler Port | Rust/Go compiler — binary tunggal, 10x faster compile |

---

## 5 Keputusan Arsitektural Kunci / 5 Key Architectural Decisions

### ❶ Tidak ada keyword `async`/`await`

Compiler menyembunyikan async di balik `Ambil dari`. Developer menulis deklaratif; compiler menulis async/await. Ini bukan limitasi — ini desain sadar: membuang kompleksitas yang tidak perlu diketahui pengguna.

The compiler hides async behind `Ambil dari`. Developer writes declarative; compiler writes async/await. This is not a limitation — it's intentional design: removing complexity the user doesn't need.

### ❷ PromptJS konsumsi API, tidak menulis API

PromptJS adalah konsumen API. Backend bisa ditulis dalam bahasa/framework apapun (Express, Hono, Django, Go, Rust). PromptJS hanya perlu URL-nya. Ini menjaga scope DSL tetap fokus.

PromptJS consumes APIs, it doesn't write them. Backend can be any language/framework. PromptJS only needs the URL. This keeps the DSL scope focused.

### ❸ Router = plugin opt-in

`router: benar` di front-matter → embed router. Tanpa itu → output tetap kecil, zero overhead. Prinsip ① (zero dep output) terjaga.

`router: benar` in front-matter → embed router. Without it → output stays small, zero overhead. Principle ① (zero dep output) is preserved.

### ❹ Auth = deklaratif di front-matter

`butuhAuth: benar` → compiler emit guard code. Session management, CSRF = tugas backend. PromptJS hanya mendeklarasikan "halaman ini butuh auth."

`butuhAuth: benar` → compiler emits guard code. Session management, CSRF = backend's job. PromptJS only declares "this page needs auth."

### ❺ Core tumbuh 5.5%, bukan 18%

Semua fitur "berat" hidup di plugin yang di-embed saat compile. Core compiler tetap fokus: mengubah `.pjs` menjadi vanilla JS.

All "heavy" features live in plugins embedded at compile time. Core compiler stays focused: turning `.pjs` into vanilla JS.

---

## Neraca Pertumbuhan Core / Core Growth Budget

```
v0.4 (baseline):     ~10,984 baris
v0.5 (Fase 0):       +300 baris  (source maps, tree shake, error boundaries)
v0.6 (Fase 1):       +100 baris  (lifecycle mount/unmount)
v0.7 (Fase 2):       +150 baris  (Ambil dari diperkuat, .cegah)
v0.8 (Fase 3):       +0 baris    (plugin system di engine, bukan core)
v0.9 (Fase 4):       +50 baris   (auth guard codegen)
v1.0 (Fase 5):       +0 baris    (docs & ecosystem)
                     ─────────
v1.0 total:          +600 baris  (5.5% growth)
```

Seluruh fitur "full-stack" tetap tersedia, tapi hidup di plugin (~700 baris) yang hanya di-embed jika diaktifkan.

---

← [Runtime](runtime.md) · [Testing →](testing.md)
