/**
 * r2.js — Cloudflare R2 client for the user service (avatar uploads)
 */
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'decp-media';
const PUBLIC_URL = process.env.R2_PUBLIC_URL;

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY,
  },
});

/**
 * Generate a presigned PUT URL for uploading an avatar directly to R2.
 * Key is always "avatars/{userId}.{ext}" so re-uploading overwrites the old avatar.
 *
 * @param {string} userId
 * @param {string} mimeType - e.g. "image/jpeg"
 * @param {number} expiresIn - seconds (default 300)
 * @returns {{ uploadUrl: string, publicUrl: string, key: string }}
 */
async function getAvatarUploadUrl(userId, mimeType = 'image/jpeg', expiresIn = 300) {
  const EXT_MAP = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const ext = EXT_MAP[mimeType] || 'jpg';
  const key = `avatars/${userId}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    ContentType: mimeType,
  });

  const uploadUrl = await getSignedUrl(s3, command, { expiresIn });
  const publicUrl = `${PUBLIC_URL}/${key}`;

  return { uploadUrl, publicUrl, key };
}

module.exports = { getAvatarUploadUrl };
