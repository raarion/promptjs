// PromptJS Standalone — Browser Shim: process
// Minimal stub for Node's `process` global.
module.exports = {
  cwd: function () { return '/'; },
  env: {},
  argv: [],
  version: '',
  versions: {},
  platform: 'browser',
};
