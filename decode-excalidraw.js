const { inflateSync } = require("node:zlib");

const INPUT_URL =
  process.env.EXCALIDRAW_URL ||
  "https://excalidraw.com/#json=-4EaDVDMsdlu4WCQyuenI,TfaYFQ-FISnJYRSEEPapQA";

const hash = new URL(INPUT_URL).hash;
const m = hash.match(/^#json=([^,]+),([^,]+)$/);
if (!m) {
  throw new Error(`Unexpected hash format: ${hash}`);
}
const [, dataPart, keyPart] = m;

function base64urlToUint8Array(str) {
  const b64 = str
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(str.length + ((4 - (str.length % 4)) % 4), "=");
  const buf = Buffer.from(b64, "base64");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
}

const VERSION_DATAVIEW_BYTES = 4;
const NEXT_CHUNK_SIZE_DATAVIEW_BYTES = 4;
const CONCAT_BUFFERS_VERSION = 1;

function dataViewGet(bufferU8, bytes, offset) {
  const dv = new DataView(
    bufferU8.buffer,
    bufferU8.byteOffset,
    bufferU8.byteLength,
  );
  if (bytes === 4) return dv.getUint32(offset);
  if (bytes === 2) return dv.getUint16(offset);
  if (bytes === 1) return dv.getUint8(offset);
  throw new Error(`Unsupported bytes: ${bytes}`);
}

function splitBuffers(concatenatedU8) {
  const buffers = [];
  let cursor = 0;

  const version = dataViewGet(
    concatenatedU8,
    NEXT_CHUNK_SIZE_DATAVIEW_BYTES,
    cursor,
  );
  if (version > CONCAT_BUFFERS_VERSION) {
    throw new Error(`Invalid concat buffer version: ${version}`);
  }
  cursor += VERSION_DATAVIEW_BYTES;

  while (true) {
    const chunkSize = dataViewGet(
      concatenatedU8,
      NEXT_CHUNK_SIZE_DATAVIEW_BYTES,
      cursor,
    );
    cursor += NEXT_CHUNK_SIZE_DATAVIEW_BYTES;

    buffers.push(concatenatedU8.slice(cursor, cursor + chunkSize));
    cursor += chunkSize;

    if (cursor >= concatenatedU8.byteLength) break;
  }

  return buffers;
}

async function decryptAesGcm({ iv, encrypted }, jwkK) {
  const subtle = globalThis.crypto.subtle;
  const cryptoKey = await subtle.importKey(
    "jwk",
    { alg: "A128GCM", ext: true, k: jwkK, key_ops: ["encrypt", "decrypt"], kty: "oct" },
    { name: "AES-GCM", length: 128 },
    false,
    ["decrypt"],
  );
  const plainBuf = await subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, encrypted);
  return new Uint8Array(plainBuf);
}

async function decodeExcalidrawJsonShareUrl(url) {
  const hash = new URL(url).hash;
  const m = hash.match(/^#json=([^,]+),([^,]+)$/);
  if (!m) throw new Error(`Unexpected hash format: ${hash}`);
  const [, dataPart, keyPart] = m;

  const top = base64urlToUint8Array(dataPart);
  const [encodingMetadataBuffer, iv, buffer] = splitBuffers(top);
  const encodingMetadata = JSON.parse(Buffer.from(encodingMetadataBuffer).toString("utf8"));

  const decryptedDeflated = await decryptAesGcm({ iv, encrypted: buffer }, keyPart);
  const decrypted = encodingMetadata.compression
    ? inflateSync(Buffer.from(decryptedDeflated))
    : Buffer.from(decryptedDeflated);

  const [contentsMetadataBuffer, contentsBuffer] = splitBuffers(
    new Uint8Array(decrypted.buffer, decrypted.byteOffset, decrypted.byteLength),
  );
  const metadata = JSON.parse(Buffer.from(contentsMetadataBuffer).toString("utf8"));

  const sceneText = Buffer.from(contentsBuffer).toString("utf8");
  const sceneJson = JSON.parse(sceneText);

  return { encodingMetadata, metadata, sceneJson };
}

decodeExcalidrawJsonShareUrl(INPUT_URL)
  .then(({ encodingMetadata, metadata, sceneJson }) => {
    const out = { encodingMetadata, metadata, sceneJson };
    process.stdout.write(JSON.stringify(out, null, 2));
  })
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });

