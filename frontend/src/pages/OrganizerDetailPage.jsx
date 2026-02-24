import { useEffect, useState } from "react";
import API from "../api";
import { useParams, Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { formatDate } from "../utils/helpers";

function OrganizerDetailPage() {
    const { id } = useParams();
    const user = JSON.parse(localStorage.getItem("user"));

    const [organizer, setOrganizer] = useState(null);
    const [upcoming, setUpcoming] = useState([]);
    const [past, setPast] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionMsg, setActionMsg] = useState("");
    const [actionType, setActionType] = useState("");

    useEffect(() => { fetchData(); }, [id]);

    const fetchData = async () => {
        try {
            const res = await API.get(`/api/users/organizers/${id}`);
            setOrganizer(res.data.organizer);
            setUpcoming(res.data.upcoming);
            setPast(res.data.past);
        } catch (err) {
            console.log(err);
        }
        setLoading(false);
    };

    const handleFollow = async () => {
        try {
            await API.post(`/api/users/follow/${id}`, {});
            setActionMsg("Followed!");
            setActionType("ok");
            fetchData();
        } catch (err) {
            setActionMsg(err.response?.data?.message || "Action failed");
            setActionType("err");
        }
        setTimeout(() => setActionMsg(""), 2000);
    };

    const handleUnfollow = async () => {
        try {
            await API.post(`/api/users/unfollow/${id}`, {});
            setActionMsg("Unfollowed!");
            setActionType("ok");
            fetchData();
        } catch (err) {
            setActionMsg(err.response?.data?.message || "Action failed");
            setActionType("err");
        }
        setTimeout(() => setActionMsg(""), 2000);
    };


    if (loading) return <DashboardLayout><p>Loading...</p></DashboardLayout>;
    if (!organizer) return <DashboardLayout><p>Organizer not found.</p></DashboardLayout>;

    const categoryColors = {
        "Technical": { bg: "#dbeafe", color: "#1e40af" },
        "Cultural": { bg: "#fce7f3", color: "#9d174d" },
        "Sports": { bg: "#d1fae5", color: "#065f46" },
        "Literary": { bg: "#fef3c7", color: "#92400e" },
    };
    const catStyle = categoryColors[organizer.category] || { bg: "#f1f5f9", color: "#475569" };

    const EventCard = ({ event, isPast }) => (
        <Link to={`/event/${event._id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
            <div className="event-card" style={{
                backgroundColor: isPast ? "#f1f5f9" : "#f0fdf4",
                borderLeft: isPast ? "4px solid #94a3b8" : "4px solid #16a34a",
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <h4 style={{ margin: 0 }}>{event.event_name}</h4>
                    <span className={`badge ${event.event_type === "merchandise" ? "badge-merch" : "badge-normal"}`}>
                        {event.event_type === "merchandise" ? "Merch" : "Normal"}
                    </span>
                </div>
                <p className="text-muted" style={{ margin: "6px 0 0" }}>
                    {formatDate(event.event_start_date)} — {formatDate(event.event_end_date)}
                </p>
                <p style={{ fontSize: "12px", color: "#94a3b8", margin: "4px 0 0" }}>
                    View Details
                </p>
            </div>
        </Link>
    );

    return (
        <DashboardLayout>
            <Link to="/participant/organizers" style={{ color: "#2563eb", fontSize: "14px", textDecoration: "none" }}>
                ← Back to Clubs
            </Link>

            {/* Organizer Info */}
            <div style={{
                border: "1px solid #e2e8f0", padding: "24px", borderRadius: "10px",
                backgroundColor: "#f8fafc", marginTop: "14px", marginBottom: "24px"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                            <h2 style={{ margin: 0 }}>{organizer.organizer_name}</h2>
                            <span style={{
                                padding: "3px 12px", borderRadius: "14px", fontSize: "12px", fontWeight: "bold",
                                backgroundColor: catStyle.bg, color: catStyle.color
                            }}>
                                {organizer.category}
                            </span>
                        </div>
                        <p style={{ color: "#475569", fontSize: "14px", margin: "6px 0" }}>
                            {organizer.description || "No description available."}
                        </p>
                        <p style={{ color: "#94a3b8", fontSize: "13px", margin: "4px 0 0" }}>
                            {organizer.email}
                        </p>
                    </div>

                    <div style={{ flexShrink: 0, marginLeft: "20px" }}>
                        {organizer.is_followed ? (
                            <button onClick={handleUnfollow} style={{
                                padding: "10px 22px", backgroundColor: "#ef4444", color: "white",
                                border: "none", borderRadius: "6px", cursor: "pointer",
                                fontWeight: "600", fontSize: "14px"
                            }}>
                                Unfollow
                            </button>
                        ) : (
                            <button onClick={handleFollow} style={{
                                padding: "10px 22px", backgroundColor: "#2563eb", color: "white",
                                border: "none", borderRadius: "6px", cursor: "pointer",
                                fontWeight: "600", fontSize: "14px"
                            }}>
                                Follow
                            </button>
                        )}
                    </div>
                </div>

                {actionMsg && (
                    <p style={{
                        marginTop: "10px", fontSize: "13px", fontWeight: "bold",
                        color: actionType === "err" ? "#dc2626" : "#16a34a"
                    }}>
                        {actionMsg}
                    </p>
                )}
            </div>

            {/* Upcoming Events */}
            <div style={{ marginBottom: "30px" }}>
                <h3 style={{ borderBottom: "2px solid #16a34a", paddingBottom: "6px", color: "#166534" }}>
                    Upcoming Events ({upcoming.length})
                </h3>
                {upcoming.length === 0 ? (
                    <p style={{ color: "#94a3b8" }}>No upcoming events.</p>
                ) : (
                    upcoming.map((e) => <EventCard key={e._id} event={e} isPast={false} />)
                )}
            </div>

            {/* Past Events */}
            <div>
                <h3 style={{ borderBottom: "2px solid #94a3b8", paddingBottom: "6px", color: "#475569" }}>
                    Past Events ({past.length})
                </h3>
                {past.length === 0 ? (
                    <p style={{ color: "#94a3b8" }}>No past events.</p>
                ) : (
                    past.map((e) => <EventCard key={e._id} event={e} isPast={true} />)
                )}
            </div>
        </DashboardLayout>
    );
}

export default OrganizerDetailPage;
