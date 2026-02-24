import { Link } from "react-router-dom";
import { formatDate, getComputedStatus, getStatusStyle, getCategoryLabel, getParticipantStatusLabel } from "../utils/helpers";

// shared card used on dashboard / browse / my-events pages
function EventCard({ event, showPublish, onPublish, participantView = false }) {
    const status = getComputedStatus(event);
    const displayStatus = participantView ? getParticipantStatusLabel(status) : status;
    const statusStyle = getStatusStyle(status);
    const primaryTag = event.event_tags?.[0] || event.event_category || "miscellaneous";

    return (
        <Link to={`/event/${event._id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div className="event-card">
                <div className="event-card-header">
                    <div>
                        <h4 style={{ margin: 0 }}>{event.event_name}</h4>
                        <span className={`badge ${event.event_type === "merchandise" ? "badge-merch" : "badge-normal"}`}>
                            {event.event_type === "merchandise" ? "Merchandise" : "Normal"}
                        </span>
                        <span className="badge badge-category" style={{ marginLeft: 6 }}>
                            {getCategoryLabel(primaryTag)}
                        </span>
                    </div>
                    <span className={`badge badge-${displayStatus}`} style={statusStyle}>
                        {displayStatus}
                    </span>
                </div>

                {participantView && event.organizer_id?.organizer_name && (
                    <p style={{ fontSize: 13, color: "#94a3b8", margin: "4px 0 0" }}>
                        by {event.organizer_id.organizer_name}
                    </p>
                )}

                <p style={{ color: "#475569", marginTop: 6 }}>
                    {event.event_description?.substring(0, 120)}
                    {event.event_description?.length > 120 ? "..." : ""}
                </p>

                <p className="text-muted">
                    Deadline: {formatDate(event.registration_deadline)} |
                    Start: {formatDate(event.event_start_date)} |
                    End: {formatDate(event.event_end_date)}
                    {event.event_type === "normal" && <> | Capacity: {event.registration_limit}</>}
                </p>

                {event.event_type === "merchandise" && event.merchandise_items && (
                    <p className="text-muted">
                        {event.merchandise_items.length} items available | Limit: {event.purchase_limit}/person
                    </p>
                )}

                {event.event_tags?.length > 0 && (
                    <div style={{ marginTop: 6 }}>
                        {event.event_tags.map((tag, i) => (
                            <span key={i} className="badge badge-category" style={{ marginRight: 4, textTransform: "none" }}>
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center" }}>
                    {showPublish && event.status === "draft" && (
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); onPublish(e, event._id); }}
                            className="btn btn-success"
                        >
                            Publish
                        </button>
                    )}
                    <span style={{ fontSize: 13, color: "#2563eb", fontWeight: "bold" }}>
                        View Details
                    </span>
                </div>
            </div>
        </Link>
    );
}

export default EventCard;
