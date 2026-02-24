const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const auth_middleware = require("../middleware/auth_middleware");
const role_middleware = require("../middleware/role_middleware");
const PasswordResetRequest = require("../models/PasswordResetRequest");

const router = express.Router();

router.get(
    "/profile",
    auth_middleware,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.user_id).select("-password");

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            res.json(user);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.patch(
    "/update-profile",
    auth_middleware,
    async (req, res) => {
        try {
            const user = await User.findById(req.user.user_id);

            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const { first_name, last_name, contact_number, college_name, interests,
                organizer_name, category, description, discord_webhook } = req.body;

            // Participant fields
            if (first_name) user.first_name = first_name;
            if (last_name) user.last_name = last_name;
            if (contact_number !== undefined) user.contact_number = contact_number;
            if (college_name !== undefined && user.participant_type === "Non-IIIT") user.college_name = college_name;
            if (interests) user.interests = interests;

            // Organizer fields
            if (organizer_name !== undefined) user.organizer_name = organizer_name;
            if (category !== undefined) user.category = category;
            if (description !== undefined) user.description = description;
            if (discord_webhook !== undefined) user.discord_webhook = discord_webhook;

            await user.save();

            res.json({ message: "Profile updated successfully" });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.patch(
    "/change-password",
    auth_middleware,
    async (req, res) => {
        try {
            const { old_password, new_password } = req.body;

            const user = await User.findById(req.user.user_id);
            if (!user) {
                return res.status(404).json({ message: "User not found" });
            }

            const isMatch = await bcrypt.compare(old_password, user.password);
            if (!isMatch) {
                return res.status(400).json({ message: "Old password incorrect" });
            }

            user.password = await bcrypt.hash(new_password, 10);
            await user.save();

            res.json({ message: "Password changed successfully" });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.post(
    "/password-reset-request",
    auth_middleware,
    role_middleware(["organizer"]),
    async (req, res) => {
        try {
            const { reason } = req.body;

            if (!reason || !reason.trim()) {
                return res.status(400).json({ message: "Reason is required" });
            }

            // Check if there's already a pending request
            const pendingRequest = await PasswordResetRequest.findOne({
                organizer_id: req.user.user_id,
                status: "pending"
            });

            if (pendingRequest) {
                return res.status(400).json({
                    message: "You already have a pending password reset request"
                });
            }

            const newRequest = new PasswordResetRequest({
                organizer_id: req.user.user_id,
                reason: reason.trim()
            });

            await newRequest.save();

            res.status(201).json({
                message: "Password reset request submitted successfully",
                request: newRequest
            });

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.get(
    "/my-password-reset-requests",
    auth_middleware,
    role_middleware(["organizer"]),
    async (req, res) => {
        try {
            const requests = await PasswordResetRequest.find({
                organizer_id: req.user.user_id
            }).sort({ createdAt: -1 });

            res.json(requests);

        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.get(
    "/organizers",
    auth_middleware,
    async (req, res) => {
        try {
            const organizers = await User.find({ role: "organizer", is_active: true })
                .select("organizer_name category description email");

            // Get current user's followed list
            const user = await User.findById(req.user.user_id).select("followed_organizers");
            const followedIds = (user?.followed_organizers || []).map(id => id.toString());

            const result = organizers.map(org => ({
                _id: org._id,
                organizer_name: org.organizer_name,
                category: org.category,
                description: org.description,
                email: org.email,
                is_followed: followedIds.includes(org._id.toString())
            }));

            res.json(result);
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.post(
    "/follow/:id",
    auth_middleware,
    role_middleware(["participant"]),
    async (req, res) => {
        try {
            const organizer = await User.findOne({ _id: req.params.id, role: "organizer" });
            if (!organizer) {
                return res.status(404).json({ message: "Organizer not found" });
            }

            const user = await User.findById(req.user.user_id);
            if (user.followed_organizers.includes(req.params.id)) {
                return res.status(400).json({ message: "Already following" });
            }

            user.followed_organizers.push(req.params.id);
            await user.save();

            res.json({ message: "Followed successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.post(
    "/unfollow/:id",
    auth_middleware,
    role_middleware(["participant"]),
    async (req, res) => {
        try {
            const user = await User.findById(req.user.user_id);
            user.followed_organizers = user.followed_organizers.filter(
                (id) => id.toString() !== req.params.id
            );
            await user.save();

            res.json({ message: "Unfollowed successfully" });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

router.get(
    "/organizers/:id",
    auth_middleware,
    async (req, res) => {
        try {
            const Event = require("../models/Event");

            const organizer = await User.findOne({ _id: req.params.id, role: "organizer", is_active: true })
                .select("organizer_name category description email");

            if (!organizer) {
                return res.status(404).json({ message: "Organizer not found" });
            }

            // Check if current user follows this organizer
            const currentUser = await User.findById(req.user.user_id).select("followed_organizers");
            const is_followed = (currentUser?.followed_organizers || [])
                .map(id => id.toString()).includes(organizer._id.toString());

            // Get published/ongoing/completed events
            const events = await Event.find({
                organizer_id: organizer._id,
                status: { $in: ["published", "ongoing", "completed"] }
            }).sort({ event_start_date: -1 });

            const now = new Date();
            const upcoming = events.filter(e => new Date(e.event_end_date) > now);
            const past = events.filter(e => new Date(e.event_end_date) <= now);

            res.json({
                organizer: { ...organizer.toObject(), is_followed },
                upcoming,
                past
            });
        } catch (error) {
            console.log(error);
            res.status(500).json({ message: "Internal server error" });
        }
    }
);

module.exports = router;
