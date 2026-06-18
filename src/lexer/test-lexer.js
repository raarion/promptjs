/**
 * PromptJS v0.1 — Lexer Test
 * ============================================================================

const Lexer = require('./promptjs-lexer');
const TT = Lexer.TT;

const testSource = `---
produk: ./data/produk.json
tema: { warnaUtama: "#ff6600" }
---
Buat halaman:
    Buat card:
        style = "padding:16px; background:#fff"
        
        Buat judul.utama#judul:
            "Halo, Beb!"
        
        Buat paragraf.deskripsi:
            "Ini adalah framework "
            Buat span.nama:
                "SEMAQ"
            " versi 1.0"
        
        Buat tombol.cta:
            "Daftar Sekarang"
            href = "/daftar"
            target = "_blank"
            type = "button"
            on_klik = handleDaftar()
            on_mouseover = console.log("Siap diklik!")
        
        Buat gambar.produk:
            src = $produk.gambarUrl
            alt = "Gambar Produk"
    
    Buat pemisah:
        pass

Buat daftar_produk:
    Ulangi untuk item in $keranjang:
        Buat card_produk:
            src = $item.gambar
            judul = $item.nama
            harga = "Rp" + $item.harga
            
            Jika $item.stok > 0:
                Buat tombol_beli:
                    "Beli Sekarang"
                    on_klik = checkout($item.id)
            Lainnya:
                Buat teks_stok_habis:
                    "Stok Habis"
                    style = "color: red"
`;

console.log('=== PROMPTJS LEXER TEST ===\n');

const result = Lexer.tokenize(testSource);

console.log('--- Front Matter ---');
if (result.frontMatter) {
  const fm = Lexer.parseFrontMatter(result.frontMatter);
  console.log(JSON.stringify(fm, null, 2));
}

console.log('\n--- Errors ---');
if (result.errors.length === 0) {
  console.log('No errors!');
} else {
  result.errors.forEach(e => console.log(`  [${e.code}] Line ${e.line}: ${e.message}`));
}

console.log('\n--- Tokens (first 60) ---');
const displayCount = Math.min(60, result.tokens.length);
for (let i = 0; i < displayCount; i++) {
  const t = result.tokens[i];
  if (t.type === TT.TK_INDENT || t.type === TT.TK_DEDENT) {
    console.log(`  [${i}] ${t.type}  (line ${t.line})`);
  } else if (t.type === TT.TK_EOF) {
    console.log(`  [${i}] ${t.type}`);
  } else {
    const val = typeof t.value === 'object' ? JSON.stringify(t.value) : t.value;
    console.log(`  [${i}] ${t.type} = "${val}"  (line ${t.line})`);
  }
}
if (result.tokens.length > displayCount) {
  console.log(`  ... and ${result.tokens.length - displayCount} more tokens`);
}

console.log(`\nTotal tokens: ${result.tokens.length}`);
