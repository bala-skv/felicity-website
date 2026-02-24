import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";
import { getComputedStatus, formatDate, getCategoryLabel } from "../utils/helpers";
import DiscussionForum from "../components/event/DiscussionForum";
import QrScanner from "../components/event/QrScanner";
import PaymentApprovals from "../components/event/PaymentApprovals";
import RegistrationsTable from "../components/event/RegistrationsTable";

function EventDetails() {
    const { id } = useParams();
    const user = JSON.parse(localStorage.getItem("user"));
    const role = user?.role;

    const [event, setEvent] = useState(null);
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(true);

    // Participant state
    const [regStatus, setRegStatus] = useState(null);
    const [formResponses, setFormResponses] = useState({});
    const [showForm, setShowForm] = useState(false);
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);
    const [paymentProofUploading, setPaymentProofUploading] = useState(false);

    // Organizer state
    const [registrations, setRegistrations] = useState([]);
    const [showRegistrations, setShowRegistrations] = useState(false);
    const [analytics, setAnalytics] = useState(null);
    const [showPaymentApprovals, setShowPaymentApprovals] = useState(false);

    // ---- Data fetching ----
    useEffect(() => { fetchEvent(); }, []);

    const fetchEvent = async () => {
        try {
            const res = await API.get(`/api/events/details/${id}`);
            setEvent(res.data);

            if (res.data.event_type === "normal" && res.data.custom_form?.length > 0) {
                const initial = {};
                res.data.custom_form.forEach(f => {
                    initial[f.field_name] = f.field_type === "checkbox" ? false : "";
                });
                setFormResponses(initial);
            }

            if (role === "participant") {
                const regRes = await API.get(`/api/events/check-registration/${id}`);
                setRegStatus(regRes.data);
            }
            if (role === "organizer") await fetchAnalytics();
        } catch {
            setMessage("Failed to load event");
        }
        setLoading(false);
    };

    const fetchAnalytics = async () => {
        try {
            const res = await API.get(`/api/events/${id}/analytics`);
            setAnalytics(res.data);
        } catch {
            setMessage("Failed to load analytics");
        }
    };

    const fetchRegistrations = async () => {
        try {
            const res = await API.get(`/api/events/${id}/registrations`);
            setRegistrations(res.data);
            setShowRegistrations(true);
        } catch {
            setMessage("Failed to load registrations");
        }
    };

    // ---- Computed values ----
    const computedStatus = getComputedStatus(event);
    const displayStatus = role === "participant" && computedStatus === "published" ? "upcoming" : computedStatus;
    const isClosedForOrganizer = role === "organizer" && computedStatus === "closed";

    const deadlinePassed = event && new Date() > new Date(event.registration_deadline);
    const isIneligible = event?.eligibility === "iiit" && user?.participant_type === "Non-IIIT";
    const allOutOfStock = event?.event_type === "merchandise" && event?.merchandise_items?.every(
        item => item.variants.every(v => v.stock <= 0)
    );
    const canRegister = !deadlinePassed && !isIneligible && !regStatus?.registered;

    const getPrimaryTag = () => event?.event_tags?.[0] || event?.event_category || "miscellaneous";
    const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

    // ---- Participant: registration actions ----
    const handleFormChange = (fieldName, value) => setFormResponses({ ...formResponses, [fieldName]: value });

    const submitNormalRegistration = async () => {
        try {
            await API.post(`/api/events/register/${id}`, { form_responses: formResponses });
            setMessage("Registered successfully!");
            setShowForm(false);
            const regRes = await API.get(`/api/events/check-registration/${id}`);
            setRegStatus(regRes.data);
        } catch (err) {
            setMessage(err.response?.data?.message || "Registration failed");
        }
    };

    const registerDirect = async () => {
        try {
            await API.post(`/api/events/register/${id}`, { form_responses: {} });
            setMessage("Registered successfully!");
            const regRes = await API.get(`/api/events/check-registration/${id}`);
            setRegStatus(regRes.data);
        } catch (err) {
            setMessage(err.response?.data?.message || "Registration failed");
        }
    };

    // ---- Participant: merchandise cart ----
    const addToCart = (itemName, size, color, price) => {
        const existing = cart.find(c => c.item_name === itemName && c.size === size && c.color === color);
        if (existing) {
            setCart(cart.map(c => c.item_name === itemName && c.size === size && c.color === color ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { item_name: itemName, size, color, quantity: 1, price }]);
        }
        setShowCart(true);
    };
    const removeFromCart = (idx) => setCart(cart.filter((_, i) => i !== idx));
    const updateCartQty = (idx, qty) => {
        if (qty < 1) return;
        setCart(cart.map((item, i) => i === idx ? { ...item, quantity: qty } : item));
    };
    const submitPurchase = async () => {
        try {
            await API.post(`/api/events/register/${id}`, { items_ordered: cart });
            setMessage("Order placed successfully!");
            setCart([]);
            setShowCart(false);
            fetchEvent();
        } catch (err) {
            setMessage(err.response?.data?.message || "Purchase failed");
        }
    };

    // ---- Participant: payment proof upload ----
    const handlePaymentProofUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        const reader = new FileReader();
        reader.onload = async () => {
            setPaymentProofUploading(true);
            setMessage("");
            try {
                const res = await API.patch(
                    `/api/events/${id}/registrations/${regStatus.registration_id}/payment-proof`,
                    { payment_proof: reader.result }
                );
                setMessage(res.data.message || "Payment proof uploaded successfully!");
                const regRes = await API.get(`/api/events/check-registration/${id}`);
                setRegStatus(regRes.data);
            } catch (err) {
                setMessage(err.response?.data?.message || "Failed to upload payment proof");
            }
            setPaymentProofUploading(false);
        };
        reader.readAsDataURL(file);
    };

    // ---- Organizer: attendance / collected toggles ----
    const toggleAttendance = async (registrationId, currentValue) => {
        try {
            await API.patch(`/api/events/${id}/registrations/${registrationId}/attendance`, { attendance_marked: !currentValue });
            fetchRegistrations();
            fetchAnalytics();
        } catch (err) {
            setMessage(err.response?.data?.message || "Failed to update attendance");
        }
    };
    const toggleCollected = async (registrationId, itemIndex, currentValue) => {
        try {
            await API.patch(`/api/events/${id}/registrations/${registrationId}/collected`, { item_index: itemIndex, collected: !currentValue });
            fetchRegistrations();
            fetchAnalytics();
        } catch (err) {
            setMessage(err.response?.data?.message || "Failed to update collected status");
        }
    };

    // ---- Render ----
    if (loading) return <DashboardLayout><p>Loading...</p></DashboardLayout>;
    if (!event) return <DashboardLayout><p>Event not found.</p></DashboardLayout>;

    return (
        <DashboardLayout>
            {/* Header */}
            <div style={{ marginBottom: "24px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                    <h2 style={{ margin: 0 }}>{event.event_name}</h2>
                    <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "12px", backgroundColor: event.event_type === "merchandise" ? "#fef3c7" : "#dbeafe", color: event.event_type === "merchandise" ? "#92400e" : "#1e40af", fontWeight: "bold" }}>
                        {event.event_type === "merchandise" ? "🛍 Merchandise" : "📋 Normal Event"}
                    </span>
                    <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "12px", backgroundColor: "#dcfce7", color: "#166534", fontWeight: "bold" }}>{displayStatus}</span>
                    <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "12px", backgroundColor: "#ede9fe", color: "#6d28d9", fontWeight: "bold" }}>{getCategoryLabel(getPrimaryTag())}</span>
                </div>
                <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>by {event.organizer_id?.organizer_name || "Unknown"}</p>
            </div>

            {message && <p style={{ color: message.toLowerCase().includes("fail") ? "red" : "green", fontWeight: "bold", padding: "8px 12px", backgroundColor: message.toLowerCase().includes("fail") ? "#fef2f2" : "#dcfce7", borderRadius: "6px" }}>{message}</p>}

            {/* ===== ALREADY REGISTERED: TICKET + QR ===== */}
            {role === "participant" && regStatus?.registered && (
                <div style={{
                    border: `2px solid ${regStatus.payment_status === "rejected" ? "#dc2626" : regStatus.payment_status === "pending_upload" || regStatus.payment_status === "pending_approval" ? "#f59e0b" : "#16a34a"}`,
                    padding: "20px", borderRadius: "12px",
                    backgroundColor: regStatus.payment_status === "rejected" ? "#fef2f2" : regStatus.payment_status === "pending_upload" || regStatus.payment_status === "pending_approval" ? "#fffbeb" : "#f0fdf4",
                    marginBottom: "20px", textAlign: "center"
                }}>
                    {regStatus.payment_status === "pending_upload" && (
                        <>
                            <h3 style={{ marginTop: 0, color: "#b45309" }}>📦 Order Placed — Payment Proof Required</h3>
                            <p style={{ color: "#92400e", fontSize: "14px", marginBottom: "16px" }}>Please upload a screenshot of your payment to complete your order.</p>
                            <label style={{ display: "inline-block", padding: "10px 24px", backgroundColor: "#f59e0b", color: "white", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                                {paymentProofUploading ? "Uploading..." : "📤 Upload Payment Proof"}
                                <input type="file" accept="image/*" onChange={handlePaymentProofUpload} style={{ display: "none" }} disabled={paymentProofUploading} />
                            </label>
                        </>
                    )}
                    {regStatus.payment_status === "pending_approval" && (
                        <>
                            <h3 style={{ marginTop: 0, color: "#b45309" }}>⏳ Payment Proof Submitted — Awaiting Approval</h3>
                            <p style={{ color: "#92400e", fontSize: "14px" }}>Your payment proof has been uploaded. Please wait for the organizer to verify it.</p>
                            {regStatus.payment_proof_uploaded_at && (
                                <p style={{ color: "#78350f", fontSize: "12px", marginTop: "4px" }}>
                                    Uploaded at: {new Date(regStatus.payment_proof_uploaded_at).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}
                                </p>
                            )}
                        </>
                    )}
                    {regStatus.payment_status === "rejected" && (
                        <>
                            <h3 style={{ marginTop: 0, color: "#dc2626" }}>❌ Payment Rejected</h3>
                            <p style={{ color: "#991b1b", fontSize: "14px", marginBottom: "8px" }}>{regStatus.rejection_reason || "Your payment proof was rejected."}</p>
                            <p style={{ color: "#7f1d1d", fontSize: "13px", marginBottom: "16px" }}>Please upload a valid payment proof to continue.</p>
                            <label style={{ display: "inline-block", padding: "10px 24px", backgroundColor: "#dc2626", color: "white", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                                {paymentProofUploading ? "Uploading..." : "📤 Re-upload Payment Proof"}
                                <input type="file" accept="image/*" onChange={handlePaymentProofUpload} style={{ display: "none" }} disabled={paymentProofUploading} />
                            </label>
                        </>
                    )}
                    {(regStatus.payment_status === "approved" || regStatus.payment_status === "not_required") && (
                        <>
                            <h3 style={{ marginTop: 0, color: "#166534" }}>✅ You are registered!</h3>
                            {regStatus.qr_code && (
                                <div style={{ marginBottom: "16px" }}>
                                    <img src={regStatus.qr_code} alt="Ticket QR Code"
                                        style={{ width: "200px", height: "200px", border: "4px solid white", borderRadius: "8px", boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }} />
                                    <div style={{ marginTop: "10px" }}>
                                        <a href={regStatus.qr_code} download="ticket-qr.png"
                                            style={{ display: "inline-block", padding: "7px 18px", backgroundColor: "#2563eb", color: "white", borderRadius: "6px", fontSize: "13px", fontWeight: "600", textDecoration: "none" }}>
                                            ⬇ Download QR
                                        </a>
                                    </div>
                                    <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#94a3b8" }}>A copy has been sent to your registered email.</p>
                                </div>
                            )}
                        </>
                    )}
                    {regStatus.items_ordered?.length > 0 && (
                        <div style={{ marginTop: "12px", textAlign: "left", maxWidth: "400px", margin: "12px auto 0" }}>
                            <p style={{ fontWeight: "bold", fontSize: "13px", marginBottom: "4px" }}>Items Ordered:</p>
                            {regStatus.items_ordered.map((item, idx) => (
                                <p key={idx} style={{ fontSize: "13px", margin: "2px 0", color: "#475569" }}>
                                    {item.item_name} — {item.size}/{item.color} × {item.quantity} — ₹{item.price * item.quantity}
                                </p>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Event Info Card */}
            <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "#f8fafc", marginBottom: "20px" }}>
                <h3 style={{ marginTop: 0 }}>Description</h3>
                <p>{event.event_description}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginTop: "16px" }}>
                    <div>
                        <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Eligibility:</strong> {event.eligibility === "iiit" ? "🏫 IIIT Only" : "🌐 Open to All"}</p>
                        <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Registration Deadline:</strong> {formatDate(event.registration_deadline)}</p>
                        <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Capacity:</strong> {event.registration_limit}</p>
                        <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Event Tag:</strong> {getCategoryLabel(getPrimaryTag())}</p>
                    </div>
                    <div>
                        <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Event Start:</strong> {formatDate(event.event_start_date)}</p>
                        <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Event End:</strong> {formatDate(event.event_end_date)}</p>
                        {event.event_type === "normal" && <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Fee:</strong> ₹{event.registration_fee}</p>}
                        {event.event_type === "merchandise" && (
                            <>
                                <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Total Limit:</strong> {event.purchase_limit} items/person</p>
                                <p style={{ margin: "4px 0", fontSize: "14px" }}><strong>Per-Item Limit:</strong> {event.per_item_limit} per item/person</p>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Merchandise Items */}
            {event.event_type === "merchandise" && event.merchandise_items?.length > 0 && (
                <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "#fff", marginBottom: "20px" }}>
                    <h3 style={{ marginTop: 0 }}>🛍 Available Items</h3>
                    {event.merchandise_items.map((item, itemIdx) => (
                        <div key={itemIdx} style={{ marginBottom: "16px" }}>
                            <h4 style={{ marginBottom: "8px" }}>{item.item_name}</h4>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                <thead>
                                    <tr style={{ backgroundColor: "#f1f5f9" }}>
                                        <th style={{ padding: "8px", textAlign: "left" }}>Size</th>
                                        <th style={{ padding: "8px", textAlign: "left" }}>Color</th>
                                        <th style={{ padding: "8px", textAlign: "left" }}>Stock</th>
                                        <th style={{ padding: "8px", textAlign: "left" }}>Price</th>
                                        {role === "participant" && canRegister && <th style={{ padding: "8px" }}></th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {item.variants.map((v, vIdx) => (
                                        <tr key={vIdx} style={{ borderBottom: "1px solid #e2e8f0" }}>
                                            <td style={{ padding: "8px" }}>{v.size}</td>
                                            <td style={{ padding: "8px" }}>{v.color}</td>
                                            <td style={{ padding: "8px" }}>{v.stock > 0 ? v.stock : <span style={{ color: "red" }}>Out of stock</span>}</td>
                                            <td style={{ padding: "8px" }}>₹{v.price}</td>
                                            {role === "participant" && canRegister && (
                                                <td style={{ padding: "8px" }}>
                                                    {v.stock > 0 && (
                                                        <button onClick={() => addToCart(item.item_name, v.size, v.color, v.price)}
                                                            style={{ padding: "4px 12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                                                            + Add
                                                        </button>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </div>
            )}

            {/* Restriction Warnings */}
            {role === "participant" && !regStatus?.registered && (deadlinePassed || isIneligible || allOutOfStock) && (
                <div style={{ marginBottom: "20px" }}>
                    {deadlinePassed && (
                        <div style={{ padding: "12px 16px", backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", marginBottom: "8px" }}>
                            <p style={{ margin: 0, color: "#dc2626", fontWeight: "bold" }}>⏰ Registration deadline has passed ({formatDate(event.registration_deadline)})</p>
                        </div>
                    )}
                    {isIneligible && (
                        <div style={{ padding: "12px 16px", backgroundColor: "#fefce8", border: "1px solid #fde68a", borderRadius: "8px", marginBottom: "8px" }}>
                            <p style={{ margin: 0, color: "#92400e", fontWeight: "bold" }}>🏫 This event is restricted to IIIT students only</p>
                        </div>
                    )}
                    {allOutOfStock && !deadlinePassed && !isIneligible && (
                        <div style={{ padding: "12px 16px", backgroundColor: "#f1f5f9", border: "1px solid #cbd5e1", borderRadius: "8px", marginBottom: "8px" }}>
                            <p style={{ margin: 0, color: "#64748b", fontWeight: "bold" }}>📦 All items are currently out of stock</p>
                        </div>
                    )}
                </div>
            )}

            {/* Participant Actions */}
            {role === "participant" && canRegister && (
                <div style={{ marginBottom: "20px" }}>
                    {event.event_type === "normal" && !showForm && (
                        <button onClick={() => { if (event.custom_form?.length > 0) setShowForm(true); else registerDirect(); }}
                            style={{ padding: "10px 24px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "15px" }}>
                            Register for Event
                        </button>
                    )}
                    {event.event_type === "normal" && showForm && (
                        <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "#fff", maxWidth: "500px" }}>
                            <h3 style={{ marginTop: 0 }}>Registration Form</h3>
                            {event.custom_form.map((field, idx) => (
                                <div key={idx} style={{ marginBottom: "12px" }}>
                                    <label style={{ display: "block", fontWeight: "bold", marginBottom: "4px", fontSize: "14px" }}>
                                        {field.field_name}{field.is_required && <span style={{ color: "red" }}> *</span>}
                                    </label>
                                    {field.field_type === "text" && <input type="text" value={formResponses[field.field_name] || ""} onChange={(e) => handleFormChange(field.field_name, e.target.value)} style={{ width: "100%", padding: "8px", boxSizing: "border-box" }} />}
                                    {field.field_type === "dropdown" && (
                                        <select value={formResponses[field.field_name] || ""} onChange={(e) => handleFormChange(field.field_name, e.target.value)} style={{ width: "100%", padding: "8px", boxSizing: "border-box" }}>
                                            <option value="">Select...</option>
                                            {field.options.map((opt, i) => <option key={i} value={opt}>{opt}</option>)}
                                        </select>
                                    )}
                                    {field.field_type === "checkbox" && <label style={{ cursor: "pointer" }}><input type="checkbox" checked={formResponses[field.field_name] || false} onChange={(e) => handleFormChange(field.field_name, e.target.checked)} style={{ marginRight: "6px" }} />Yes</label>}
                                </div>
                            ))}
                            <div style={{ display: "flex", gap: "10px" }}>
                                <button onClick={submitNormalRegistration} style={{ padding: "10px 20px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Submit</button>
                                <button onClick={() => setShowForm(false)} style={{ padding: "10px 20px", backgroundColor: "#6b7280", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Cancel</button>
                            </div>
                        </div>
                    )}
                    {event.event_type === "merchandise" && showCart && cart.length > 0 && (
                        <div style={{ border: "1px solid #cbd5e1", padding: "16px", borderRadius: "8px", backgroundColor: "#f0fdf4", maxWidth: "500px" }}>
                            <h4 style={{ marginTop: 0 }}>🛒 Your Cart</h4>
                            {cart.map((item, idx) => (
                                <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 0", borderBottom: "1px solid #e2e8f0" }}>
                                    <span style={{ fontSize: "13px" }}>{item.item_name} — {item.size}/{item.color} — ₹{item.price}</span>
                                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                        <button onClick={() => updateCartQty(idx, item.quantity - 1)} style={{ width: "24px", height: "24px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", background: "white" }}>-</button>
                                        <span style={{ fontWeight: "bold" }}>{item.quantity}</span>
                                        <button onClick={() => updateCartQty(idx, item.quantity + 1)} style={{ width: "24px", height: "24px", border: "1px solid #ccc", borderRadius: "4px", cursor: "pointer", background: "white" }}>+</button>
                                        <button onClick={() => removeFromCart(idx)} style={{ padding: "2px 8px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "3px", cursor: "pointer", fontSize: "11px" }}>×</button>
                                    </div>
                                </div>
                            ))}
                            <p style={{ fontWeight: "bold", marginTop: "10px" }}>Total: ₹{totalPrice}</p>
                            <button onClick={submitPurchase} style={{ padding: "10px 20px", backgroundColor: "#f59e0b", color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}>Place Order</button>
                        </div>
                    )}
                </div>
            )}

            {/* Organizer Action Buttons */}
            {role === "organizer" && (
                <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                    {!isClosedForOrganizer ? (
                        <Link to={`/organizer/events/${id}/edit`} style={{ padding: "10px 20px", backgroundColor: "#f59e0b", color: "white", textDecoration: "none", borderRadius: "6px", fontSize: "14px" }}>Edit Event</Link>
                    ) : (
                        <button disabled style={{ padding: "10px 20px", backgroundColor: "#cbd5e1", color: "#475569", border: "none", borderRadius: "6px", fontSize: "14px", cursor: "not-allowed" }}>Edit Disabled (Closed)</button>
                    )}
                    <button onClick={fetchRegistrations} style={{ padding: "10px 20px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>
                        {event.event_type === "merchandise" ? "View Orders" : "View Registrations"}
                    </button>
                    {event.event_type === "merchandise" && computedStatus !== "closed" && (
                        <button onClick={() => setShowPaymentApprovals(true)} style={{ padding: "10px 20px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "14px" }}>Payment Approvals</button>
                    )}
                </div>
            )}

            {/* Analytics + QR Scanner */}
            {role === "organizer" && analytics && (
                <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "#f8fafc", marginBottom: "20px" }}>
                    <h3 style={{ marginTop: 0 }}>Analytics</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: "10px", marginBottom: "14px" }}>
                        <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Registrations</p>
                            <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "700" }}>{analytics.total_registrations || 0}</p>
                        </div>
                        {analytics.mode === "merchandise" && (
                            <>
                                <div style={{ backgroundColor: "#fff", border: "1px solid #fde68a", borderRadius: "8px", padding: "10px" }}>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#b45309" }}>Pending Approval</p>
                                    <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "700", color: "#b45309" }}>{analytics.pending_approvals || 0}</p>
                                </div>
                                <div style={{ backgroundColor: "#fff", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "10px" }}>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#166534" }}>Approved</p>
                                    <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "700", color: "#166534" }}>{analytics.approved_orders || 0}</p>
                                </div>
                            </>
                        )}
                        <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>{analytics.mode === "merchandise" ? "Collected" : "Attendance"}</p>
                            <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "700" }}>{analytics.mode === "merchandise" ? analytics.total_collected_quantity || 0 : analytics.total_attendance || 0}</p>
                        </div>
                        <div style={{ backgroundColor: "#fff", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "10px" }}>
                            <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>Revenue</p>
                            <p style={{ margin: "4px 0 0", fontSize: "20px", fontWeight: "700" }}>₹{analytics.total_revenue || 0}</p>
                        </div>
                    </div>

                    {computedStatus === "ongoing" && (
                        <QrScanner eventId={id} analyticsMode={analytics.mode}
                            onScanComplete={() => { if (showRegistrations) fetchRegistrations(); fetchAnalytics(); }} />
                    )}

                    {analytics.mode === "merchandise" && (
                        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "14px", marginTop: "8px" }}>
                            <h4 style={{ margin: "8px 0" }}>Items Sold</h4>
                            {analytics.items_sold?.length === 0 ? (
                                <p style={{ margin: 0, color: "#64748b" }}>No sales yet.</p>
                            ) : (
                                <div style={{ overflowX: "auto" }}>
                                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", fontSize: "13px" }}>
                                        <thead>
                                            <tr style={{ backgroundColor: "#f1f5f9" }}>
                                                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Item</th>
                                                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Sold</th>
                                                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Collected</th>
                                                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0" }}>Revenue</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {analytics.items_sold.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{item.item_name} ({item.size}/{item.color})</td>
                                                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{item.sold_quantity}</td>
                                                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{item.collected_quantity}</td>
                                                    <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>₹{item.revenue}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Registrations Table */}
            {showRegistrations && (
                <RegistrationsTable
                    event={event}
                    registrations={registrations}
                    onToggleAttendance={toggleAttendance}
                    onToggleCollected={toggleCollected}
                />
            )}

            {/* Payment Approvals */}
            {showPaymentApprovals && event?.event_type === "merchandise" && computedStatus !== "closed" && (
                <PaymentApprovals
                    eventId={id}
                    onClose={() => setShowPaymentApprovals(false)}
                    onUpdate={fetchAnalytics}
                />
            )}

            {/* Discussion Forum */}
            {(role === "organizer" || (role === "participant" && regStatus?.registered)) && (
                <DiscussionForum eventId={id} user={user} role={role} isRegistered={regStatus?.registered} />
            )}
        </DashboardLayout>
    );
}

export default EventDetails;
