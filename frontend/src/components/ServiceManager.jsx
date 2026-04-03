import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-toastify';

function ServiceManager() {
  const [services, setServices] = useState([]);
  const [formData, setFormData] = useState({ name: '', price: '', duration: '' });

  // Load Services when component mounts
  useEffect(() => {
    let isActive = true;

    axios
      .get('http://localhost:5000/api/services')
      .then((response) => {
        if (isActive) {
          setServices(response.data);
        }
      })
      .catch((error) => {
        toast.error(error.response?.data?.message || 'Failed to load services');
      });

    return () => {
      isActive = false;
    };
  }, []);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      setFormData({ name: '', price: '', duration: '' }); // Clear form
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
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete service');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg border-t-4 border-blue-500 transition-colors duration-300 mt-8">
      <h3 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Manage Salon Services</h3>

      {/* Add New Service Form */}
      <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <input
          type="text"
          name="name"
          placeholder="Service Name (e.g. Haircut)"
          value={formData.name}
          onChange={handleInputChange}
          required
          className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          name="price"
          placeholder="Price (Rs.)"
          value={formData.price}
          onChange={handleInputChange}
          required
          className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="number"
          name="duration"
          placeholder="Duration (Mins)"
          value={formData.duration}
          onChange={handleInputChange}
          required
          className="px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          type="submit"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-transform transform hover:-translate-y-1 shadow-md"
        >
          + Add Service
        </button>
      </form>

      {/* Services List Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-300">
              <th className="p-4 border-b border-slate-300 dark:border-slate-700">Service Name</th>
              <th className="p-4 border-b border-slate-300 dark:border-slate-700">Price</th>
              <th className="p-4 border-b border-slate-300 dark:border-slate-700">Duration</th>
              <th className="p-4 border-b border-slate-300 dark:border-slate-700 text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service._id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-medium">
                  {service.name}
                </td>
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  Rs. {service.price}
                </td>
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200">
                  {service.duration} mins
                </td>
                <td className="p-4 border-b border-slate-200 dark:border-slate-700 text-center">
                  <button
                    onClick={() => handleDeleteService(service._id)}
                    className="text-red-500 hover:text-red-700 font-bold px-3 py-1 bg-red-100 dark:bg-red-500/10 rounded-md transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {services.length === 0 && (
              <tr>
                <td colSpan="4" className="p-4 text-center text-slate-500 dark:text-slate-400">
                  No services found. Add a new service above!
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default ServiceManager;