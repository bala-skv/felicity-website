const mongoose = require("mongoose");

const reactionSchema = new mongoose.Schema({
    user_id: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    emoji: { type: String, required: true }
}, { _id: false });

const discussionSchema = new mongoose.Schema(
    {
        event_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },

        author_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        author_role: {
            type: String,
            enum: ["participant", "organizer"],
            required: true
        },

        content: {
            type: String,
            required: true,
            maxlength: 2000
        },

        // null = top-level message, otherwise reply to parent
        parent_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Discussion",
            default: null
        },

        is_announcement: {
            type: Boolean,
            default: false
        },

        is_pinned: {
            type: Boolean,
            default: false
        },

        reactions: {
            type: [reactionSchema],
            default: []
        },

        is_deleted: {
            type: Boolean,
            default: false
        }
    },
    { timestamps: true }
);

discussionSchema.index({ event_id: 1, createdAt: -1 });
discussionSchema.index({ event_id: 1, parent_id: 1 });

module.exports = mongoose.model("Discussion", discussionSchema);
