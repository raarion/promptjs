# D2 — Negative-test Matrix

> **Wave**: D2  
> **Tanggal**: 2026-06-20  
> **Statistik**: 20/42 lulus (47.6%) • 0 gagal • 22 skip  

---

Test suite untuk memverifikasi bahwa setiap kode error `E####` yang aktif di-throw muncul dengan input yang salah. Juga mencakup positive tests untuk statement type yang sebelumnya belum ada test khusus.

**Hasil**: 14 error codes berhasil dites, 1 warning berhasil dites, 5 positive tests untuk statement type. 12 error codes adalah feature gap (keyword belum diimplementasi), 10 error/warning di-defer ke D2.1 (setup kompleks).

---

## Daftar Isi

1. [Error codes yang berhasil dites](#error-codes-yang-berhasil-dites)
2. [Warning codes yang berhasil dites](#warning-codes-yang-berhasil-dites)
3. [Statement type positive tests](#statement-type-positive-tests)
4. [Feature gap — error codes yang TIDAK dapat dipicu](#feature-gap-error-codes-yang-tidak-dapat-dipicu)
5. [Deferred ke D2.1 — error/warning dengan setup kompleks](#deferred-ke-d21-errorwarning-dengan-setup-kompleks)

---

## 1. Error codes yang berhasil dites

14 error codes yang aktif di-throw dan berhasil dipicu dengan input negatif. Setiap test memverifikasi bahwa kode error yang spesifik muncul untuk input yang salah.

### Ringkasan

| # | Test ID | Nama | Status |
|---|---------|------|--------|
| 1 | `E1001` | E1001: Indentasi ganjil (bukan kelipatan 2) | ✅ |
| 2 | `E1002` | E1002: Indentasi tidak konsisten (dedent ke level tidak ada) | ✅ |
| 3 | `E1003` | E1003: String tidak ditutup | ✅ |
| 4 | `E1004` | E1004: Block opener tanpa colon (:) | ✅ |
| 5 | `E1005` | E1005: Karakter tidak dikenali | ✅ |
| 6 | `E2001` | E2001: Token tidak sesuai yang diharapkan | ✅ |
| 7 | `E2010` | E2010: Expected "untuk/for" setelah "ulangi/loop" | ✅ |
| 8 | `E3001` | E3001: Identifier tidak dideklarasikan | ✅ |
| 9 | `E3002` | E3002: Simbol duplikat dalam scope yang sama | ✅ |
| 10 | `E3004` | E3004: Menggunakan komponen sebelum deklarasi | ✅ |
| 11 | `E4005` | E4005: Parameter duplikat dalam komponen | ✅ |
| 12 | `E4012` | E4012: "lewati" di luar loop | ✅ |
| 13 | `E4013` | E4013: "kembalikan" di luar fungsi/komponen | ✅ |
| 14 | `E0000` | E0000: System error (file tidak dapat dibaca) | ✅ |


### Detail Test Case

### 1. `E3004` — E3004: Menggunakan komponen sebelum deklarasi ✅

**Kategori**: Resolver

**Input**:

```pjs
Buat TidakAdaKomponen(nama: "hai")
```

**Catatan**:

Komponen tidak terdaftar dipicu via Buat NamaKomponen(...) tanpa deklarasi Komponen sebelumnya.

---

### 2. `E4005` — E4005: Parameter duplikat dalam komponen ✅

**Kategori**: Analyzer

**Input**:

```pjs
Komponen Kartu(judul, judul):\n    Buat div:\n        "hai"
```

**Catatan**:

Parameter duplikat di komponen — satu-satunya analyzer error yang bisa dipicu tanpa keyword yang belum diimplementasi.

---

### 3. `E0000` — E0000: System error (file tidak dapat dibaca) ✅

**Kategori**: Engine

**Input**:

```pjs
compileFile("/path/tidak/ada.pjs")
```

**Catatan**:

System error dipicu via compileFile() dengan path yang tidak ada.

---

## 2. Warning codes yang berhasil dites

1 warning code berhasil dipicu. Sisanya di-defer ke D2.1.

### Ringkasan

| # | Test ID | Nama | Status |
|---|---------|------|--------|
| 1 | `W4101` | W4101: Simbol dideklarasikan tapi tidak digunakan | ✅ |


## 3. Statement type positive tests

5 positive tests untuk statement type yang sebelumnya belum ada test khusus. Semua berhasil compile berkat bug fix D1 (word operator collision, boolean/null literals, SaatStatement target, fragment compiledVarName).

### Ringkasan

| # | Test ID | Nama | Status |
|---|---------|------|--------|
| 1 | `pass-statement` | PassStatement ("pass") | ✅ |
| 2 | `lewati-statement` | PassStatement ("lewati") | ✅ |
| 3 | `fungsi-declaration` | FungsiDeclaration with parameters | ✅ |
| 4 | `saat-statement` | SaatStatement (reactive watcher) | ✅ |
| 5 | `kembalikan-statement` | KembalikanStatement (return) | ✅ |


### Detail Test Case

### 1. `fungsi-declaration` — FungsiDeclaration with parameters ✅

**Kategori**: Positive

**Input**:

```pjs
Fungsi tambah(a, b):\n    kembalikan a + b
```

**Catatan**:

Bug fix D1: `tambah` sebelumnya dianggap operator `+`, bukan nama fungsi.

---

### 2. `saat-statement` — SaatStatement (reactive watcher) ✅

**Kategori**: Positive

**Input**:

```pjs
data hitung = 0\nSaat hitung:\n    "berubah"
```

**Catatan**:

Bug fix D1: target SaatStatement sebelumnya di-stringify sebagai "[object Object]".

---

## 4. Feature gap — error codes yang TIDAK dapat dipicu

12 error codes yang terdefinisi di source code tapi TIDAK dapat dipicu karena keyword yang dibutuhkan belum diimplementasi di lexer. Ini bukan bug — ini feature gap yang akan diimplementasi di wave mendatang. Daftar ini akan dipakai sebagai blueprint untuk implementasi keyword baru.

### Ringkasan

| # | Test ID | Nama | Status |
|---|---------|------|--------|
| 1 | `E3003` | E3003: Menulis ke variabel tetap (const) | ⏭️ |
| 2 | `E3005` | E3005: "ketika" tanpa target di luar blok buat/komponen | ⏭️ |
| 3 | `E4001` | E4001: Lifecycle hook di luar komponen | ⏭️ |
| 4 | `E4002` | E4002: Side-effect di dalam ekspresi turunan | ⏭️ |
| 5 | `E4004` | E4004: Menulis ke data turunan (read-only) | ⏭️ |
| 6 | `E4006` | E4006: Parameter tanpa default setelah parameter dengan default | ⏭️ |
| 7 | `E4007` | E4007: Mode tampilkan tidak valid | ⏭️ |
| 8 | `E4008` | E4008: Properti perbarui tidak didukung | ⏭️ |
| 9 | `E4010` | E4010: Penggunaan "gunakan" untuk non-komponen | ⏭️ |
| 10 | `E4011` | E4011: "berhenti" di luar loop/handler | ⏭️ |
| 11 | `E4101` | E4101: Target tidak dapat ditulis | ⏭️ |
| 12 | `E4009` | E4009: Event name tidak dikenali (warning) | ⏭️ |


### Detail Test Case

### 1. `E3003` — E3003: Menulis ke variabel tetap (const) ⏭️

**Kategori**: Feature gap

**Catatan**:

Keyword `simpan` belum diimplementasi di lexer/parser

---

### 2. `E4001` — E4001: Lifecycle hook di luar komponen ⏭️

**Kategori**: Feature gap

**Catatan**:

Keyword `dipasang` belum diimplementasi di lexer

---

### 3. `E4011` — E4011: "berhenti" di luar loop/handler ⏭️

**Kategori**: Feature gap

**Catatan**:

Keyword `berhenti` belum diimplementasi di lexer

---

## 5. Deferred ke D2.1 — error/warning dengan setup kompleks

10 error/warning codes yang butuh setup kompleks atau synthetic AST untuk dipicu. Akan dikerjakan di sub-wave D2.1 terpisah.

### Ringkasan

| # | Test ID | Nama | Status |
|---|---------|------|--------|
| 1 | `E4201` | E4201: Dependency cycle pada data turunan | ⏭️ |
| 2 | `E5001` | E5001: Node AST tidak didukung compiler | ⏭️ |
| 3 | `W4003` | W4003: Deklarasi tetap tanpa nilai awal | ⏭️ |
| 4 | `W3002` | W3002: Variabel shadowing scope luar | ⏭️ |
| 5 | `W3003` | W3003: Watcher target bukan data reaktif | ⏭️ |
| 6 | `W4001` | W4001: Type hint tidak cocok dengan nilai | ⏭️ |
| 7 | `W4002` | W4002: Lifecycle hook di dalam loop/handler | ⏭️ |
| 8 | `W4102` | W4102: Simbol ditulis tapi tidak pernah dibaca | ⏭️ |
| 9 | `W4103` | W4103: Data reaktif dimutasi tapi tidak dibaca | ⏭️ |
| 10 | `W4104` | W4104: Watcher target bukan data reaktif (analyzer) | ⏭️ |

