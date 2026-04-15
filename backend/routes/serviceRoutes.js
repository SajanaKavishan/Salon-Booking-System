const express = require('express');
const router = express.Router();
const { getServices, createService, deleteService } = require('../controllers/serviceController');
const Service = require('../models/Service'); // Import the Service model for the PUT route

router.route('/').get(getServices).post(createService);
router.route('/:id').delete(deleteService);
// Update Service (PUT)
router.put('/:id', async (req, res) => {
  try {
    const updatedService = await Service.findByIdAndUpdate(
      req.params.id, 
      req.body, 
      { new: true, runValidators: true }
    );

    if (!updatedService) {
      return res.status(404).json({ message: 'Service not found' });
    }

    res.status(200).json(updatedService);
  } catch (error) {
    res.status(500).json({ message: 'Error updating service', error });
  }
});

module.exports = router;