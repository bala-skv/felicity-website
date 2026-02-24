const express = require("express");
const router = express.Router();
const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const User = require("../../models/User");
const auth = require("../../middleware/auth_middleware");
const roleCheck = require("../../middleware/role_middleware");
const { ALLOWED_EVENT_TAGS } = require("../../utils/constants");
const { sendDiscordNotification } = require("../../utils/discord");

// CREATE EVENT (draft)
router.post("/create", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const {
            event_name, event_description, event_type, eligibility,
            registration_deadline, event_start_date, event_end_date,
            registration_limit, registration_fee, event_tags,
            custom_form, merchandise_items, purchase_limit
        } = req.body;

        if (
            !event_name || !event_description || !event_type || !eligibility ||
            !registration_deadline || !event_start_date || !event_end_date ||
            !registration_limit || !Array.isArray(event_tags) || event_tags.length === 0
        ) {
            return res.status(400).json({ message: "All required fields must be provided" });
        }

        if (!event_tags.every((tag) => ALLOWED_EVENT_TAGS.includes(tag))) {
            return res.status(400).json({ message: "Invalid event tag provided" });
        }

        const eventData = {
            event_name, event_description, event_type, eligibility,
            registration_deadline, event_start_date, event_end_date,
            registration_limit,
            registration_fee: registration_fee || 0,
            event_tags,
            organizer_id: req.user.user_id,
            status: "draft"
        };

        if (event_type === "normal") {
            eventData.custom_form = custom_form || [];
        } else if (event_type === "merchandise") {
            eventData.merchandise_items = merchandise_items || [];
            eventData.purchase_limit = purchase_limit || 1;
        }

        const new_event = new Event(eventData);
        await new_event.save();

        res.status(201).json({ message: "Event created successfully (draft)", event: new_event });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
});

// PUBLISH EVENT
router.patch("/publish/:event_id", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const event = await Event.findById(req.params.event_id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (event.organizer_id.toString() !== req.user.user_id) {
            return res.status(403).json({ message: "You can only publish your own events" });
        }
        if (event.status !== "draft") {
            return res.status(400).json({ message: "Only draft events can be published" });
        }

        event.status = "published";
        await event.save();

        try {
            await sendDiscordNotification(req.user.user_id, event, "publish");
        } catch (webhookErr) {
            console.warn("Discord webhook failed:", webhookErr.message);
        }

        res.json({ message: "Event published successfully", event });
    } catch (e) {
        res.status(500).json({ message: "Server error" });
    }
});

// GET SINGLE EVENT
router.get("/details/:event_id", auth, async (req, res) => {
    try {
        const event = await Event.findById(req.params.event_id)
            .populate("organizer_id", "organizer_name email");
        if (!event) return res.status(404).json({ message: "Event not found" });
        res.json(event);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Internal server error" });
    }
});

// EDIT EVENT (organizer only)
router.patch("/edit/:event_id", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id } = req.params;
        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (event.organizer_id.toString() !== req.user.user_id) {
            return res.status(403).json({ message: "You can only edit your own events" });
        }

        const now = new Date();
        const isClosed = event.status === "closed" || (event.status !== "draft" && now > event.event_end_date);
        if (isClosed) return res.status(400).json({ message: "Closed events cannot be edited" });

        const {
            event_description, registration_limit, registration_deadline,
            event_start_date, event_end_date, event_tags,
            custom_form, merchandise_items, purchase_limit, per_item_limit
        } = req.body;

        if (event_description !== undefined) event.event_description = event_description;

        if (registration_limit !== undefined) {
            if (registration_limit < event.registration_limit) {
                return res.status(400).json({
                    message: `Registration limit can only be increased. Current: ${event.registration_limit}`
                });
            }
            event.registration_limit = registration_limit;
        }

        if (registration_deadline !== undefined) {
            const newDeadline = new Date(registration_deadline);
            const endDate = event_end_date ? new Date(event_end_date) : event.event_end_date;
            if (newDeadline > endDate) {
                return res.status(400).json({ message: "Registration deadline cannot be after the event end date" });
            }
            event.registration_deadline = newDeadline;
        }

        if (event_start_date !== undefined) event.event_start_date = new Date(event_start_date);
        if (event_end_date !== undefined) event.event_end_date = new Date(event_end_date);

        if (event_tags !== undefined) {
            if (!Array.isArray(event_tags) || event_tags.length === 0) {
                return res.status(400).json({ message: "At least one event tag is required" });
            }
            if (!event_tags.every((tag) => ALLOWED_EVENT_TAGS.includes(tag))) {
                return res.status(400).json({ message: "Invalid event tag provided" });
            }
            event.event_tags = event_tags;
        }

        if (custom_form !== undefined && event.event_type === "normal") {
            const regCount = await Registration.countDocuments({ event_id });
            if (regCount > 0) {
                return res.status(400).json({ message: "Cannot edit custom form after registrations have been received" });
            }
            event.custom_form = custom_form;
        }

        if (merchandise_items !== undefined && event.event_type === "merchandise") {
            event.merchandise_items = merchandise_items;
        }
        if (purchase_limit !== undefined) event.purchase_limit = purchase_limit;
        if (per_item_limit !== undefined) event.per_item_limit = per_item_limit;

        if (event.eligibility && !['iiit', 'all'].includes(event.eligibility)) {
            event.eligibility = 'all';
        }

        await event.save();

        if (event.status === "published") {
            try {
                await sendDiscordNotification(req.user.user_id, event, "update");
            } catch (webhookErr) {
                console.warn("Discord webhook failed:", webhookErr.message);
            }
        }

        res.json({ message: "Event updated successfully", event });
    } catch (error) {
        console.log(error);
        res.status(500).json({ message: "Something went wrong" });
    }
});

// LIST PUBLISHED EVENTS
router.get("/list", auth, async (req, res) => {
    try {
        const events = await Event.find({ status: "published" })
            .populate("organizer_id", "organizer_name email is_active");

        const activeEvents = events.filter(
            (event) => event.organizer_id && event.organizer_id.is_active
        );
        res.json(activeEvents);
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Server error" });
    }
});

// TRENDING EVENTS
router.get("/trending", auth, async (req, res) => {
    try {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        const trending = await Registration.aggregate([
            { $match: { createdAt: { $gte: oneDayAgo } } },
            { $group: { _id: "$event_id", reg_count: { $sum: 1 } } },
            { $sort: { reg_count: -1 } },
            { $limit: 5 }
        ]);

        const eventIds = trending.map(t => t._id);
        const events = await Event.find({ _id: { $in: eventIds }, status: "published" })
            .populate("organizer_id", "organizer_name email is_active");

        const result = trending
            .map(t => {
                const ev = events.find(e => e._id.toString() === t._id.toString());
                if (!ev || !ev.organizer_id?.is_active) return null;
                return { ...ev.toObject(), reg_count: t.reg_count };
            })
            .filter(Boolean);

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// MY EVENTS (organizer)
router.get("/my-events", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const events = await Event.find({ organizer_id: req.user.user_id });
        res.json(events);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
});

module.exports = router;
