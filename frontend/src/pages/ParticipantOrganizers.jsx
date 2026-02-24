import { useEffect, useState } from "react";
import API from "../api";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";

function ParticipantOrganizers() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [organizers, setOrganizers] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchOrganizers(); }, []);

    const fetchOrganizers = async () => {
        try {
            const res = await API.get("/api/users/organizers");
            setOrganizers(res.data);
        } catch (err) {
            console.log(err);
        }
        setLoading(false);
    };

    if (loading) return <DashboardLayout><p>Loading...</p></DashboardLayout>;

    const categoryColors = {
        "Technical": { bg: "#dbeafe", color: "#1e40af" },
        "Cultural": { bg: "#fce7f3", color: "#9d174d" },
        "Sports": { bg: "#d1fae5", color: "#065f46" },
        "Literary": { bg: "#fef3c7", color: "#92400e" },
    };

    return (
        <DashboardLayout>
            <h2 style={{ marginBottom: "6px" }}>Clubs & Organizers</h2>
            <p style={{ color: "#64748b", marginTop: 0, marginBottom: "20px" }}>
                Browse all approved clubs and organizers
            </p>

            {organizers.length === 0 ? (
                <p style={{ color: "#94a3b8" }}>No organizers found.</p>
            ) : (
                organizers.map((org) => {
                    const catStyle = categoryColors[org.category] || { bg: "#f1f5f9", color: "#475569" };
                    return (
                        <Link to={`/participant/organizers/${org._id}`} key={org._id}
                            style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                            <div className="event-card" style={{
                                display: "flex", alignItems: "center", justifyContent: "space-between",
                            }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <h3 style={{ margin: 0 }}>{org.organizer_name}</h3>
                                    <span style={{
                                        padding: "2px 10px", borderRadius: "12px", fontSize: "11px", fontWeight: "bold",
                                        backgroundColor: catStyle.bg, color: catStyle.color
                                    }}>
                                        {org.category}
                                    </span>
                                    {org.is_followed && (
                                        <span style={{
                                            padding: "2px 8px", borderRadius: "12px", fontSize: "11px",
                                            fontWeight: "bold", backgroundColor: "#d1fae5", color: "#065f46"
                                        }}>
                                            Following
                                        </span>
                                    )}
                                </div>
                                <span style={{ color: "#94a3b8", fontSize: "18px" }}>&gt;</span>
                            </div>
                        </Link>
                    );
                })
            )}
        </DashboardLayout>
    );
}

export default ParticipantOrganizers;
