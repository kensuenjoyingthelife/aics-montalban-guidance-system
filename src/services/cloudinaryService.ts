/**
 * Cloudinary Secure Upload Engine
 * Direct integration for student identification cards and live personal photos.
 * Replaces local storage bottlenecks with Cloudinary high-speed global CDN delivery.
 * Automatically saves the resulting secure HTTPS URLs to Supabase.
 */

export const CLOUDINARY_CONFIG = {
  cloudName: 'exflbc2r',
  apiKey: '299749614121119',
  uploadPreset: 'aics_student_photos',
  uploadUrl: 'https://api.cloudinary.com/v1_1/exflbc2r/image/upload',
};

export interface CloudinaryUploadResult {
  success: boolean;
  secureUrl?: string;
  publicId?: string;
  error?: string;
}

/**
 * Upload an image file (Student ID or Live Selfie) directly to Cloudinary CDN
 * @param file The image File object (already compressed on client-side)
 * @param studentNumber The student's official ID number for tagging
 * @param tag Type of image ('student_id' | 'personal_photo')
 */
export async function uploadImageToCloudinary(
  file: File,
  studentNumber: string,
  tag: 'student_id' | 'personal_photo'
): Promise<string | null> {
  try {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
    formData.append('tags', `aics,${studentNumber.trim()},${tag}`);
    formData.append('context', `student_number=${studentNumber.trim()}|photo_type=${tag}`);

    console.log(`☁️ Uploading ${tag} for ${studentNumber} to Cloudinary...`);

    const res = await fetch(CLOUDINARY_CONFIG.uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      console.error('Cloudinary upload error:', errData);
      return null;
    }

    const data = await res.json();
    console.log(`✅ Cloudinary upload success (${tag}):`, data.secure_url);
    return data.secure_url as string;
  } catch (err) {
    console.error('Cloudinary network exception:', err);
    return null;
  }
}
