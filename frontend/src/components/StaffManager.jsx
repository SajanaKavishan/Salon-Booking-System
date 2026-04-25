import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { GlassCard, GoldButton } from './SystemUI';

function StaffManager() {
  const fieldClassName = 'w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all';
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState({ name: '', specialty: '', workingHours: '', offDays: '' });
  const [selectedImage, setSelectedImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const fileInputRef = useRef(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editData, setEditData] = useState({ name: '', specialty: '', workingHours: '', offDays: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let isActive = true;
    axios
      .get('http://localhost:5000/api/staff')
      .then((response) => {
        if (isActive) setStaffList(response.data);
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Failed to load staff list'));
    return () => { isActive = false; };
  }, []);

  useEffect(() => () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
  }, [imagePreview]);

  const specialtyOptions = ['Hair Stylist', 'Colorist', 'Beautician', 'Massage Therapist', 'All-Rounder'];
  const shiftOptions = ['09:00 AM - 05:00 PM', '10:00 AM - 06:00 PM', '08:00 AM - 02:00 PM', '02:00 PM - 08:00 PM'];
  const offDayOptions = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleImageChange = (file) => {
    if (!file) {
      setSelectedImage(null);
      setImagePreview('');
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.');
      return;
    }

    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }

    setSelectedImage(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleFileInputChange = (e) => {
    handleImageChange(e.target.files?.[0] || null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    handleImageChange(e.dataTransfer.files?.[0] || null);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const clearSelectedImage = () => {
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
    }
    setSelectedImage(null);
    setImagePreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEditInputChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('specialty', formData.specialty);
      payload.append('workingHours', formData.workingHours);
      payload.append('offDays', formData.offDays);
      if (selectedImage) {
        payload.append('image', selectedImage);
      }

      const response = await axios.post('http://localhost:5000/api/staff', payload);
      setStaffList((currentStaff) => [...currentStaff, response.data]);
      setFormData({ name: '', specialty: '', workingHours: '', offDays: '' });
      clearSelectedImage();
      toast.success('Staff member added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add staff');
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await axios.delete(`http://localhost:5000/api/staff/${itemToDelete}`);
      setStaffList((currentStaff) => currentStaff.filter((staff) => staff._id !== itemToDelete));
      toast.success('Staff member removed!');
      setActiveMenuId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove staff');
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const openEditModal = (staff) => {
    setEditData({
      name: staff.name,
      specialty: staff.specialty,
      workingHours: staff.workingHours,
      offDays: staff.offDays
    });
    setEditingId(staff._id);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`http://localhost:5000/api/staff/${editingId}`, editData);
      setStaffList((currentStaff) => currentStaff.map((staff) => (staff._id === editingId ? response.data : staff)));
      setIsEditModalOpen(false);
      toast.success('Staff updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update staff');
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md">
        <form onSubmit={handleAddStaff} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleInputChange} required className={fieldClassName} />
          <select name="specialty" value={formData.specialty} onChange={handleInputChange} required className={fieldClassName}>
            <option value="" disabled className="bg-[#111111] text-gray-500">Select Specialty</option>
            {specialtyOptions.map((option) => (
              <option key={option} value={option} className="bg-[#111111]">{option}</option>
            ))}
          </select>
          <select name="workingHours" value={formData.workingHours} onChange={handleInputChange} required className={fieldClassName}>
            <option value="" disabled className="bg-[#111111] text-gray-500">Select Shift</option>
            {shiftOptions.map((option) => (
              <option key={option} value={option} className="bg-[#111111]">{option}</option>
            ))}
          </select>
          <select name="offDays" value={formData.offDays} onChange={handleInputChange} required className={fieldClassName}>
            <option value="" disabled className="bg-[#111111] text-gray-500">Select Off Day</option>
            {offDayOptions.map((option) => (
              <option key={option} value={option} className="bg-[#111111]">{option}</option>
            ))}
          </select>

          <div className="md:col-span-2 lg:col-span-4">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="flex min-h-[180px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-600 bg-black/30 px-6 py-6 text-center text-sm text-gray-300 transition hover:border-[#d4af37] hover:bg-black/40"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileInputChange}
                className="hidden"
              />
              {imagePreview ? (
                <div className="flex flex-col items-center">
                  <img src={imagePreview} alt="Staff preview" className="h-24 w-24 rounded-full border border-[#d4af37]/40 object-cover" />
                  <p className="mt-4 font-medium text-white">Image selected</p>
                  <p className="mt-1 max-w-xs truncate text-xs text-gray-400">{selectedImage?.name}</p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearSelectedImage();
                    }}
                    className="mt-3 text-xs text-[#d4af37] hover:text-yellow-400"
                  >
                    Remove image
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 text-[#d4af37]">
                    <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                      <path d="M12 16V7m0 0-3.5 3.5M12 7l3.5 3.5M4 17.5V18a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  <p className="mt-4 font-medium text-white">Drag and drop a staff image here</p>
                  <p className="mt-1 text-xs text-gray-400">or click to choose a file from your device</p>
                </>
              )}
            </div>
          </div>

          <div className="md:col-span-2 lg:col-span-4">
            <GoldButton type="submit" className="rounded-lg px-5 py-3 font-bold shadow-[0_0_20px_rgba(212,175,55,0.28)] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)]">
              + Add Staff
            </GoldButton>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300">
            {staffList.length} staff members
          </span>
          <span className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-1 text-[#d4af37]">
            Team roster
          </span>
        </div>

        <div className="salon-scrollbar overflow-x-auto rounded-xl border border-white/10 bg-black/20">
          <table className="salon-table">
            <thead>
              <tr className="bg-black/30 text-[#d4af37]">
                <th className="salon-table-th border-b border-white/10">Name</th>
                <th className="salon-table-th border-b border-white/10">Specialty</th>
                <th className="salon-table-th border-b border-white/10">Working Hours</th>
                <th className="salon-table-th border-b border-white/10">Off Days</th>
                <th className="salon-table-th border-b border-white/10 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {staffList.map((staff) => (
                <tr key={staff._id} className="group border-b border-white/10 transition-colors last:border-b-0 hover:bg-white/5">
                  <td className="salon-table-td">
                    <div className="font-medium text-gray-200">{staff.name}</div>
                  </td>
                  <td className="salon-table-td text-gray-300">{staff.specialty}</td>
                  <td className="salon-table-td text-gray-300">{staff.workingHours}</td>
                  <td className="salon-table-td font-medium text-red-400/90">{staff.offDays}</td>
                  <td className="salon-table-td text-center">
                    {activeMenuId === staff._id ? (
                      <div className="flex items-center justify-center gap-2">
                        <GoldButton type="button" variant="ghost" onClick={() => openEditModal(staff)} className="border border-blue-800/50 bg-blue-900/30 px-3 py-1 text-sm text-blue-300 hover:bg-blue-600 hover:text-white">
                          Edit
                        </GoldButton>
                        <button
                          type="button"
                          onClick={() => {
                            setItemToDelete(staff._id);
                            setIsDeleteModalOpen(true);
                          }}
                          className="inline-flex items-center justify-center rounded-md border border-red-800/50 bg-red-900/30 px-3 py-1 text-sm font-semibold text-red-300 transition duration-300 hover:bg-red-600 hover:text-white"
                        >
                          Delete
                        </button>
                        <GoldButton type="button" variant="ghost" onClick={() => setActiveMenuId(null)} className="bg-gray-800 px-2 py-1 text-sm text-gray-400 hover:bg-gray-700 hover:text-white">
                          x
                        </GoldButton>
                      </div>
                    ) : (
                      <GoldButton type="button" variant="outline" onClick={() => setActiveMenuId(staff._id)} className="px-4 py-1.5">
                        Manage
                      </GoldButton>
                    )}
                  </td>
                </tr>
              ))}
              {staffList.length === 0 && (
                <tr>
                  <td colSpan="5" className="bg-[#0a0a0a]/30 p-10 text-center font-light text-gray-500">
                    No staff members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <GlassCard className="relative w-full max-w-md border-t-4 border-t-[#d4af37] bg-[#111111] p-8">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="absolute right-4 top-4 text-xl text-gray-400 hover:text-white">
              x
            </button>
            <h3 className="salon-heading mb-6 border-b border-white/10 pb-4">Edit Staff Member</h3>
            <form onSubmit={handleUpdateStaff} className="flex flex-col gap-4">
              <input type="text" name="name" placeholder="Name" value={editData.name} onChange={handleEditInputChange} required className={fieldClassName} />
              <select name="specialty" value={editData.specialty} onChange={handleEditInputChange} required className={fieldClassName}>
                {specialtyOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#111111]">{option}</option>
                ))}
              </select>
              <select name="workingHours" value={editData.workingHours} onChange={handleEditInputChange} required className={fieldClassName}>
                {shiftOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#111111]">{option}</option>
                ))}
              </select>
              <select name="offDays" value={editData.offDays} onChange={handleEditInputChange} required className={fieldClassName}>
                {offDayOptions.map((option) => (
                  <option key={option} value={option} className="bg-[#111111]">{option}</option>
                ))}
              </select>
              <div className="mt-4 flex justify-end gap-3">
                <GoldButton type="button" variant="ghost" onClick={() => setIsEditModalOpen(false)} className="bg-gray-800 px-4 py-2 text-white hover:bg-gray-700 hover:text-white">
                  Cancel
                </GoldButton>
                <GoldButton type="submit" className="px-4 py-2">
                  Save Changes
                </GoldButton>
              </div>
            </form>
          </GlassCard>
        </div>
      )}

      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <GlassCard className="mx-4 w-full max-w-sm border-t-4 border-t-red-600 bg-[#111111] p-6">
            <h4 className="mb-3 text-xl font-semibold text-white">Delete Staff Member</h4>
            <p className="mb-6 text-gray-400">Are you sure you want to delete this? This action cannot be undone.</p>
            <div className="flex items-center justify-end gap-3">
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
                className="inline-flex items-center justify-center rounded-md bg-red-600/90 px-4 py-2 font-semibold text-white shadow-[0_0_15px_rgba(220,38,38,0.4)] transition-colors hover:bg-red-700"
              >
                Yes, Delete
              </button>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

export default StaffManager;
