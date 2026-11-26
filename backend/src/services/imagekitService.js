const crypto = require('crypto');
const axios = require('axios');

function getImageKitConfig() {
  const publicKey = (process.env.IMAGEKIT_PUBLIC_KEY || '').trim();
  const privateKey = (process.env.IMAGEKIT_PRIVATE_KEY || '').trim();
  const urlEndpoint = (process.env.IMAGEKIT_URL_ENDPOINT || '').trim();
  return {
    publicKey,
    privateKey,
    urlEndpoint,
    configured: Boolean(publicKey && privateKey && urlEndpoint)
  };
}

function getUploadAuthParams() {
  const { publicKey, privateKey, urlEndpoint, configured } = getImageKitConfig();
  if (!configured) {
    return { configured: false };
  }

  const token = crypto.randomUUID();
  const expire = Math.floor(Date.now() / 1000) + 1800;
  const signature = crypto
    .createHmac('sha1', privateKey)
    .update(token + expire)
    .digest('hex');

  return {
    configured: true,
    token,
    expire,
    signature,
    publicKey,
    urlEndpoint
  };
}

async function deleteImageKitFiles(fileIds = []) {
  const { privateKey, configured } = getImageKitConfig();
  const validIds = (fileIds || []).map((id) => String(id || '').trim()).filter(Boolean);
  if (!configured || validIds.length === 0) return;

  const authHeader = `Basic ${Buffer.from(`${privateKey}:`).toString('base64')}`;

  await Promise.allSettled(
    validIds.map((fileId) =>
      axios.delete(`https://api.imagekit.io/v1/files/${encodeURIComponent(fileId)}`, {
        headers: { Authorization: authHeader },
        timeout: 5000
      })
    )
  );
}

module.exports = {
  getImageKitConfig,
  getUploadAuthParams,
  deleteImageKitFiles
};
