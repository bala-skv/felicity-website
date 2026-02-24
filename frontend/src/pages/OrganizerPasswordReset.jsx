import { useEffect, useState } from "react";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";
import { formatDate } from "../utils/helpers";

function OrganizerPasswordReset() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [reason, setReason] = useState("");
    const [message, setMessage] = useState("");
    const [msgType, setMsgType] = useState("");
    const [requests, setRequests] = useState([]);

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            const res = await API.get("/api/users/my-password-reset-requests");
            setRequests(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    const submitRequest = async (e) => {
        e.preventDefault();
        try {
            await API.post("/api/users/password-reset-request",
                { reason }
            );
            setMessage("Password reset request submitted!");
            setMsgType("ok");
            setReason("");
            fetchRequests();
        } catch (err) {
            setMessage(err.response?.data?.message || "Request failed");
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
            <h2>Password Reset</h2>

            {message && <p className={`msg-banner ${msgType === "err" ? "error" : "success"}`}>{message}</p>}

            {/* Submit new request */}
            <div className="section-box">
                <h3 style={{ marginTop: 0 }}>Request Password Reset</h3>
                <form onSubmit={submitRequest}>
                    <label style={{ display: "block", fontWeight: "bold", marginBottom: "4px" }}>Reason</label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        required
                        placeholder="Explain why you need a password reset..."
                        style={{ width: "100%", padding: "8px", minHeight: "80px", boxSizing: "border-box", marginBottom: "12px" }}
                    />
                    <button type="submit" style={{
                        padding: "8px 16px", backgroundColor: "#2563eb",
                        color: "white", border: "none", borderRadius: "4px", cursor: "pointer"
                    }}>Submit Request</button>
                </form>
            </div>

            {/* Request history */}
            <h3>Password Reset History</h3>

            {requests.length === 0 ? (
                <p>No password reset requests yet.</p>
            ) : (
                requests.map((req) => (
                    <div key={req._id} style={{
                        border: "1px solid #ddd", padding: "15px", marginBottom: "10px",
                        borderRadius: "8px", backgroundColor: "#f8fafc"
                    }}>
                        <p><strong>Date:</strong> {formatDate(req.createdAt)}</p>
                        <p><strong>Reason:</strong> {req.reason}</p>
                        <p><strong>Status:</strong> <span style={{ color: statusColor(req.status), fontWeight: "bold", textTransform: "uppercase" }}>{req.status}</span></p>

                        {req.status === "approved" && req.new_password && (
                            <p style={{ backgroundColor: "#dcfce7", padding: "8px", borderRadius: "4px" }}>
                                <strong>New Password:</strong> {req.new_password}
                            </p>
                        )}

                        {req.status === "rejected" && req.admin_comments && (
                            <p style={{ backgroundColor: "#fef2f2", padding: "8px", borderRadius: "4px" }}>
                                <strong>Rejection Reason:</strong> {req.admin_comments}
                            </p>
                        )}

                        {req.status === "approved" && req.admin_comments && (
                            <p style={{ fontSize: "13px", color: "#64748b" }}>
                                <strong>Admin Comment:</strong> {req.admin_comments}
                            </p>
                        )}
                    </div>
                ))
            )}
        </DashboardLayout>
    );
}

export default OrganizerPasswordReset;
