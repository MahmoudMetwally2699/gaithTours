const { Transform } = require('stream');
const fzstd = require('fzstd');

class ZstdDecompressStream extends Transform {
  constructor(options) {
    super(options);
    this.decompressor = new fzstd.Decompress((chunk, isLast) => {
      // This is ondata callback
      if (chunk) {
        this.push(chunk);
      }
    });

    // Override ondata just in case, but constructor might set it.
    // Based on probe, we need to handle how fzstd emits data.
    // If fzstd.Decompress(cb) sets ondata to cb, then:
    // Signature seems to be (chunk, final) based on probe result where "err" was Uint8Array.
  }

  _transform(chunk, encoding, callback) {
    try {
      // push data to fzstd
      this.decompressor.push(chunk);
      callback();
    } catch (err) {
      callback(err);
    }
  }

  _flush(callback) {
    try {
      // signal end to fzstd
      this.decompressor.push(new Uint8Array(0), true);
      callback();
    } catch (err) {
      callback(err);
    }
  }
}

module.exports = ZstdDecompressStream;
