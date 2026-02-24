const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
    {
        user_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        event_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },

        // Type of notification
        type: {
            type: String,
            enum: ["announcement", "reply", "pin"],
            required: true
        },

        // Reference to the discussion message that triggered this
        message_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Discussion",
            required: true
        },

        // Preview text for display
        content: {
            type: String,
            required: true,
            maxlength: 200
        },

        // Who triggered the notification
        triggered_by: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        read: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

notificationSchema.index({ user_id: 1, read: 1, createdAt: -1 });
notificationSchema.index({ user_id: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", notificationSchema);
