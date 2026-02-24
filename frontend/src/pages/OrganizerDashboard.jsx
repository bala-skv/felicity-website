import { useEffect, useMemo, useState } from "react";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";
import EventCard from "../components/EventCard";
import { getComputedStatus } from "../utils/helpers";

function OrganizerDashboard() {
    const [events, setEvents] = useState([]);
    const [message, setMessage] = useState("");
    const [statusSort, setStatusSort] = useState("all");

    useEffect(() => { fetchMyEvents(); }, []);

    const fetchMyEvents = async () => {
        try {
            const res = await API.get("/api/events/my-events");
            setEvents(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    const publishEvent = async (e, eventId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await API.patch(`/api/events/publish/${eventId}`, {});
            setMessage("Event published!");
            fetchMyEvents();
        } catch (err) {
            setMessage("Publish failed");
        }
    };

    const sortedEvents = useMemo(() => {
        const statusRank = { draft: 0, published: 1, ongoing: 2, closed: 3 };
        const filtered = statusSort === "all"
            ? events
            : events.filter((ev) => getComputedStatus(ev) === statusSort);

        return [...filtered].sort((a, b) => {
            const diff = statusRank[getComputedStatus(a)] - statusRank[getComputedStatus(b)];
            return diff !== 0 ? diff : new Date(a.event_start_date) - new Date(b.event_start_date);
        });
    }, [events, statusSort]);

    return (
        <DashboardLayout>
            <h2>Organizer Dashboard</h2>
            {message && <p style={{ color: "green", fontWeight: "bold" }}>{message}</p>}

            <div style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <label htmlFor="status-sort" style={{ fontSize: 14, fontWeight: 600 }}>
                    Filter by status:
                </label>
                <select
                    id="status-sort"
                    value={statusSort}
                    onChange={(e) => setStatusSort(e.target.value)}
                    style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #cbd5e1" }}
                >
                    <option value="all">All</option>
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="closed">Closed</option>
                </select>
            </div>

            {sortedEvents.length === 0 ? (
                <p>No events created yet.</p>
            ) : (
                sortedEvents.map((event) => (
                    <EventCard
                        key={event._id}
                        event={event}
                        showPublish
                        onPublish={publishEvent}
                    />
                ))
            )}
        </DashboardLayout>
    );
}

export default OrganizerDashboard;
