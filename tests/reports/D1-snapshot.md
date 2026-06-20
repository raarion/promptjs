# D1 — Snapshot Codegen Tests

> **Wave**: D1  
> **Tanggal**: 2026-06-20  
> **Statistik**: 44/44 lulus (100.0%) • 0 gagal • 0 skip  

---

Snapshot test suite untuk mengunci output codegen per statement type dan expression type. Setiap perubahan codegen yang mengubah output akan terdeteksi otomatis saat `npm test` dijalankan.

**Bug fix yang terkait dengan D1:**
1. **Lexer** — `_tokenizeDeclaration` sekarang parse nama identifier secara eksplisit untuk Fungsi/Komponen/Data/Tetap/Ubah/Turunan/Saat, menghindari collision dengan word operators (`tambah`/`kali`/`dan`/`atau`/`tidak`). Sebelum fix: `Fungsi tambah(a, b):` gagal karena `tambah` dianggap operator `+`.
2. **Lexer** — Tambah `TK_BENAR`/`TK_SALAH`/`TK_KOSONG` ke `TT` dan `benar`/`salah`/`kosong` (serta `true`/`false`/`null`) ke `KEYWORDS`. Sebelum fix: `tetap x = benar` gagal karena `benar` dianggap identifier.
3. **Parser** — `_parsePrimaryExpression` sekarang handle `TK_BENAR`/`TK_SALAH`/`TK_KOSONG` menjadi Literal node dengan value `true`/`false`/`null`.
4. **Resolver** — `visitSaatStatement` sekarang handle target berupa AST node (Identifier/MemberExpression), bukan hanya string. Sebelum fix: `Saat hitung:` gagal dengan E3001 "Identifier [object Object] tidak dideklarasikan".
5. **Compiler** — `visitBuatStatement` untuk fragment sekarang mewariskan `compiledVarName` dari parent, sehingga event handler tanpa target eksplisit (mis. `on_klik = ...` di dalam multi-child Buat body) resolve ke parent element yang benar. Sebelum fix: emit `__el_2.addEventListener(...)` padahal `__el_2` belum dideklarasikan.

**Catatan**: snapshot berisi user code saja (bagian setelah `// === User Code ===` dan sebelum IIFE closer `})();`), bukan full output compiler. Runtime helpers (~80 baris boilerplate) di-skip supaya perubahan runtime helpers tidak membuat semua snapshot fail.

---

## Daftar Isi

1. [Composite: end-to-end](#composite-end-to-end)
2. [Expression: ArrayLiteral](#expression-arrayliteral)
3. [Expression: BinaryExpression](#expression-binaryexpression)
4. [Expression: CallExpression](#expression-callexpression)
5. [Expression: ConditionalExpression (ternary)](#expression-conditionalexpression-ternary)
6. [Expression: Literal](#expression-literal)
7. [Expression: MemberExpression](#expression-memberexpression)
8. [Expression: ObjectLiteral](#expression-objectliteral)
9. [Expression: UnaryExpression](#expression-unaryexpression)
10. [Statement: BuatStatement](#statement-buatstatement)
11. [Statement: Declarations](#statement-declarations)
12. [Statement: FungsiDeclaration](#statement-fungsideclaration)
13. [Statement: JikaStatement](#statement-jikastatement)
14. [Statement: KembalikanStatement](#statement-kembalikanstatement)
15. [Statement: KomponenDeclaration](#statement-komponendeclaration)
16. [Statement: OnEventStatement](#statement-oneventstatement)
17. [Statement: PassStatement](#statement-passstatement)
18. [Statement: PropertyLine](#statement-propertyline)
19. [Statement: SaatStatement](#statement-saatstatement)
20. [Statement: TextNode](#statement-textnode)
21. [Statement: UlangiStatement](#statement-ulangistatement)

---

## 1. Composite: end-to-end

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `composite-counter` | composite-counter: data + tombol + on_klik + alert 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `composite-list` | composite-list: Ulangi dengan Data array 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


### Detail Test Case

### 1. `composite-counter` — composite-counter: data + tombol + on_klik + alert 1 ✅

**Kategori**: Composite: end-to-end

**Input**:

```pjs
data + tombol + on_klik + alert 1
```

**Actual**:

```

"(function() {
  // @source 1:1 DataDeclaration
  const hitung = __createReactive(0);
  // @source 2:1 BuatStatement
  const __el_1 = document.createElement("button");
  const __txt_3 = document.createTextNode("Klik aku");
  __el_1.appendChild(__txt_3);
  __el_1.addEventListener("click", (event) => {
    alert(hitung.value);
  });
  document.body.appendChild(__el_1);"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

### 2. `composite-list` — composite-list: Ulangi dengan Data array 1 ✅

**Kategori**: Composite: end-to-end

**Input**:

```pjs
Ulangi dengan Data array 1
```

**Actual**:

```

"(function() {
  // @source 1:1 TetapDeclaration
  const items = ["Apel", "Jeruk", "Mangga"];
  // @source 2:1 BuatStatement
  const __el_1 = document.createElement("ul");
  items.forEach((item, indeks) => {
    const __el_2 = document.createElement("li");
    __el_1.appendChild(__el_2);
  });
  document.body.appendChild(__el_1);"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

## 2. Expression: ArrayLiteral

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `array-basic` | array-basic: [1, 2, 3] 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `array-mixed` | array-mixed: [1, "dua", benar] 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 3. Expression: BinaryExpression

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `binary-compare` | binary-compare: x | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `binary-logic` | binary-logic: benar dan salah 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 3 | `binary-symbol` | binary-symbol: 3 + 4 * 2 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 4 | `binary-word` | binary-word: 3 tambah 4 kali 2 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


### Detail Test Case

### 1. `binary-logic` — binary-logic: benar dan salah 1 ✅

**Kategori**: Expression: BinaryExpression

**Input**:

```pjs
benar dan salah 1
```

**Actual**:

```

"(function() {
  // @source 1:1 TetapDeclaration
  const x = (true && false);"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

### 2. `binary-word` — binary-word: 3 tambah 4 kali 2 1 ✅

**Kategori**: Expression: BinaryExpression

**Input**:

```pjs
3 tambah 4 kali 2 1
```

**Actual**:

```

"(function() {
  // @source 1:1 TetapDeclaration
  const x = (3 + (4 * 2));"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

## 4. Expression: CallExpression

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `call-builtin` | call-builtin: panjang(arr) 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `call-js-global` | call-js-global: alert("hi") 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 5. Expression: ConditionalExpression (ternary)

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `ternary-basic` | ternary-basic: x | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 6. Expression: Literal

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `literal-boolean` | literal-boolean: tetap aktif = benar 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `literal-null` | literal-null: tetap kosong = kosong 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 3 | `literal-number` | literal-number: tetap x = 42 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 4 | `literal-string` | literal-string: tetap nama = "Budi" 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


### Detail Test Case

### 1. `literal-boolean` — literal-boolean: tetap aktif = benar 1 ✅

**Kategori**: Expression: Literal

**Input**:

```pjs
tetap aktif = benar 1
```

**Actual**:

```

"(function() {
  // @source 1:1 TetapDeclaration
  const aktif = true;"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

### 2. `literal-null` — literal-null: tetap kosong = kosong 1 ✅

**Kategori**: Expression: Literal

**Input**:

```pjs
tetap kosong = kosong 1
```

**Actual**:

```

"(function() {
  // @source 1:1 TetapDeclaration
  const kosong = null;"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

## 7. Expression: MemberExpression

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `member-access` | member-access: orang.nama 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 8. Expression: ObjectLiteral

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `object-basic` | object-basic: { nama: "Budi", umur: 30 } 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `object-string-key` | object-string-key: { "nama-lengkap": "Budi" } 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 9. Expression: UnaryExpression

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `unary-negate` | unary-negate: -5 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `unary-not` | unary-not: tidak benar 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 10. Statement: BuatStatement

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `buat-bilingual` | buat-bilingual: Create div.box: 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `buat-fragment` | buat-fragment: auto-fragment multi-child 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 3 | `buat-pass` | buat-pass: empty body marker 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 4 | `buat-selector` | buat-selector: Buat tombol.cta#daftar: 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 5 | `buat-simple` | buat-simple: Buat h1: "Hello" 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 11. Statement: Declarations

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `data-declaration` | data-declaration: Data hitung = 0 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `tetap-declaration` | tetap-declaration: Tetap PI = 3.14 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 3 | `turunan-declaration` | turunan-declaration: Turunan total = a + b 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 4 | `ubah-declaration` | ubah-declaration: Ubah nama = "Budi" 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 12. Statement: FungsiDeclaration

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `fungsi-no-params` | fungsi-no-params: Fungsi halo(): 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `fungsi-with-params` | fungsi-with-params: Fungsi tambah(a, b): 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


### Detail Test Case

### 1. `fungsi-with-params` — fungsi-with-params: Fungsi tambah(a, b): 1 ✅

**Kategori**: Statement: FungsiDeclaration

**Input**:

```pjs
Fungsi tambah(a, b): 1
```

**Actual**:

```

"(function() {
  // @source 1:1 FungsiDeclaration
  function tambah(a, b) {
    return (a + b);
  }"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

## 13. Statement: JikaStatement

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `jika-basic` | jika-basic: Jika stok | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `jika-lainnya` | jika-lainnya: with else branch 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 3 | `jika-word-operator` | jika-word-operator: Jika stok lebih dari 0 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 14. Statement: KembalikanStatement

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `kembalikan-value` | kembalikan-value: kembalikan "hai" 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 15. Statement: KomponenDeclaration

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `komponen-basic` | komponen-basic: Komponen Kartu(judul): 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 16. Statement: OnEventStatement

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `on-event-klik` | on-event-klik: on_klik = alert("hi") 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


### Detail Test Case

### 1. `on-event-klik` — on-event-klik: on_klik = alert("hi") 1 ✅

**Kategori**: Statement: OnEventStatement

**Input**:

```pjs
on_klik = alert("hi") 1
```

**Actual**:

```

"(function() {
  // @source 1:1 BuatStatement
  const __el_1 = document.createElement("button");
  const __txt_3 = document.createTextNode("Klik");
  __el_1.appendChild(__txt_3);
  __el_1.addEventListener("click", (event) => {
    alert("hi");
  });
  document.body.appendChild(__el_1);"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

## 17. Statement: PassStatement

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `pass-lewati` | pass-lewati: lewati keyword 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 18. Statement: PropertyLine

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `property-basic` | property-basic: kelas = "tombol" 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 19. Statement: SaatStatement

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `saat-basic` | saat-basic: Saat hitung 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


### Detail Test Case

### 1. `saat-basic` — saat-basic: Saat hitung 1 ✅

**Kategori**: Statement: SaatStatement

**Input**:

```pjs
Saat hitung 1
```

**Actual**:

```

"(function() {
  // @source 1:1 DataDeclaration
  const hitung = __createReactive(0);
  // @source 2:1 SaatStatement
  __watch([object Object], (nilaiBaru, nilaiLama) => {
    const __txt_1 = document.createTextNode("berubah");
    document.body.appendChild(__txt_1);
  });"

```

**Snapshot**: `tests/__snapshots__/snapshot-codegen.test.js.snap`

---

## 20. Statement: TextNode

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `textnode-inline` | textnode-inline: inline text in Buat 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |


## 21. Statement: UlangiStatement

### Ringkasan

| # | Test ID | Nama | Status | Snapshot |
|---|---------|------|--------|----------|
| 1 | `ulangi-counted` | ulangi-counted: Ulangi 3 kali 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 2 | `ulangi-iterasi` | ulangi-iterasi: Ulangi untuk item in daftar 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |
| 3 | `ulangi-rentang` | ulangi-rentang: Ulangi untuk i in [1,2,3,4,5] 1 | ✅ | [snapshot-codegen.test.js.snap](../tests/__snapshots__/snapshot-codegen.test.js.snap) |

