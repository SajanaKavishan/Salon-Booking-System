import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function StaffManager() {
  const [staffList, setStaffList] = useState([]);
  const [formData, setFormData] = useState({ name: '', specialty: '', workingHours: '', offDays: '' });

  useEffect(() => {
    let isActive = true;

    axios
      .get('http://localhost:5000/api/staff')
      .then((response) => {
        if (isActive) {
          setStaffList(response.data);
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || 'Failed to load staff list');
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to remove staff');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border-t-4 border-blue-500 transition-colors duration-300 mt-8">
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Manage Salon Staff</h3>

      {/* Add New Staff Form */}
      <form onSubmit={handleAddStaff} className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8">
        <input
          type="text"
          name="name"
          placeholder="Name (e.g. Kamal)"
          value={formData.name}
          onChange={handleInputChange}
          required
          className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          name="specialty"
          placeholder="Specialty (e.g. Haircut)"
          value={formData.specialty}
          onChange={handleInputChange}
          required
          className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          name="workingHours"
          placeholder="Hours (09AM - 05PM)"
          value={formData.workingHours}
          onChange={handleInputChange}
          required
          className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          name="offDays"
          placeholder="Off Days (e.g. Sunday)"
          value={formData.offDays}
          onChange={handleInputChange}
          required
          className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:-translate-y-1 shadow-md"
        >
          + Add Staff
        </button>
      </form>

      {/* Staff List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
              <th className="p-4 border-b border-slate-300 dark:border-slate-700">Name</th>
              <th className="p-4 border-b border-slate-300 dark:border-slate-700">Specialty</th>
              <th className="p-4 border-b border-slate-300 dark:border-slate-700">Working Hours</th>
              <th className="p-4 border-b border-slate-300 dark:border-slate-700">Off Days</th>
              <th className="p-4 border-b border-slate-300 dark:border-slate-700 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {staffList.map((staff) => (
              <tr key={staff._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                  {staff.name}
                </td>
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  {staff.specialty}
                </td>
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  {staff.workingHours}
                </td>
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-red-500 font-semibold">
                  {staff.offDays}
                </td>
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">
                  <button
                    onClick={() => handleDeleteStaff(staff._id)}
                    className="text-red-500 hover:text-red-700 font-bold px-3 py-1 bg-red-100 dark:bg-red-500/10 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {staffList.length === 0 && (
              <tr>
                <td colSpan="5" className="p-4 text-center text-slate-500 dark:text-slate-400">
                  No staff members added yet. Add someone above!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default StaffManager;