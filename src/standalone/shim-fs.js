// PromptJS Standalone — Browser Shim: filesystem
// Zero-op stub for Node's `fs` so the compiler bundle doesn't crash in browser.
module.exports = {
  readFileSync() {
    throw new Error('fs.readFileSync not available in browser. Use compile() with inline source.');
  },
  existsSync() {
    return false;
  },
  mkdirSync() {},
  writeFileSync() {},
  rmSync() {},
  readdirSync() {
    return [];
  },
};
