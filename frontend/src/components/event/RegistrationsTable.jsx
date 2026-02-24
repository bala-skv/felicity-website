import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import Papa from "papaparse";

export default function RegistrationsTable({ event, registrations, onToggleAttendance, onToggleCollected }) {
    const [search, setSearch] = useState("");
    const [participantTypeFilter, setParticipantTypeFilter] = useState("all");
    const [markingFilter, setMarkingFilter] = useState("all");
    const [formFieldFilter, setFormFieldFilter] = useState("all");
    const [formResponseFilter, setFormResponseFilter] = useState("");

    const isMerch = event?.event_type === "merchandise";

    const rows = useMemo(() => {
        return registrations.map((reg) => {
            const fullName = `${reg.participant_id?.first_name || ""} ${reg.participant_id?.last_name || ""}`.trim();
            const email = reg.participant_id?.email || "";
            const participantType = reg.participant_id?.participant_type || "Unknown";
            const regDateText = new Date(reg.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

            const customResponsesText = !isMerch
                ? (event.custom_form || []).map((field) => {
                    const value = reg.form_responses?.[field.field_name];
                    if (value === undefined || value === null || value === "") return "";
                    if (typeof value === "boolean") return value ? "yes" : "no";
                    return String(value);
                }).filter(Boolean).join(" ")
                : "";

            const itemsText = (reg.items_ordered || []).map((item) => `${item.item_name} ${item.size} ${item.color} qty ${item.quantity}`).join(" ");

            const statusKey = !isMerch
                ? (reg.attendance_marked ? "marked" : "not_marked")
                : (reg.items_ordered || []).every((item) => item.collected) ? "collected"
                    : (reg.items_ordered || []).some((item) => item.collected) ? "partially_collected" : "not_collected";

            return { reg, fullName, email, participantType, customResponsesText, itemsText, statusKey, regDateText };
        });
    }, [registrations, event, isMerch]);

    const filteredRows = useMemo(() => {
        let result = rows;

        if (participantTypeFilter !== "all") {
            result = result.filter((r) => r.participantType === participantTypeFilter);
        }
        if (markingFilter !== "all") {
            result = result.filter((r) => r.statusKey === markingFilter);
        }
        if (!isMerch && formFieldFilter !== "all") {
            result = result.filter((r) => {
                const rawValue = r.reg.form_responses?.[formFieldFilter];
                if (rawValue === undefined || rawValue === null || rawValue === "") return false;
                const valueText = typeof rawValue === "boolean" ? (rawValue ? "yes" : "no") : String(rawValue);
                const q = formResponseFilter.trim().toLowerCase();
                return !q || valueText.toLowerCase().includes(q);
            });
        }

        const query = search.trim();
        if (!query) return result;
        const fuse = new Fuse(result, {
            keys: ["fullName", "email", "participantType", "customResponsesText", "itemsText", "regDateText"],
            threshold: 0.35, ignoreLocation: true, minMatchCharLength: 2,
        });
        return fuse.search(query).map((r) => r.item);
    }, [rows, participantTypeFilter, markingFilter, formFieldFilter, formResponseFilter, search, isMerch]);

    const exportCsv = () => {
        if (filteredRows.length === 0) return;
        const csvRows = filteredRows.map((row) => {
            const reg = row.reg;
            const common = { Name: row.fullName, Email: row.email, ParticipantType: row.participantType, RegistrationDate: row.regDateText };
            if (!isMerch) {
                return { ...common, Attendance: reg.attendance_marked ? "Marked" : "Not Marked", Responses: row.customResponsesText || "-" };
            }
            return {
                ...common,
                ItemsOrdered: (reg.items_ordered || []).map((i) => `${i.item_name} (${i.size}/${i.color}) x${i.quantity}`).join("; "),
                Collected: (reg.items_ordered || []).map((i) => `${i.item_name}(${i.size}/${i.color}):${i.collected ? "Collected" : "Not Collected"}`).join("; "),
                OrderTotal: `₹${(reg.items_ordered || []).reduce((s, i) => s + (i.price || 0) * (i.quantity || 0), 0)}`,
            };
        });
        const csv = Papa.unparse(csvRows);
        const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", `${event.event_name.replace(/\s+/g, "_")}_registrations.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    return (
        <div style={{ border: "1px solid #ddd", padding: "20px", borderRadius: "8px", backgroundColor: "#fff" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <h3 style={{ margin: 0 }}>{isMerch ? "Orders" : "Registrations"} ({registrations.length})</h3>
                {!isMerch && (() => {
                    const present = registrations.filter((r) => r.attendance_marked).length;
                    const absent = registrations.length - present;
                    return (
                        <div style={{ display: "flex", gap: "8px", fontSize: "13px" }}>
                            <span style={{ padding: "4px 12px", borderRadius: "20px", backgroundColor: "#dcfce7", color: "#166534", fontWeight: "600" }}>✅ Present: {present}</span>
                            <span style={{ padding: "4px 12px", borderRadius: "20px", backgroundColor: "#fee2e2", color: "#991b1b", fontWeight: "600" }}>❌ Absent: {absent}</span>
                        </div>
                    );
                })()}
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "14px", alignItems: "center", flexWrap: "wrap", padding: "10px 12px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px" }}>
                <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search participants..." style={{ flex: "1 1 260px", minWidth: "240px", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
                <select value={participantTypeFilter} onChange={(e) => setParticipantTypeFilter(e.target.value)}
                    style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white" }}>
                    <option value="all">All Participant Types</option>
                    <option value="IIIT">IIIT</option>
                    <option value="Non-IIIT">Non-IIIT</option>
                </select>
                <select value={markingFilter} onChange={(e) => setMarkingFilter(e.target.value)}
                    style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white" }}>
                    <option value="all">All {!isMerch ? "Attendance" : "Collected"}</option>
                    {!isMerch ? (
                        <>
                            <option value="marked">Marked</option>
                            <option value="not_marked">Not Marked</option>
                        </>
                    ) : (
                        <>
                            <option value="collected">Collected</option>
                            <option value="partially_collected">Partially Collected</option>
                            <option value="not_collected">Not Collected</option>
                        </>
                    )}
                </select>
                {!isMerch && event.custom_form?.length > 0 && (
                    <>
                        <select value={formFieldFilter} onChange={(e) => setFormFieldFilter(e.target.value)}
                            style={{ padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", backgroundColor: "white" }}>
                            <option value="all">All Form Fields</option>
                            {event.custom_form.map((field, idx) => <option key={idx} value={field.field_name}>{field.field_name}</option>)}
                        </select>
                        <input type="text" value={formResponseFilter} onChange={(e) => setFormResponseFilter(e.target.value)}
                            placeholder="Filter selected form response" style={{ minWidth: "220px", padding: "8px 10px", border: "1px solid #cbd5e1", borderRadius: "6px" }} />
                    </>
                )}
                <button onClick={exportCsv} style={{ padding: "8px 12px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px" }}>Export CSV</button>
            </div>

            {filteredRows.length === 0 ? <p>No matching participants.</p> : (
                <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", border: "1px solid #e2e8f0", fontSize: "13px" }}>
                        <thead>
                            <tr style={{ backgroundColor: "#f1f5f9" }}>
                                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: "700", color: "#475569" }}>Name</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: "700", color: "#475569" }}>Email</th>
                                {!isMerch && event.custom_form?.map((field, idx) => (
                                    <th key={idx} style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: "700", color: "#475569" }}>{field.field_name}</th>
                                ))}
                                {isMerch && (
                                    <>
                                        <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: "700", color: "#475569" }}>Items Ordered</th>
                                        <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: "700", color: "#475569" }}>Total</th>
                                    </>
                                )}
                                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: "700", color: "#475569" }}>{isMerch ? "Collected" : "Attendance"}</th>
                                <th style={{ padding: "10px 12px", textAlign: "left", borderBottom: "2px solid #e2e8f0", fontWeight: "700", color: "#475569" }}>Reg Date</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((row) => {
                                const reg = row.reg;
                                return (
                                    <tr key={reg._id}
                                        onMouseOver={(e) => e.currentTarget.style.backgroundColor = "#f8fafc"}
                                        onMouseOut={(e) => e.currentTarget.style.backgroundColor = "transparent"}>
                                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600" }}>
                                            {reg.participant_id?.first_name} {reg.participant_id?.last_name}
                                        </td>
                                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>{reg.participant_id?.email}</td>
                                        {!isMerch && event.custom_form?.map((field, idx) => (
                                            <td key={idx} style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                                                {reg.form_responses?.[field.field_name] !== undefined
                                                    ? (typeof reg.form_responses[field.field_name] === "boolean"
                                                        ? (reg.form_responses[field.field_name] ? "Yes" : "No")
                                                        : reg.form_responses[field.field_name] || "—")
                                                    : "—"}
                                            </td>
                                        ))}
                                        {isMerch && (
                                            <>
                                                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                                                    {reg.items_ordered?.map((item, idx) => <div key={idx}>{item.item_name} ({item.size}/{item.color}) ×{item.quantity}</div>)}
                                                </td>
                                                <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", fontWeight: "600" }}>
                                                    ₹{reg.items_ordered?.reduce((sum, i) => sum + i.price * i.quantity, 0) || 0}
                                                </td>
                                            </>
                                        )}
                                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0" }}>
                                            {!isMerch ? (
                                                <div>
                                                    <button onClick={() => onToggleAttendance(reg._id, reg.attendance_marked)}
                                                        style={{
                                                            padding: "6px 10px", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px",
                                                            backgroundColor: reg.attendance_marked ? "#16a34a" : "#e2e8f0",
                                                            color: reg.attendance_marked ? "white" : "#334155"
                                                        }}>
                                                        {reg.attendance_marked ? "✅ Present" : "Mark Present"}
                                                    </button>
                                                    {reg.attendance_marked && reg.attendance_time && (
                                                        <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#64748b" }}>
                                                            {new Date(reg.attendance_time).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                                                    {reg.items_ordered?.map((item, idx) => (
                                                        <button key={idx} onClick={() => onToggleCollected(reg._id, idx, item.collected)}
                                                            style={{
                                                                padding: "5px 8px", border: "none", borderRadius: "4px", cursor: "pointer",
                                                                fontSize: "11px", textAlign: "left",
                                                                backgroundColor: item.collected ? "#16a34a" : "#e2e8f0",
                                                                color: item.collected ? "white" : "#334155"
                                                            }}>
                                                            {item.item_name} ({item.size}/{item.color}): {item.collected ? "Collected" : "Not Collected"}
                                                        </button>
                                                    ))}
                                                    {reg.collection_time && (
                                                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#64748b" }}>
                                                            📦 {new Date(reg.collection_time).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td style={{ padding: "10px 12px", borderBottom: "1px solid #e2e8f0", color: "#64748b" }}>
                                            {new Date(reg.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
