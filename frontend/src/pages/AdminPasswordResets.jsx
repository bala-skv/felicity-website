import { useEffect, useState } from "react";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";
import { formatDate } from "../utils/helpers";

function AdminPasswordResets() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [requests, setRequests] = useState([]);
    const [message, setMessage] = useState("");
    const [msgType, setMsgType] = useState("");
    const [rejectComments, setRejectComments] = useState({});

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await API.get("/api/admin/password-reset-requests");
            setRequests(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    const handleApprove = async (id) => {
        try {
            const res = await API.patch(
                `/api/admin/password-reset/${id}/approve`,
                { admin_comments: "Approved" }
            );
            setMessage(`Approved! New password: ${res.data.new_password}`);
            setMsgType("ok");
            fetchRequests();
        } catch (err) {
            setMessage(err.response?.data?.message || "Approval failed");
            setMsgType("err");
        }
    };

    const handleReject = async (id) => {
        const comments = rejectComments[id];
        if (!comments || !comments.trim()) {
            setMessage("Please enter a rejection reason");
            setMsgType("err");
            return;
        }
        try {
            await API.patch(
                `/api/admin/password-reset/${id}/reject`,
                { admin_comments: comments.trim() }
            );
            setMessage("Request rejected");
            setMsgType("ok");
            fetchRequests();
        } catch (err) {
            setMessage(err.response?.data?.message || "Rejection failed");
            setMsgType("err");
        }
    };


    const statusColor = (status) => {
        if (status === "approved") return "#16a34a";
        if (status === "rejected") return "#ef4444";
        return "#f59e0b";
    };

    return (
        <DashboardLayout>
            <h2>Password Reset Requests</h2>

            {message && <p style={{ color: msgType === "err" ? "red" : "green", fontWeight: "bold" }}>{message}</p>}

            {requests.length === 0 ? (
                <p>No password reset requests.</p>
            ) : (
                requests.map((req) => (
                    <div key={req._id} style={{
                        border: "1px solid #ddd", padding: "15px", marginBottom: "12px",
                        borderRadius: "8px", backgroundColor: "#f8fafc"
                    }}>
                        <p><strong>Organizer:</strong> {req.organizer_id?.organizer_name || "Unknown"} ({req.organizer_id?.email})</p>
                        <p><strong>Date:</strong> {formatDate(req.createdAt)}</p>
                        <p><strong>Reason:</strong> {req.reason}</p>
                        <p><strong>Status:</strong> <span style={{ color: statusColor(req.status), fontWeight: "bold", textTransform: "uppercase" }}>{req.status}</span></p>

                        {req.status === "approved" && req.new_password && (
                            <p style={{ backgroundColor: "#dcfce7", padding: "8px", borderRadius: "4px" }}>
                                <strong>Generated Password:</strong> {req.new_password}
                            </p>
                        )}

                        {req.status === "rejected" && req.admin_comments && (
                            <p style={{ backgroundColor: "#fef2f2", padding: "8px", borderRadius: "4px" }}>
                                <strong>Rejection Reason:</strong> {req.admin_comments}
                            </p>
                        )}

                        {req.status === "pending" && (
                            <div style={{ marginTop: "10px", display: "flex", gap: "10px", alignItems: "flex-start" }}>
                                <button onClick={() => handleApprove(req._id)} style={{
                                    padding: "6px 14px", backgroundColor: "#16a34a",
                                    color: "white", border: "none", borderRadius: "4px", cursor: "pointer"
                                }}>Approve</button>

                                <div style={{ flex: 1 }}>
                                    <input
                                        type="text"
                                        placeholder="Rejection reason..."
                                        value={rejectComments[req._id] || ""}
                                        onChange={(e) => setRejectComments({ ...rejectComments, [req._id]: e.target.value })}
                                        style={{ width: "100%", padding: "6px", boxSizing: "border-box" }}
                                    />
                                </div>

                                <button onClick={() => handleReject(req._id)} style={{
                                    padding: "6px 14px", backgroundColor: "#ef4444",
                                    color: "white", border: "none", borderRadius: "4px", cursor: "pointer"
                                }}>Reject</button>
                            </div>
                        )}
                    </div>
                ))
            )}
        </DashboardLayout>
    );
}

export default AdminPasswordResets;
