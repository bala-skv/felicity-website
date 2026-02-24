import { useState } from "react";
import API from "../../api";

export default function PaymentApprovals({ eventId, onClose, onUpdate }) {
    const [payments, setPayments] = useState([]);
    const [statusFilter, setStatusFilter] = useState("pending_approval");
    const [expandedProof, setExpandedProof] = useState(null);
    const [loaded, setLoaded] = useState(false);

    const fetchPayments = async () => {
        try {
            const res = await API.get(`/api/events/${eventId}/pending-payments`);
            setPayments(res.data);
            setLoaded(true);
        } catch {}
    };

    if (!loaded) fetchPayments();

    const approve = async (regId) => {
        try {
            await API.patch(`/api/events/${eventId}/registrations/${regId}/approve-payment`);
            fetchPayments();
            if (onUpdate) onUpdate();
        } catch (err) { console.log(err); }
    };

    const reject = async (regId) => {
        const reason = prompt("Enter rejection reason (optional):");
        try {
            await API.patch(`/api/events/${eventId}/registrations/${regId}/reject-payment`, { reason: reason || "Payment proof rejected" });
            fetchPayments();
        } catch {}
    };

    const filtered = payments.filter((p) => p.payment_status === statusFilter);

    return (
        <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "#fefce8", marginTop: "20px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <h3 style={{ margin: 0 }}>💳 Payment Approvals</h3>
                <button onClick={onClose} style={{ padding: "6px 14px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>Close</button>
            </div>

            <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                {[{ val: "pending_approval", label: "⏳ Pending" }, { val: "approved", label: "✅ Approved" }, { val: "rejected", label: "❌ Rejected" }].map((f) => (
                    <button key={f.val} onClick={() => setStatusFilter(f.val)}
                        style={{
                            padding: "7px 16px", borderRadius: "20px",
                            border: `1.5px solid ${statusFilter === f.val ? "#7c3aed" : "#d1d5db"}`,
                            backgroundColor: statusFilter === f.val ? "#7c3aed" : "white",
                            color: statusFilter === f.val ? "white" : "#374151",
                            cursor: "pointer", fontSize: "13px", fontWeight: "600"
                        }}>
                        {f.label}
                    </button>
                ))}
            </div>

            {filtered.length === 0 ? (
                <p style={{ color: "#64748b" }}>No {statusFilter.replace("_", " ")} payments.</p>
            ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {filtered
                        .sort((a, b) => new Date(b.payment_proof_uploaded_at) - new Date(a.payment_proof_uploaded_at))
                        .map((reg) => (
                            <div key={reg._id} style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "16px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px" }}>
                                    <div>
                                        <p style={{ margin: "0 0 4px", fontWeight: "600" }}>
                                            {reg.participant_id?.first_name} {reg.participant_id?.last_name}
                                        </p>
                                        <p style={{ margin: "0 0 2px", fontSize: "13px", color: "#64748b" }}>{reg.participant_id?.email}</p>
                                        {reg.participant_id?.roll_number && <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Roll: {reg.participant_id.roll_number}</p>}
                                    </div>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                                        📤 {reg.payment_proof_uploaded_at ? new Date(reg.payment_proof_uploaded_at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : "N/A"}
                                    </p>
                                </div>

                                <div style={{ backgroundColor: "#f8fafc", padding: "10px", borderRadius: "6px", marginBottom: "10px" }}>
                                    <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: "600", color: "#475569" }}>Items Ordered:</p>
                                    {reg.items_ordered?.map((item, idx) => (
                                        <p key={idx} style={{ margin: "2px 0", fontSize: "13px", color: "#334155" }}>
                                            • {item.item_name} — {item.size}/{item.color} × {item.quantity} — ₹{item.price * item.quantity}
                                        </p>
                                    ))}
                                    <p style={{ margin: "6px 0 0", fontSize: "13px", fontWeight: "600", color: "#166534" }}>
                                        Total: ₹{reg.items_ordered?.reduce((sum, i) => sum + (i.price * i.quantity), 0)}
                                    </p>
                                </div>

                                <div style={{ marginBottom: "12px" }}>
                                    <button onClick={() => setExpandedProof(expandedProof === reg._id ? null : reg._id)}
                                        style={{ padding: "6px 14px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>
                                        {expandedProof === reg._id ? "Hide Proof" : "View Payment Proof"}
                                    </button>
                                    {expandedProof === reg._id && reg.payment_proof && (
                                        <div style={{ marginTop: "10px", textAlign: "center" }}>
                                            <img src={reg.payment_proof} alt="Payment Proof"
                                                style={{ maxWidth: "100%", maxHeight: "400px", borderRadius: "8px", border: "2px solid #e2e8f0" }} />
                                        </div>
                                    )}
                                </div>

                                {statusFilter === "pending_approval" && (
                                    <div style={{ display: "flex", gap: "10px" }}>
                                        <button onClick={() => approve(reg._id)}
                                            style={{ padding: "8px 20px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                                            ✅ Approve
                                        </button>
                                        <button onClick={() => reject(reg._id)}
                                            style={{ padding: "8px 20px", backgroundColor: "#dc2626", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600" }}>
                                            ❌ Reject
                                        </button>
                                    </div>
                                )}

                                {statusFilter === "rejected" && reg.rejection_reason && (
                                    <p style={{ margin: 0, fontSize: "12px", color: "#dc2626" }}>Rejection reason: {reg.rejection_reason}</p>
                                )}
                            </div>
                        ))}
                </div>
            )}
        </div>
    );
}
