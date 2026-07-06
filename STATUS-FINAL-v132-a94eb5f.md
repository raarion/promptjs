# Status Final — v132 Commit a94eb5f

**Tanggal:** 2026-07-06  
**Commit terbaru v132:** `a94eb5f` — fix(v132): LIM-1,2,3,4 + MIS-1  
**Official suite:** 63 file / **1154 test PASS** ✅

---

## Ringkasan

**Semua BUG, LIM, dan MIS sudah diperbaiki.** Tidak ada issue aktif tersisa.

---

## ✅ BUG — Semua FIXED (34 item, commit sebelumnya)

Semua 34 bug sudah diperbaiki dan terverifikasi di commit-commit sebelumnya.

---

## ✅ LIM — Semua FIXED (4 item, commit a94eb5f)

| ID | Limitasi | Fix | Commit |
|----|----------|-----|--------|
| LIM-1 | `Gunakan Nama(prop: val)` → E3001 | Parser sekarang support parenthesized props di `GunakanStatement` | `a94eb5f` |
| LIM-2 | `arahkan ke "/path"` → E2020 | Keyword `ke` opsional setelah `arahkan` diterima | `a94eb5f` |
| LIM-3 | E4201 suggestion generik | Error sekarang menyebut simbol spesifik yang harus diubah | `a94eb5f` |
| LIM-4 | `kurangi <value> ke <target>` silently wrong | Parser reject dengan E2020 + suggestion gunakan `dari` | `a94eb5f` |

### Detail Fix

#### LIM-1: `Gunakan Nama(prop: val)`
```pjs
// SEBELUM (error E3001):
Gunakan Salam(nama: "Dunia")    // ❌ E3001

// SEKARANG (works):
Gunakan Salam(nama: "Dunia")    // ✅ → __komp_Salam({ "nama": "Dunia" })
Gunakan Kartu(judul: "Halo", isi: "Dunia")  // ✅ multi-props
```

#### LIM-2: `arahkan ke "/path"`
```pjs
// SEBELUM (error E2020):
arahkan ke "/halaman"            // ❌ E2020

// SEKARANG (both work):
arahkan ke "/halaman"            // ✅ → window.location.href = "/halaman"
arahkan "/halaman"               // ✅ → window.location.href = "/halaman"
```

#### LIM-3: E4201 per-symbol suggestion
```pjs
// SEBELUM:
// E4201: Dependency cycle pada data turunan: a -> b -> a
// Saran: Ubah salah satu ekspresi turunan agar tidak saling bergantung secara melingkar.

// SEKARANG:
// E4201: Dependency cycle pada data turunan: a -> b -> a
// Saran: Ubah ekspresi turunan "b" agar tidak bergantung pada "a",
//        atau pecah cycle dengan menjadikan salah satu sebagai "Data" biasa.
```

#### LIM-4: `kurangi <value> ke <target>` rejected
```pjs
// SEBELUM (silently wrong output):
kurangi 5 ke hitung              // ❌ __setState(document, 5 - hitung.value)

// SEKARANG (rejected with clear error):
kurangi 5 ke hitung              // ❌ E2020: "kurangi <nilai> ke <target>" tidak valid.
                                  //    Saran: Gunakan "kurangi <nilai> dari <target>"

// Tiga forma valid tetap berfungsi:
kurangi hitung                   // ✅ hitung.value - 1
kurangi hitung ke 5              // ✅ hitung.value - 5
kurangi 5 dari hitung            // ✅ hitung.value - 5
```

---

## ✅ MIS — FIXED (1 item, commit a94eb5f)

| ID | Deskripsi | Fix | Commit |
|----|-----------|-----|--------|
| MIS-1 | E5001 generic error tanpa saran | Error sekarang menyertakan saran per-node type | `a94eb5f` |

#### MIS-1: E5001 per-node suggestion
```
// SEBELUM:
[E5001] Node AST bertipe "ForStatement" tidak didukung oleh compiler

// SEKARANG:
[E5001] Node AST bertipe "ForStatement" tidak didukung oleh compiler.
Gunakan "UlangiStatement" (keyword "ulangi") untuk loop.
```

---

## File yang Diubah

| File | Perubahan |
|------|-----------|
| `src/parser/promptjs-parser.js` | +64: LIM-1 (Gunakan props), LIM-2 (arahkan ke), LIM-4 (kurangi rejection) |
| `src/analyzer/promptjs-analyzer.js` | +9: LIM-3 (E4201 per-symbol suggestion) |
| `src/compiler/promptjs-compiler.js` | +20: MIS-1 (E5001 per-node suggestion) |
| `tests/v5-diagnostic-text.test.js` | +1/-1: Update E4201 suggestion assertion |
| `tests/lim-mis-fixes-v132.test.js` | +197: 19 new tests for all LIM + MIS fixes |
| `STATUS-FINAL-v132-10fac7b.md` | New: Final status report |

---

## Tabel Status Akhir

| Kategori | Sebelum | Sesudah |
|----------|---------|---------|
| 🔴 BUG aktif | 0 | **0** |
| 🟡 LIM | 4 | **0** ✅ |
| 🟢 MIS | 1 | **0** ✅ |
| 📁 Test files | 62 | **63** |
| 🧪 Tests | 1135 | **1154** |

> **v132 commit `a94eb5f`: Zero active issues. All BUG, LIM, and MIS resolved.**
