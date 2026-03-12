/**
 * r2.js — Cloudflare R2 client (S3-compatible)
 * Generates pre-signed PUT URLs for direct browser uploads.
 */
const { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand, PutObjectCommandInput } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'decp-media';
const PUBLIC_URL = process.env.R2_PUBLIC_URL; // e.g. https://pub-xxxx.r2.dev

// R2 uses the standard S3 API endpoint format
const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a presigned PUT URL for uploading a file directly to R2.
 * The browser uploads directly to R2 — no bandwidth through the gateway.
 *
 * @param {string} key      - Object key (path inside the bucket), e.g. "posts/uuid.jpg"
 * @param {string} mimeType - MIME type of the file, e.g. "image/jpeg"
 * @param {number} expiresIn - Seconds until the URL expires (default 300s)
 * @returns {{ uploadUrl: string, publicUrl: string }}
 */
async function getPresignedUploadUrl(key, mimeType = 'application/octet-stream', expiresIn = 300) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl };
}

/**
 * Delete an object from R2.
 * @param {string} key - Object key to delete, e.g. "posts/uuid.jpg"
 */
async function deleteObject(key) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
}

/**
 * Check whether an object exists in R2.
 * Returns true if the object exists, false if it does not.
 * @param {string} key - Object key to check
 * @returns {Promise<boolean>}
 */
async function objectExists(key) {
  try {
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET_NAME, Key: key }));
    return true;
  } catch (err) {
    if (err.name === 'NotFound' || err.$metadata?.httpStatusCode === 404) return false;
    throw err;
  }
}

/**
 * Extract the R2 object key from a public URL.
 * e.g. "https://pub-xxx.r2.dev/posts/uuid.jpg" → "posts/uuid.jpg"
 * Returns null if the URL doesn't belong to this bucket.
 * @param {string} url
 * @returns {string|null}
 */
function keyFromPublicUrl(url) {
  if (!PUBLIC_URL || !url.startsWith(PUBLIC_URL)) return null;
  return url.slice(PUBLIC_URL.length).replace(/^\//, '');
}

/**
 * Upload a file buffer directly to R2 (server-side, avoids browser CORS).
 * @param {string} key
 * @param {Buffer} body
 * @param {string} contentType
 * @returns {Promise<string>} publicUrl
 */
async function uploadObject(key, body, contentType = 'application/octet-stream') {
  await s3.send(new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
  return `${PUBLIC_URL}/${key}`;
}

module.exports = { getPresignedUploadUrl, uploadObject, deleteObject, objectExists, keyFromPublicUrl };
