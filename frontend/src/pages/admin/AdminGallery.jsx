import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { AlertTriangle, ImagePlus, Trash2, Upload, X } from 'lucide-react';
import { toast } from 'react-toastify';
import { GoldButton } from '../../components/admin/SystemUI';
import API_BASE_URL from '../../utils/apiConfig';

const isRequestCanceled = (error) => error.code === 'ERR_CANCELED' || axios.isCancel(error);
const uploadHelperText = 'Max size: 5MB. Formats: JPG, PNG, WEBP, GIF.';

const homeImageCards = [
  {
    key: 'salonInterior',
    title: 'Salon Experience Image',
    description: 'This image appears above the Visionary section in the Home page experience area.',
    imageField: 'salonInteriorImage',
    fallback: '/salonInterior.jpg',
  },
  {
    key: 'owner',
    title: 'Visionary Image',
    description: 'This image appears in the Meet The Visionary section on the Home page.',
    imageField: 'ownerImage',
    fallback: '/Owner.jpg',
  },
];

function AdminGallery() {
  const [galleryImages, setGalleryImages] = useState([]);
  const [homeSettings, setHomeSettings] = useState({
    salonInteriorImage: '/salonInterior.jpg',
    ownerImage: '/Owner.jpg',
  });
  const [title, setTitle] = useState('');
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isHomeSettingsLoading, setIsHomeSettingsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [homeImageUploadingKey, setHomeImageUploadingKey] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const fileInputRef = useRef(null);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  };

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    const fetchGalleryImages = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/gallery`, { signal });
        setGalleryImages(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        if (isRequestCanceled(error)) return;

        console.error('Failed to load gallery images:', error);
        setGalleryImages([]);
      } finally {
        if (!signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    const fetchHomeSettings = async () => {
      setIsHomeSettingsLoading(true);
      try {
        const response = await axios.get(`${API_BASE_URL}/api/settings`, { signal });
        setHomeSettings((currentSettings) => ({
          ...currentSettings,
          ...response.data,
        }));
      } catch (error) {
        if (isRequestCanceled(error)) return;

        console.error('Failed to load Home page images:', error);
      } finally {
        if (!signal.aborted) {
          setIsHomeSettingsLoading(false);
        }
      }
    };

    fetchGalleryImages();
    fetchHomeSettings();

    return () => {
      controller.abort();
    };
  }, []);

  useEffect(() => () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
  }, [previewUrl]);

  const handleImageSelect = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }

    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedImage(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const clearSelectedImage = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setSelectedImage(null);
    setPreviewUrl('');

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const openGalleryFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleDropzoneKeyDown = (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openGalleryFilePicker();
    }
  };

  const handleUpload = async (event) => {
    event.preventDefault();

    if (!selectedImage) {
      toast.error('Please choose an image to upload.');
      return;
    }

    setIsUploading(true);
    try {
      const payload = new FormData();
      payload.append('image', selectedImage);
      payload.append('title', title);
      payload.append('altText', title || 'Salon portfolio image');

      const response = await axios.post(`${API_BASE_URL}/api/gallery`, payload, getAuthConfig());
      setGalleryImages((currentImages) => [response.data, ...currentImages]);
      setTitle('');
      clearSelectedImage();
      toast.success('Gallery image uploaded successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to upload gallery image');
    } finally {
      setIsUploading(false);
    }
  };

  const requestDelete = (image) => {
    if (isDeleting) return;
    setDeleteTarget(image);
  };

  const closeDeleteDialog = () => {
    if (isDeleting) return;
    setDeleteTarget(null);
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;

    const imageId = deleteTarget._id;
    setIsDeleting(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/gallery/${imageId}`, getAuthConfig());
      setGalleryImages((currentImages) => currentImages.filter((image) => image._id !== imageId));
      toast.success('Gallery image deleted.');
      setDeleteTarget(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete gallery image');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleHomeImageUpload = async (imageKey, file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file.');
      return;
    }

    setHomeImageUploadingKey(imageKey);
    try {
      const payload = new FormData();
      payload.append('image', file);

      const response = await axios.post(`${API_BASE_URL}/api/settings/images/${imageKey}`, payload, getAuthConfig());
      setHomeSettings((currentSettings) => ({
        ...currentSettings,
        ...response.data,
      }));
      toast.success('Home page image updated successfully.');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update Home page image');
    } finally {
      setHomeImageUploadingKey('');
    }
  };

  return (
    <div className="mx-auto w-full max-w-7xl">
      <header className="mb-6 sm:mb-8">
        <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">Manage Gallery</h1>
        <p className="mt-3 text-sm leading-6 text-gray-400 sm:text-base">
          Upload and maintain the portfolio images shown in the Our Latest Work section.
        </p>
      </header>

      <section className="mb-8 rounded-lg border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:p-6">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">Home Page Images</p>
          <h2 className="mt-2 font-serif text-2xl text-white">Salon & Visionary Photos</h2>
          <p className="mt-2 text-sm leading-6 text-gray-400">
            Update the fixed Home page images without touching code.
          </p>
        </div>

        {isHomeSettingsLoading ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm text-gray-400">
            Loading Home page images...
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {homeImageCards.map((card) => (
              <article key={card.key} className="overflow-hidden rounded-lg border border-white/10 bg-black/30">
                <img
                  src={homeSettings[card.imageField] || card.fallback}
                  alt={card.title}
                  className="h-64 w-full object-cover"
                />
                <div className="flex flex-col gap-4 border-t border-white/10 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <h3 className="font-serif text-xl text-white">{card.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-gray-400">{card.description}</p>
                    <p className="mt-2 text-xs text-gray-500">{uploadHelperText}</p>
                  </div>

                  <input
                    id={`home-image-upload-${card.key}`}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={Boolean(homeImageUploadingKey)}
                    className="hidden"
                    aria-label={`Upload ${card.title.toLowerCase()}`}
                    onChange={(event) => {
                      handleHomeImageUpload(card.key, event.target.files?.[0]);
                      event.target.value = '';
                    }}
                  />
                  <label
                    htmlFor={`home-image-upload-${card.key}`}
                    className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-[#d4af37]/35 px-4 py-2 text-sm font-semibold text-[#d4af37] transition hover:bg-[#d4af37]/10"
                    aria-disabled={Boolean(homeImageUploadingKey)}
                  >
                    <Upload className="h-4 w-4" />
                    {homeImageUploadingKey === card.key ? 'Uploading...' : 'Upload'}
                  </label>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-lg border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:p-6">
        <form onSubmit={handleUpload} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)]">
          <div className="space-y-4">
            <div>
              <label htmlFor="gallery-image-title" className="mb-2 block text-sm font-semibold text-gray-200">
                Image title
              </label>
              <input
                id="gallery-image-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Optional title"
                className="w-full rounded-lg border border-gray-700 bg-black/50 p-3 text-white outline-none transition-all placeholder:text-gray-500 focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37]"
              />
            </div>

            <input
              id="gallery-image-upload"
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="hidden"
              aria-label="Choose gallery image"
              onChange={(event) => handleImageSelect(event.target.files?.[0])}
            />

            <div
              tabIndex={0}
              onClick={openGalleryFilePicker}
              onKeyDown={handleDropzoneKeyDown}
              onDrop={(event) => {
                event.preventDefault();
                handleImageSelect(event.dataTransfer.files?.[0]);
              }}
              onDragOver={(event) => event.preventDefault()}
              className="flex min-h-60 w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#d4af37]/35 bg-black/30 p-5 text-center transition hover:border-[#d4af37]/70 hover:bg-[#d4af37]/5 focus:border-[#d4af37] focus:outline-none focus:ring-1 focus:ring-[#d4af37]"
            >
              {previewUrl ? (
                <span className="flex w-full flex-col items-center gap-3">
                  <img
                    src={previewUrl}
                    alt="Selected gallery preview"
                    className="h-48 w-full max-w-xl rounded-lg border border-[#d4af37]/30 object-cover"
                  />
                  <span className="text-sm font-semibold text-white">{selectedImage?.name}</span>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation();
                      clearSelectedImage();
                    }}
                    onKeyDown={(event) => {
                      event.stopPropagation();
                    }}
                    className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                  >
                    Remove image
                  </button>
                </span>
              ) : (
                <span className="flex flex-col items-center">
                  <ImagePlus className="h-10 w-10 text-[#d4af37]" />
                  <span className="mt-4 block font-semibold text-white">Drag and drop a portfolio image here</span>
                  <span className="mt-1 block text-xs text-gray-400">or click to choose a file from your device</span>
                  <span className="mt-3 block text-xs text-gray-500">{uploadHelperText}</span>
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-lg border border-white/10 bg-black/30 p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">Upload</p>
              <h2 className="mt-3 font-serif text-2xl text-white">Add Latest Work</h2>
              <p className="mt-3 text-sm leading-6 text-gray-400">
                Images uploaded here are stored in Cloudinary and appear on the public Home page gallery.
              </p>
            </div>

            <GoldButton
              type="submit"
              disabled={isUploading}
              className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg px-5 py-3 font-bold disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Upload className="h-4 w-4" />
              {isUploading ? 'Uploading...' : 'Upload Image'}
            </GoldButton>
          </div>
        </form>
      </section>

      <section className="mt-8 rounded-lg border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:p-6">
        <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#d4af37]">Portfolio</p>
            <h2 className="mt-2 font-serif text-2xl text-white">Uploaded Images</h2>
          </div>
          <p className="text-sm text-gray-500">{galleryImages.length} image{galleryImages.length === 1 ? '' : 's'}</p>
        </div>

        {isLoading ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-10 text-center text-sm text-gray-400">
            Loading gallery images...
          </div>
        ) : galleryImages.length === 0 ? (
          <div className="rounded-lg border border-dashed border-white/10 bg-black/20 p-10 text-center text-sm text-gray-400">
            No gallery images uploaded yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {galleryImages.map((image) => (
              <article key={image._id} className="group overflow-hidden rounded-lg border border-white/10 bg-black/30">
                <img
                  src={image.imageUrl}
                  alt={image.altText || image.title || 'Salon portfolio image'}
                  className="h-52 w-full object-cover transition duration-500 group-hover:scale-105"
                />
                <div className="flex items-center justify-between gap-3 border-t border-white/10 p-4">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-white">{image.title || 'Untitled work'}</p>
                    <p className="mt-1 text-xs text-gray-500">Visible on Home page</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => requestDelete(image)}
                    disabled={isDeleting}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/25 bg-red-500/10 text-red-300 transition hover:bg-red-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                    aria-label={`Delete ${image.title || 'gallery image'}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              closeDeleteDialog();
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-gallery-image-title"
            aria-describedby="delete-gallery-image-description"
            className="w-full max-w-md rounded-lg border border-red-500/25 bg-[#111111] p-5 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-red-500/30 bg-red-500/10 text-red-300">
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <div>
                  <h3 id="delete-gallery-image-title" className="font-serif text-xl text-white">
                    Delete gallery image?
                  </h3>
                  <p id="delete-gallery-image-description" className="mt-2 text-sm leading-6 text-gray-400">
                    This will remove {deleteTarget.title ? `"${deleteTarget.title}"` : 'this image'} from the gallery and the public Home page.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/10 text-gray-400 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Close delete confirmation"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 overflow-hidden rounded-lg border border-white/10 bg-black/30">
              <img
                src={deleteTarget.imageUrl}
                alt={deleteTarget.altText || deleteTarget.title || 'Gallery image selected for deletion'}
                className="h-40 w-full object-cover"
              />
            </div>

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteDialog}
                disabled={isDeleting}
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-white/10 px-4 py-2 text-sm font-semibold text-gray-300 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeleting}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-red-500/30 bg-red-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 className="h-4 w-4" />
                {isDeleting ? 'Deleting...' : 'Delete Image'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminGallery;
