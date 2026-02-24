import { useEffect, useState } from "react";
import API from "../api";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { getComputedStatus, CATEGORY_LABELS } from "../utils/helpers";

function OrganizerEditEvent() {
    const { id } = useParams();
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [event, setEvent] = useState(null);
    const [message, setMessage] = useState("");
    const [hasRegistrations, setHasRegistrations] = useState(false);

    // Editable fields
    const [description, setDescription] = useState("");
    const [registrationLimit, setRegistrationLimit] = useState("");
    const [registrationDeadline, setRegistrationDeadline] = useState("");
    const [eventStartDate, setEventStartDate] = useState("");
    const [eventEndDate, setEventEndDate] = useState("");
    const [eventTag, setEventTag] = useState("miscellaneous");
    const [customForm, setCustomForm] = useState([]);

    const EVENT_TAGS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

    // Merchandise editing
    const [merchandiseItems, setMerchandiseItems] = useState([]);
    const [purchaseLimit, setPurchaseLimit] = useState("5");
    const [perItemLimit, setPerItemLimit] = useState("1");

    // Form builder add field state
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldType, setNewFieldType] = useState("text");
    const [newFieldOptions, setNewFieldOptions] = useState("");
    const [newFieldRequired, setNewFieldRequired] = useState(false);

    // Merch variant add state
    const [activeItemIndex, setActiveItemIndex] = useState(null);
    const [newVariantSize, setNewVariantSize] = useState("");
    const [newVariantColor, setNewVariantColor] = useState("");
    const [newVariantStock, setNewVariantStock] = useState("");
    const [newVariantPrice, setNewVariantPrice] = useState("");

    const toLocalDatetime = (d) => {
        if (!d) return "";
        const date = new Date(d);
        const offset = date.getTimezoneOffset();
        const local = new Date(date.getTime() - offset * 60000);
        return local.toISOString().slice(0, 16);
    };

    useEffect(() => {
        fetchEvent();
    }, []);

    const fetchEvent = async () => {
        try {
            const res = await API.get(`/api/events/details/${id}`);
            const ev = res.data;
            setEvent(ev);
            setDescription(ev.event_description);
            setRegistrationLimit(ev.registration_limit);
            setRegistrationDeadline(toLocalDatetime(ev.registration_deadline));
            setEventStartDate(toLocalDatetime(ev.event_start_date));
            setEventEndDate(toLocalDatetime(ev.event_end_date));
            setEventTag(ev.event_tags?.[0] || ev.event_category || "miscellaneous");
            setCustomForm(ev.custom_form || []);
            setMerchandiseItems(ev.merchandise_items || []);
            setPurchaseLimit(ev.purchase_limit || 5);
            setPerItemLimit(ev.per_item_limit || 1);

            // Check if there are registrations
            const regRes = await API.get(`/api/events/${id}/registrations`);
            setHasRegistrations(regRes.data.length > 0);
        } catch (err) {
            setMessage("Failed to load event");
        }
    };

    const handleSave = async () => {
        if (event && event.status !== "draft" && new Date() > new Date(event.event_end_date)) {
            setMessage("Closed events cannot be edited");
            return;
        }

        try {
            const body = {
                event_description: description,
                registration_limit: parseInt(registrationLimit),
                registration_deadline: registrationDeadline,
                event_start_date: eventStartDate,
                event_end_date: eventEndDate,
                event_tags: [eventTag],
            };

            if (event.event_type === "normal" && !hasRegistrations) {
                body.custom_form = customForm;
            }
            if (event.event_type === "merchandise") {
                body.merchandise_items = merchandiseItems;
                body.purchase_limit = parseInt(purchaseLimit);
                body.per_item_limit = parseInt(perItemLimit);
            }

            await API.patch(`/api/events/edit/${id}`, body);

            setMessage("Event updated successfully!");
            setTimeout(() => navigate("/organizer/dashboard"), 1500);
        } catch (err) {
            setMessage(err.response?.data?.message || "Update failed");
        }
    };

    // Form builder
    const addFormField = () => {
        if (!newFieldName.trim()) return;
        setCustomForm([...customForm, { field_name: newFieldName.trim(), field_type: newFieldType, options: newFieldType === "dropdown" ? newFieldOptions.split(",").map(o => o.trim()).filter(o => o) : [], is_required: newFieldRequired }]);
        setNewFieldName(""); setNewFieldType("text"); setNewFieldOptions(""); setNewFieldRequired(false);
    };
    const removeFormField = (idx) => setCustomForm(customForm.filter((_, i) => i !== idx));

    // Merch variant
    const addVariant = (itemIdx) => {
        if (!newVariantSize.trim() || !newVariantColor.trim() || !newVariantStock || !newVariantPrice) return;
        const updated = [...merchandiseItems];
        updated[itemIdx].variants.push({ size: newVariantSize.trim(), color: newVariantColor.trim(), stock: parseInt(newVariantStock), price: parseFloat(newVariantPrice) });
        setMerchandiseItems(updated);
        setNewVariantSize(""); setNewVariantColor(""); setNewVariantStock(""); setNewVariantPrice("");
    };

    if (!event) return <DashboardLayout><p>Loading...</p></DashboardLayout>;

    const computedStatus = getComputedStatus(event);
    const isClosed = computedStatus === "closed";

    const inputStyle = { width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" };
    const labelStyle = { display: "block", fontWeight: "bold", marginBottom: "4px", fontSize: "14px" };

    return (
        <DashboardLayout>
            <h2>Edit Event: {event.event_name}</h2>
            <p style={{ color: "#64748b", fontSize: "13px" }}>Type: <strong>{event.event_type}</strong> | Status: <strong>{computedStatus}</strong></p>

            {message && <p style={{ color: message.includes("failed") || message.includes("Failed") ? "red" : "green", fontWeight: "bold" }}>{message}</p>}
            {isClosed && (
                <p style={{ color: "#b91c1c", fontWeight: "bold", backgroundColor: "#fef2f2", padding: "8px 12px", borderRadius: "6px" }}>
                    This event is closed and cannot be edited.
                </p>
            )}

            <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "#f8fafc", maxWidth: "700px" }}>
                <label style={labelStyle}>Description</label>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)} disabled={isClosed} style={{ ...inputStyle, minHeight: "80px" }} />

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                        <label style={labelStyle}>Registration Limit</label>
                        <input type="number" value={registrationLimit} onChange={(e) => setRegistrationLimit(e.target.value)} min={event.registration_limit} disabled={isClosed} style={inputStyle} />
                        <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-8px" }}>Can only increase (current: {event.registration_limit})</p>
                    </div>
                    <div>
                        <label style={labelStyle}>Registration Deadline</label>
                        <input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} disabled={isClosed} style={inputStyle} />
                        <p style={{ fontSize: "12px", color: "#64748b", marginTop: "-8px" }}>Any time up to event end</p>
                    </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                        <label style={labelStyle}>Event Start</label>
                        <input type="datetime-local" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} disabled={isClosed} style={inputStyle} />
                    </div>
                    <div>
                        <label style={labelStyle}>Event End</label>
                        <input type="datetime-local" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} disabled={isClosed} style={inputStyle} />
                    </div>
                </div>

                <label style={labelStyle}>Event Tag</label>
                <select
                    value={eventTag}
                    onChange={(e) => setEventTag(e.target.value)}
                    disabled={isClosed}
                    style={inputStyle}
                >
                    {EVENT_TAGS.map((tag) => (
                        <option key={tag.value} value={tag.value}>{tag.label}</option>
                    ))}
                </select>

                {/* Normal event: form builder */}
                {event.event_type === "normal" && (
                    <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#fff" }}>
                        <h3 style={{ marginTop: 0 }}>Custom Form {hasRegistrations && <span style={{ color: "#ef4444", fontSize: "13px" }}>(locked — has registrations)</span>}</h3>
                        {customForm.map((field, idx) => (
                            <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: "6px", backgroundColor: "#f1f5f9", borderRadius: "4px" }}>
                                <span><strong>{field.field_name}</strong> ({field.field_type}){field.is_required && <span style={{ color: "red" }}> *</span>}</span>
                                {!hasRegistrations && !isClosed && <button onClick={() => removeFormField(idx)} style={{ background: "#ef4444", color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer" }}>Remove</button>}
                            </div>
                        ))}
                        {!hasRegistrations && !isClosed && (
                            <div style={{ marginTop: "10px" }}>
                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "8px" }}>
                                    <input type="text" placeholder="Field name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} style={{ padding: "8px" }} />
                                    <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} style={{ padding: "8px" }}>
                                        <option value="text">Text</option>
                                        <option value="dropdown">Dropdown</option>
                                        <option value="checkbox">Checkbox</option>
                                    </select>
                                </div>
                                {newFieldType === "dropdown" && <input type="text" placeholder="Options (comma separated)" value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />}
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <label style={{ cursor: "pointer" }}><input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} style={{ marginRight: "4px" }} />Required</label>
                                    <button onClick={addFormField} style={{ padding: "6px 16px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Add Field</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Merchandise: show items */}
                {event.event_type === "merchandise" && (
                    <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#fff" }}>
                        <h3 style={{ marginTop: 0 }}>Merchandise Items</h3>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                            <div>
                                <label style={labelStyle}>Total Limit (per participant)</label>
                                <input type="number" value={purchaseLimit} onChange={(e) => setPurchaseLimit(e.target.value)} min="1" disabled={isClosed} style={{ ...inputStyle, maxWidth: "200px" }} />
                            </div>
                            <div>
                                <label style={labelStyle}>Per-Item Limit</label>
                                <input type="number" value={perItemLimit} onChange={(e) => setPerItemLimit(e.target.value)} min="1" disabled={isClosed} style={{ ...inputStyle, maxWidth: "200px" }} />
                            </div>
                        </div>

                        {merchandiseItems.map((item, itemIdx) => (
                            <div key={itemIdx} style={{ border: "1px solid #e2e8f0", padding: "12px", marginBottom: "10px", borderRadius: "6px" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                    <strong>{item.item_name}</strong>
                                    <button onClick={() => setActiveItemIndex(activeItemIndex === itemIdx ? null : itemIdx)} disabled={isClosed} style={{ padding: "4px 10px", backgroundColor: isClosed ? "#94a3b8" : "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: isClosed ? "not-allowed" : "pointer", fontSize: "12px" }}>
                                        {activeItemIndex === itemIdx ? "Close" : "Edit Variants"}
                                    </button>
                                </div>
                                {item.variants.length > 0 && (
                                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                                        <thead><tr style={{ backgroundColor: "#e2e8f0" }}><th style={{ padding: "6px", textAlign: "left" }}>Size</th><th style={{ padding: "6px", textAlign: "left" }}>Color</th><th style={{ padding: "6px", textAlign: "left" }}>Stock</th><th style={{ padding: "6px", textAlign: "left" }}>Price</th></tr></thead>
                                        <tbody>
                                            {item.variants.map((v, vIdx) => (
                                                <tr key={vIdx}>
                                                    <td style={{ padding: "6px" }}>{v.size}</td>
                                                    <td style={{ padding: "6px" }}>{v.color}</td>
                                                    <td style={{ padding: "6px" }}>
                                                        <input type="number" value={v.stock} min="0" disabled={isClosed}
                                                            onChange={(e) => {
                                                                const updated = [...merchandiseItems];
                                                                updated[itemIdx].variants[vIdx].stock = parseInt(e.target.value) || 0;
                                                                setMerchandiseItems(updated);
                                                            }}
                                                            style={{ width: "70px", padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
                                                    </td>
                                                    <td style={{ padding: "6px" }}>
                                                        <input type="number" value={v.price} min="0" disabled={isClosed}
                                                            onChange={(e) => {
                                                                const updated = [...merchandiseItems];
                                                                updated[itemIdx].variants[vIdx].price = parseFloat(e.target.value) || 0;
                                                                setMerchandiseItems(updated);
                                                            }}
                                                            style={{ width: "80px", padding: "4px 6px", border: "1px solid #cbd5e1", borderRadius: "4px" }} />
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                                {activeItemIndex === itemIdx && !isClosed && (
                                    <div style={{ display: "flex", gap: "6px", marginTop: "8px", alignItems: "center" }}>
                                        <input type="text" placeholder="Size" value={newVariantSize} onChange={(e) => setNewVariantSize(e.target.value)} style={{ padding: "6px", width: "70px" }} />
                                        <input type="text" placeholder="Color" value={newVariantColor} onChange={(e) => setNewVariantColor(e.target.value)} style={{ padding: "6px", width: "80px" }} />
                                        <input type="number" placeholder="Stock" value={newVariantStock} onChange={(e) => setNewVariantStock(e.target.value)} style={{ padding: "6px", width: "70px" }} min="0" />
                                        <input type="number" placeholder="Price" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} style={{ padding: "6px", width: "80px" }} min="0" />
                                        <button onClick={() => addVariant(itemIdx)} style={{ padding: "6px 12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Add</button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {!isClosed && <button onClick={handleSave} style={{ marginTop: "20px", padding: "10px 24px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}>Save Changes</button>}
            </div>
        </DashboardLayout>
    );
}

export default OrganizerEditEvent;
