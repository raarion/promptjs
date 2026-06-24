# Todo App — PromptJS Demo

Aplikasi todo list interaktif yang mendemonstrasikan fitur-fitur PromptJS:

- **Reactive state** — `data` + `Saat` watcher
- **CRUD** — tambah, centang, hapus tugas
- **Filter** — semua / aktif / selesai
- **Front-matter data** — seed data dari JSON di front-matter
- **Inline styles** — `Gaya:` block dengan CSS lengkap
- **Event handling** — `on_klik`, `on_diketik`, `on_diubah`
- **Lifecycle** — `Ketika dipasang:` untuk init data

## Cara Menjalankan

```bash
# Dari root promptjs
node src/cli/index.js serve examples/todo-app/

# Atau compile saja
node src/cli/index.js compile examples/todo-app/index.pjs
```

## Fitur PromptJS yang Digunakan

| Fitur | Contoh di Kode |
|-------|---------------|
| `data` | `data daftar = []`, `data filter = "semua"` |
| `Gaya:` | CSS lengkap dalam satu block |
| `tambahkan ... ke` | `tambahkan { teks: inputTeks, selesai: salah } ke daftar` |
| `Ulangi untuk` | `Ulangi untuk tugas dari daftar:` |
| `Jika ... Lainnya` | Filter logic |
| `hapus ... dari` | `hapus tugas dari daftar` |
| `Saat` | `Saat daftar:` watcher |
| `Ketika dipasang` | `Ketika dipasang: simpan $todos ke daftar` |
| `simpan ... ke` | `simpan event.target.value ke inputTeks` |
