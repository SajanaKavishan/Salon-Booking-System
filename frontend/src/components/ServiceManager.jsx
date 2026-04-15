import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function ServiceManager() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', duration: '', image: '' });
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  // Editing state to hold the current values of the service being edited, including the image URL
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
      // After adding a service, we reset the form data including the image field
      setFormData({ name: '', price: '', duration: '', image: '' });
      toast.success('Service added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add service');
    }
  };

  const handleDeleteService = async (id) => {
    if (!window.confirm('Are you sure you want to delete this service?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/services/${id}`);
      setServices((currentServices) => currentServices.filter((service) => service._id !== id));
      toast.success('Service deleted!');
      setActiveMenuId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete service');
    }
  };

  const openEditModal = (service) => {
    // When opening the edit modal, we populate the editData state with the service's current data, including the image URL
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
      setServices((currentServices) => currentServices.map(service => service._id === editingId ? response.data : service));
      setIsEditModalOpen(false);
      toast.success('Service updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update service');
    }
  };

  return (
    <div className="bg-[#111111]/70 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-white/10 border-t-4 border-t-[#d4af37] transition-colors duration-300 mt-8 relative">
      <h3 className="text-2xl font-serif text-[#d4af37] mb-6 border-b pb-4 border-white/10">Manage Salon Services</h3>

      {/* Add New Service Form */}
      <form onSubmit={handleAddService} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <input type="text" name="name" placeholder="Service Name (e.g. Haircut)" value={formData.name} onChange={handleInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
        <input type="number" name="price" placeholder="Price (Rs.)" value={formData.price} onChange={handleInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
        <input type="number" name="duration" placeholder="Duration (Mins)" value={formData.duration} onChange={handleInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
        
        {/* Image URL Input */}
        <input type="text" name="image" placeholder="Image URL" value={formData.image} onChange={handleInputChange} className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
        
        <button type="submit" className="bg-[#d4af37] hover:bg-yellow-400 text-black font-semibold py-2 px-4 rounded-md transition duration-300 transform hover:-translate-y-1 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)]">
          + Add Service
        </button>
      </form>

      {/* Services List Table */}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0a0a0a]/80 text-[#d4af37]">
              {/* Image Column Header */}
              <th className="p-4 border-b border-white/10 font-medium">Image</th>
              <th className="p-4 border-b border-white/10 font-medium">Service Name</th>
              <th className="p-4 border-b border-white/10 font-medium">Price</th>
              <th className="p-4 border-b border-white/10 font-medium">Duration</th>
              <th className="p-4 border-b border-white/10 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service._id} className="hover:bg-white/5 transition-colors group">
                {/* Image Column */}
                <td className="p-4 border-b border-white/10">
                  {service.image ? (
                    <img src={service.image} alt={service.name} className="w-12 h-12 object-cover rounded-md border border-white/20" />
                  ) : (
                    <div className="w-12 h-12 bg-gray-800 rounded-md flex items-center justify-center text-xs text-gray-500 border border-white/10">No Img</div>
                  )}
                </td>
                <td className="p-4 border-b border-white/10 text-gray-200 font-medium">{service.name}</td>
                <td className="p-4 border-b border-white/10 text-gray-300">Rs. {service.price}</td>
                <td className="p-4 border-b border-white/10 text-gray-300">{service.duration} mins</td>
                <td className="p-4 border-b border-white/10 text-center">
                  {activeMenuId === service._id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEditModal(service)} className="text-blue-400 hover:text-white font-semibold px-3 py-1 bg-blue-900/30 hover:bg-blue-600 rounded-md transition duration-300 border border-blue-800/50 text-sm">Edit</button>
                      <button onClick={() => handleDeleteService(service._id)} className="text-red-400 hover:text-white font-semibold px-3 py-1 bg-red-900/30 hover:bg-red-600 rounded-md transition duration-300 border border-red-800/50 text-sm">Delete</button>
                      <button onClick={() => setActiveMenuId(null)} className="text-gray-400 hover:text-white px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-md transition text-sm">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveMenuId(service._id)} className="text-[#d4af37] hover:text-black font-semibold px-4 py-1.5 border border-[#d4af37] hover:bg-[#d4af37] rounded-md transition duration-300">Manage</button>
                  )}
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-light bg-[#0a0a0a]/30">No services found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Service Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#111111] p-8 rounded-xl shadow-2xl border border-white/10 border-t-4 border-t-[#d4af37] w-full max-w-md relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <h3 className="text-2xl font-serif text-[#d4af37] mb-6 border-b pb-4 border-white/10">Edit Service</h3>
            <form onSubmit={handleUpdateService} className="flex flex-col gap-4">
              <input type="text" name="name" placeholder="Service Name" value={editData.name} onChange={handleEditInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
              <input type="number" name="price" placeholder="Price (Rs.)" value={editData.price} onChange={handleEditInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
              <input type="number" name="duration" placeholder="Duration (Mins)" value={editData.duration} onChange={handleEditInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
              
              {/* Edit Modal Image URL Input */}
              <input type="text" name="image" placeholder="Image URL (Optional)" value={editData.image} onChange={handleEditInputChange} className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
              
              {/* Photo Preview in Edit Modal */}
              {editData.image && (
                <div className="mt-2 flex justify-center">
                  <img src={editData.image} alt="Preview" className="w-full h-32 object-cover rounded-md border border-white/20" />
                </div>
              )}

              <div className="flex justify-end gap-3 mt-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 bg-gray-800 text-white rounded-md hover:bg-gray-700 transition">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-[#d4af37] text-black font-semibold rounded-md hover:bg-yellow-400 transition shadow-[0_0_15px_rgba(212,175,55,0.3)]">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

export default ServiceManager;