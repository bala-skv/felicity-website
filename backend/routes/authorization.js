const express = require("express");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const axios = require("axios");

const router = express.Router();
const jwt = require("jsonwebtoken");

const verifyCaptcha = async (token) => {
    if (!token) return false;
    try {
        const response = await axios.post(
            "https://www.google.com/recaptcha/api/siteverify",
            null,
            {
                params: {
                    secret: process.env.RECAPTCHA_SECRET_KEY,
                    response: token
                }
            }
        );
        return response.data.success === true;
    } catch (err) {
        console.log("reCAPTCHA verification error:", err.message);
        return false;
    }
};

router.post("/register", async (req, res) => {
    try {
        const {
            first_name,
            last_name,
            email,
            password,
            participant_type,
            college_name,
            contact_number,
            captcha_token
        } = req.body;

        // Verify CAPTCHA
        const captchaOk = await verifyCaptcha(captcha_token);
        if (!captchaOk) {
            return res.status(400).json({ message: "CAPTCHA verification failed. Please try again." });
        }

        // Required field validation
        if (!first_name || !last_name || !email || !password || !participant_type || !contact_number) {
            return res.status(400).json({ message: "All fields are required" });
        }

        // Non-IIIT must provide college name
        if (participant_type === "Non-IIIT" && !college_name) {
            return res.status(400).json({ message: "College/Organization name is required for Non-IIIT participants" });
        }

        // Check duplicate email
        const registered_user = await User.findOne({ email });
        if (registered_user) {
            return res.status(400).json({ message: "Email already registered" });
        }

        // IIIT email validation
        if (participant_type === "IIIT") {
            if (!email.toLowerCase().endsWith("iiit.ac.in")) {
                return res.status(400).json({ message: "Invalid IIIT email domain" });
            }
        }

        // Hash password
        const hashed_password = await bcrypt.hash(password, 10);

        // Create user
        const new_user = new User({
            role: "participant",
            first_name,
            last_name,
            email,
            password: hashed_password,
            participant_type,
            college_name: participant_type === "IIIT" ? "IIIT" : college_name,
            contact_number
        });

        await new_user.save();

        res.status(201).json({ message: "User registered successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Something went wrong" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password, captcha_token } = req.body;

        // Verify CAPTCHA
        const captchaOk = await verifyCaptcha(captcha_token);
        if (!captchaOk) {
            return res.status(400).json({ message: "CAPTCHA verification failed. Please try again." });
        }

        // Check required fields
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password required" });
        }

        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials" });
        }
        if (user.is_active == false) {
            return res.status(403).json({ message: "Account is disabled" });
        }

        // Compare password
        const is_match = await bcrypt.compare(password, user.password);
        if (!is_match) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                user_id: user._id,
                role: user.role
            },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );

        res.status(200).json({
            message: "Login successful",
            token,
            role: user.role,
            userId: user._id,
            participant_type: user.participant_type || null
        });

    } catch (e) {
        console.log(e);
        res.status(500).json({ message: "Server error" });
    }
});


module.exports = router;
