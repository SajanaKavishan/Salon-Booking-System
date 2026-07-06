const mongoose = require('mongoose');
const Service = require('../models/Service');
const {
  cleanupUploadedCloudinaryFile,
  destroyCloudinaryAsset,
  resolveCloudinaryPublicId,
} = require('../utils/cloudinaryAssets');

const getValidationMessage = (error) => (
  Object.values(error.errors || {})
    .map((validationError) => validationError.message)
    .filter(Boolean)
    .join(' ')
  || 'Please check the service details.'
);

const sendServiceError = (res, error, fallbackMessage = 'Server Error') => {
  if (error?.name === 'ValidationError') {
    return res.status(400).json({ message: getValidationMessage(error) });
  }

  return res.status(500).json({ message: fallbackMessage, error: error.message });
};

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
    if (!name || price === undefined || price === '' || duration === undefined || duration === '') {
      await cleanupUploadedCloudinaryFile(req.file, 'Service validation cleanup');
      return res.status(400).json({ message: 'Please add all fields' });
    }

    const service = await Service.create({
      name,
      price,
      duration,
      image: req.file?.path || image || undefined,
      imagePublicId: req.file?.filename || resolveCloudinaryPublicId('', image) || '',
    });

    res.status(201).json(service);
  } catch (error) {
    await cleanupUploadedCloudinaryFile(req.file, 'Service creation cleanup');
    sendServiceError(res, error, 'Error creating service');
  }
};

// @desc    Update a service (Admin only)
// @route   PUT /api/services/:id
const updateService = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid service ID' });
    }

    const existingService = await Service.findById(req.params.id);
    if (!existingService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    const updateData = {};
    const allowedFields = ['name', 'price', 'duration'];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updateData[field] = req.body[field];
      }
    });

    if (req.body.imageUrl !== undefined) {
      updateData.image = req.body.imageUrl;
      updateData.imagePublicId = resolveCloudinaryPublicId('', req.body.imageUrl);
    } else if (req.body.image !== undefined) {
      updateData.image = req.body.image;
      updateData.imagePublicId = resolveCloudinaryPublicId('', req.body.image);
    }

    if (req.file?.path) {
      await destroyCloudinaryAsset(existingService.imagePublicId, existingService.image);
      updateData.image = req.file.path;
      updateData.imagePublicId = req.file.filename || '';
    } else if (
      updateData.image !== undefined
      && updateData.image !== existingService.image
    ) {
      await destroyCloudinaryAsset(existingService.imagePublicId, existingService.image);
    }

    const updatedService = await Service.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    res.status(200).json(updatedService);
  } catch (error) {
    sendServiceError(res, error, 'Error updating service');
  }
};

// @desc    Delete a service (Admin only)
// @route   DELETE /api/services/:id
const deleteService = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid service ID' });
    }

    const service = await Service.findById(req.params.id);
    if (!service) {
      return res.status(404).json({ message: 'Service not found' });
    }

    await destroyCloudinaryAsset(service.imagePublicId, service.image);
    await Service.findByIdAndDelete(req.params.id);

    res.status(200).json({ id: req.params.id, message: 'Service deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getServices, createService, updateService, deleteService };
