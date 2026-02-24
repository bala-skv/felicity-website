const express = require("express");
const Discussion = require("../models/Discussion");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const Notification = require("../models/Notification");
const auth_middleware = require("../middleware/auth_middleware");

const router = express.Router();

const isOrganizer = (event, userId) => event.organizer_id.toString() === userId;

const isRegisteredParticipant = async (eventId, userId) => {
    const reg = await Registration.findOne({
        event_id: eventId,
        participant_id: userId,
        status: "confirmed"
    });
    return !!reg;
};

router.get("/:event_id", auth_middleware, async (req, res) => {
    try {
        const { event_id } = req.params;
        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        // Only organizer or registered participants can view
        const userId = req.user.user_id;
        const isOrg = isOrganizer(event, userId);
        if (!isOrg) {
            const isReg = await isRegisteredParticipant(event_id, userId);
            if (!isReg) return res.status(403).json({ message: "Only registered participants can view the discussion" });
        }

        const messages = await Discussion.find({ event_id })
            .populate("author_id", "first_name last_name email organizer_name role")
            .sort({ createdAt: 1 });

        return res.json(messages);
    } catch (err) {
        console.error(err);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

// post new message
router.post("/:event_id", auth_middleware, async (req, res) => {
    try {
        const { event_id } = req.params;
        const { content, parent_id, is_announcement } = req.body;
        const userId = req.user.user_id;

        if (!content || !content.trim()) {
            return res.status(400).json({ message: "Message content is required" });
        }

        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const isOrg = isOrganizer(event, userId);
        if (!isOrg) {
            const isReg = await isRegisteredParticipant(event_id, userId);
            if (!isReg) return res.status(403).json({ message: "Only registered participants can post" });
        }

        // Verify parent exists if threading (multi-level nesting allowed)
        if (parent_id) {
            const parent = await Discussion.findById(parent_id);
            if (!parent || parent.event_id.toString() !== event_id) {
                return res.status(400).json({ message: "Invalid parent message" });
            }
        }

        const msg = new Discussion({
            event_id,
            author_id: userId,
            author_role: isOrg ? "organizer" : "participant",
            content: content.trim(),
            parent_id: parent_id || null,
            is_announcement: isOrg && is_announcement ? true : false,
        });
        await msg.save();

        // --- Create notifications (fire-and-forget) ---
        try {
            const preview = content.trim().substring(0, 150);

            if (isOrg && is_announcement) {
                // ANNOUNCEMENT: notify all registered participants
                const registrations = await Registration.find({ event_id, status: "confirmed" });
                const notifDocs = registrations
                    .filter((r) => r.participant_id.toString() !== userId)
                    .map((r) => ({
                        user_id: r.participant_id,
                        event_id,
                        type: "announcement",
                        message_id: msg._id,
                        content: preview,
                        triggered_by: userId
                    }));
                if (notifDocs.length > 0) await Notification.insertMany(notifDocs);
            }

            if (parent_id) {
                // REPLY: notify the parent message author (if not replying to self)
                const parentMsg = await Discussion.findById(parent_id);
                if (parentMsg && parentMsg.author_id.toString() !== userId) {
                    await Notification.create({
                        user_id: parentMsg.author_id,
                        event_id,
                        type: "reply",
                        message_id: msg._id,
                        content: preview,
                        triggered_by: userId
                    });
                }
            }
        } catch (notifErr) {
            console.log("Notification creation error (non-fatal):", notifErr.message);
        }

        const populated = await Discussion.findById(msg._id)
            .populate("author_id", "first_name last_name email organizer_name role");

        return res.status(201).json(populated);
    } catch (e) {
        return res.status(500).json({ message: "Server error" });
    }
});

router.patch("/:event_id/:message_id/pin", auth_middleware, async (req, res) => {
    try {
        const { event_id, message_id } = req.params;
        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (!isOrganizer(event, req.user.user_id)) {
            return res.status(403).json({ message: "Only organizers can pin messages" });
        }

        const msg = await Discussion.findById(message_id);
        if (!msg || msg.event_id.toString() !== event_id) {
            return res.status(404).json({ message: "Message not found" });
        }

        msg.is_pinned = !msg.is_pinned;
        await msg.save();

        // Create pin notification for all registered participants
        if (msg.is_pinned) {
            try {
                const preview = msg.content.substring(0, 150);
                const registrations = await Registration.find({ event_id, status: "confirmed" });
                const notifDocs = registrations
                    .filter((r) => r.participant_id.toString() !== req.user.user_id)
                    .map((r) => ({
                        user_id: r.participant_id,
                        event_id,
                        type: "pin",
                        message_id: msg._id,
                        content: preview,
                        triggered_by: req.user.user_id
                    }));
                // Also notify the organizer if different (but organizer is doing the pinning so skip)
                if (notifDocs.length > 0) await Notification.insertMany(notifDocs);
            } catch (notifErr) {
                console.log("Pin notification error (non-fatal):", notifErr.message);
            }
        }

        return res.json({ message: msg.is_pinned ? "Message pinned" : "Message unpinned", is_pinned: msg.is_pinned });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// delete (organizer or author)
router.delete("/:event_id/:message_id", auth_middleware, async (req, res) => {
    try {
        const { event_id, message_id } = req.params;
        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const msg = await Discussion.findById(message_id);
        if (!msg || msg.event_id.toString() !== event_id) {
            return res.status(404).json({ message: "Message not found" });
        }

        const isOrg = isOrganizer(event, req.user.user_id);
        const isAuthor = msg.author_id.toString() === req.user.user_id;

        if (!isOrg && !isAuthor) {
            return res.status(403).json({ message: "Only the organizer or author can delete this message" });
        }

        msg.is_deleted = true;
        msg.content = "[This message has been deleted]";
        await msg.save();

        return res.json({ message: "Message deleted" });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

router.post("/:event_id/:message_id/react", auth_middleware, async (req, res) => {
    try {
        const { event_id, message_id } = req.params;
        const { emoji } = req.body;
        const userId = req.user.user_id;

        if (!emoji) return res.status(400).json({ message: "Emoji is required" });

        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ message: "Event not found" });

        const isOrg = isOrganizer(event, userId);
        if (!isOrg) {
            const isReg = await isRegisteredParticipant(event_id, userId);
            if (!isReg) return res.status(403).json({ message: "Access denied" });
        }

        const msg = await Discussion.findById(message_id);
        if (!msg || msg.event_id.toString() !== event_id) {
            return res.status(404).json({ message: "Message not found" });
        }

        // Toggle reaction: remove if same emoji exists, add otherwise
        const existingIdx = msg.reactions.findIndex(
            (r) => r.user_id.toString() === userId && r.emoji === emoji
        );

        if (existingIdx >= 0) {
            msg.reactions.splice(existingIdx, 1);
        } else {
            // Remove any previous reaction by this user with different emoji and add new
            msg.reactions = msg.reactions.filter((r) => r.user_id.toString() !== userId);
            msg.reactions.push({ user_id: userId, emoji });
        }

        await msg.save();

        return res.json({ reactions: msg.reactions });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Server error" });
    }
});

// unread count since timestamp
router.get("/:event_id/unread-count", auth_middleware, async (req, res) => {
    try {
        const { event_id } = req.params;
        const { since } = req.query; // ISO timestamp

        if (!since) return res.json({ count: 0 });

        const count = await Discussion.countDocuments({
            event_id,
            createdAt: { $gt: new Date(since) },
            is_deleted: false
        });

        return res.json({ count });
    } catch (err) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

module.exports = router;
