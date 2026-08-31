import { supabase } from './supabase';

/**
 * Comprime una imagen en el cliente usando HTML Canvas para ahorrar ancho de banda y almacenamiento.
 */
export async function compressImage(file: File, maxWidth = 1600, quality = 0.85): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(file);
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = () => resolve(file);
    };
    reader.onerror = () => reject(new Error('Error al leer el archivo de imagen'));
  });
}

/**
 * Sube una imagen a Supabase Storage (Bucket: 'recipe-images')
 */
export async function uploadRecipeImage(file: File, userId: string): Promise<string> {
  try {
    const compressedBlob = await compressImage(file);
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const filePath = `recipes/${userId || 'public'}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from('recipe-images')
      .upload(filePath, compressedBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      });

    if (uploadError) {
      console.warn('[Pulse&Cook] Storage upload error:', uploadError.message);
      // Si el bucket no está configurado en Supabase, generar Data URL para no bloquear al usuario
      return await fileToDataUrl(compressedBlob);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('recipe-images').getPublicUrl(filePath);

    return publicUrl;
  } catch (err) {
    console.warn('[Pulse&Cook] Error uploading to storage, using fallback:', err);
    return await fileToDataUrl(file);
  }
}

function fileToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.readAsDataURL(blob);
  });
}
