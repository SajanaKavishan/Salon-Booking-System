import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import axios from 'axios';
import { toast } from 'react-toastify';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { GlassCard, GoldButton } from './SystemUI';
import API_BASE_URL from '../../utils/apiConfig';

const mutedGoldButtonClassName = 'disabled:cursor-not-allowed disabled:border-[#756a1d] disabled:bg-[#756a1d] disabled:text-black/70 disabled:shadow-none disabled:brightness-75 disabled:hover:bg-[#756a1d] disabled:hover:text-black/70';

function SalonNumberField({
  id,
  label,
  value,
  onValueChange,
  placeholder,
  labelClassName,
  fieldClassName,
  step = 1,
  min = 0,
}) {
  const commitValue = (nextValue) => {
    const numericValue = Number(nextValue);
    if (nextValue === '') {
      onValueChange('');
      return;
    }

    if (!Number.isNaN(numericValue)) {
      onValueChange(String(Math.max(min, numericValue)));
    }
  };

  const adjustValue = (direction) => {
    const currentValue = Number(value) || 0;
    const nextValue = Math.max(min, currentValue + direction * step);
    onValueChange(String(nextValue));
  };

  return (
    <div>
      <label htmlFor={id} className={labelClassName}>{label}</label>
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="decimal"
          placeholder={placeholder}
          value={value}
          onChange={(event) => {
            const nextValue = event.target.value;
            if (/^\d*\.?\d*$/.test(nextValue)) {
              onValueChange(nextValue);
            }
          }}
          onBlur={() => commitValue(value)}
          required
          className={`${fieldClassName} pr-12`}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 flex-col overflow-hidden rounded-md border border-[#d4af37]/20 bg-[#0b0b0b]/90">
          <button
            type="button"
            onClick={() => adjustValue(1)}
            aria-label={`Increase ${label}`}
            className="flex h-5 w-8 items-center justify-center text-[#d4af37] transition hover:bg-[#d4af37]/15 hover:text-[#f5d76e]"
          >
            <ChevronUp size={13} strokeWidth={2.5} />
          </button>
          <span className="h-px bg-[#d4af37]/15" />
          <button
            type="button"
            onClick={() => adjustValue(-1)}
            aria-label={`Decrease ${label}`}
            className="flex h-5 w-8 items-center justify-center text-[#d4af37] transition hover:bg-[#d4af37]/15 hover:text-[#f5d76e]"
          >
            <ChevronDown size={13} strokeWidth={2.5} />
          </button>
        </div>
      </div>
    </div>
  );
}

function ServiceManager() {
  const fallbackServiceImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23111111'/><rect x='24' y='24' width='352' height='252' rx='20' fill='%230a0a0a' stroke='%23d4af37' stroke-opacity='0.35'/><circle cx='200' cy='126' r='42' fill='%23d4af37' fill-opacity='0.18'/><path d='M200 92c-12 0-22 10-22 22s10 22 22 22 22-10 22-22-10-22-22-22Zm0 56c-26 0-60 13-60 38v10h120v-10c0-25-34-38-60-38Z' fill='%23d4af37'/><text x='200' y='232' text-anchor='middle' fill='%23cfcfcf' font-family='Arial, sans-serif' font-size='18'>Salon Service</text></svg>";
  const fieldClassName = 'w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all';
  const labelClassName = 'mb-2 block text-xs font-bold uppercase tracking-[0.16em] text-zinc-500';
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', duration: '', image: '' });
  const [selectedServiceImage, setSelectedServiceImage] = useState(null);
  const [serviceImagePreview, setServiceImagePreview] = useState('');
  const [isFetchingInitial, setIsFetchingInitial] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [isAddingService, setIsAddingService] = useState(false);
  const [isUpdatingService, setIsUpdatingService] = useState(false);
  const [isDeletingService, setIsDeletingService] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editData, setEditData] = useState({ name: '', price: '', duration: '', image: '' });
  const [originalEditData, setOriginalEditData] = useState({ name: '', price: '', duration: '', image: '' });
  const [selectedEditImage, setSelectedEditImage] = useState(null);
  const [editImagePreview, setEditImagePreview] = useState('');
  const [editingId, setEditingId] = useState(null);
  const serviceFileInputRef = useRef(null);
  const editFileInputRef = useRef(null);
  const canAddService = Boolean(
    formData.name.trim() &&
    Number(formData.price) > 0 &&
    Number(formData.duration) > 0
  );
  const hasEditChanges = JSON.stringify(editData) !== JSON.stringify(originalEditData) || Boolean(selectedEditImage);

  const getAuthConfig = () => {
    const token = localStorage.getItem('token');
    return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
  };

  useEffect(() => {
    let isActive = true;
    setIsFetchingInitial(true);
    setFetchError('');

    axios
      .get(`${API_BASE_URL}/api/services`)
      .then((response) => {
        if (isActive) setServices(response.data);
      })
      .catch((error) => {
        const message = error.response?.data?.message || 'Failed to load services';
        if (isActive) setFetchError(message);
        toast.error(message);
      })
      .finally(() => {
        if (isActive) setIsFetchingInitial(false);
      });

    return () => { isActive = false; };
  }, []);

  useEffect(() => () => {
    if (serviceImagePreview) {
      URL.revokeObjectURL(serviceImagePreview);
    }
  }, [serviceImagePreview]);

  useEffect(() => () => {
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview);
    }
  }, [editImagePreview]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const selectImageFile = (file, setSelectedImage, setImagePreview, currentPreview) => {
    if (!file) {
      setSelectedImage(null);
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    if (currentPreview) {
      URL.revokeObjectURL(currentPreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const clearSelectedServiceImage = () => {
    if (serviceImagePreview) {
      URL.revokeObjectURL(serviceImagePreview);
    }

    setSelectedServiceImage(null);
    setServiceImagePreview('');

    if (serviceFileInputRef.current) {
      serviceFileInputRef.current.value = '';
    }
  };

  const clearSelectedEditImage = () => {
    if (editImagePreview) {
      URL.revokeObjectURL(editImagePreview);
    }

    setSelectedEditImage(null);
    setEditImagePreview('');

    if (editFileInputRef.current) {
      editFileInputRef.current.value = '';
    }
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    if (isAddingService || !canAddService) return;

    setIsAddingService(true);
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('price', Number(formData.price));
      payload.append('duration', Number(formData.duration));

      if (selectedServiceImage) {
        payload.append('image', selectedServiceImage);
      }

      const response = await axios.post(`${API_BASE_URL}/api/services`, payload, getAuthConfig());
      setServices((currentServices) => [...currentServices, response.data]);
      setFormData({ name: '', price: '', duration: '', image: '' });
      clearSelectedServiceImage();
      toast.success('Service added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add service');
    } finally {
      setIsAddingService(false);
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete || isDeletingService) return;

    setIsDeletingService(true);
    try {
      await axios.delete(`${API_BASE_URL}/api/services/${itemToDelete}`, getAuthConfig());
      setServices((currentServices) => currentServices.filter((service) => service._id !== itemToDelete));
      toast.success('Service deleted!');
      setActiveMenuId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete service');
    } finally {
      setIsDeletingService(false);
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const openEditModal = (service) => {
    const nextEditData = {
      name: service.name,
      price: service.price,
      duration: service.duration,
      image: service.image || ''
    };
    setEditData(nextEditData);
    setOriginalEditData(nextEditData);
    clearSelectedEditImage();
    setEditingId(service._id);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    if (isUpdatingService || !hasEditChanges) return;

    setIsUpdatingService(true);
    try {
      const payload = new FormData();
      payload.append('name', editData.name);
      payload.append('price', Number(editData.price));
      payload.append('duration', Number(editData.duration));

      if (selectedEditImage) {
        payload.append('image', selectedEditImage);
      } else {
        payload.append('image', editData.image || '');
      }

      const response = await axios.put(`${API_BASE_URL}/api/services/${editingId}`, payload, getAuthConfig());
      setServices((currentServices) => currentServices.map((service) => (service._id === editingId ? response.data : service)));
      setIsEditModalOpen(false);
      setOriginalEditData(editData);
      clearSelectedEditImage();
      toast.success('Service updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update service');
    } finally {
      setIsUpdatingService(false);
    }
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:p-6">
        <form onSubmit={handleAddService} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="service-name" className={labelClassName}>Service Name</label>
            <input id="service-name" type="text" name="name" placeholder="Service Name" value={formData.name} onChange={handleInputChange} required className={fieldClassName} />
          </div>
          <SalonNumberField
            id="service-price"
            label="Price"
            value={formData.price}
            onValueChange={(value) => setFormData((current) => ({ ...current, price: value }))}
            placeholder="Price (Rs.)"
            labelClassName={labelClassName}
            fieldClassName={fieldClassName}
          />
          <SalonNumberField
            id="service-duration"
            label="Duration"
            value={formData.duration}
            onValueChange={(value) => setFormData((current) => ({ ...current, duration: value }))}
            placeholder="Duration (Mins)"
            labelClassName={labelClassName}
            fieldClassName={fieldClassName}
          />
          <button
            type="button"
            onClick={() => serviceFileInputRef.current?.click()}
            onDrop={(e) => {
              e.preventDefault();
              selectImageFile(e.dataTransfer.files?.[0] || null, setSelectedServiceImage, setServiceImagePreview, serviceImagePreview);
            }}
            onDragOver={(e) => e.preventDefault()}
            className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#d4af37]/35 bg-black/30 p-4 text-center transition hover:border-[#d4af37]/70 hover:bg-[#d4af37]/5 md:col-span-3"
          >
            <input
              ref={serviceFileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => selectImageFile(e.target.files?.[0] || null, setSelectedServiceImage, setServiceImagePreview, serviceImagePreview)}
            />
            {serviceImagePreview ? (
              <span className="flex w-full flex-col items-center gap-3">
                <img src={serviceImagePreview} alt="Service preview" className="h-32 w-full max-w-sm rounded-lg border border-[#d4af37]/30 object-cover" />
                <span className="text-sm font-semibold text-white">{selectedServiceImage?.name}</span>
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    clearSelectedServiceImage();
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      e.stopPropagation();
                      clearSelectedServiceImage();
                    }
                  }}
                  className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                >
                  Remove image
                </span>
              </span>
            ) : (
              <span>
                <span className="block font-semibold text-white">Drag and drop a service image here</span>
                <span className="mt-1 block text-xs text-gray-400">or click to choose a file from your device</span>
              </span>
            )}
          </button>
          <div className="md:col-span-3">
            <GoldButton
              type="submit"
              disabled={!canAddService || isAddingService}
              className={`w-full rounded-lg px-5 py-3 font-bold shadow-[0_0_20px_rgba(212,175,55,0.28)] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)] sm:w-fit ${mutedGoldButtonClassName}`}
            >
              {isAddingService ? 'Adding...' : '+ Add Service'}
            </GoldButton>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-4 shadow-xl backdrop-blur-md sm:p-6">
        <div className="space-y-3 md:hidden">
          {isFetchingInitial ? (
            Array.from({ length: 3 }).map((_, index) => (
              <article key={`service-mobile-skeleton-${index}`} className="animate-pulse rounded-xl border border-white/10 bg-black/20 p-4">
                <div className="flex items-start gap-4">
                  <div className="h-16 w-16 shrink-0 rounded-lg bg-white/10" />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div className="h-4 w-2/3 rounded bg-white/10" />
                    <div className="h-3 w-1/2 rounded bg-white/5" />
                    <div className="grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-black/20 p-3">
                      <div className="h-8 rounded bg-white/5" />
                      <div className="h-8 rounded bg-white/5" />
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : fetchError ? (
            <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-8 text-center">
              <p className="text-sm font-semibold text-red-200">Could not load services</p>
              <p className="mt-2 text-sm text-red-100/70">{fetchError}</p>
            </div>
          ) : services.length > 0 ? (
            services.map((service) => (
            <article key={service._id} className="rounded-xl border border-white/10 bg-black/20 p-4">
              <div className="flex items-start gap-4">
                {service.image ? (
                  <img
                    src={service.image}
                    alt={service.name}
                    className="h-16 w-16 shrink-0 rounded-lg border border-white/20 object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallbackServiceImage;
                    }}
                  />
                ) : (
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-white/10 bg-gray-800 text-[10px] text-gray-500">
                    No Img
                  </div>
                )}

                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-gray-100">{service.name}</p>
                      <p className="mt-1 text-xs text-gray-500">Visible during customer booking</p>
                    </div>
                    {activeMenuId === service._id ? (
                      <GoldButton type="button" variant="ghost" onClick={() => setActiveMenuId(null)} aria-label="Close dialog" className="shrink-0 bg-gray-800 px-2 py-1 text-sm text-gray-400 hover:bg-gray-700 hover:text-white">
                        x
                      </GoldButton>
                    ) : (
                      <GoldButton type="button" variant="outline" onClick={() => setActiveMenuId(service._id)} className="shrink-0 px-3 py-1.5 text-sm">
                        Manage
                      </GoldButton>
                    )}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg border border-white/5 bg-black/20 p-3 text-sm">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Price</p>
                      <p className="mt-1 font-semibold text-[#d4af37]">Rs. {service.price}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Duration</p>
                      <p className="mt-1 font-semibold text-gray-200">{service.duration} mins</p>
                    </div>
                  </div>

                  {activeMenuId === service._id && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                      <GoldButton type="button" variant="ghost" onClick={() => openEditModal(service)} className="border border-blue-800/50 bg-blue-900/30 px-3 py-2 text-sm text-blue-300 hover:bg-blue-600 hover:text-white">
                        Edit
                      </GoldButton>
                      <button
                        type="button"
                        onClick={() => {
                          setItemToDelete(service._id);
                          setIsDeleteModalOpen(true);
                        }}
                        className="inline-flex items-center justify-center rounded-md border border-red-800/50 bg-red-900/30 px-3 py-2 text-sm font-semibold text-red-300 transition duration-300 hover:bg-red-600 hover:text-white"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed border-white/10 bg-black/20 p-8 text-center text-sm font-light text-gray-500">
              No services found.
            </div>
          )}
        </div>

        <div className="salon-scrollbar hidden overflow-x-auto rounded-xl border border-white/10 bg-black/20 md:block">
          <table className="salon-table">
            <thead>
              <tr className="bg-black/30 text-[#d4af37]">
                <th className="salon-table-th border-b border-white/10">Image</th>
                <th className="salon-table-th border-b border-white/10">Service Name</th>
                <th className="salon-table-th border-b border-white/10">Price</th>
                <th className="salon-table-th border-b border-white/10">Duration</th>
                <th className="salon-table-th border-b border-white/10 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {isFetchingInitial ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <tr key={`service-table-skeleton-${index}`} className="animate-pulse border-b border-white/10 last:border-b-0">
                    <td className="salon-table-td">
                      <div className="h-12 w-12 rounded-md bg-white/10" />
                    </td>
                    <td className="salon-table-td">
                      <div className="h-4 w-44 rounded bg-white/10" />
                      <div className="mt-2 h-3 w-32 rounded bg-white/5" />
                    </td>
                    <td className="salon-table-td">
                      <div className="h-4 w-20 rounded bg-white/10" />
                    </td>
                    <td className="salon-table-td">
                      <div className="h-4 w-20 rounded bg-white/10" />
                    </td>
                    <td className="salon-table-td">
                      <div className="mx-auto h-8 w-24 rounded bg-white/10" />
                    </td>
                  </tr>
                ))
              ) : fetchError ? (
                <tr>
                  <td colSpan="5" className="bg-red-950/20 p-10 text-center">
                    <p className="text-sm font-semibold text-red-200">Could not load services</p>
                    <p className="mt-2 text-sm text-red-100/70">{fetchError}</p>
                  </td>
                </tr>
              ) : services.length > 0 ? (
                services.map((service) => (
                <tr key={service._id} className="group border-b border-white/10 transition-colors last:border-b-0 hover:bg-white/5">
                  <td className="salon-table-td">
                    {service.image ? (
                      <img
                        src={service.image}
                        alt={service.name}
                        className="h-12 w-12 rounded-md border border-white/20 object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = fallbackServiceImage;
                        }}
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-md border border-white/10 bg-gray-800 text-xs text-gray-500">
                        No Img
                      </div>
                    )}
                  </td>
                  <td className="salon-table-td">
                    <div className="font-medium text-gray-200">{service.name}</div>
                    <div className="mt-1 text-xs text-gray-500">Visible during customer booking</div>
                  </td>
                  <td className="salon-table-td text-gray-300">Rs. {service.price}</td>
                  <td className="salon-table-td text-gray-300">{service.duration} mins</td>
                  <td className="salon-table-td text-center">
                    {activeMenuId === service._id ? (
                      <div className="flex items-center justify-center gap-2">
                        <GoldButton type="button" variant="ghost" onClick={() => openEditModal(service)} className="border border-blue-800/50 bg-blue-900/30 px-3 py-1 text-sm text-blue-300 hover:bg-blue-600 hover:text-white">
                          Edit
                        </GoldButton>
                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(service._id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-red-800/50 bg-red-900/30 px-3 py-1 text-sm font-semibold text-red-300 transition duration-300 hover:bg-red-600 hover:text-white"
                        >
                          Delete
                        </button>
                        <GoldButton type="button" variant="ghost" onClick={() => setActiveMenuId(null)} aria-label="Close dialog" className="bg-gray-800 px-2 py-1 text-sm text-gray-400 hover:bg-gray-700 hover:text-white">
                          x
                        </GoldButton>
                      </div>
                    ) : (
                      <GoldButton type="button" variant="outline" onClick={() => setActiveMenuId(service._id)} className="px-4 py-1.5">
                        Manage
                      </GoldButton>
                    )}
                  </td>
                </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="bg-[#0a0a0a]/30 p-10 text-center font-light text-gray-500">
                    No services found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {typeof document !== 'undefined' && createPortal((
        <>
          {isEditModalOpen && (
        <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center overflow-y-auto bg-black/90 px-4 py-6 backdrop-blur-xl">
          <GlassCard className="relative w-full max-w-md border-t-4 border-t-[#d4af37] bg-[#111111] p-5 sm:p-8">
            <button type="button" onClick={() => setIsEditModalOpen(false)} aria-label="Close dialog" className="absolute right-4 top-4 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-sm text-gray-400 hover:text-white">
              x
            </button>
            <h3 className="salon-heading mb-6 border-b border-white/10 pb-4 pr-10 text-2xl sm:text-3xl">Edit Service</h3>
            <form onSubmit={handleUpdateService} className="flex flex-col gap-4">
              <div>
                <label htmlFor="edit-service-name" className={labelClassName}>Service Name</label>
                <input id="edit-service-name" type="text" name="name" placeholder="Service Name" value={editData.name} onChange={handleEditInputChange} required className={fieldClassName} />
              </div>
              <SalonNumberField
                id="edit-service-price"
                label="Price"
                value={editData.price}
                onValueChange={(value) => setEditData((current) => ({ ...current, price: value }))}
                placeholder="Price (Rs.)"
                labelClassName={labelClassName}
                fieldClassName={fieldClassName}
              />
              <SalonNumberField
                id="edit-service-duration"
                label="Duration"
                value={editData.duration}
                onValueChange={(value) => setEditData((current) => ({ ...current, duration: value }))}
                placeholder="Duration (Mins)"
                labelClassName={labelClassName}
                fieldClassName={fieldClassName}
              />
              <button
                type="button"
                onClick={() => editFileInputRef.current?.click()}
                onDrop={(e) => {
                  e.preventDefault();
                  selectImageFile(e.dataTransfer.files?.[0] || null, setSelectedEditImage, setEditImagePreview, editImagePreview);
                }}
                onDragOver={(e) => e.preventDefault()}
                className="flex min-h-36 flex-col items-center justify-center rounded-xl border border-dashed border-[#d4af37]/35 bg-black/30 p-4 text-center transition hover:border-[#d4af37]/70 hover:bg-[#d4af37]/5"
              >
                <input
                  ref={editFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => selectImageFile(e.target.files?.[0] || null, setSelectedEditImage, setEditImagePreview, editImagePreview)}
                />
                {editImagePreview || editData.image ? (
                  <span className="flex w-full flex-col items-center gap-3">
                    <img
                      src={editImagePreview || editData.image}
                      alt="Service preview"
                      className="h-32 w-full rounded-md border border-white/20 object-cover"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackServiceImage;
                      }}
                    />
                    <span className="text-sm font-semibold text-white">
                      {selectedEditImage?.name || 'Current service image'}
                    </span>
                    {selectedEditImage && (
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => {
                          e.stopPropagation();
                          clearSelectedEditImage();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            e.stopPropagation();
                            clearSelectedEditImage();
                          }
                        }}
                        className="rounded-md border border-white/10 px-3 py-1 text-xs font-semibold text-gray-300 hover:bg-white/10 hover:text-white"
                      >
                        Remove new image
                      </span>
                    )}
                  </span>
                ) : (
                  <span>
                    <span className="block font-semibold text-white">Drag and drop a new service image here</span>
                    <span className="mt-1 block text-xs text-gray-400">or click to choose a file from your device</span>
                  </span>
                )}
              </button>

              <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <GoldButton type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} disabled={isUpdatingService} className="bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 hover:text-white disabled:cursor-not-allowed disabled:opacity-60">
                  Cancel
                </GoldButton>
                <GoldButton type="submit" disabled={!hasEditChanges || isUpdatingService} className={`px-4 py-2 ${mutedGoldButtonClassName}`}>
                  {isUpdatingService ? 'Saving...' : 'Save Changes'}
                </GoldButton>
              </div>
            </form>
          </GlassCard>
        </div>
          )}

          {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[9999] flex min-h-screen items-center justify-center bg-black/90 px-4 backdrop-blur-xl">
          <GlassCard className="w-full max-w-sm border-t-4 border-t-red-600 bg-[#111111] p-5 sm:p-6">
            <h4 className="mb-3 text-xl font-semibold text-white">Delete Service</h4>
            <p className="mb-6 text-gray-400">Are you sure you want to delete this? This action cannot be undone.</p>
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <GoldButton
                type="button"
                variant="ghost"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setItemToDelete(null);
                }}
                className="border border-white/20 bg-transparent px-4 py-2 text-white hover:bg-white/10 hover:text-white"
              >
                Cancel
              </GoldButton>
              <button
                type="button"
                onClick={confirmDelete}
                disabled={isDeletingService}
                className="inline-flex items-center justify-center rounded-md bg-red-600/90 px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isDeletingService ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </GlassCard>
        </div>
          )}
        </>
      ), document.body)}
    </div>
  );
}

export default ServiceManager;
