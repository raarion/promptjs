# Cara Membaca Glosarium / How to Read the Glossary

> docs/reference/ → **Glossary (Narrative Companion) / Glosarium (Pendamping Naratif)**
> ← [Glossary](glossary.md) · [Error Codes](error-codes.md) · [CLI](cli.md) →
>
> Pendamping naratif untuk [glossary.md](glossary.md). Halaman ini **tidak mengubah satu pun istilah, padanan English, atau kode** di glosarium resmi — ia hanya memperhalus kalimat penuntun di sekelilingnya agar lebih nyaman dibaca pemula.
>
> A narrative companion to [glossary.md](glossary.md). This page **does not change a single term, English counterpart, or code** in the official glossary — it only smooths the guiding prose around it so it reads more comfortably for newcomers.

---

## Kenapa Ada Glosarium? / Why a Glossary?

PromptJS punya satu sifat yang jarang dimiliki bahasa lain: ia dwibahasa sampai ke akarnya. Setiap kata kunci punya dua wajah yang setara — satu dalam bahasa Indonesia, satu dalam bahasa Inggris — dan keduanya menghasilkan JavaScript yang identik. `Buat` dan `Create` adalah pintu yang sama. `Jika` dan `If` membuka ruang yang sama. Karena itu, glosarium bukan sekadar kamus; ia adalah peta yang menunjukkan bahwa dua bahasa yang kamu kenal sebenarnya berbicara hal yang sama.

PromptJS has a rare trait among programming languages: it is bilingual down to its roots. Every keyword has two equal faces — one in Indonesian, one in English — and both compile to identical JavaScript. `Buat` and `Create` are the same door. `Jika` and `If` open the same room. So the glossary is not merely a dictionary; it's a map showing that two languages you already know are, in fact, saying the same thing.

Bacalah glosarium bukan dari atas ke bawah seperti novel, melainkan seperti kamus saku: bukalah saat sebuah istilah muncul di kodemu dan kamu ingin tahu maknanya. Itulah cara terbaik memakainya.

Read the glossary not top-to-bottom like a novel, but like a pocket dictionary: open it the moment a term shows up in your code and you want to know its meaning. That's the best way to use it.

---

## Tujuh Keluarga Istilah / Seven Families of Terms

Untuk membantumu menavigasi, istilah-istilah dalam [glossary.md](glossary.md) dikelompokkan ke dalam beberapa keluarga yang saling berhubungan. Ini bukan istilah baru — hanya cara menarasikan kelompok yang sudah ada di glosarium resmi.

To help you navigate, the terms in [glossary.md](glossary.md) are grouped into related families. These are not new terms — just a way to narrate the groupings that already exist in the official glossary.

- **Keyword & Pernyataan / Keyword & Statement.** Ini fondasinya — kata-kata yang membentuk struktur halaman dan alur logika, seperti `Halaman`/`Page`, `Buat`/`Create`, `Jika`/`If`, dan `Ulangi`/`Loop`. Satu catatan halus yang sering membingungkan pemula: `Ketika`/`When` adalah penangan *event*, sedangkan `Saat`/`Watch` adalah pengawas *reaktivitas* — bunyinya mirip, tugasnya berbeda.

  This is the foundation — the words that shape page structure and logic flow, like `Halaman`/`Page`, `Buat`/`Create`, `Jika`/`If`, and `Ulangi`/`Loop`. One subtle note that often trips up beginners: `Ketika`/`When` is an *event* handler, while `Saat`/`Watch` is a *reactivity* watcher — they sound alike, but their jobs differ.

- **Data & Keadaan / Data & State.** Keluarga ini menentukan bagaimana nilai hidup di aplikasimu: `data` untuk keadaan reaktif berbasis Proxy, `turunan` untuk nilai turunan yang read-only, `tetap`/`const` untuk yang tak berubah, dan `ubah`/`let` untuk variabel biasa.

  This family decides how values live in your app: `data` for Proxy-based reactive state, `turunan` for read-only derived values, `tetap`/`const` for the unchanging, and `ubah`/`let` for ordinary variables.

- **Aksi / Actions.** Kata kerja yang melakukan sesuatu pada elemen atau array — `tambahkan`/`append`, `hapus`/`delete`, `tampilkan`/`show`, `perbarui`/`update`, dan teman-temannya.

  The verbs that act on elements or arrays — `tambahkan`/`append`, `hapus`/`delete`, `tampilkan`/`show`, `perbarui`/`update`, and their companions.

- **Komponen & Modul / Component & Module.** Cara kamu membungkus dan membagi-pakai logika: `Komponen`/`Component`, `Gunakan`/`Use`, `kirim`/`share` untuk ekspor, dan `terima`/`get` untuk impor.

  How you wrap and share logic: `Komponen`/`Component`, `Gunakan`/`Use`, `kirim`/`share` for export, and `terima`/`get` for import.

- **Navigasi / Navigation.** Untuk aplikasi multi-halaman: `arahkan`/`navigate`, `muatulang`/`reload`, dan `kembali`/`back`.

  For multi-page apps: `arahkan`/`navigate`, `muatulang`/`reload`, and `kembali`/`back`.

- **Struktur & Gaya / Structure & Style.** Tempat tampilan diatur: blok `Gaya`/`Style` untuk CSS, dan `Front-matter` untuk metadata di awal file.

  Where appearance is arranged: the `Gaya`/`Style` block for CSS, and `Front-matter` for file-leading metadata.

- **Internal & Keamanan / Internal & Security.** Istilah yang menjelaskan apa yang terjadi di balik layar — `Pipeline`, `Tree-shaking`, `Adapter`, `Plugin` — dan helper keamanan yang melindungi aplikasimu.

  Terms describing what happens behind the scenes — `Pipeline`, `Tree-shaking`, `Adapter`, `Plugin` — and the security helpers that protect your app.

---

## Memahami Bagian Keamanan dengan Tenang / Reading the Security Section Calmly

Bagian keamanan di [glossary.md](glossary.md) bisa terasa menakutkan bagi pemula, padahal pesan utamanya justru menenangkan: PromptJS menanamkan beberapa helper keamanan ke runtime hasil-kompilasi, dan semuanya bersifat **fail-closed** — saat ragu, ia menolak. Input berbahaya ditolak diam-diam, sementara aplikasimu tetap berjalan.

The security section in [glossary.md](glossary.md) can feel intimidating to a beginner, yet its core message is actually reassuring: PromptJS injects several security helpers into the compiled runtime, and they are all **fail-closed** — when in doubt, they deny. Dangerous input is silently rejected, while your app keeps running.

Tiga helper itu — `__sanitizeHTML`, `__safeAttr`, dan `__pjs_verifyPeran` — bekerja seperti penjaga yang ramah tapi tegas. Kalau ada atribut event-handler inline atau URL berskema tidak aman yang mencoba lewat, kamu akan melihat peringatan jujur di console browser: `PJS-W1001` untuk atribut event-handler yang diblokir, dan `PJS-W1002` untuk URL skema tidak aman. Peringatan ini bukan kegagalan — ia adalah bukti bahwa pelindungmu sedang bekerja.

Those three helpers — `__sanitizeHTML`, `__safeAttr`, and `__pjs_verifyPeran` — act like guards that are friendly but firm. If an inline event-handler attribute or an unsafe-scheme URL tries to slip through, you'll see an honest warning in the browser console: `PJS-W1001` for a blocked event-handler attribute, and `PJS-W1002` for an unsafe-scheme URL. These warnings are not failures — they are proof that your protector is working.

Satu kejujuran penting yang juga tercatat di glosarium, dan layak diulang dengan tenang: **auth guard PromptJS bersifat client-side/advisory** — ia bukan kontrol keamanan server. Untuk otorisasi yang sesungguhnya, verifikasi peran wajib dilakukan di server. PromptJS tidak berpura-pura menjadi lebih dari yang sebenarnya, dan kejujuran itu sendiri adalah bentuk keamanan.

One important honesty also recorded in the glossary, worth repeating calmly: **PromptJS's auth guard is client-side/advisory** — it is not a server-side security control. For real authorization, role verification must happen on the server. PromptJS does not pretend to be more than it is, and that honesty is itself a form of safety.

---

## Aturan Emas / The Golden Rule

Jangan menghafal glosarium. Tidak ada yang menghafal kamus, dan kamu pun tidak perlu. Biarkan glosarium menjadi sahabat yang selalu siap dibuka saat kamu butuh — bukan ujian yang harus kamu lewati. Seiring kamu menulis lebih banyak `.pjs`, istilah-istilah ini akan masuk dengan sendirinya, satu per satu, lewat kebiasaan, bukan paksaan.

Don't memorize the glossary. No one memorizes a dictionary, and you don't need to either. Let the glossary be a friend that's always ready when you need it — not a test you must pass. As you write more `.pjs`, these terms will settle in on their own, one by one, through habit rather than force.

---

← [Glossary](glossary.md) · [Error Codes](error-codes.md) · [CLI](cli.md) →
