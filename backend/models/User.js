const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
    {
        role: {
            type: String,
            enum: ["participant", "organizer", "admin"],
            required: true
        },

        first_name: {
            type: String
        },

        last_name: {
            type: String
        },

        email: {
            type: String,
            required: true,
            unique: true
        },

        password: {
            type: String,
            required: true
        },

        participant_type: {
            type: String,
            enum: ["IIIT", "Non-IIIT"]
        },

        college_name: {
            type: String
        },

        contact_number: {
            type: String
        },

        discord_webhook: {
            type: String
        },

        organizer_name: {
            type: String
        },

        category: {
            type: String
        },

        description: {
            type: String
        },

        interests: [String],

        followed_organizers: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User"
            }
        ],
        is_active: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
