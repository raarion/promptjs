/**
 * PromptJS v0.2 — End-to-end Pipeline Test
 * ============================================================================
 * Tests: Lexer → Parser → (Resolver → Analyzer → Compiler from PromptJS)
 */

const Lexer = require('../lexer/promptjs-lexer');
const Parser = require('../parser/promptjs-parser');
const Resolver = require('../resolver/promptjs-resolver');
const Analyzer = require('../analyzer/promptjs-analyzer');
const Compiler = require('../compiler/promptjs-compiler');

const TT = Lexer.TT;

// ===== TEST 1: Lexer only =====
console.log('=== TEST 1: LEXER ===\n');

const testSource = `---
produk: ./data/produk.json
---
Buat halaman:
    Buat judul.utama#judul:
        "Halo, Beb!"
`;

const lexResult = Lexer.tokenize(testSource);
console.log('Front matter:', JSON.stringify(Lexer.parseFrontMatter(lexResult.frontMatter), null, 2));
console.log('Errors:', lexResult.errors.length === 0 ? 'None' : lexResult.errors);
console.log('Tokens:', lexResult.tokens.map(t => `${t.type}(${typeof t.value === 'object' ? JSON.stringify(t.value) : t.value})`).join(' '));

// ===== TEST 2: Parser only =====
console.log('\n=== TEST 2: PARSER ===\n');

const fm = Lexer.parseFrontMatter(lexResult.frontMatter);
const parseResult = Parser.parse(lexResult.tokens, fm);

if (parseResult.errors.length > 0) {
  console.log('Parse Errors:', parseResult.errors);
} else {
  console.log('AST:', JSON.stringify(parseResult.ast, (k, v) => {
    if (k === 'loc') return undefined;
    return v;
  }, 2));
}

// ===== TEST 3: Full Pipeline (Lexer → Parser → Resolver → Compiler) =====
console.log('\n=== TEST 3: FULL PIPELINE ===\n');

// Simpler test for pipeline connection
const simpleSource = `Buat ruang:
    "Hello from PromptJS!"
    style = "padding:20px"
`;

const lex2 = Lexer.tokenize(simpleSource);
console.log('Lexer tokens:', lex2.tokens.map(t => `${t.type}(${t.value})`).join(' '));

if (lex2.errors.length > 0) {
  console.log('Lexer errors:', lex2.errors);
} else {
  const parse2 = Parser.parse(lex2.tokens, null);
  console.log('Parse errors:', parse2.errors.length > 0 ? parse2.errors : 'None');

  if (parse2.errors.length === 0 && parse2.ast) {
    try {
      const resolver = new Resolver();
      const resolveResult = resolver.resolve(parse2.ast);
      console.log('Resolve errors:', resolveResult.errors.length > 0 ? resolveResult.errors.map(e => e.message || e.pesan) : 'None');

      if (resolveResult.errors.length === 0) {
        try {
          const analyzer = new Analyzer();
          const analyzeResult = analyzer.analyze(resolveResult.ast);
          console.log('Analyze errors:', analyzeResult.errors.length > 0 ? analyzeResult.errors.map(e => e.message || e.pesan) : 'None');

          if (analyzeResult.errors.length === 0) {
            try {
              const compiler = new Compiler();
              const js = compiler.compile(analyzeResult.ast);
              console.log('\n--- Generated JS ---');
              console.log(js);
            } catch (compileErr) {
              console.log('Compiler error:', compileErr.message);
            }
          }
        } catch (analyzeErr) {
          console.log('Analyzer error:', analyzeErr.message);
        }
      }
    } catch (resolveErr) {
      console.log('Resolver error:', resolveErr.message);
    }
  }
}

// ===== TEST 4: Bilingual keywords produce same AST =====
console.log('\n=== TEST 4: BILINGUAL ===\n');

const idSource = `Buat ruang.kotak:
    "Indonesia"
`;
const enSource = `Create div.kotak:
    "English"
`;

const idLex = Lexer.tokenize(idSource);
const enLex = Lexer.tokenize(enSource);
const idParse = Parser.parse(idLex.tokens, null);
const enParse = Parser.parse(enLex.tokens, null);

console.log('ID AST type:', idParse.ast.body[0]?.type);
console.log('EN AST type:', enParse.ast.body[0]?.type);
console.log('ID selector tag:', idParse.ast.body[0]?.selector?.tag);
console.log('EN selector tag:', enParse.ast.body[0]?.selector?.tag);

// ===== TEST 5: Extended example =====
console.log('\n=== TEST 5: EXTENDED EXAMPLE ===\n');

const extSource = `Buat card:
    Buat tombol.cta:
        "Klik Aku"
        on_klik = handleClick()
`;

const extLex = Lexer.tokenize(extSource);
const extParse = Parser.parse(extLex.tokens, null);

if (extParse.errors.length > 0) {
  console.log('Parse Errors:', extParse.errors);
} else {
  console.log('AST (no loc):', JSON.stringify(extParse.ast, (k, v) => {
    if (k === 'loc') return undefined;
    return v;
  }, 2));
}
