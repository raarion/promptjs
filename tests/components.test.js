/**
 * PromptJS — Component system tests (Level 1, Wave C3).
 * Declaration (Komponen/Component, alias Definisikan/Define), named-props
 * instantiation via Buat/Create, prop scoping, and the undeclared-component error.
 */
import { describe, it, expect } from 'vitest';
import Engine from '../src/engine/promptjs.js';

const decl = `Komponen Kartu(judul, isi):
    Buat ruang.kartu:
        Buat h2: judul
        Buat paragraf: isi
`;

describe('component system', () => {
  it('declares a component as a props-object factory', () => {
    const r = Engine.compile(decl + '\nHalaman:\n    Buat Kartu(judul: "Halo", isi: "Dunia")');
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Kartu(props)');
    expect(r.js).toContain('window.Kartu = __komp_Kartu;');
  });

  it('destructures declared params into locals', () => {
    const r = Engine.compile(decl + '\nHalaman:\n    Buat Kartu(judul: "Halo", isi: "Dunia")');
    expect(r.js).toContain('const judul = props.judul;');
    expect(r.js).toContain('const isi = props.isi;');
    // The body references the params by bare name.
    expect(r.js).toMatch(/innerText = judul/);
    expect(r.js).toMatch(/innerText = isi/);
  });

  it('instantiates with named arguments via Buat Name(...)', () => {
    const r = Engine.compile(decl + '\nHalaman:\n    Buat Kartu(judul: "Halo", isi: "Dunia")');
    expect(r.success).toBe(true);
    expect(r.js).toContain('__komp_Kartu({ "judul": "Halo", "isi": "Dunia" })');
    expect(r.js).toMatch(/appendChild\(__komp_\d+\)/);
  });

  it('produces syntactically valid JavaScript', () => {
    const r = Engine.compile(decl + '\nHalaman:\n    Buat Kartu(judul: "Halo", isi: "Dunia")');
    expect(r.success).toBe(true);
    // new Function(...) throws on a syntax error; a no-op body is fine here.
    expect(() => new Function(`return (function(){ if(false){\n${r.js}\n} });`)).not.toThrow();
  });

  it('supports the English keywords (Component / Create)', () => {
    const r = Engine.compile(
      'Component Box(text):\n    Create div: text\n\nPage Home:\n    Create Box(text: "Hi")'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Box(props)');
    expect(r.js).toContain('__komp_Box({ "text": "Hi" })');
  });

  it('accepts Definisikan as an alias for Komponen', () => {
    const r = Engine.compile(
      'Definisikan Label(teksnya):\n    Buat teks: teksnya\n\nHalaman:\n    Buat Label(teksnya: "x")'
    );
    expect(r.success).toBe(true);
    expect(r.js).toContain('function __komp_Label(props)');
  });

  it('errors (E3004) when instantiating an undeclared component', () => {
    const r = Engine.compile('Halaman:\n    Buat TidakAda(x: 1)');
    expect(r.success).toBe(false);
    expect(r.errors.some((e) => e.code === 'E3004')).toBe(true);
  });
});
