/**
 * Compression d'images côté navigateur (canvas) — aucune dépendance.
 *
 * ⚠️ Firestore limite chaque document à **1 Mio** : une capture d'écran brute
 * (base64 ≈ +33 % de la taille du fichier) dépasse souvent cette limite et
 * l'écriture échoue. On redimensionne donc l'image et on diminue la qualité
 * jusqu'à passer sous la cible (500 Ko par défaut).
 */

export interface CompressedImage {
  /** Image compressée, prête pour Firestore (`data:image/jpeg;base64,…`). */
  dataUrl: string;
  /** Poids estimé en octets. */
  bytes: number;
  width: number;
  height: number;
  /** Qualité JPEG finalement retenue (0–1). */
  quality: number;
}

interface CompressOptions {
  /** Largeur maximale (px). Défaut : 800. */
  maxWidth?: number;
  /** Poids maximal cible (octets). Défaut : 500 Ko. */
  maxBytes?: number;
  /** Qualité JPEG de départ (0–1). Défaut : 0,6. */
  quality?: number;
}

/** Poids approximatif d'une data URL base64 (octets). */
export function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? '';
  return Math.round((base64.length * 3) / 4);
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.onerror = () => reject(new Error('Lecture du fichier impossible.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Image illisible ou corrompue.'));
    image.src = dataUrl;
  });
}

/**
 * Compresse une image (JPEG, largeur max 800 px) sous `maxBytes`.
 * Réduit progressivement la qualité puis la taille si nécessaire.
 */
export async function compressImageFile(
  file: File,
  options: CompressOptions = {},
): Promise<CompressedImage> {
  const maxWidth = options.maxWidth ?? 800;
  const maxBytes = options.maxBytes ?? 500_000;
  const startQuality = options.quality ?? 0.6;

  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Compression impossible sur ce navigateur.');

  let width = image.width;
  let height = image.height;
  if (width > maxWidth) {
    height = Math.round((height * maxWidth) / width);
    width = maxWidth;
  }

  let attempt = 0;
  let quality = startQuality;
  let dataUrl = '';

  // Jusqu'à 6 tentatives : qualité 0,6 → 0,25, puis réduction de moitié.
  while (attempt < 6) {
    canvas.width = width;
    canvas.height = height;
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (estimateDataUrlBytes(dataUrl) <= maxBytes) {
      return { dataUrl, bytes: estimateDataUrlBytes(dataUrl), width, height, quality };
    }

    attempt += 1;
    if (quality > 0.25) {
      quality = Math.max(0.25, quality - 0.15);
    } else {
      width = Math.round(width * 0.75);
      height = Math.round(height * 0.75);
    }
  }

  throw new Error(
    "Capture trop lourde même après compression. Choisissez une image plus simple (moins de détails).",
  );
}
