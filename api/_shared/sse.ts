// Incrementally decode the JSON string value of "reply" out of a partial buffer
// as it streams in. Returns the text decoded so far and whether the closing quote
// has been seen. Pure + dependency-free so it can be unit-tested in isolation.
//
// Handles JSON string escapes — including \uXXXX (and surrogate pairs), \b and \f —
// so multibyte/accented characters don't surface as mojibake ("cafu00e9") in the
// streamed tokens. Escapes (and \u sequences) split across chunk boundaries cause
// an early return; the next call sees the completed buffer and decodes them.
export function decodeReply(buf: string): { text: string; closed: boolean } {
  const key = buf.indexOf('"reply"');
  if (key === -1) return { text: '', closed: false };
  let i = buf.indexOf('"', key + 7); // opening quote after the colon
  if (i === -1) return { text: '', closed: false };
  i += 1;
  let out = '';
  for (; i < buf.length; i++) {
    const c = buf[i];
    if (c === '\\') {
      const n = buf[i + 1];
      if (n === undefined) break; // escape split across chunks — wait
      if (n === 'u') {
        const hex = buf.slice(i + 2, i + 6);
        if (hex.length < 4) break; // \uXXXX split across chunks — wait for the rest
        out += String.fromCharCode(parseInt(hex, 16)); // surrogate halves concat correctly
        i += 5;
      } else {
        out += { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', '"': '"', '\\': '\\', '/': '/' }[n] ?? n;
        i += 1;
      }
    } else if (c === '"') {
      return { text: out, closed: true };
    } else {
      out += c;
    }
  }
  return { text: out, closed: false };
}
