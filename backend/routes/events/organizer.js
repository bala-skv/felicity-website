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

/* helper: verify organizer owns the event */
async function verifyOwnership(eventId, userId) {
    const event = await Event.findById(eventId);
    if (!event) return { error: "Event not found", status: 404 };
    if (event.organizer_id.toString() !== userId) return { error: "Access denied", status: 403 };
    return { event };
}

// VIEW REGISTRATIONS (organizer)
router.get("/:event_id/registrations", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id } = req.params;
        const check = await verifyOwnership(event_id, req.user.user_id);
        if (check.error) return res.status(check.status).json({ message: check.error });

        const registrations = await Registration.find({ event_id })
            .populate("participant_id", "first_name last_name email participant_type")
            .sort({ createdAt: -1 });
        res.json(registrations);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
});

// TOGGLE ATTENDANCE (normal events)
router.patch("/:event_id/registrations/:registration_id/attendance", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id, registration_id } = req.params;
        const { attendance_marked } = req.body;

        const check = await verifyOwnership(event_id, req.user.user_id);
        if (check.error) return res.status(check.status).json({ message: check.error });
        if (check.event.event_type !== "normal") {
            return res.status(400).json({ message: "Attendance is only applicable for normal events" });
        }

        const registration = await Registration.findOne({ _id: registration_id, event_id });
        if (!registration) return res.status(404).json({ message: "Registration not found" });

        registration.attendance_marked = Boolean(attendance_marked);
        registration.attendance_time = Boolean(attendance_marked) ? new Date() : null;
        await registration.save();

        return res.json({ message: "Attendance updated", registration });
    } catch (e) {
        return res.status(500).json({ message: "Server error" });
    }
});

// SCAN QR — mark attendance / collection via ticket_id
router.post("/:event_id/scan-qr", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id } = req.params;
        const { ticket_id } = req.body;
        if (!ticket_id) return res.status(400).json({ message: "ticket_id is required" });

        const check = await verifyOwnership(event_id, req.user.user_id);
        if (check.error) return res.status(check.status).json({ message: check.error });

        const registration = await Registration.findOne({ ticket_id, event_id })
            .populate("participant_id", "first_name last_name email");
        if (!registration) return res.status(404).json({ message: "No registration found for this QR code" });

        const participantInfo = {
            name: `${registration.participant_id?.first_name || ""} ${registration.participant_id?.last_name || ""}`.trim(),
            email: registration.participant_id?.email
        };

        // Merchandise: mark all items collected
        if (check.event.event_type === "merchandise") {
            const allCollected = registration.items_ordered.every((i) => i.collected);
            if (allCollected) {
                return res.json({
                    already_marked: true, mode: "merchandise",
                    message: "Items already collected",
                    participant: participantInfo,
                    collection_time: registration.collection_time,
                    items: registration.items_ordered.map((i) => ({
                        item_name: i.item_name, size: i.size, color: i.color, quantity: i.quantity
                    }))
                });
            }
            const now = new Date();
            registration.items_ordered.forEach((i) => { i.collected = true; });
            registration.collection_time = now;
            await registration.save();
            return res.json({
                already_marked: false, mode: "merchandise",
                message: "Items marked as collected",
                participant: participantInfo,
                collection_time: now,
                items: registration.items_ordered.map((i) => ({
                    item_name: i.item_name, size: i.size, color: i.color, quantity: i.quantity
                }))
            });
        }

        // Normal event: mark attendance
        if (registration.attendance_marked) {
            return res.json({
                already_marked: true, mode: "normal",
                message: "Already marked present",
                participant: participantInfo,
                attendance_time: registration.attendance_time
            });
        }

        registration.attendance_marked = true;
        registration.attendance_time = new Date();
        await registration.save();

        return res.json({
            already_marked: false, mode: "normal",
            message: "Attendance marked successfully",
            participant: participantInfo,
            attendance_time: registration.attendance_time
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// TOGGLE COLLECTED (merchandise items)
router.patch("/:event_id/registrations/:registration_id/collected", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id, registration_id } = req.params;
        const { item_index, collected } = req.body;

        const check = await verifyOwnership(event_id, req.user.user_id);
        if (check.error) return res.status(check.status).json({ message: check.error });
        if (check.event.event_type !== "merchandise") {
            return res.status(400).json({ message: "Collected is only applicable for merchandise events" });
        }

        const registration = await Registration.findOne({ _id: registration_id, event_id });
        if (!registration) return res.status(404).json({ message: "Order not found" });

        if (item_index === undefined || item_index === null || item_index < 0 || item_index >= registration.items_ordered.length) {
            return res.status(400).json({ message: "Invalid item index" });
        }

        registration.items_ordered[item_index].collected = Boolean(collected);
        await registration.save();

        return res.json({ message: "Collected status updated", registration });
    } catch (err) {
        console.log(err);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

// EVENT ANALYTICS (organizer)
router.get("/:event_id/analytics", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id } = req.params;
        const check = await verifyOwnership(event_id, req.user.user_id);
        if (check.error) return res.status(check.status).json({ message: check.error });

        const registrations = await Registration.find({ event_id, status: "confirmed" });
        const total_registrations = registrations.length;

        if (check.event.event_type === "normal") {
            const total_attendance = registrations.filter((r) => r.attendance_marked).length;
            const total_revenue = total_registrations * (check.event.registration_fee || 0);
            return res.json({ mode: "normal", total_registrations, total_attendance, total_revenue });
        }

        // Merchandise analytics
        const pending_uploads = registrations.filter((r) => r.payment_status === "pending_upload").length;
        const pending_approvals = registrations.filter((r) => r.payment_status === "pending_approval").length;
        const approved_orders = registrations.filter((r) => r.payment_status === "approved").length;

        const itemMap = new Map();
        let total_collected_quantity = 0;
        let total_revenue = 0;

        const approvedRegs = registrations.filter((r) => r.payment_status === "approved");
        for (const reg of approvedRegs) {
            for (const item of reg.items_ordered || []) {
                const key = `${item.item_name}__${item.size}__${item.color}`;
                const existing = itemMap.get(key) || {
                    item_name: item.item_name, size: item.size, color: item.color,
                    sold_quantity: 0, collected_quantity: 0, revenue: 0
                };

                existing.sold_quantity += item.quantity || 0;
                existing.revenue += (item.price || 0) * (item.quantity || 0);
                if (item.collected) {
                    existing.collected_quantity += item.quantity || 0;
                    total_collected_quantity += item.quantity || 0;
                }
                total_revenue += (item.price || 0) * (item.quantity || 0);
                itemMap.set(key, existing);
            }
        }

        const items_sold = Array.from(itemMap.values()).sort((a, b) => b.sold_quantity - a.sold_quantity);

        return res.json({
            mode: "merchandise", total_registrations,
            pending_uploads, pending_approvals, approved_orders,
            total_collected_quantity, total_revenue, items_sold
        });
    } catch (e) {
        console.error(e);
        res.status(500).json({ message: "Server error" });
    }
});

// GET PENDING PAYMENTS (organizer)
router.get("/:event_id/pending-payments", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id } = req.params;
        const check = await verifyOwnership(event_id, req.user.user_id);
        if (check.error) return res.status(check.status).json({ message: check.error });

        const registrations = await Registration.find({
            event_id,
            payment_status: { $in: ["pending_approval", "approved", "rejected"] }
        })
            .populate("participant_id", "first_name last_name email roll_number phone_number")
            .sort({ payment_proof_uploaded_at: -1 });

        return res.json(registrations);
    } catch (err) {
        return res.status(500).json({ message: "Internal server error" });
    }
});

// APPROVE PAYMENT (organizer)
router.patch("/:event_id/registrations/:registration_id/approve-payment", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id, registration_id } = req.params;
        const check = await verifyOwnership(event_id, req.user.user_id);
        if (check.error) return res.status(check.status).json({ message: check.error });

        const registration = await Registration.findById(registration_id)
            .populate("participant_id", "first_name last_name email");
        if (!registration) return res.status(404).json({ message: "Registration not found" });
        if (registration.event_id.toString() !== event_id) {
            return res.status(400).json({ message: "Registration does not belong to this event" });
        }
        if (registration.payment_status !== "pending_approval") {
            return res.status(400).json({ message: "This order is not pending approval" });
        }

        // Validate and decrement stock
        for (const orderedItem of registration.items_ordered) {
            const merchItem = check.event.merchandise_items.find(mi => mi.item_name === orderedItem.item_name);
            if (!merchItem) {
                return res.status(400).json({ message: `Item "${orderedItem.item_name}" no longer exists` });
            }
            const variant = merchItem.variants.find(v => v.size === orderedItem.size && v.color === orderedItem.color);
            if (!variant) {
                return res.status(400).json({
                    message: `Variant ${orderedItem.size}/${orderedItem.color} no longer exists for "${orderedItem.item_name}"`
                });
            }
            if (variant.stock < orderedItem.quantity) {
                return res.status(400).json({
                    message: `Insufficient stock for "${orderedItem.item_name}" (${orderedItem.size}/${orderedItem.color}). Available: ${variant.stock}`
                });
            }
            variant.stock -= orderedItem.quantity;
        }
        await check.event.save();

        // Generate ticket + QR
        const ticket_id = uuidv4();
        const qr_code = await QRCode.toDataURL(ticket_id);

        registration.payment_status = "approved";
        registration.ticket_id = ticket_id;
        registration.qr_code = qr_code;
        await registration.save();

        // Send confirmation email
        try {
            const participant = registration.participant_id;
            const organizer = await User.findById(check.event.organizer_id).select("organizer_name");
            await sendRegistrationEmail(
                participant.email,
                `${participant.first_name || ""} ${participant.last_name || ""}`.trim() || "Participant",
                check.event.event_name,
                organizer?.organizer_name || "Organizer",
                check.event.event_start_date
                    ? new Date(check.event.event_start_date).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })
                    : "TBD",
                qr_code,
                "merchandise"
            );
        } catch (mailErr) {
            console.warn("Payment approval email failed:", mailErr.message);
        }

        return res.json({ message: "Payment approved. Ticket issued.", registration });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Something went wrong" });
    }
});

// REJECT PAYMENT (organizer)
router.patch("/:event_id/registrations/:registration_id/reject-payment", auth, roleCheck(["organizer"]), async (req, res) => {
    try {
        const { event_id, registration_id } = req.params;
        const { reason } = req.body;

        const check = await verifyOwnership(event_id, req.user.user_id);
        if (check.error) return res.status(check.status).json({ message: check.error });

        const registration = await Registration.findById(registration_id);
        if (!registration) return res.status(404).json({ message: "Registration not found" });
        if (registration.event_id.toString() !== event_id) {
            return res.status(400).json({ message: "Registration does not belong to this event" });
        }
        if (registration.payment_status !== "pending_approval") {
            return res.status(400).json({ message: "This order is not pending approval" });
        }

        registration.payment_status = "rejected";
        registration.rejection_reason = reason || "Payment proof rejected";
        await registration.save();

        return res.json({ message: "Payment rejected", registration });
    } catch (e) {
        console.log(e);
        return res.status(500).json({ message: "Server error" });
    }
});

module.exports = router;
