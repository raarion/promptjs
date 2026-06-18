# Panduan Push PromptJS ke GitHub via Termux

> Repo target: `github.com/raarion/promptjs`
> Folder di perangkat: `/storage/emulated/0/Documents/promptjs/`

---

## Prasyarat

Pastikan file-file berikut ada di folder project-mu:
- `.gitignore`
- `README.md`
- `package.json`
- `PromptJS-Spec-v0.1.md`
- `PromptJS-Spec-v0.2.md`
- `PromptJS-Evaluasi-Arsitektur.md`
- `src/promptjs/` (semua source code)

**PENTING:** `.gitignore`, `README.md`, dan file spec yang baru dibuat di sesi ini
belum ada di perangkatmu. Kamu perlu menyalinnya manual. Lihat bagian
"Menyalin File Baru" di bawah.

---

## Langkah-demi-Langkah

### 1. Install git (jika belum)

```bash
pkg install git
```

### 2. Konfigurasi git

```bash
git config --global user.name  "raarion"
git config --global user.email "email@akun-github-kamu.com"
```

Ganti `email@akun-github-kamu.com` dengan email yang terdaftar di GitHub-mu.

### 3. Buat repo kosong di GitHub

Buka browser, login ke GitHub sebagai **raarion**, lalu:

1. Kunjungi **https://github.com/new**
2. **Repository name**: `promptjs`
3. **Description**: `A mini-DSL template engine that compiles to vanilla JS`
4. Pilih **Public**
5. **JANGAN** centang: Add a README, Add .gitignore, Choose a license
   (karena kita sudah punya sendiri)
6. Klik **Create repository**

Alternatif: jika `gh` CLI terinstal:

```bash
pkg install gh
gh auth login
gh repo create promptjs --public --description "A mini-DSL template engine that compiles to vanilla JS"
```

### 4. Pindah ke folder project

```bash
cd /storage/emulated/0/Documents/promptjs/
```

### 5. Menyalin File Baru

File-file ini dibuat di sesi terakhir dan belum ada di perangkatmu.
Salin isi file dari output di bawah ke file baru di folder project-mu:

#### `.gitignore`

Buat file `.gitignore` dengan isi:

```
# ===========================================
# PromptJS — .gitignore
# ===========================================

# --- Node.js ---
node_modules/
package-lock.json

# --- Build output ---
dist/
build/
output/
outputs/

# --- OS / Editor ---
.DS_Store
Thumbs.db
*.swp
*.swo
*~
.vscode/
.idea/

# --- Sandbox artifacts (jangan di-push) ---
# direktori clone lama (tidak di-push, sudah di gitignore)
browser-data/
.browser_data/
.psiphon_data/
.agent_hooks/
.agent-hooks/
summarized_conversations/
outputs/

# --- Misc ---
*.log
.env
todo.md
```

#### `README.md`

Buat file `README.md` — isi lengkapnya ada di file README.md
yang bisa kamu akses sebagai attachment di pesan ini.

#### `PromptJS-Spec-v0.2.md`

File spec v0.2 juga belum ada di perangkatmu. Salin dari attachment.

### 6. Inisialisasi git

```bash
git init
```

### 7. Tambahkan remote

```bash
git remote add origin https://github.com/raarion/promptjs.git
```

### 8. Tambahkan file PromptJS (HANYA file project!)

```bash
git add .gitignore
git add README.md
git add package.json
git add assets/
git add doc-dev/
git add src/
```

**JANGAN** lakukan `git add .` karena akan memasukkan file-file
sandbox yang tidak diinginkan (clone lama/, browser-data/, outputs/, dll).

### 9. Verifikasi file yang akan di-commit

```bash
git status
```

Pastikan YANG MASUK adalah:
- `.gitignore`
- `README.md`
- `package.json`
- `PromptJS-Spec-v0.1.md`
- `PromptJS-Spec-v0.2.md`
- `PromptJS-Evaluasi-Arsitektur.md`
- `src/promptjs/**` (semua source code PromptJS)

Pastikan YANG TIDAK MASUK:
- `clone lama/` (direktori referensi lama)
- `browser-data/` atau `.browser_data/`
- `.agent_hooks/` atau `.agent-hooks/`
- `summarized_conversations/`
- `outputs/`
- `.psiphon_data/`
- `todo.md`

Jika ada yang lolos, periksa `.gitignore` — pastikan isinya benar.

### 10. Commit pertama

```bash
git commit -m "feat: initial commit — PromptJS v0.1.0

- 5-stage pipeline: Lexer → Parser → Resolver → Analyzer → Compiler
- Bilingual keywords (Indonesia/English)
- Front-matter data binding
- Event & tag alias maps
- CLI: compile, serve, build, init
- 24 tests passing"
```

### 11. Push ke GitHub

```bash
git branch -M main
git push -u origin main
```

GitHub akan meminta username dan password/token.

**PENTING:** GitHub tidak lagi menerima password untuk push.
Kamu perlu menggunakan **Personal Access Token (PAT)**:

1. Buka **https://github.com/settings/tokens**
2. Klik **Generate new token (classic)**
3. Beri nama: `termux-promptjs`
4. Centang scope: `repo` (full control)
5. Klik **Generate token**
6. **SIMPAN token** — tidak akan ditampilkan lagi!

Saat `git push` meminta password, masukkan PAT tersebut (bukan password GitHub-mu).

### 12. Verifikasi

```bash
# Buka di browser:
# https://github.com/raarion/promptjs
```

---

## Troubleshooting

### Error: "remote origin already exists"

```bash
git remote remove origin
git remote add origin https://github.com/raarion/promptjs.git
```

### Error: "failed to push — refs/heads/main"

Repo mungkin sudah ada dengan file README. Hapus repo di GitHub
dan ulangi dari langkah 3 (JANGAN centang README saat create repo).

### Error: "Authentication failed"

Pastikan kamu menggunakan PAT, bukan password.
Buat token baru di https://github.com/settings/tokens

### Ingin menghapus file yang sudah ter-commit tapi salah

```bash
git rm --cached <file-path>
git commit -m "chore: remove accidentally committed file"
git push
```

---

## Setelah Push

Kamu bisa install promptjs secara lokal:

```bash
npm install -g .
pjs help
pjs compile index.pjs --stdout
```

Atau link untuk development:

```bash
npm link
pjs help
```
