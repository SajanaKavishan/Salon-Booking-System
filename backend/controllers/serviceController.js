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
    const { name, price, duration, image } = req.body;
    if (!name || !price || !duration) {
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const service = await Service.create({
      name,
      price,
      duration,
      image: req.file?.path || image || undefined,
    });

    res.status(201).json(service);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update a service (Admin only)
// @route   PUT /api/services/:id
const updateService = async (req, res) => {
  try {
    const updateData = {
      ...req.body,
    };

    if (req.file?.path) {
      updateData.image = req.file.path;
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.status(200).json(updatedService);
  } catch (error) {
    res.status(500).json({ message: 'Error updating service', error });
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

module.exports = { getServices, createService, updateService, deleteService };
