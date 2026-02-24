const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const auth_middleware = require("../middleware/auth_middleware");
const role_middleware = require("../middleware/role_middleware");
const Event = require("../models/Event");
const Registration = require("../models/Registration");
const PasswordResetRequest = require("../models/PasswordResetRequest");
const { sendMail } = require("../utils/mailer");

const router = express.Router();

router.post(
    "/create-organizer",
    auth_middleware,
    role_middleware(["admin"]),
    async (req, res) => {
        try {
            const { organizer_name, category, description, email } = req.body;

            if (!organizer_name || !category || !description || !email) {
                return res.status(400).json({ message: "All fields are required" });
            }

            const existing = await User.findOne({ email });
            if (existing) {
                return res.status(400).json({ message: "Organizer already exists" });
            }

            const temp_password = Math.random().toString(36).slice(-8);
            const hashed_password = await bcrypt.hash(temp_password, 10);

            const new_organizer = new User({
                role: "organizer",
                organizer_name,
                category,
                description,
                email,
                password: hashed_password,
                is_active: true
            });

            await new_organizer.save();

            // Send credentials via email
            await sendMail(
                email,
                "Your Felicity Organizer Account",
                `Hello ${organizer_name},\n\nYour organizer account has been created.\n\nEmail: ${email}\nTemporary Password: ${temp_password}\n\nPlease login and change your password.\n\nRegards,\nFelicity Admin`
            );

            res.status(201).json({
                message: "Organizer created successfully",
                temp_password
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.patch(
    "/disable-organizer/:id",
    auth_middleware,
    role_middleware(["admin"]),
    async (req, res) => {
        try {
            const organizer = await User.findById(req.params.id);

            if (!organizer || organizer.role !== "organizer") {
                return res.status(404).json({ message: "Organizer not found" });
            }

            organizer.is_active = false;
            await organizer.save();

            res.json({ message: "Organizer disabled successfully" });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.patch(
    "/enable-organizer/:id",
    auth_middleware,
    role_middleware(["admin"]),
    async (req, res) => {
        try {
            const organizer = await User.findById(req.params.id);

            if (!organizer || organizer.role !== "organizer") {
                return res.status(404).json({ message: "Organizer not found" });
            }

            organizer.is_active = true;
            await organizer.save();

            res.json({ message: "Organizer enabled successfully" });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.delete(
    "/delete-organizer/:id",
    auth_middleware,
    role_middleware(["admin"]),
    async (req, res) => {
        try {
            const organizer = await User.findById(req.params.id);

            if (!organizer || organizer.role !== "organizer") {
                return res.status(404).json({ message: "Organizer not found" });
            }

            const events = await Event.find({ organizer_id: organizer._id });
            const eventIds = events.map(event => event._id);

            await Registration.deleteMany({
                event_id: { $in: eventIds }
            });

            await Event.deleteMany({
                organizer_id: organizer._id
            });

            await organizer.deleteOne();

            res.json({
                message: "Organizer and all related events + registrations deleted successfully"
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.get(
    "/all-organizers",
    auth_middleware,
    role_middleware(["admin"]),
    async (req, res) => {
        try {
            const organizers = await User.find({ role: "organizer" });
            res.json(organizers);
        } catch (error) {
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.get(
    "/password-reset-requests",
    auth_middleware,
    role_middleware(["admin"]),
    async (req, res) => {
        try {
            const requests = await PasswordResetRequest.find()
                .populate("organizer_id", "organizer_name email")
                .sort({ createdAt: -1 });

            res.json(requests);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.patch(
    "/password-reset/:id/approve",
    auth_middleware,
    role_middleware(["admin"]),
    async (req, res) => {
        try {
            const request = await PasswordResetRequest.findById(req.params.id)
                .populate("organizer_id", "organizer_name email");

            if (!request) {
                return res.status(404).json({ message: "Request not found" });
            }

            if (request.status !== "pending") {
                return res.status(400).json({ message: "Request already processed" });
            }

            // Generate new password
            const new_password = Math.random().toString(36).slice(-8);
            const hashed_password = await bcrypt.hash(new_password, 10);

            // Update organizer's password
            await User.findByIdAndUpdate(request.organizer_id._id, {
                password: hashed_password
            });

            // Update request
            request.status = "approved";
            request.new_password = new_password;
            request.admin_comments = req.body.admin_comments || "Approved";
            await request.save();

            // Send email with new password
            await sendMail(
                request.organizer_id.email,
                "Password Reset Approved - Felicity",
                `Hello ${request.organizer_id.organizer_name},\n\nYour password reset request has been approved.\n\nYour new password: ${new_password}\n\nPlease login and change your password.\n\nRegards,\nFelicity Admin`
            );

            res.json({
                message: "Password reset approved",
                new_password
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.patch(
    "/password-reset/:id/reject",
    auth_middleware,
    role_middleware(["admin"]),
    async (req, res) => {
        try {
            const { admin_comments } = req.body;

            const request = await PasswordResetRequest.findById(req.params.id);

            if (!request) {
                return res.status(404).json({ message: "Request not found" });
            }

            if (request.status !== "pending") {
                return res.status(400).json({ message: "Request already processed" });
            }

            request.status = "rejected";
            request.admin_comments = admin_comments || "Rejected";
            await request.save();

            res.json({ message: "Password reset rejected" });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

module.exports = router;
