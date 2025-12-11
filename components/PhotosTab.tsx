'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface Photo {
  id: string;
  label: string;
  url?: string;
  uploading?: boolean;
  progress?: number;
  editingLabel?: boolean;
}

const PHOTO_LABELS = [
  'Well Head',
  'Pump House',
  'Pressure Tank',
  'Pressure Gauge',
  'Water Softener',
  'Water Heater',
  'Well Cap',
  'Well Seal',
  'Discharge Pipe',
  'Control Box',
  'Electrical Panel',
  'Well Permit Sign',
  'Property Overview',
  'Well Location',
  'Additional Photo',
];

interface PhotosTabProps {
  jobId: string;
  initialPhotos?: Photo[];
  onSave?: () => void;
}

export default function PhotosTab({
  jobId,
  initialPhotos,
  onSave,
}: PhotosTabProps) {
  const [photos, setPhotos] = useState<Photo[]>(
    PHOTO_LABELS.map((label, index) => {
      const existingPhoto = initialPhotos?.find((p) => p.label === label);
      // Only use URLs that are not blob URLs
      const url = existingPhoto?.url && !existingPhoto.url.startsWith('blob:') && !existingPhoto.url.startsWith('data:')
        ? existingPhoto.url
        : undefined;
      return {
        id: `photo-${index}`,
        label: existingPhoto?.label || label,
        url: url,
      };
    })
  );
  const fileInputRefs = useRef<{ [key: string]: HTMLInputElement | null }>({});
  const localUrlsRef = useRef<Set<string>>(new Set());

  // Update photos when initialPhotos changes, but filter out blob URLs
  useEffect(() => {
    if (initialPhotos) {
      const validPhotos = initialPhotos.filter((p) => 
        p.url && !p.url.startsWith('blob:') && !p.url.startsWith('data:')
      );
      
      setPhotos((prev) => {
        return PHOTO_LABELS.map((label, index) => {
          const existingPhoto = validPhotos.find((p) => p.label === label);
          const currentPhoto = prev.find((p) => p.id === `photo-${index}`);
          
          // If we have a valid URL from database, use it (even if current has blob URL)
          // Only keep blob URL if there's no valid URL from database AND upload is in progress
          if (existingPhoto?.url) {
            return {
              id: `photo-${index}`,
              label: existingPhoto.label || label,
              url: existingPhoto.url,
            };
          }
          
          // If current photo is uploading (has blob URL and uploading flag), keep it
          if (currentPhoto?.uploading && currentPhoto?.url?.startsWith('blob:')) {
            return currentPhoto;
          }
          
          // Otherwise, use current photo or default
          return {
            id: `photo-${index}`,
            label: existingPhoto?.label || label,
            url: currentPhoto?.url && !currentPhoto.url.startsWith('blob:') ? currentPhoto.url : undefined,
          };
        });
      });
    }
  }, [initialPhotos]);

  // Cleanup local URLs on unmount
  useEffect(() => {
    return () => {
      localUrlsRef.current.forEach((url) => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, []);

  const handlePhotoSelect = async (
    photoId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const photo = photos.find((p) => p.id === photoId);
    if (!photo) return;

    // Create local preview URL
    const localUrl = URL.createObjectURL(file);
    localUrlsRef.current.add(localUrl);

    // Update state to show uploading
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === photoId ? { ...p, uploading: true, progress: 0, url: localUrl } : p
      )
    );

    // Don't save blob URL to database - wait for public URL after upload
    // This prevents broken thumbnails

    // Upload to Supabase Storage (will queue if offline)
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${jobId}/${photoId}-${Date.now()}.${fileExt}`;

      console.log('Uploading photo:', { fileName, jobId, fileSize: file.size, fileType: file.type });

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('well-report-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', {
          message: uploadError.message,
          statusCode: uploadError.statusCode,
          error: uploadError,
        });
        
        // If offline, Supabase will queue - show message
        if (!navigator.onLine || uploadError.message?.includes('fetch') || uploadError.message?.includes('network')) {
          toast.success(`${photo.label} saved locally - will upload when online`);
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photoId ? { ...p, uploading: false } : p
            )
          );
          onSave?.();
          return;
        }
        
        // Check for specific error types
        if (uploadError.message?.includes('new row violates row-level security') || 
            uploadError.message?.includes('permission denied') ||
            uploadError.statusCode === '403') {
          toast.error('Permission denied. Check storage policies in Supabase.');
          console.error('Storage policy error - run FIX-STORAGE-POLICIES.sql');
        } else if (uploadError.message?.includes('Bucket not found') || 
                   uploadError.statusCode === '404') {
          toast.error('Storage bucket not found. Create "well-report-photos" bucket in Supabase.');
        } else {
          toast.error(`Upload failed: ${uploadError.message || 'Unknown error'}`);
        }
        throw uploadError;
      }

      console.log('Upload successful:', uploadData);

      // Get public URL - use the path from uploadData if available
      const filePath = uploadData?.path || fileName;
      const {
        data: { publicUrl },
      } = supabase.storage.from('well-report-photos').getPublicUrl(filePath);

      console.log('Public URL generated:', publicUrl);
      console.log('File path:', filePath);
      
      // Verify the URL is valid
      if (!publicUrl || !publicUrl.startsWith('http')) {
        throw new Error('Invalid public URL generated');
      }

      // Cleanup local URL
      if (localUrl && localUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localUrl);
        localUrlsRef.current.delete(localUrl);
      }

      // Update photo with public URL in state
      setPhotos((prev) => {
        const updated = prev.map((p) =>
          p.id === photoId ? { ...p, url: publicUrl, uploading: false } : p
        );
        
        // Save to database with public URL (not blob URL) - use updated array
        const photosData = updated
          .filter((p) => p.url && !p.url.startsWith('blob:') && !p.url.startsWith('data:')) // Only save real URLs
          .map((p) => ({ label: p.label, url: p.url! }));

        // Save asynchronously without blocking UI
        supabase
          .from('well_reports')
          .upsert(
            {
              job_id: jobId,
              photos: photosData,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'job_id' }
          )
          .then(({ error: saveError }) => {
            if (saveError) {
              console.error('Error saving photos to report:', saveError);
              toast.error('Photo uploaded but failed to save reference');
            } else {
              console.log('✅ Photos saved to report with public URLs:', photosData);
            }
          })
          .catch((error) => {
            console.error('Error saving photos:', error);
          });

        return updated;
      });

      toast.success(`${photo.label} uploaded!`);
      onSave?.();
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      // Show detailed error message
      if (navigator.onLine) {
        const errorMessage = error.message || 'Failed to upload photo';
        console.error('Upload error details:', {
          message: errorMessage,
          status: error.statusCode,
          error: error,
        });
        toast.error(`Failed to upload: ${errorMessage}`);
      }
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photoId ? { ...p, uploading: false } : p
        )
      );
    }
  };

  const savePhotosToReport = async () => {
    try {
      const photosData = photos
        .filter((p) => p.url)
        .map((p) => ({ label: p.label, url: p.url }));

      const { error } = await supabase
        .from('well_reports')
        .upsert(
          {
            job_id: jobId,
            photos: photosData,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'job_id' }
        );

      if (error) throw error;
    } catch (error: any) {
      console.error('Error saving photos:', error);
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    const photo = photos.find((p) => p.id === photoId);
    if (!photo || !photo.url) return;

    if (!confirm(`Delete photo "${photo.label}"?`)) return;

    try {
      // Extract file path from URL to delete from storage
      if (photo.url && photo.url.includes('/storage/v1/object/public/well-report-photos/')) {
        const urlParts = photo.url.split('/well-report-photos/');
        if (urlParts.length > 1) {
          const filePath = urlParts[1];
          const { error: deleteError } = await supabase.storage
            .from('well-report-photos')
            .remove([filePath]);

          if (deleteError && navigator.onLine) {
            console.warn('Failed to delete from storage:', deleteError);
            // Continue anyway - will be cleaned up later
          }
        }
      }

      // Remove photo from state
      setPhotos((prev) =>
        prev.map((p) => (p.id === photoId ? { ...p, url: undefined } : p))
      );

      // Save updated photos list
      await savePhotosToReport();
      toast.success('Photo deleted');
      onSave?.();
    } catch (error: any) {
      console.error('Error deleting photo:', error);
      toast.error('Failed to delete photo');
    }
  };

  const handleLabelChange = (photoId: string, newLabel: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, label: newLabel, editingLabel: false } : p))
    );
  };

  const startEditingLabel = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, editingLabel: true } : p))
    );
  };

  const cancelEditingLabel = (photoId: string) => {
    setPhotos((prev) =>
      prev.map((p) => (p.id === photoId ? { ...p, editingLabel: false } : p))
    );
  };

  const triggerFileInput = (photoId: string) => {
    fileInputRefs.current[photoId]?.click();
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      <div className="grid grid-cols-2 gap-4">
        {photos.map((photo) => (
          <div
            key={photo.id}
            className="bg-[#24253B] rounded-lg shadow-md p-4 border-2 border-[#2D2E47]"
          >
            {/* Label with edit functionality */}
            {photo.editingLabel ? (
              <div className="mb-2 flex gap-2">
                <input
                  type="text"
                  value={photo.label}
                  onChange={(e) => {
                    setPhotos((prev) =>
                      prev.map((p) => (p.id === photo.id ? { ...p, label: e.target.value } : p))
                    );
                  }}
                  onBlur={() => {
                    handleLabelChange(photo.id, photo.label);
                    savePhotosToReport();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleLabelChange(photo.id, photo.label);
                      savePhotosToReport();
                    } else if (e.key === 'Escape') {
                      cancelEditingLabel(photo.id);
                    }
                  }}
                  autoFocus
                  className="flex-1 px-2 py-1 text-sm bg-[#1A1B2C] border-2 border-[#FF6B35] rounded text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    handleLabelChange(photo.id, photo.label);
                    savePhotosToReport();
                  }}
                  className="bg-[#4CAF50] text-white px-2 py-1 rounded text-xs"
                >
                  ✓
                </button>
                <button
                  type="button"
                  onClick={() => cancelEditingLabel(photo.id)}
                  className="bg-[#666] text-white px-2 py-1 rounded text-xs"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-semibold text-gray-300">
                  {photo.label}
                </label>
                {photo.url && (
                  <button
                    type="button"
                    onClick={() => startEditingLabel(photo.id)}
                    className="text-xs text-[#FF6B35] hover:text-[#e55a2b]"
                  >
                    ✏️ Edit
                  </button>
                )}
              </div>
            )}

            {photo.url ? (
              <div className="space-y-2">
                <img
                  src={photo.url}
                  alt={photo.label}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const input = fileInputRefs.current[photo.id];
                      if (input) {
                        input.setAttribute('capture', 'environment');
                        input.click();
                      }
                    }}
                    className="flex-1 bg-[#FF6B35] hover:bg-[#e55a2b] text-white font-semibold py-2 px-2 rounded-lg text-xs transition-colors"
                  >
                    📷 Replace
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(photo.id)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-2 rounded-lg text-xs transition-colors"
                  >
                    🗑️ Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const input = fileInputRefs.current[photo.id];
                    if (input) {
                      input.setAttribute('capture', 'environment');
                      input.click();
                    }
                  }}
                  disabled={photo.uploading}
                  className="w-full bg-[#1A1B2C] hover:bg-[#24253B] border-2 border-dashed border-[#2D2E47] rounded-lg py-6 text-center transition-colors disabled:opacity-50"
                >
                  {photo.uploading ? (
                    <div className="space-y-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4CAF50] mx-auto"></div>
                      <p className="text-sm text-gray-600">Uploading...</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <svg
                        className="w-12 h-12 text-gray-500 mx-auto"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                      </svg>
                      <p className="text-sm text-gray-600 font-semibold">📷 Take Photo</p>
                    </div>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const input = fileInputRefs.current[photo.id];
                    if (input) {
                      input.removeAttribute('capture');
                      input.click();
                    }
                  }}
                  disabled={photo.uploading}
                  className="w-full bg-[#2D2E47] hover:bg-[#3A3B5A] text-gray-300 font-semibold py-2 px-4 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  🖼️ Choose from Gallery
                </button>
              </div>
            )}

            <input
              ref={(el) => (fileInputRefs.current[photo.id] = el)}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => handlePhotoSelect(photo.id, e)}
              className="hidden"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
