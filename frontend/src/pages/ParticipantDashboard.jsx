import { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { formatDate } from "../utils/helpers";

function ParticipantDashboard() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [upcoming, setUpcoming] = useState([]);
    const [past, setPast] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchRegistrations(); }, []);

    const fetchRegistrations = async () => {
        try {
            const res = await API.get("/api/events/my-registrations");

            const now = new Date();
            const upcomingEvents = [];
            const pastEvents = [];

            for (const reg of res.data) {
                if (!reg.event_id) continue;
                const eventEnd = new Date(reg.event_id.event_end_date);
                if (eventEnd > now) {
                    upcomingEvents.push(reg);
                } else {
                    pastEvents.push(reg);
                }
            }

            setUpcoming(upcomingEvents);
            setPast(pastEvents);
        } catch (err) {
            console.log(err);
        }
        setLoading(false);
    };


    const EventCard = ({ reg, isPast }) => (
        <Link to={`/event/${reg.event_id._id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div className="event-card" style={{
                backgroundColor: isPast ? "#f1f5f9" : "#f0fdf4",
                borderLeft: isPast ? "4px solid #94a3b8" : "4px solid #16a34a",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h4 style={{ margin: 0 }}>{reg.event_id.event_name}</h4>
                    <span className={`badge ${reg.event_id.event_type === "merchandise" ? "badge-merch" : "badge-normal"}`}>
                        {reg.event_id.event_type === "merchandise" ? "Merch" : "Normal"}
                    </span>
                </div>

                <p className="text-muted" style={{ margin: "6px 0 0" }}>
                    {formatDate(reg.event_id.event_start_date)} — {formatDate(reg.event_id.event_end_date)}
                </p>

                {reg.items_ordered?.length > 0 && (
                    <p style={{ fontSize: "13px", color: "#475569", margin: "4px 0 0" }}>
                        {reg.items_ordered.map(i => `${i.item_name} (${i.size}/${i.color} ×${i.quantity})`).join(", ")}
                    </p>
                )}

                <p style={{
                    fontSize: "12px", fontWeight: "bold", margin: "6px 0 0",
                    color: isPast ? "#64748b" : "#16a34a"
                }}>
                    {isPast ? "Completed" : "Confirmed"} · View Details
                </p>
            </div>
        </Link>
    );

    if (loading) return <DashboardLayout><p>Loading...</p></DashboardLayout>;

    return (
        <DashboardLayout>
            <h2>Participant Dashboard</h2>

            {/* Upcoming Events */}
            <div style={{ marginBottom: "30px" }}>
                <h3 style={{ borderBottom: "2px solid #16a34a", paddingBottom: "6px", color: "#166534" }}>
                    Upcoming Events ({upcoming.length})
                </h3>
                {upcoming.length === 0 ? (
                    <p style={{ color: "#64748b" }}>
                        No upcoming events. <Link to="/participant/events" style={{ color: "#2563eb" }}>Browse events</Link> to register!
                    </p>
                ) : (
                    upcoming.map((reg) => <EventCard key={reg._id} reg={reg} isPast={false} />)
                )}
            </div>

            {/* Participation History */}
            <div>
                <h3 style={{ borderBottom: "2px solid #94a3b8", paddingBottom: "6px", color: "#475569" }}>
                    Past Events ({past.length})
                </h3>
                {past.length === 0 ? (
                    <p style={{ color: "#64748b" }}>No past events yet.</p>
                ) : (
                    past.map((reg) => <EventCard key={reg._id} reg={reg} isPast={true} />)
                )}
            </div>
        </DashboardLayout>
    );
}

export default ParticipantDashboard;
