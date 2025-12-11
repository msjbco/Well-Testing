// Storage utility functions for handling photo uploads

/**
 * Upload base64 photos to Supabase Storage and return public URLs
 * @param {Array} photos - Array of photo objects with url property
 * @param {string} jobId - Job ID for organizing photos in storage
 * @param {Object} supabase - Supabase client instance
 * @returns {Promise<Array>} Array of photos with public URLs
 */
async function uploadBase64PhotosToStorage(photos, jobId, supabase) {
  if (!photos || !Array.isArray(photos) || photos.length === 0) {
    return photos;
  }

  if (!supabase || !jobId) {
    console.warn('⚠️  Cannot upload photos: Supabase not available or jobId missing');
    return photos;
  }

  const processedPhotos = [];
  
  for (const photo of photos) {
    // If photo URL is already a public URL (not base64), keep it
    if (photo.url && !photo.url.startsWith('data:image')) {
      processedPhotos.push({
        ...photo,
        caption: photo.caption || photo.label || '',
        label: photo.label || photo.caption || '',
      });
      continue;
    }
    
    // If photo URL is base64, upload it to Supabase Storage
    if (photo.url && photo.url.startsWith('data:image')) {
      try {
        // Extract base64 data
        const matches = photo.url.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
          console.warn('Invalid base64 image format, skipping photo');
          continue;
        }
        
        const imageType = matches[1]; // jpeg, png, etc.
        const base64Data = matches[2];
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const fileName = `${jobId}/main-site-${Date.now()}-${Math.random().toString(36).substring(7)}.${imageType}`;
        
        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('well-report-photos')
          .upload(fileName, buffer, {
            contentType: `image/${imageType}`,
            cacheControl: '3600',
            upsert: false,
          });
        
        if (uploadError) {
          console.error('Error uploading photo to storage:', uploadError);
          // Keep original base64 URL if upload fails
          processedPhotos.push({
            ...photo,
            caption: photo.caption || photo.label || '',
            label: photo.label || photo.caption || '',
          });
          continue;
        }
        
        // Get public URL
        const { data: { publicUrl } } = supabase.storage
          .from('well-report-photos')
          .getPublicUrl(fileName);
        
        // Replace base64 URL with public URL
        processedPhotos.push({
          ...photo,
          url: publicUrl,
          caption: photo.caption || photo.label || '',
          label: photo.label || photo.caption || '',
        });
        
        console.log(`✅ Uploaded base64 photo to storage: ${publicUrl}`);
      } catch (error) {
        console.error('Error processing base64 photo:', error);
        // Keep original photo if processing fails
        processedPhotos.push({
          ...photo,
          caption: photo.caption || photo.label || '',
          label: photo.label || photo.caption || '',
        });
      }
    } else {
      // No URL, skip
      continue;
    }
  }
  
  return processedPhotos;
}

module.exports = {
  uploadBase64PhotosToStorage
};
