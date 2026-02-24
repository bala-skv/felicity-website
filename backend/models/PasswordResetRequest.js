const mongoose = require("mongoose");

const passwordResetRequestSchema = new mongoose.Schema(
    {
        organizer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        reason: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: ["pending", "approved", "rejected"],
            default: "pending"
        },

        admin_comments: {
            type: String,
            default: ""
        },

        new_password: {
            type: String,
            default: ""
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("PasswordResetRequest", passwordResetRequestSchema);
