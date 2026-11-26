/**
 * Compress and center-crop a mobile camera or gallery image into an ultra-lightweight
 * avatar (default 192x192 WebP/JPEG, target <= 12 KB) before uploading to ImageKit.
 */
function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), mimeType, quality);
  });
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read compressed image'));
    reader.readAsDataURL(blob);
  });
}

function loadImageElement(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Could not decode selected image'));
    };
    img.src = objectUrl;
  });
}

export async function compressMemberPhoto(file, { size = 192, targetMaxBytes = 12288 } = {}) {
  if (!file) throw new Error('No image selected');

  const img = await loadImageElement(file);
  const srcW = img.naturalWidth || img.width;
  const srcH = img.naturalHeight || img.height;

  // Center-crop to square for crisp avatar & minimal byte size
  const cropSide = Math.min(srcW, srcH);
  const sx = Math.max(0, Math.floor((srcW - cropSide) / 2));
  const sy = Math.max(0, Math.floor((srcH - cropSide) / 2));

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, cropSide, cropSide, 0, 0, size, size);

  const qualities = [0.48, 0.38, 0.3, 0.24];
  let bestBlob = null;
  let chosenMime = 'image/webp';

  for (const mime of ['image/webp', 'image/jpeg']) {
    for (const q of qualities) {
      const candidate = await canvasToBlob(canvas, mime, q);
      if (!candidate || candidate.type !== mime) break;
      bestBlob = candidate;
      chosenMime = mime;
      if (candidate.size <= targetMaxBytes) {
        const dataUrl = await blobToDataUrl(bestBlob);
        const ext = chosenMime === 'image/webp' ? 'webp' : 'jpg';
        return {
          blob: bestBlob,
          dataUrl,
          originalBytes: file.size || 0,
          compressedBytes: bestBlob.size,
          mimeType: chosenMime,
          fileName: `member-${Date.now()}.${ext}`
        };
      }
    }
    if (bestBlob) break;
  }

  if (!bestBlob) {
    throw new Error('Browser failed to compress the image');
  }

  const dataUrl = await blobToDataUrl(bestBlob);
  const ext = chosenMime === 'image/webp' ? 'webp' : 'jpg';
  return {
    blob: bestBlob,
    dataUrl,
    originalBytes: file.size || 0,
    compressedBytes: bestBlob.size,
    mimeType: chosenMime,
    fileName: `member-${Date.now()}.${ext}`
  };
}

export function formatBytes(bytes = 0) {
  if (!bytes || bytes < 1024) return `${bytes || 0} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
