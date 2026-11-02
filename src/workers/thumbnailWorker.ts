// Web Worker for high-resolution (800px) thumbnail generation without UI freezing
self.onmessage = async (e: MessageEvent<{ id: string; bitmap: ImageBitmap; maxEdge?: number }>) => {
  const { id, bitmap, maxEdge = 800 } = e.data;
  try {
    const width = bitmap.width;
    const height = bitmap.height;

    let targetWidth = width;
    let targetHeight = height;

    if (Math.max(width, height) > maxEdge) {
      if (width > height) {
        targetWidth = maxEdge;
        targetHeight = Math.round((height * maxEdge) / width);
      } else {
        targetHeight = maxEdge;
        targetWidth = Math.round((width * maxEdge) / height);
      }
    }

    const canvas = new OffscreenCanvas(targetWidth, targetHeight);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Could not get 2D context in offscreen canvas');
    }

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, targetWidth, targetHeight);
    ctx.drawImage(bitmap, 0, 0, targetWidth, targetHeight);

    const blob = await canvas.convertToBlob({ type: 'image/jpeg', quality: 0.88 });
    bitmap.close();

    self.postMessage({ id, success: true, blob });
  } catch (err: any) {
    if (bitmap && typeof bitmap.close === 'function') {
      bitmap.close();
    }
    self.postMessage({ id, success: false, error: err?.message || 'Worker error' });
  }
};
