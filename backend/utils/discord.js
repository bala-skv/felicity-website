const User = require("../models/User");

// send discord embed via organizer's webhook
async function sendDiscordNotification(organizerId, event, type) {
    const organizer = await User.findById(organizerId).select("discord_webhook organizer_name");
    if (!organizer?.discord_webhook) return;

    const tag = event.event_tags?.[0] || event.event_category || "event";
    const deadline = event.registration_deadline
        ? new Date(event.registration_deadline).toLocaleDateString("en-IN")
        : "TBD";
    const start = event.event_start_date
        ? new Date(event.event_start_date).toLocaleDateString("en-IN")
        : "TBD";

    const isNew = type === "publish";
    const payload = {
        username: organizer.organizer_name || "Event Bot",
        embeds: [
            {
                title: isNew
                    ? `🎉 New Event: ${event.event_name}`
                    : `✏️ Event Updated: ${event.event_name}`,
                description: event.event_description || "",
                color: isNew ? 0x2563eb : 0xf59e0b,
                fields: [
                    { name: "Tag", value: tag, inline: true },
                    { name: "Eligibility", value: event.eligibility || "All", inline: true },
                    { name: "Starts", value: start, inline: true },
                    { name: "Registration Deadline", value: deadline, inline: true },
                    { name: "Fee", value: event.registration_fee ? `₹${event.registration_fee}` : "Free", inline: true }
                ],
                footer: { text: `Organizer: ${organizer.organizer_name || ""}` },
                timestamp: new Date().toISOString()
            }
        ]
    };

    await fetch(organizer.discord_webhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}

module.exports = { sendDiscordNotification };
