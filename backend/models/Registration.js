const mongoose = require("mongoose");

const registrationSchema = new mongoose.Schema(
    {
        event_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Event",
            required: true
        },

        participant_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        status: {
            type: String,
            enum: ["confirmed", "cancelled"],
            default: "confirmed"
        },

        // Normal event: custom form responses
        form_responses: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        // Merchandise event: items ordered
        items_ordered: [
            {
                item_name: { type: String },
                size: { type: String },
                color: { type: String },
                quantity: { type: Number, default: 1 },
                price: { type: Number, default: 0 },
                collected: { type: Boolean, default: false }
            }
        ],

        ticket_id: {
            type: String,
            unique: true,
            sparse: true
        },

        qr_code: {
            type: String
        },

        attendance_marked: {
            type: Boolean,
            default: false
        },

        attendance_time: {
            type: Date,
            default: null
        },

        collection_time: {
            type: Date,
            default: null
        },

        // Payment verification for merchandise
        payment_status: {
            type: String,
            enum: ["not_required", "pending_upload", "pending_approval", "approved", "rejected"],
            default: "not_required"
        },

        payment_proof: {
            type: String,
            default: null
        },

        payment_proof_uploaded_at: {
            type: Date,
            default: null
        },

        rejection_reason: {
            type: String,
            default: null
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Registration", registrationSchema);
