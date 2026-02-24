import { useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { CATEGORY_LABELS } from "../utils/helpers";

function OrganizerCreateEvent() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [eventName, setEventName] = useState("");
    const [description, setDescription] = useState("");
    const [fee, setFee] = useState("0");
    const [registrationLimit, setRegistrationLimit] = useState("100");
    const [eligibility, setEligibility] = useState("all");
    const [registrationDeadline, setRegistrationDeadline] = useState("");
    const [eventStartDate, setEventStartDate] = useState("");
    const [eventEndDate, setEventEndDate] = useState("");
    const [eventType, setEventType] = useState("normal");
    const [eventTag, setEventTag] = useState("competition");
    const [message, setMessage] = useState("");

    const EVENT_TAGS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

    // Normal: Form builder state
    const [customForm, setCustomForm] = useState([]);
    const [newFieldName, setNewFieldName] = useState("");
    const [newFieldType, setNewFieldType] = useState("text");
    const [newFieldOptions, setNewFieldOptions] = useState("");
    const [newFieldRequired, setNewFieldRequired] = useState(false);

    // Merchandise state
    const [merchandiseItems, setMerchandiseItems] = useState([]);
    const [purchaseLimit, setPurchaseLimit] = useState("5");
    const [perItemLimit, setPerItemLimit] = useState("1");
    const [newItemName, setNewItemName] = useState("");
    const [newVariantSize, setNewVariantSize] = useState("");
    const [newVariantColor, setNewVariantColor] = useState("");
    const [newVariantStock, setNewVariantStock] = useState("");
    const [newVariantPrice, setNewVariantPrice] = useState("");
    const [activeItemIndex, setActiveItemIndex] = useState(null);

    // Form builder functions
    const addFormField = () => {
        if (!newFieldName.trim()) return;
        setCustomForm([...customForm, {
            field_name: newFieldName.trim(),
            field_type: newFieldType,
            options: newFieldType === "dropdown" ? newFieldOptions.split(",").map(o => o.trim()).filter(o => o) : [],
            is_required: newFieldRequired
        }]);
        setNewFieldName(""); setNewFieldType("text"); setNewFieldOptions(""); setNewFieldRequired(false);
    };
    const removeFormField = (idx) => setCustomForm(customForm.filter((_, i) => i !== idx));

    // Merchandise functions
    const addMerchItem = () => {
        if (!newItemName.trim()) return;
        setMerchandiseItems([...merchandiseItems, { item_name: newItemName.trim(), variants: [] }]);
        setNewItemName("");
        setActiveItemIndex(merchandiseItems.length);
    };

    const removeMerchItem = (idx) => {
        setMerchandiseItems(merchandiseItems.filter((_, i) => i !== idx));
        setActiveItemIndex(null);
    };

    const addVariant = (itemIdx) => {
        if (!newVariantSize.trim() || !newVariantColor.trim() || !newVariantStock || !newVariantPrice) return;
        const updated = [...merchandiseItems];
        updated[itemIdx].variants.push({
            size: newVariantSize.trim(),
            color: newVariantColor.trim(),
            stock: parseInt(newVariantStock),
            price: parseFloat(newVariantPrice)
        });
        setMerchandiseItems(updated);
        setNewVariantSize(""); setNewVariantColor(""); setNewVariantStock(""); setNewVariantPrice("");
    };

    const removeVariant = (itemIdx, varIdx) => {
        const updated = [...merchandiseItems];
        updated[itemIdx].variants = updated[itemIdx].variants.filter((_, i) => i !== varIdx);
        setMerchandiseItems(updated);
    };

    const createEvent = async (e) => {
        e.preventDefault();
        try {
            const body = {
                event_name: eventName,
                event_description: description,
                event_type: eventType,
                eligibility,
                registration_deadline: registrationDeadline,
                event_start_date: eventStartDate,
                event_end_date: eventEndDate,
                registration_limit: parseInt(registrationLimit),
                registration_fee: parseFloat(fee),
                event_tags: [eventTag],
            };

            if (eventType === "normal") {
                body.custom_form = customForm;
            } else {
                body.merchandise_items = merchandiseItems;
                body.purchase_limit = parseInt(purchaseLimit);
                body.per_item_limit = parseInt(perItemLimit);
            }

            await API.post("/api/events/create", body);

            setMessage("Event created successfully!");
            setTimeout(() => navigate("/organizer/dashboard"), 1500);
        } catch (err) {
            setMessage(err.response?.data?.message || "Event creation failed");
        }
    };

    const inputStyle = { width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" };
    const labelStyle = { display: "block", fontWeight: "bold", marginBottom: "4px", fontSize: "14px" };

    return (
        <DashboardLayout>
            <h2>Create Event</h2>
            {message && <p style={{ color: "green", fontWeight: "bold" }}>{message}</p>}

            <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "#f8fafc" }}>
                <form onSubmit={createEvent}>
                    <label style={labelStyle}>Event Name</label>
                    <input type="text" value={eventName} onChange={(e) => setEventName(e.target.value)} required style={inputStyle} />

                    <label style={labelStyle}>Description</label>
                    <textarea value={description} onChange={(e) => setDescription(e.target.value)} required style={{ ...inputStyle, minHeight: "80px" }} />

                    <label style={labelStyle}>Event Type</label>
                    <div style={{ marginBottom: "12px", display: "flex", gap: "20px" }}>
                        <label style={{ cursor: "pointer" }}>
                            <input type="radio" value="normal" checked={eventType === "normal"} onChange={() => setEventType("normal")} style={{ marginRight: "5px" }} />
                            Normal Event
                        </label>
                        <label style={{ cursor: "pointer" }}>
                            <input type="radio" value="merchandise" checked={eventType === "merchandise"} onChange={() => setEventType("merchandise")} style={{ marginRight: "5px" }} />
                            Merchandise
                        </label>
                    </div>

                    <label style={labelStyle}>Event Tag</label>
                    <select value={eventTag} onChange={(e) => setEventTag(e.target.value)} required style={inputStyle}>
                        {EVENT_TAGS.map((tag) => (
                            <option key={tag.value} value={tag.value}>{tag.label}</option>
                        ))}
                    </select>

                    <label style={labelStyle}>Eligibility</label>
                    <select value={eligibility} onChange={(e) => setEligibility(e.target.value)} required style={inputStyle}>
                        <option value="all">All (Open to everyone)</option>
                        <option value="iiit">IIIT Only</option>
                    </select>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label style={labelStyle}>Registration Deadline</label>
                            <input type="datetime-local" value={registrationDeadline} onChange={(e) => setRegistrationDeadline(e.target.value)} required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Registration Limit</label>
                            <input type="number" value={registrationLimit} onChange={(e) => setRegistrationLimit(e.target.value)} required min="1" style={inputStyle} />
                        </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                        <div>
                            <label style={labelStyle}>Event Start</label>
                            <input type="datetime-local" value={eventStartDate} onChange={(e) => setEventStartDate(e.target.value)} required style={inputStyle} />
                        </div>
                        <div>
                            <label style={labelStyle}>Event End</label>
                            <input type="datetime-local" value={eventEndDate} onChange={(e) => setEventEndDate(e.target.value)} required style={inputStyle} />
                        </div>
                    </div>

                    {eventType === "normal" && (
                        <>
                            <label style={labelStyle}>Registration Fee (₹)</label>
                            <input type="number" value={fee} onChange={(e) => setFee(e.target.value)} min="0" style={inputStyle} />

                            {/* Form Builder */}
                            <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#fff" }}>
                                <h3 style={{ marginTop: 0 }}>Custom Registration Form</h3>
                                {customForm.map((field, idx) => (
                                    <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", marginBottom: "6px", backgroundColor: "#f1f5f9", borderRadius: "4px" }}>
                                        <span><strong>{field.field_name}</strong> ({field.field_type}){field.is_required && <span style={{ color: "red" }}> *</span>}{field.options.length > 0 && <span style={{ color: "#64748b" }}> — {field.options.join(", ")}</span>}</span>
                                        <button type="button" onClick={() => removeFormField(idx)} style={{ background: "#ef4444", color: "white", border: "none", padding: "4px 10px", borderRadius: "4px", cursor: "pointer" }}>Remove</button>
                                    </div>
                                ))}
                                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "8px", marginBottom: "8px" }}>
                                    <input type="text" placeholder="Field name" value={newFieldName} onChange={(e) => setNewFieldName(e.target.value)} style={{ padding: "8px" }} />
                                    <select value={newFieldType} onChange={(e) => setNewFieldType(e.target.value)} style={{ padding: "8px" }}>
                                        <option value="text">Text</option>
                                        <option value="dropdown">Dropdown</option>
                                        <option value="checkbox">Checkbox</option>
                                    </select>
                                </div>
                                {newFieldType === "dropdown" && (
                                    <input type="text" placeholder="Options (comma separated)" value={newFieldOptions} onChange={(e) => setNewFieldOptions(e.target.value)} style={{ ...inputStyle, marginBottom: "8px" }} />
                                )}
                                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                                    <label style={{ cursor: "pointer" }}><input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} style={{ marginRight: "4px" }} />Required</label>
                                    <button type="button" onClick={addFormField} style={{ padding: "6px 16px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Add Field</button>
                                </div>
                            </div>
                        </>
                    )}

                    {eventType === "merchandise" && (
                        <div style={{ marginTop: "20px", padding: "15px", border: "1px solid #cbd5e1", borderRadius: "8px", backgroundColor: "#fff" }}>
                            <h3 style={{ marginTop: 0 }}>Merchandise Items</h3>

                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px" }}>
                                <div>
                                    <label style={labelStyle}>Total Limit (per participant)</label>
                                    <input type="number" value={purchaseLimit} onChange={(e) => setPurchaseLimit(e.target.value)} min="1" style={{ ...inputStyle, maxWidth: "200px" }} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Per-Item Limit</label>
                                    <input type="number" value={perItemLimit} onChange={(e) => setPerItemLimit(e.target.value)} min="1" style={{ ...inputStyle, maxWidth: "200px" }} />
                                </div>
                            </div>

                            {/* Existing items */}
                            {merchandiseItems.map((item, itemIdx) => (
                                <div key={itemIdx} style={{ border: "1px solid #e2e8f0", padding: "12px", marginBottom: "10px", borderRadius: "6px", backgroundColor: "#f8fafc" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                                        <strong>{item.item_name}</strong>
                                        <div style={{ display: "flex", gap: "6px" }}>
                                            <button type="button" onClick={() => setActiveItemIndex(activeItemIndex === itemIdx ? null : itemIdx)} style={{ padding: "4px 10px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                                                {activeItemIndex === itemIdx ? "Close" : "Add Variants"}
                                            </button>
                                            <button type="button" onClick={() => removeMerchItem(itemIdx)} style={{ padding: "4px 10px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Remove</button>
                                        </div>
                                    </div>

                                    {/* Variants table */}
                                    {item.variants.length > 0 && (
                                        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", marginBottom: "8px" }}>
                                            <thead>
                                                <tr style={{ backgroundColor: "#e2e8f0" }}>
                                                    <th style={{ padding: "6px", textAlign: "left" }}>Size</th>
                                                    <th style={{ padding: "6px", textAlign: "left" }}>Color</th>
                                                    <th style={{ padding: "6px", textAlign: "left" }}>Stock</th>
                                                    <th style={{ padding: "6px", textAlign: "left" }}>Price (₹)</th>
                                                    <th style={{ padding: "6px" }}></th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {item.variants.map((v, vIdx) => (
                                                    <tr key={vIdx}>
                                                        <td style={{ padding: "6px" }}>{v.size}</td>
                                                        <td style={{ padding: "6px" }}>{v.color}</td>
                                                        <td style={{ padding: "6px" }}>{v.stock}</td>
                                                        <td style={{ padding: "6px" }}>₹{v.price}</td>
                                                        <td style={{ padding: "6px" }}><button type="button" onClick={() => removeVariant(itemIdx, vIdx)} style={{ background: "#ef4444", color: "white", border: "none", padding: "2px 8px", borderRadius: "3px", cursor: "pointer", fontSize: "11px" }}>×</button></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    )}

                                    {/* Add variant form */}
                                    {activeItemIndex === itemIdx && (
                                        <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                                            <input type="text" placeholder="Size" value={newVariantSize} onChange={(e) => setNewVariantSize(e.target.value)} style={{ padding: "6px", width: "70px" }} />
                                            <input type="text" placeholder="Color" value={newVariantColor} onChange={(e) => setNewVariantColor(e.target.value)} style={{ padding: "6px", width: "80px" }} />
                                            <input type="number" placeholder="Stock" value={newVariantStock} onChange={(e) => setNewVariantStock(e.target.value)} style={{ padding: "6px", width: "70px" }} min="0" />
                                            <input type="number" placeholder="Price" value={newVariantPrice} onChange={(e) => setNewVariantPrice(e.target.value)} style={{ padding: "6px", width: "80px" }} min="0" />
                                            <button type="button" onClick={() => addVariant(itemIdx)} style={{ padding: "6px 12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>Add</button>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Add new item */}
                            <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                                <input type="text" placeholder="Item name (e.g. Felicity T-Shirt)" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} style={{ flex: 1, padding: "8px" }} />
                                <button type="button" onClick={addMerchItem} style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Add Item</button>
                            </div>
                        </div>
                    )}

                    <button type="submit" style={{ marginTop: "20px", padding: "10px 24px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "16px" }}>
                        Create Event
                    </button>
                </form>
            </div>
        </DashboardLayout>
    );
}

export default OrganizerCreateEvent;
