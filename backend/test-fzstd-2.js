try {
  const fzstdStream = require('fzstd/stream');
  console.log('fzstd/stream exports:', Object.keys(fzstdStream));
} catch(e) {
  console.log('require("fzstd/stream") failed:', e.message);
}
try {
  const fzstdLib = require('fzstd/lib/stream');
  console.log('fzstd/lib/stream exports:', Object.keys(fzstdLib));
} catch(e) {
  console.log('require("fzstd/lib/stream") failed:', e.message);
}
