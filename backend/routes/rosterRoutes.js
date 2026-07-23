const express = require("express");
const router = express.Router();
const {
    getShifts,
    getStaffMetrics,
    applyLeave,
    applyLeaveBulk,
} = require("../controllers/rosterController");
const { protect, staffOrAdmin } = require("../middleware/authMiddleware");

router.route("/shifts").get(protect, staffOrAdmin, getShifts);
router.route("/metrics").get(protect, staffOrAdmin, getStaffMetrics);
router.route("/leaves/bulk").post(protect, staffOrAdmin, applyLeaveBulk);
router.route("/leaves").post(protect, staffOrAdmin, applyLeave);

module.exports = router;
