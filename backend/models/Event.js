const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
    {
        event_name: {
            type: String,
            required: true
        },

        event_description: {
            type: String,
            required: true
        },

        event_type: {
            type: String,
            enum: ["normal", "merchandise"],
            required: true
        },

        event_category: {
            type: String,
            enum: [
                "competition",
                "workshop",
                "academic-talk",
                "cultural",
                "social",
                "sports",
                "recreational",
                "miscellaneous"
            ],
            default: "miscellaneous"
        },

        eligibility: {
            type: String,
            enum: ["iiit", "all"],
            default: "all",
            required: true
        },

        registration_deadline: {
            type: Date,
            required: true
        },

        event_start_date: {
            type: Date,
            required: true
        },

        event_end_date: {
            type: Date,
            required: true
        },

        registration_limit: {
            type: Number,
            required: true
        },

        registration_fee: {
            type: Number,
            default: 0
        },

        organizer_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        event_tags: [String],

        status: {
            type: String,
            enum: ["draft", "published", "ongoing", "completed", "closed"],
            default: "draft"
        },

        // Normal event: custom registration form
        custom_form: [
            {
                field_name: { type: String, required: true },
                field_type: {
                    type: String,
                    enum: ["text", "dropdown", "checkbox"],
                    required: true
                },
                options: [String],
                is_required: { type: Boolean, default: false }
            }
        ],

        // Merchandise event fields
        merchandise_items: [
            {
                item_name: { type: String },
                variants: [
                    {
                        size: { type: String },
                        color: { type: String },
                        stock: { type: Number, default: 0 },
                        price: { type: Number, default: 0 }
                    }
                ]
            }
        ],

        purchase_limit: {
            type: Number,
            default: 5
        },

        per_item_limit: {
            type: Number,
            default: 1
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
