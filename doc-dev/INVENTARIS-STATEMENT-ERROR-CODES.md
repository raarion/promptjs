# Inventaris Statement Type & Error Code — PromptJS v0.2

> **Dibuat untuk:** Konvensi snapshot testing & Coverage gate strategy  
> **Tanggal:** 2025  
> **Sumber:** Analisis kode sumber (`src/parser/`, `src/lexer/`, `src/resolver/`, `src/analyzer/`)  
> **Coverage saat ini:** 49.9% statements | 37.34% branches | 42.71% functions | 50.94% lines  
> **File test:** 4 file (`tests/c4-expressions.test.js`, `tests/components.test.js`, `tests/extended.test.js`, `tests/pipeline.test.js`)

---

## DAFTAR A: Statement Type yang Dapat Diparse

Setiap jenis statement yang dikenali parser berdasarkan `_parseStatement()` dispatch di `src/parser/promptjs-parser.js`.

| Nama Statement | Keyword Trigger | Contoh Sintaks | Sudah ada test? |
|----------------|-----------------|----------------|-----------------|
| **BuatStatement** | `TK_BUAT` | `Buat h1.kelas#id:` atau `Buat Kartu(judul: "Hai")` | ✅ (components.test.js) |
| **JikaStatement** | `TK_JIKA` | `Jika kondisi:` (opsional `Lainnya:`) | ✅ (extended.test.js) |
| **UlangiStatement** | `TK_ULANGI` | `Ulangi 5 kali:`, `Ulangi untuk x dari array:`, `Ulangi i dari 1 sampai 10:` | ✅ (extended.test.js) |
| **PassStatement** | `TK_PASS` | `pass` atau `lewati` | ❌ |
| **DataDeclaration** | `TK_DATA`, `TK_TETAP`, `TK_UBAH`, `TK_TURUNAN` | `Data x: angka = 5`, `Tetap PI = 3.14`, `Turunan total = x + y` | ✅ (pipeline.test.js - sebagian) |
| **FungsiDeclaration** | `TK_FUNGSI` | `Fungsi nama(param):` | ❌ |
| **DefinisikanKomponen** | `TK_DEFINSIKAN` | `Definisikan Kartu(judul, isi):` | ✅ (components.test.js) |
| **SaatStatement** | `TK_SAAT` | `Saat data.berubah:` | ❌ |
| **KembalikanStatement** | `TK_KEMBALIKAN` | `kembalikan nilai` | ❌ |
| **TextNode** | `TK_STRING` | `"teks literal"` (inline dalam Buat) | ✅ (implicit) |
| **OnEventStatement** | `TK_ON_EVENT` | `on_klik -> aksi` | ✅ (c4-expressions.test.js - sebagian) |
| **PropertyOrExpression** | `TK_IDENT` | `properti = nilai` (assignment) | ✅ (pipeline.test.js) |

### Catatan Daftar A:

1. **Statement yang BELUM ADA TEST khusus:**
   - `PassStatement` (`pass` / `lewati`)
   - `FungsiDeclaration` (fungsi kustom)
   - `SaatStatement` (watcher reaktif)
   - `KembalikanStatement` (return dari fungsi)

2. **Statement yang TIDAK muncul di parser switch-case** (hanya didefinisikan di token-types.js tapi tidak diparse):
   - `TK_TAMPILKAN`, `TK_SEMBUNYIKAN`, `TK_HAPUS`, `TK_KOSONGKAN`, `TK_PERBARUI` — keyword DOM manipulation
   - `TK_AMBIL`, `TK_ARAHKAN`, `TK_MUAT_ULANG`, `TK_KEMBALI` — networking/navigasi
   - `TK_JALANKAN` — execute action
   - `TK_GUNAKAN` — component instantiation (handled via `Buat Name(...)`)
   - `TK_DATA` variants (`TK_SIMPAN`, `TK_TAMBAHKAN`, `TK_KURANGI`, `TK_SISIPKAN`) — handled sebagai expression/statements terpisah

3. **Status ROADMAP-Level-1.md:**
   - ✅ Wave C1-C3 selesai (loop syntax, named pages, components)
   - ⏳ Wave C4 (expressions: else-if, ternary, list/object literals) — NEXT
   - ✅ Komponen system implemented
   - ✅ Loop syntax reconciled

---

## DAFTAR B: Error Code yang BENAR-BENAR di-throw

Error code yang aktif di-throw melalui `Err.createError()`, `addError()`, `errors.push({code: 'E####'})`, atau object literal `{code: 'E####'}`.

### B.1 — Lexer Errors (`src/lexer/promptjs-lexer.js`)

| Error Code | File sumber | Deskripsi singkat | Sudah ada test negatif? |
|------------|-------------|-------------------|------------------------|
| **E1001** | lexer:464 | Indentasi ganjil (bukan kelipatan 2) | ❌ |
| **E1002** | lexer:547 | Indentasi tidak konsisten | ❌ |
| **E1003** | lexer:670 | String tidak ditutup | ❌ |
| **E1004** | lexer:807,843,920 | Block opener tanpa colon (`:`) | ❌ |
| **E1005** | lexer:1394 | Karakter tidak dikenali | ❌ |

### B.2 — Parser Errors (`src/parser/promptjs-parser.js`)

| Error Code | File sumber | Deskripsi singkat | Sudah ada test negatif? |
|------------|-------------|-------------------|------------------------|
| **E2001** | parser:177,987 | Token tidak sesuai yang diharapkan | ❌ |
| **E2010** | parser:485 | Expected "untuk/for" setelah "ulangi/loop" | ❌ |
| **E2011** | parser:503 | Operator tidak didukung | ❌ |
| **E2020** | parser:1008 | Indentasi tidak konsisten | ❌ |

### B.3 — Resolver Errors (`src/resolver/promptjs-resolver.js`)

| Error Code | File sumber | Deskripsi singkat | Sudah ada test negatif? |
|------------|-------------|-------------------|------------------------|
| **E3001** | resolver:552,1215,939 | Identifier tidak dideklarasikan | ❌ |
| **E3002** | resolver:421 | Simbol duplikat dalam scope yang sama | ❌ |
| **E3003** | resolver:723 | Menulis ke variabel tetap (const) | ❌ |
| **E3004** | resolver:858 | Menggunakan komponen sebelum deklarasi | ❌ |
| **E3005** | resolver:1168 | "ketika" tanpa target di luar blok buat/komponen | ❌ |
| **E4008** | resolver:831 | Properti perbarui tidak didukung | ❌ |
| **E4009** | resolver:1183 | Event name tidak dikenali | ❌ |
| **E4010** | resolver:866 | Penggunaan "gunakan" untuk non-komponen | ❌ |

### B.4 — Analyzer Errors (`src/analyzer/promptjs-analyzer.js`)

| Error Code | File sumber | Deskripsi singkat | Sudah ada test negatif? |
|------------|-------------|-------------------|------------------------|
| **E4001** | analyzer:473 | Lifecycle hook di luar komponen | ❌ |
| **E4002** | analyzer:281 | Side-effect di dalam ekspresi turunan | ❌ |
| **E4004** | analyzer:251 | Menulis ke data turunan (read-only) | ❌ |
| **E4005** | analyzer:432 | Parameter duplikat dalam komponen | ❌ |
| **E4006** | analyzer:445 | Parameter tanpa default setelah parameter dengan default | ❌ |
| **E4007** | analyzer:674 | Mode tampilkan tidak valid | ❌ |
| **E4010** | analyzer:652 | "gunakan" untuk non-komponen | ❌ |
| **E4011** | analyzer:782,790 | "berhenti" di luar loop/handler | ❌ |
| **E4012** | analyzer:810 | "lewati" di luar loop | ❌ |
| **E4013** | analyzer:828 | "kembalikan" di luar fungsi/komponen | ❌ |
| **E4101** | analyzer:260 | Target tidak dapat ditulis | ❌ |
| **E4201** | analyzer:310 | Dependency cycle pada data turunan | ❌ |

### B.5 — Engine/Runtime Errors (`src/engine/promptjs.js`)

| Error Code | File sumber | Deskripsi singkat | Sudah ada test negatif? |
|------------|-------------|-------------------|------------------------|
| **E0000** | engine:115,136,199 | System error (unhandled exception) | ❌ |
| **E5001** | engine:164 | Node AST tidak didukung compiler | ❌ |

### B.6 — Warning Codes (aktif di-throw)

| Warning Code | File sumber | Deskripsi singkat | Sudah ada test? |
|--------------|-------------|-------------------|-----------------|
| **W3002** | resolver:434 | Variabel shadowing scope luar | ❌ |
| **W3003** | resolver:1223 | Watcher target bukan data reaktif | ❌ |
| **W4003** | resolver:1268, analyzer:540 | Deklarasi tetap tanpa nilai awal | ❌ |
| **W4001** | analyzer:199 | Type hint tidak cocok dengan nilai | ❌ |
| **W4002** | analyzer:482 | Lifecycle hook di dalam loop/handler | ❌ |
| **W4101** | analyzer:376 | Simbol dideklarasikan tapi tidak digunakan | ❌ |
| **W4102** | analyzer:398 | Simbol ditulis tapi tidak pernah dibaca | ❌ |
| **W4103** | analyzer:387 | Data reaktif dimutasi tapi tidak dibaca | ❌ |
| **W4104** | analyzer:923 | Watcher target bukan data reaktif (analyzer) | ❌ |

---

## NOT THROWN — Error Code yang HANYA Didefinisikan

Error code berikut **didefinisikan di `error-codes.js`** tapi **TIDAK PERNAH di-throw** di manapun dalam kode sumber (hingga commit ini). Ini adalah prioritas utama untuk implementasi test negatif.

### Lexer (E1xxx)
| Code | Deskripsi | Status |
|------|-----------|--------|
| E1006 | Komentar blok `[[` tidak ditutup `]]` | 🔴 NOT IMPLEMENTED |
| E1007 | Blok DocString `[[` tidak ditutup `]]` | 🔴 NOT IMPLEMENTED |
| E1008 | Angka literal tidak valid | 🔴 NOT IMPLEMENTED |
| E1009 | Selector CSS tidak valid | 🔴 NOT IMPLEMENTED (hanya komentar di lexer:940) |
| W1001 | DocString tidak menempel ke node manapun | 🔴 NOT IMPLEMENTED |

### Parser (E2xxx)
| Code | Deskripsi | Status |
|------|-----------|--------|
| E2002 | Selector tidak valid | 🔴 NOT THROWN |
| E2003 | Nama komponen harus diawali huruf kapital | 🔴 NOT THROWN |
| E2004 | Blok aksi diharapkan setelah ':' | 🔴 NOT THROWN |
| E2005 | Kurung tutup ')' tidak ditemukan | 🔴 NOT THROWN |
| E2006 | Kurung kurawal tutup '}' tidak ditemukan | 🔴 NOT THROWN |
| E2007 | Kurung siku tutup ']' tidak ditemukan | 🔴 NOT THROWN |
| E2008 | Nilai awal diharapkan setelah '=' | 🔴 NOT THROWN |
| E2009 | Kondisi tidak valid | 🔴 NOT THROWN |
| E2012 | Argumen fungsi tidak valid | 🔴 NOT THROWN |
| E2013 | Parameter komponen/fungsi tidak valid | 🔴 NOT THROWN |
| E2014 | Properti objek literal tidak valid | 🔴 NOT THROWN |
| E2015 | Selector CSS tidak valid | 🔴 NOT THROWN |
| E2016 | Token '->' diharapkan | 🔴 NOT THROWN |
| E2017 | Target event tidak valid | 🔴 NOT THROWN |
| E2018 | Nama event tidak valid | 🔴 NOT THROWN |
| E2019 | 'jika tidak' hanya valid di akhir rantai jika/kalau | 🔴 NOT THROWN |
| E2021 | Sumber data ulangi tidak valid | 🔴 NOT THROWN |
| E2022 | Target tampilkan tidak valid | 🔴 NOT THROWN |
| E2023 | Token tidak terduga di akhir file | 🔴 NOT THROWN |
| E2024 | ambil tanpa konteks yang jelas | 🔴 NOT THROWN |
| E2025 | Daftar props gunakan tidak valid | 🔴 NOT THROWN |
| E2026 | Ekspresi kosong tidak valid | 🔴 NOT THROWN |
| E2027 | Properti perbarui tidak dikenali | 🔴 NOT THROWN |
| E2028 | Body komponen/fungsi kosong | 🔴 NOT THROWN |
| W2001 | DocString tidak menempel ke node manapun | 🔴 NOT THROWN |
| W2002 | Blok kosong terdeteksi | 🔴 NOT THROWN |
| W2003 | Rantai jika tanpa cabang jika tidak | 🔴 NOT THROWN |
| W2004 | Jumlah argumen mungkin tidak sesuai | 🔴 NOT THROWN |

### Resolver (E3xxx / W3xxx)
| Code | Deskripsi | Status |
|------|-----------|--------|
| W3001 | Variabel dideklarasikan tapi tidak pernah digunakan | 🔴 NOT THROWN (diganti W3003 di resolver) |

### Analyzer (E4xxx / W4xxx)
| Code | Deskripsi | Status |
|------|-----------|--------|
| W4101-W4104 | Unused symbols tracking | ⚠️ Implemented tapi belum ada test |

### Compiler (E5xxx)
| Code | Deskripsi | Status |
|------|-----------|--------|
| E5002 | Gagal menurunkan ekspresi ke JavaScript | 🔴 NOT THROWN |
| E5003 | Selector tidak dapat dikompilasi | 🔴 NOT THROWN |
| W5001 | Kode yang dihasilkan mungkin tidak berjalan | 🔴 NOT THROWN |
| W5002 | Fitur eksperimental digunakan | 🔴 NOT THROWN |

### Runtime (E6xxx)
| Code | Deskripsi | Status |
|------|-----------|--------|
| E6001 | berhenti di luar konteks loop/handler | 🔴 NOT THROWN (diganti E4011 di analyzer) |
| E6002 | lewati di luar konteks loop | 🔴 NOT THROWN (diganti E4012 di analyzer) |
| E6003 | kembalikan di luar fungsi/komponen | 🔴 NOT THROWN (diganti E4013 di analyzer) |
| E6004 | Pipeline gagal | 🔴 NOT THROWN |

---

## CEK ULANG

### ✅ Daftar A cocok dengan fitur di ROADMAP yang sudah ✅?

| Fitur ROADMAP | Statement Type | Status |
|---------------|----------------|--------|
| Wave C1: Loop syntax | `UlangiStatement` (kali, dari, rentang) | ✅ Cocok |
| Wave C2: Named pages | `BuatStatement` (dengan selector #id) | ✅ Cocok |
| Wave C3: Component system | `DefinisikanKomponen`, `BuatStatement` (invocation) | ✅ Cocok |
| Wave C4: Expressions | `JikaStatement` (else-if), `Literal` (list/object) | ⏳ NEXT |

**Kesimpulan:** Daftar A **cocok** dengan roadmap. Statement type yang sudah diimplementasikan sesuai dengan Wave C1-C3 yang ditandai ✅.

### ✅ Daftar B hanya berisi error yang benar-benar ada di kode?

**Verifikasi:**
- Semua error di Daftar B diverifikasi dengan `grep -rn "code: 'E####'" src/` dan `grep -rn "Err.createError('E####'" src/`
- Hanya error yang **benar-benar di-throw** yang masuk Daftar B
- Error yang hanya didefinisikan di `error-codes.js` tanpa implementasi → masuk bagian "NOT THROWN"

**Kesimpulan:** Daftar B **akurat** — hanya error yang aktif di kode sumber.

### ✅ Bagian "NOT THROWN" masuk akal?

**Analisis:**
- **Lexer E1006-E1009**: Fitur komentar blok `[[ ]]`, docstring, number validation, selector validation — **belum diimplementasikan** di lexer
- **Parser E2002-E2028**: Kebanyakan error untuk validasi sintaksis detail yang **belum ada handler error-nya**
- **Runtime E6001-E6004**: Diganti dengan kode analyzer (E4011-E4013) — **sengaja dideprecate**
- **Compiler E5002-E5003, W5xxx**: Compiler fallback ke E5001 generic — **belum granular**

**Kesimpulan:** Bagian "NOT THROWN" **masuk akal** — merepresentasikan:
1. Fitur yang belum diimplementasikan (lexer comments, selectors)
2. Validasi yang belum ada error handler-nya (parser detail checks)
3. Error codes yang dideprecate (runtime → analyzer migration)

---

## REKOMENDASI PRIORITAS TESTING

Berdasarkan inventaris ini, berikut prioritas test negatif untuk mencapai coverage ≥80%:

### Priority 1 — Error codes yang SUDAH di-throw tapi belum ada test:
```
E1001, E1002, E1003, E1004, E1005 (lexer)
E2001, E2010, E2011, E2020 (parser)
E3001, E3002, E3003, E3004, E3005 (resolver)
E4001-E4013, E4101, E4201 (analyzer)
E0000, E5001 (engine)
```

### Priority 2 — Statement types tanpa test:
```
PassStatement (pass/lewati)
FungsiDeclaration (fungsi kustom)
SaatStatement (watcher)
KembalikanStatement (return)
```

### Priority 3 — Implementasi error codes "NOT THROWN":
```
E1006-E1009 (lexer features missing)
E2002-E2028 (parser validation missing)
E5002-E5003 (compiler granularity)
```

---

**Catatan:** Dokumen ini akan diperbarui setiap wave ROADMAP-Level-1 selesai untuk menjaga akurasi dengan kode sumber.
