const Service = require('../models/Service');

// @desc    Get all services
// @route   GET /api/services
const getServices = async (req, res) => {
  try {
    const services = await Service.find();
    res.status(200).json(services);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create a service (Admin only)
// @route   POST /api/services
const createService = async (req, res) => {
  try {
    const { name, price, duration } = req.body;
    if (!name || !price || !duration) {
      return res.status(400).json({ message: 'Please add all fields' });
    }
    const service = await Service.create({ name, price, duration });
    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete a service (Admin only)
// @route   DELETE /api/services/:id
const deleteService = async (req, res) => {
  try {
    const service = await Service.findByIdAndDelete(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }
    res.status(200).json({ id: req.params.id, message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getServices, createService, deleteService };