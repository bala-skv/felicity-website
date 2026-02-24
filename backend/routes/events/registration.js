const express = require("express");
const router = express.Router();
const Event = require("../../models/Event");
const Registration = require("../../models/Registration");
const User = require("../../models/User");
const auth = require("../../middleware/auth_middleware");
const roleCheck = require("../../middleware/role_middleware");
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const { sendRegistrationEmail } = require("../../utils/mailer");

// CHECK REGISTRATION STATUS
router.get("/check-registration/:eventId", auth, async (req, res) => {
    try {
        const registration = await Registration.findOne({
            event_id: req.params.eventId,
            participant_id: req.user.user_id,
        });

        if (!registration) return res.json({ registered: false });

        res.json({
            registered: true,
            registration_id: registration._id,
            ticket_id: registration.ticket_id,
            qr_code: registration.qr_code,
            items_ordered: registration.items_ordered,
            status: registration.status,
            payment_status: registration.payment_status,
            payment_proof_uploaded_at: registration.payment_proof_uploaded_at,
            rejection_reason: registration.rejection_reason,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
});

// REGISTER FOR EVENT (normal + merchandise)
router.post("/register/:eventId", auth, async (req, res) => {
    try {
        const { eventId } = req.params;
        const userId = req.user.user_id;
        const { form_responses, items_ordered } = req.body;

        const user = await User.findById(userId);
        if (!user || !user.is_active) {
            return res.status(403).json({ message: "Account is disabled" });
        }

        const event = await Event.findById(eventId);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (event.status !== "published") {
            return res.status(400).json({ message: "Event not open for registration" });
        }
        if (new Date() > event.registration_deadline) {
            return res.status(400).json({ message: "Registration deadline passed" });
        }

        // Eligibility check
        if (event.eligibility === "iiit" && user.participant_type === "Non-IIIT") {
            return res.status(403).json({ message: "This event is restricted to IIIT students only" });
        }

        // ---- Normal event ----
        if (event.event_type === "normal") {
            const currentRegistrations = await Registration.countDocuments({ event_id: eventId });
            if (currentRegistrations >= event.registration_limit) {
                return res.status(400).json({ message: "Event registration full" });
            }

            const existingRegistration = await Registration.findOne({
                event_id: eventId, participant_id: userId,
            });
            if (existingRegistration) {
                return res.status(400).json({ message: "Already registered for this event" });
            }

            // Validate required custom form fields
            if (event.custom_form?.length > 0) {
                for (const field of event.custom_form) {
                    if (field.is_required) {
                        const response = form_responses && form_responses[field.field_name];
                        if (response === undefined || response === null || response === "") {
                            return res.status(400).json({ message: `Required field "${field.field_name}" is missing` });
                        }
                    }
                }
            }

            const ticket_id = uuidv4();
            const qr_code = await QRCode.toDataURL(ticket_id);

            const newRegistration = new Registration({
                event_id: eventId,
                participant_id: userId,
                status: "confirmed",
                form_responses: form_responses || {},
                ticket_id,
                qr_code,
            });
            await newRegistration.save();

            // Send QR email
            try {
                const participant = await User.findById(userId).select("email first_name last_name");
                const organizer = await User.findById(event.organizer_id).select("organizer_name");
                await sendRegistrationEmail(
                    participant.email,
                    `${participant.first_name || ""} ${participant.last_name || ""}`.trim() || "Participant",
                    event.event_name,
                    organizer?.organizer_name || "Organizer",
                    event.event_start_date
                        ? new Date(event.event_start_date).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })
                        : "TBD",
                    qr_code,
                    "normal"
                );
            } catch (mailErr) {
                console.warn("Registration email failed:", mailErr.message);
            }

            return res.status(201).json({
                message: "Successfully registered for event",
                registration: newRegistration,
            });
        }

        // ---- Merchandise event ----
        if (event.event_type === "merchandise") {
            if (!items_ordered || items_ordered.length === 0) {
                return res.status(400).json({ message: "No items selected" });
            }

            const existingOrders = await Registration.find({
                event_id: eventId, participant_id: userId,
            });

            // Tally previous quantities
            const previousItemQty = {};
            let totalPreviousQty = 0;
            for (const order of existingOrders) {
                for (const item of order.items_ordered) {
                    previousItemQty[item.item_name] = (previousItemQty[item.item_name] || 0) + item.quantity;
                    totalPreviousQty += item.quantity;
                }
            }

            // Tally new quantities
            const newItemQty = {};
            let totalNewQty = 0;
            for (const item of items_ordered) {
                newItemQty[item.item_name] = (newItemQty[item.item_name] || 0) + item.quantity;
                totalNewQty += item.quantity;
            }

            // Total purchase limit
            if (totalPreviousQty + totalNewQty > event.purchase_limit) {
                return res.status(400).json({
                    message: `Total purchase limit exceeded. Max ${event.purchase_limit} items per participant. You've already ordered ${totalPreviousQty}.`
                });
            }

            // Per-item limit
            for (const [itemName, newQty] of Object.entries(newItemQty)) {
                const prevQty = previousItemQty[itemName] || 0;
                if (prevQty + newQty > event.per_item_limit) {
                    return res.status(400).json({
                        message: `Per-item limit exceeded for "${itemName}". Max ${event.per_item_limit} per participant. You've already ordered ${prevQty}.`
                    });
                }
            }

            // Validate stock
            for (const orderedItem of items_ordered) {
                const merchItem = event.merchandise_items.find(mi => mi.item_name === orderedItem.item_name);
                if (!merchItem) {
                    return res.status(400).json({ message: `Item "${orderedItem.item_name}" not found` });
                }
                const variant = merchItem.variants.find(v => v.size === orderedItem.size && v.color === orderedItem.color);
                if (!variant) {
                    return res.status(400).json({
                        message: `Variant ${orderedItem.size}/${orderedItem.color} not found for "${orderedItem.item_name}"`
                    });
                }
                if (variant.stock < orderedItem.quantity) {
                    return res.status(400).json({
                        message: `Insufficient stock for "${orderedItem.item_name}" (${orderedItem.size}/${orderedItem.color}). Available: ${variant.stock}`
                    });
                }
                orderedItem.price = variant.price;
            }

            const newRegistration = new Registration({
                event_id: eventId,
                participant_id: userId,
                status: "confirmed",
                items_ordered,
                payment_status: "pending_upload",
            });
            await newRegistration.save();

            return res.status(201).json({
                message: "Order placed. Please upload payment proof to complete your purchase.",
                registration: newRegistration,
            });
        }

        return res.status(400).json({ message: "Unknown event type" });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Server error" });
    }
});

// MY REGISTRATIONS (participant)
router.get("/my-registrations", auth, roleCheck(["participant"]), async (req, res) => {
    try {
        const registrations = await Registration.find({ participant_id: req.user.user_id })
            .populate("event_id")
            .sort({ createdAt: -1 });
        res.json(registrations);
    } catch (e) {
        res.status(500).json({ message: "Internal server error" });
    }
});

// CANCEL REGISTRATION (participant)
router.delete("/register/:event_id", auth, roleCheck(["participant"]), async (req, res) => {
    try {
        const { event_id } = req.params;
        const event = await Event.findById(event_id);
        if (!event) return res.status(404).json({ message: "Event not found" });
        if (new Date() > event.event_start_date) {
            return res.status(400).json({ message: "Event already started. Cannot cancel." });
        }

        const registration = await Registration.findOne({
            event_id, participant_id: req.user.user_id
        });
        if (!registration) return res.status(404).json({ message: "Registration not found" });

        // Restore stock for merchandise
        if (event.event_type === "merchandise" && registration.items_ordered) {
            for (const orderedItem of registration.items_ordered) {
                const merchItem = event.merchandise_items.find(mi => mi.item_name === orderedItem.item_name);
                if (merchItem) {
                    const variant = merchItem.variants.find(v => v.size === orderedItem.size && v.color === orderedItem.color);
                    if (variant) variant.stock += orderedItem.quantity;
                }
            }
            await event.save();
        }

        await Registration.deleteOne({ _id: registration._id });
        res.json({ message: "Registration cancelled successfully" });
    } catch (err) {
        console.log(err);
        res.status(500).json({ message: "Something went wrong" });
    }
});

// UPLOAD PAYMENT PROOF (participant)
router.patch("/:event_id/registrations/:registration_id/payment-proof", auth, roleCheck(["participant"]), async (req, res) => {
    try {
        const { event_id, registration_id } = req.params;
        const { payment_proof } = req.body;

        if (!payment_proof) {
            return res.status(400).json({ message: "Payment proof image is required" });
        }

        const registration = await Registration.findById(registration_id);
        if (!registration) return res.status(404).json({ message: "Registration not found" });
        if (registration.event_id.toString() !== event_id) {
            return res.status(400).json({ message: "Registration does not belong to this event" });
        }
        if (registration.participant_id.toString() !== req.user.user_id) {
            return res.status(403).json({ message: "Access denied" });
        }
        if (!["pending_upload", "rejected"].includes(registration.payment_status)) {
            return res.status(400).json({ message: "Payment proof cannot be uploaded at this stage" });
        }

        registration.payment_proof = payment_proof;
        registration.payment_proof_uploaded_at = new Date();
        registration.payment_status = "pending_approval";
        registration.rejection_reason = null;
        await registration.save();

        return res.json({ message: "Payment proof uploaded successfully", registration });
    } catch (e) {
        console.error(e);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
