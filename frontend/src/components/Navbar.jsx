import { Link, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import API from "../api";

function Navbar({ role }) {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);
    const panelRef = useRef(null);

    const showNotifs = role === "organizer" || role === "participant";

    useEffect(() => {
        if (!showNotifs || !user?.token) return;
        fetchUnreadCount();
        const interval = setInterval(fetchUnreadCount, 15000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (panelRef.current && !panelRef.current.contains(e.target)) {
                setShowNotifPanel(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchUnreadCount = async () => {
        try {
            const res = await API.get("/api/notifications/unread-count");
            setUnreadCount(res.data.count);
        } catch {}
    };

    const fetchNotifications = async () => {
        try {
            const res = await API.get("/api/notifications?limit=30");
            setNotifications(res.data);
        } catch {}
    };

    const togglePanel = async () => {
        if (!showNotifPanel) {
            await fetchNotifications();
        }
        setShowNotifPanel(!showNotifPanel);
    };

    const markAsRead = async (id) => {
        try {
            await API.patch(`/api/notifications/${id}/read`, {});
            setNotifications((prev) => prev.map((n) => n._id === id ? { ...n, read: true } : n));
            setUnreadCount((prev) => Math.max(0, prev - 1));
        } catch {}
    };

    const markAllRead = async () => {
        try {
            await API.patch("/api/notifications/read-all", {});
            setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
            setUnreadCount(0);
        } catch {}
    };

    const getNotifIcon = (type) => {
        if (type === "announcement") return "[A]";
        if (type === "reply") return "[R]";
        if (type === "pin") return "[P]";
        return "[N]";
    };

    const getNotifLabel = (notif) => {
        const triggeredBy = notif.triggered_by;
        const name = triggeredBy?.role === "organizer"
            ? (triggeredBy.organizer_name || "Organizer")
            : `${triggeredBy?.first_name || ""} ${triggeredBy?.last_name || ""}`.trim() || "Someone";
        const eventName = notif.event_id?.event_name || "an event";
        if (notif.type === "announcement") return `${name} posted an announcement in ${eventName}`;
        if (notif.type === "reply") return `${name} replied to your message in ${eventName}`;
        if (notif.type === "pin") return `A message was pinned in ${eventName}`;
        return `New activity in ${eventName}`;
    };

    const logout = () => {
        localStorage.removeItem("user");
        navigate("/");
    };

    return (
        <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "15px 30px",
            backgroundColor: "#1e293b",
            color: "white"
        }}>

            <div style={{ display: "flex", gap: "20px", alignItems: "center" }}>
                {role === "admin" && (
                    <>
                        <Link to="/admin/dashboard" style={{ color: "white", textDecoration: "none" }}>
                            Dashboard
                        </Link>
                        <Link to="/admin/create-organizer" style={{ color: "white", textDecoration: "none" }}>
                            Create Organizer
                        </Link>
                        <Link to="/admin/organizers" style={{ color: "white", textDecoration: "none" }}>
                            Manage Organizers
                        </Link>
                        <Link to="/admin/password-resets" style={{ color: "white", textDecoration: "none" }}>
                            Password Resets
                        </Link>
                    </>
                )}

                {role === "organizer" && (
                    <>
                        <Link to="/organizer/dashboard" style={{ color: "white", textDecoration: "none" }}>
                            Dashboard
                        </Link>
                        <Link to="/organizer/create-event" style={{ color: "white", textDecoration: "none" }}>
                            Create Event
                        </Link>
                        <Link to="/organizer/profile" style={{ color: "white", textDecoration: "none" }}>
                            Profile
                        </Link>
                        <Link to="/organizer/password-reset" style={{ color: "white", textDecoration: "none" }}>
                            Password Reset
                        </Link>
                    </>
                )}

                {role === "participant" && (
                    <>
                        <Link to="/participant/dashboard" style={{ color: "white", textDecoration: "none" }}>
                            Dashboard
                        </Link>
                        <Link to="/participant/events" style={{ color: "white", textDecoration: "none" }}>
                            Browse Events
                        </Link>

                        <Link to="/participant/organizers" style={{ color: "white", textDecoration: "none" }}>
                            Clubs
                        </Link>
                        <Link to="/participant/profile" style={{ color: "white", textDecoration: "none" }}>
                            Profile
                        </Link>
                    </>
                )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                {showNotifs && (
                    <div ref={panelRef} style={{ position: "relative" }}>
                        <button
                            onClick={togglePanel}
                            style={{
                                background: "none", border: "none", cursor: "pointer",
                                fontSize: "20px", position: "relative", padding: "4px 8px",
                                color: "white"
                            }}
                            title="Notifications"
                        >
                            ●
                            {unreadCount > 0 && (
                                <span style={{
                                    position: "absolute", top: "-2px", right: "0",
                                    backgroundColor: "#ef4444", color: "white",
                                    borderRadius: "50%", width: "18px", height: "18px",
                                    fontSize: "11px", fontWeight: "bold",
                                    display: "flex", alignItems: "center", justifyContent: "center"
                                }}>
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifPanel && (
                            <div style={{
                                position: "absolute", top: "40px", right: "0",
                                width: "380px", maxHeight: "480px",
                                backgroundColor: "white", borderRadius: "12px",
                                boxShadow: "0 8px 30px rgba(0,0,0,0.2)",
                                zIndex: 1000, overflow: "hidden",
                                border: "1px solid #e2e8f0"
                            }}>
                                {/* Header */}
                                <div style={{
                                    padding: "12px 16px", borderBottom: "1px solid #e2e8f0",
                                    display: "flex", justifyContent: "space-between", alignItems: "center",
                                    backgroundColor: "#f8fafc"
                                }}>
                                    <span style={{ fontWeight: "700", fontSize: "15px", color: "#1e293b" }}>
                                        Notifications
                                    </span>
                                    {unreadCount > 0 && (
                                        <button onClick={markAllRead}
                                            style={{
                                                fontSize: "12px", color: "#7c3aed", background: "none",
                                                border: "none", cursor: "pointer", fontWeight: "600"
                                            }}>
                                            Mark all read
                                        </button>
                                    )}
                                </div>

                                {/* Notification list */}
                                <div style={{ maxHeight: "420px", overflowY: "auto" }}>
                                    {notifications.length === 0 ? (
                                        <p style={{ textAlign: "center", color: "#94a3b8", padding: "24px", fontSize: "14px" }}>
                                            No notifications yet
                                        </p>
                                    ) : notifications.map((notif) => (
                                        <div
                                            key={notif._id}
                                            onClick={() => {
                                                if (!notif.read) markAsRead(notif._id);
                                                setShowNotifPanel(false);
                                                navigate(`/event/${notif.event_id?._id || notif.event_id}`);
                                            }}
                                            style={{
                                                padding: "10px 16px", borderBottom: "1px solid #f1f5f9",
                                                cursor: "pointer", display: "flex", gap: "10px",
                                                backgroundColor: notif.read ? "white" : "#f0f0ff",
                                                transition: "background-color 0.15s"
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = notif.read ? "#f8fafc" : "#e8e8ff"}
                                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = notif.read ? "white" : "#f0f0ff"}
                                        >
                                            <span style={{ fontSize: "20px", flexShrink: 0, marginTop: "2px" }}>
                                                {getNotifIcon(notif.type)}
                                            </span>
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <p style={{
                                                    margin: 0, fontSize: "13px", color: "#1e293b",
                                                    fontWeight: notif.read ? "400" : "600",
                                                    lineHeight: "1.4"
                                                }}>
                                                    {getNotifLabel(notif)}
                                                </p>
                                                <p style={{
                                                    margin: "3px 0 0", fontSize: "12px", color: "#64748b",
                                                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                                                }}>
                                                    "{notif.content}"
                                                </p>
                                                <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#94a3b8" }}>
                                                    {new Date(notif.createdAt).toLocaleString("en-GB", {
                                                        timeZone: "Asia/Kolkata", day: "2-digit", month: "short",
                                                        hour: "2-digit", minute: "2-digit"
                                                    })}
                                                </p>
                                            </div>
                                            {!notif.read && (
                                                <span style={{
                                                    width: "8px", height: "8px", borderRadius: "50%",
                                                    backgroundColor: "#7c3aed", flexShrink: 0, marginTop: "6px"
                                                }} />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <button
                    onClick={logout}
                    style={{
                        padding: "8px 15px",
                        backgroundColor: "#ef4444",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}
                >
                    Logout
                </button>
            </div>
        </div>
    );
}

export default Navbar;