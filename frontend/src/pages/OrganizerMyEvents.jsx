import { useEffect, useState } from "react";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";
import EventCard from "../components/EventCard";

function OrganizerMyEvents() {
    const [events, setEvents] = useState([]);
    const [message, setMessage] = useState("");

    useEffect(() => { fetchMyEvents(); }, []);

    const fetchMyEvents = async () => {
        try {
            const res = await API.get("/api/events/my-events");
            setEvents(res.data);
        } catch (err) { console.log(err); }
    };

    const publishEvent = async (e, eventId) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await API.patch(`/api/events/publish/${eventId}`, {});
            setMessage("Published!");
            fetchMyEvents();
        } catch (err) { setMessage("Publish failed"); }
    };

    return (
        <DashboardLayout>
            <h2>My Events</h2>
            {message && <p style={{ color: "green", fontWeight: "bold" }}>{message}</p>}

            {events.length === 0 ? (
                <p>No events created yet.</p>
            ) : (
                events.map((event) => (
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

export default OrganizerMyEvents;
