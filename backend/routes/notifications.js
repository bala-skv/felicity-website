const express = require("express");
const Notification = require("../models/Notification");
const auth_middleware = require("../middleware/auth_middleware");

const router = express.Router();

// fetch notifications
router.get("/", auth_middleware, async (req, res) => {
    try {
        const userId = req.user.user_id;
        const { limit = 50, unread_only } = req.query;

        const filter = { user_id: userId };
        if (unread_only === "true") filter.read = false;

        const notifications = await Notification.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit))
            .populate("event_id", "event_name")
            .populate("triggered_by", "first_name last_name organizer_name role");

        return res.json(notifications);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

router.get("/unread-count", auth_middleware, async (req, res) => {
    try {
        const count = await Notification.countDocuments({
            user_id: req.user.user_id,
            read: false
        });
        return res.json({ count });
    } catch (e) {
        return res.status(500).json({ message: "Server error" });
    }
});

router.patch("/:id/read", auth_middleware, async (req, res) => {
    try {
        const notif = await Notification.findById(req.params.id);
        if (!notif || notif.user_id.toString() !== req.user.user_id) {
            return res.status(404).json({ message: "Notification not found" });
        }
        notif.read = true;
        await notif.save();
        return res.json({ message: "Marked as read" });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// mark all as read
router.patch("/read-all", auth_middleware, async (req, res) => {
    try {
        await Notification.updateMany(
            { user_id: req.user.user_id, read: false },
            { read: true }
        );
        return res.json({ message: "All notifications marked as read" });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
