const express = require("express");
const router = express.Router();
const { getShifts, applyLeave } = require("../controllers/rosterController");
const { protect, staffOrAdmin } = require("../middleware/authMiddleware");

router.route("/shifts").get(protect, staffOrAdmin, getShifts);
router.route("/leaves").post(protect, staffOrAdmin, applyLeave);

module.exports = router;