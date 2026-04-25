import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { GlassCard, GoldButton } from './SystemUI';

function ServiceManager() {
  const fallbackServiceImage = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'><rect width='400' height='300' fill='%23111111'/><rect x='24' y='24' width='352' height='252' rx='20' fill='%230a0a0a' stroke='%23d4af37' stroke-opacity='0.35'/><circle cx='200' cy='126' r='42' fill='%23d4af37' fill-opacity='0.18'/><path d='M200 92c-12 0-22 10-22 22s10 22 22 22 22-10 22-22-10-22-22-22Zm0 56c-26 0-60 13-60 38v10h120v-10c0-25-34-38-60-38Z' fill='%23d4af37'/><text x='200' y='232' text-anchor='middle' fill='%23cfcfcf' font-family='Arial, sans-serif' font-size='18'>Salon Service</text></svg>";
  const fieldClassName = 'w-full bg-black/50 border border-gray-700 rounded-lg p-3 text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] outline-none transition-all';
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', duration: '', image: '' });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [editData, setEditData] = useState({ name: '', price: '', duration: '', image: '' });
  const [editingId, setEditingId] = useState(null);

  useEffect(() => {
    let isActive = true;
    axios
      .get('http://localhost:5000/api/services')
      .then((response) => {
        if (isActive) setServices(response.data);
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Failed to load services'));
    return () => { isActive = false; };
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleAddService = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/services', {
        ...formData,
        price: Number(formData.price),
        duration: Number(formData.duration),
      });
      setServices((currentServices) => [...currentServices, response.data]);
      setFormData({ name: '', price: '', duration: '', image: '' });
      toast.success('Service added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add service');
    }
  };

  const confirmDelete = async () => {
    if (!itemToDelete) return;

    try {
      await axios.delete(`http://localhost:5000/api/services/${itemToDelete}`);
      setServices((currentServices) => currentServices.filter((service) => service._id !== itemToDelete));
      toast.success('Service deleted!');
      setActiveMenuId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete service');
    } finally {
      setIsDeleteModalOpen(false);
      setItemToDelete(null);
    }
  };

  const openEditModal = (service) => {
    setEditData({
      name: service.name,
      price: service.price,
      duration: service.duration,
      image: service.image || ''
    });
    setEditingId(service._id);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleUpdateService = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`http://localhost:5000/api/services/${editingId}`, {
        ...editData,
        price: Number(editData.price),
        duration: Number(editData.duration),
      });
      setServices((currentServices) => currentServices.map((service) => (service._id === editingId ? response.data : service)));
      setIsEditModalOpen(false);
      toast.success('Service updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update service');
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md">
        <form onSubmit={handleAddService} className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          <input type="text" name="name" placeholder="Service Name" value={formData.name} onChange={handleInputChange} required className={fieldClassName} />
          <input type="number" name="price" placeholder="Price (Rs.)" value={formData.price} onChange={handleInputChange} required className={fieldClassName} />
          <input type="number" name="duration" placeholder="Duration (Mins)" value={formData.duration} onChange={handleInputChange} required className={fieldClassName} />
          <input type="text" name="image" placeholder="Image URL" value={formData.image} onChange={handleInputChange} className={fieldClassName} />
          <div className="md:col-span-2 lg:col-span-4">
            <GoldButton type="submit" className="rounded-lg px-5 py-3 font-bold shadow-[0_0_20px_rgba(212,175,55,0.28)] hover:shadow-[0_0_28px_rgba(212,175,55,0.4)]">
              + Add Service
            </GoldButton>
          </div>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-[#111111]/70 p-6 shadow-xl backdrop-blur-md">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-gray-300">
            {services.length} services configured
          </span>
          <span className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/10 px-3 py-1 text-[#d4af37]">
            Customer booking catalog
          </span>
        </div>

        <div className="salon-scrollbar overflow-x-auto rounded-xl border border-white/10 bg-black/20">
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
              {services.map((service) => (
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
                        <GoldButton type="button" variant="ghost" onClick={() => setActiveMenuId(null)} className="bg-gray-800 px-2 py-1 text-sm text-gray-400 hover:bg-gray-700 hover:text-white">
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
              ))}
              {services.length === 0 && (
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

      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <GlassCard className="relative w-full max-w-md border-t-4 border-t-[#d4af37] bg-[#111111] p-8">
            <button type="button" onClick={() => setIsEditModalOpen(false)} className="absolute right-4 top-4 text-xl text-gray-400 hover:text-white">
              x
            </button>
            <h3 className="salon-heading mb-6 border-b border-white/10 pb-4">Edit Service</h3>
            <form onSubmit={handleUpdateService} className="flex flex-col gap-4">
              <input type="text" name="name" placeholder="Service Name" value={editData.name} onChange={handleEditInputChange} required className={fieldClassName} />
              <input type="number" name="price" placeholder="Price (Rs.)" value={editData.price} onChange={handleEditInputChange} required className={fieldClassName} />
              <input type="number" name="duration" placeholder="Duration (Mins)" value={editData.duration} onChange={handleEditInputChange} required className={fieldClassName} />
              <input type="text" name="image" placeholder="Image URL (Optional)" value={editData.image} onChange={handleEditInputChange} className={fieldClassName} />

              {editData.image && (
                <div className="mt-2 flex justify-center">
                  <img
                    src={editData.image}
                    alt="Preview"
                    className="h-32 w-full rounded-md border border-white/20 object-cover"
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallbackServiceImage;
                    }}
                  />
                </div>
              )}

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
            <h4 className="mb-3 text-xl font-semibold text-white">Delete Service</h4>
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

export default ServiceManager;
