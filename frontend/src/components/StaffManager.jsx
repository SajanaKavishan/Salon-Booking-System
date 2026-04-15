import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function StaffManager() {
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState({ name: '', specialty: '', workingHours: '', offDays: '' });
  
  // States for Manage Menu & Edit Modal
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEditInputChange = (e) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleAddStaff = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post('http://localhost:5000/api/staff', formData);
      setStaffList((currentStaff) => [...currentStaff, response.data]);
      setFormData({ name: '', specialty: '', workingHours: '', offDays: '' });
      toast.success('Staff member added successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to add staff');
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Are you sure you want to remove this staff member?')) return;
    try {
      await axios.delete(`http://localhost:5000/api/staff/${id}`);
      setStaffList((currentStaff) => currentStaff.filter((staff) => staff._id !== id));
      toast.success('Staff member removed!');
      setActiveMenuId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove staff');
    }
  };

  const openEditModal = (staff) => {
    setEditData({ name: staff.name, specialty: staff.specialty, workingHours: staff.workingHours, offDays: staff.offDays });
    setEditingId(staff._id);
    setIsEditModalOpen(true);
    setActiveMenuId(null);
  };

  const handleUpdateStaff = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.put(`http://localhost:5000/api/staff/${editingId}`, editData);
      setStaffList((currentStaff) => currentStaff.map(staff => staff._id === editingId ? response.data : staff));
      setIsEditModalOpen(false);
      toast.success('Staff updated successfully!');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update staff');
    }
  };

  return (
    <div className="bg-[#111111]/70 backdrop-blur-md p-6 rounded-xl shadow-2xl border border-white/10 border-t-4 border-t-[#d4af37] transition-colors duration-300 mt-8 relative">
      <h3 className="text-2xl font-serif text-[#d4af37] mb-6 border-b pb-4 border-white/10">Manage Salon Staff</h3>

      {/* Add New Staff Form */}
      <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <input type="text" name="name" placeholder="Name (e.g. Kamal)" value={formData.name} onChange={handleInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white placeholder-gray-500 focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
        <select name="specialty" value={formData.specialty} onChange={handleInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition cursor-pointer">
          <option value="" disabled className="bg-[#111111] text-gray-500">Select Specialty</option>
          <option value="Hair Stylist" className="bg-[#111111]">Hair Stylist</option>
          <option value="Colorist" className="bg-[#111111]">Colorist</option>
          <option value="Beautician" className="bg-[#111111]">Beautician</option>
          <option value="Massage Therapist" className="bg-[#111111]">Massage Therapist</option>
          <option value="All-Rounder" className="bg-[#111111]">All-Rounder</option>
        </select>
        <select name="workingHours" value={formData.workingHours} onChange={handleInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition cursor-pointer">
          <option value="" disabled className="bg-[#111111] text-gray-500">Select Shift</option>
          <option value="09:00 AM - 05:00 PM" className="bg-[#111111]">09:00 AM - 05:00 PM</option>
          <option value="10:00 AM - 06:00 PM" className="bg-[#111111]">10:00 AM - 06:00 PM</option>
          <option value="08:00 AM - 02:00 PM" className="bg-[#111111]">08:00 AM - 02:00 PM</option>
          <option value="02:00 PM - 08:00 PM" className="bg-[#111111]">02:00 PM - 08:00 PM</option>
        </select>
        <select name="offDays" value={formData.offDays} onChange={handleInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white focus:outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition cursor-pointer">
          <option value="" disabled className="bg-[#111111] text-gray-500">Select Off Day</option>
          <option value="Monday" className="bg-[#111111]">Monday</option>
          <option value="Tuesday" className="bg-[#111111]">Tuesday</option>
          <option value="Wednesday" className="bg-[#111111]">Wednesday</option>
          <option value="Thursday" className="bg-[#111111]">Thursday</option>
          <option value="Friday" className="bg-[#111111]">Friday</option>
          <option value="Saturday" className="bg-[#111111]">Saturday</option>
          <option value="Sunday" className="bg-[#111111]">Sunday</option>
        </select>
        <button type="submit" className="bg-[#d4af37] hover:bg-yellow-400 text-black font-semibold py-2 px-4 rounded-md transition duration-300 transform hover:-translate-y-1 shadow-[0_0_15px_rgba(212,175,55,0.3)] hover:shadow-[0_0_25px_rgba(212,175,55,0.5)]">
          + Add Staff
        </button>
      </form>

      {/* Staff List Table */}
      <div className="overflow-x-auto rounded-lg border border-white/10">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#0a0a0a]/80 text-[#d4af37]">
              <th className="p-4 border-b border-white/10 font-medium">Name</th>
              <th className="p-4 border-b border-white/10 font-medium">Specialty</th>
              <th className="p-4 border-b border-white/10 font-medium">Working Hours</th>
              <th className="p-4 border-b border-white/10 font-medium">Off Days</th>
              <th className="p-4 border-b border-white/10 font-medium text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff._id} className="hover:bg-white/5 transition-colors group">
                <td className="p-4 border-b border-white/10 text-gray-200 font-medium">{staff.name}</td>
                <td className="p-4 border-b border-white/10 text-gray-300">{staff.specialty}</td>
                <td className="p-4 border-b border-white/10 text-gray-300">{staff.workingHours}</td>
                <td className="p-4 border-b border-white/10 text-red-400/90 font-medium">{staff.offDays}</td>
                <td className="p-4 border-b border-white/10 text-center">
                  {activeMenuId === staff._id ? (
                    <div className="flex items-center justify-center gap-2">
                      <button onClick={() => openEditModal(staff)} className="text-blue-400 hover:text-white font-semibold px-3 py-1 bg-blue-900/30 hover:bg-blue-600 rounded-md transition duration-300 border border-blue-800/50 text-sm">Edit</button>
                      <button onClick={() => handleDeleteStaff(staff._id)} className="text-red-400 hover:text-white font-semibold px-3 py-1 bg-red-900/30 hover:bg-red-600 rounded-md transition duration-300 border border-red-800/50 text-sm">Delete</button>
                      <button onClick={() => setActiveMenuId(null)} className="text-gray-400 hover:text-white px-2 py-1 bg-gray-800 hover:bg-gray-700 rounded-md transition text-sm">✕</button>
                    </div>
                  ) : (
                    <button onClick={() => setActiveMenuId(staff._id)} className="text-[#d4af37] hover:text-black font-semibold px-4 py-1.5 border border-[#d4af37] hover:bg-[#d4af37] rounded-md transition duration-300">Manage</button>
                  )}
                </td>
              </tr>
            ))}
            {staffList.length === 0 && (
              <tr><td colSpan="5" className="p-8 text-center text-gray-500 font-light bg-[#0a0a0a]/30">No staff members found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Staff Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
          <div className="bg-[#111111] p-8 rounded-xl shadow-2xl border border-white/10 border-t-4 border-t-[#d4af37] w-full max-w-md relative">
            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl">✕</button>
            <h3 className="text-2xl font-serif text-[#d4af37] mb-6 border-b pb-4 border-white/10">Edit Staff Member</h3>
            <form onSubmit={handleUpdateStaff} className="flex flex-col gap-4">
              <input type="text" name="name" placeholder="Name" value={editData.name} onChange={handleEditInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition" />
              <select name="specialty" value={editData.specialty} onChange={handleEditInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white cursor-pointer">
                <option value="Hair Stylist" className="bg-[#111111]">Hair Stylist</option>
                <option value="Colorist" className="bg-[#111111]">Colorist</option>
                <option value="Beautician" className="bg-[#111111]">Beautician</option>
                <option value="Massage Therapist" className="bg-[#111111]">Massage Therapist</option>
                <option value="All-Rounder" className="bg-[#111111]">All-Rounder</option>
              </select>
              <select name="workingHours" value={editData.workingHours} onChange={handleEditInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white cursor-pointer">
                <option value="09:00 AM - 05:00 PM" className="bg-[#111111]">09:00 AM - 05:00 PM</option>
                <option value="10:00 AM - 06:00 PM" className="bg-[#111111]">10:00 AM - 06:00 PM</option>
                <option value="08:00 AM - 02:00 PM" className="bg-[#111111]">08:00 AM - 02:00 PM</option>
                <option value="02:00 PM - 08:00 PM" className="bg-[#111111]">02:00 PM - 08:00 PM</option>
              </select>
              <select name="offDays" value={editData.offDays} onChange={handleEditInputChange} required className="px-4 py-2 bg-[#0a0a0a]/80 border border-white/10 rounded-md text-white cursor-pointer">
                <option value="Monday" className="bg-[#111111]">Monday</option>
                <option value="Tuesday" className="bg-[#111111]">Tuesday</option>
                <option value="Wednesday" className="bg-[#111111]">Wednesday</option>
                <option value="Thursday" className="bg-[#111111]">Thursday</option>
                <option value="Friday" className="bg-[#111111]">Friday</option>
                <option value="Saturday" className="bg-[#111111]">Saturday</option>
                <option value="Sunday" className="bg-[#111111]">Sunday</option>
              </select>
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

export default StaffManager;