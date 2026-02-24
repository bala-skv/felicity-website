// figure out event status from dates
export function getComputedStatus(event) {
    if (!event) return "draft";
    if (event.status === "draft") return "draft";

    const now = new Date();
    const start = new Date(event.event_start_date);
    const end = new Date(event.event_end_date);

    if (now < start) return "published";
    if (now >= start && now <= end) return "ongoing";
    return "closed";
}

export function formatDate(d) {
    return d
        ? new Date(d).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })
        : "N/A";
}

export const CATEGORY_LABELS = {
    "competition": "Competition",
    "workshop": "Workshop",
    "academic-talk": "Academic/Talk",
    "cultural": "Cultural",
    "social": "Social",
    "sports": "Sports",
    "recreational": "Recreational",
    "miscellaneous": "Miscellaneous"
};

export function getCategoryLabel(tag) {
    return CATEGORY_LABELS[tag] || "Miscellaneous";
}

export function getStatusStyle(status) {
    switch (status) {
        case "draft":     return { backgroundColor: "#e2e8f0", color: "#475569" };
        case "published": return { backgroundColor: "#dbeafe", color: "#1e40af" };
        case "ongoing":   return { backgroundColor: "#dcfce7", color: "#166534" };
        default:          return { backgroundColor: "#fee2e2", color: "#991b1b" };
    }
}

// For participant view: "published" → "upcoming"
export function getParticipantStatusLabel(status) {
    return status === "published" ? "upcoming" : status;
}
