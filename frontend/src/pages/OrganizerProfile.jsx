import { useEffect, useState } from "react";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";

const CATEGORIES = [
    "Technical", "Cultural", "Sports", "Academic", "Social",
    "Workshop", "Competition", "Recreational", "Miscellaneous"
];

function Field({ label, value }) {
    return (
        <div style={{ marginBottom: "14px" }}>
            <span style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
            <p style={{ margin: "2px 0 0", color: "#111827", fontSize: "15px", wordBreak: "break-word" }}>{value || <em style={{ color: "#9ca3af" }}>Not set</em>}</p>
        </div>
    );
}

function OrganizerProfile() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [profile, setProfile] = useState(null);
    const [message, setMessage] = useState({ text: "", type: "" });
    const [editing, setEditing] = useState(false);

    // editable fields
    const [organizerName, setOrganizerName] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [discordWebhook, setDiscordWebhook] = useState("");

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await API.get("/api/users/profile");
            const d = res.data;
            setProfile(d);
            setOrganizerName(d.organizer_name || "");
            setCategory(d.category || "");
            setDescription(d.description || "");
            setContactNumber(d.contact_number || "");
            setDiscordWebhook(d.discord_webhook || "");
        } catch {
            setMessage({ text: "Failed to load profile.", type: "error" });
        }
    };

    const handleSave = async () => {
        try {
            await API.patch(
                "/api/users/update-profile",
                {
                    organizer_name: organizerName,
                    category,
                    description,
                    contact_number: contactNumber,
                    discord_webhook: discordWebhook
                }
            );
            setMessage({ text: "Profile updated successfully!", type: "success" });
            setEditing(false);
            fetchProfile();
        } catch {
            setMessage({ text: "Update failed. Please try again.", type: "error" });
        }
    };

    const handleCancel = () => {
        if (profile) {
            setOrganizerName(profile.organizer_name || "");
            setCategory(profile.category || "");
            setDescription(profile.description || "");
            setContactNumber(profile.contact_number || "");
            setDiscordWebhook(profile.discord_webhook || "");
        }
        setEditing(false);
    };

    if (!profile) {
        return <DashboardLayout><p style={{ padding: "20px" }}>Loading profile...</p></DashboardLayout>;
    }

    const input = {
        width: "100%", padding: "9px 12px", fontSize: "14px", border: "1px solid #d1d5db",
        borderRadius: "6px", boxSizing: "border-box", marginBottom: "14px",
        outline: "none", transition: "border 0.15s"
    };
    const label = { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "5px" };

    return (
        <DashboardLayout>
            <div style={{ maxWidth: "640px" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
                    <h2 style={{ margin: 0 }}>Organizer Profile</h2>
                    <span style={{
                        padding: "3px 10px", borderRadius: "999px", fontSize: "13px", fontWeight: "600",
                        backgroundColor: profile.is_active ? "#dcfce7" : "#fee2e2",
                        color: profile.is_active ? "#16a34a" : "#dc2626"
                    }}>{profile.is_active ? "Active" : "Disabled"}</span>
                </div>

                {message.text && (
                    <div style={{
                        padding: "10px 14px", borderRadius: "6px", marginBottom: "16px", fontSize: "14px",
                        backgroundColor: message.type === "error" ? "#fef2f2" : "#f0fdf4",
                        color: message.type === "error" ? "#dc2626" : "#16a34a",
                        border: `1px solid ${message.type === "error" ? "#fecaca" : "#bbf7d0"}`
                    }}>{message.text}</div>
                )}

                {!editing ? (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#f9fafb", padding: "24px" }}>
                        <Field label="Organizer Name" value={profile.organizer_name} />
                        <Field label="Login Email (non-editable)" value={profile.email} />
                        <Field label="Contact Number" value={profile.contact_number} />
                        <Field label="Category" value={profile.category} />
                        <Field label="Description" value={profile.description} />

                        <div style={{ marginBottom: "14px" }}>
                            <span style={{ fontSize: "12px", fontWeight: "600", color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" }}>Discord Webhook</span>
                            {profile.discord_webhook ? (
                                <p style={{ margin: "2px 0 0", fontSize: "14px", color: "#7c3aed", wordBreak: "break-all" }}>
                                    Configured
                                </p>
                            ) : (
                                <p style={{ margin: "2px 0 0", fontSize: "14px" }}><em style={{ color: "#9ca3af" }}>Not configured</em></p>
                            )}
                        </div>

                        <button onClick={() => setEditing(true)} style={{
                            marginTop: "6px", padding: "9px 20px", backgroundColor: "#2563eb",
                            color: "white", border: "none", borderRadius: "6px", cursor: "pointer",
                            fontSize: "14px", fontWeight: "600"
                        }}>Edit Profile</button>
                    </div>
                ) : (
                    <div style={{ border: "1px solid #e5e7eb", borderRadius: "10px", backgroundColor: "#f9fafb", padding: "24px" }}>
                        {/* Login email — read-only */}
                        <label style={label}>Login Email <span style={{ color: "#9ca3af", fontWeight: 400 }}>(non-editable)</span></label>
                        <input type="email" value={profile.email} readOnly style={{ ...input, backgroundColor: "#f3f4f6", color: "#6b7280", cursor: "not-allowed" }} />

                        <label style={label}>Organizer Name</label>
                        <input type="text" value={organizerName} onChange={(e) => setOrganizerName(e.target.value)} style={input} placeholder="Your club / society name" />

                        <label style={label}>Category</label>
                        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...input, marginBottom: "14px" }}>
                            <option value="">-- Select category --</option>
                            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                        </select>

                        <label style={label}>Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ ...input, resize: "vertical" }} placeholder="Short description of your organization" />

                        <label style={label}>Contact Number</label>
                        <input type="tel" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} style={input} placeholder="+91 9xxxxxxxxx" />

                        {/* Discord webhook section */}
                        <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "16px", marginTop: "6px" }}>
                            <label style={{ ...label, color: "#7c3aed" }}>Discord Webhook URL</label>
                            <p style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px", marginTop: 0 }}>
                                When set, new events will be auto-posted to your Discord channel upon publishing.
                                <a href="https://support.discord.com/hc/en-us/articles/228383668" target="_blank" rel="noreferrer"
                                    style={{ marginLeft: "6px", color: "#7c3aed" }}>How to create a webhook</a>
                            </p>
                            <input
                                type="url"
                                value={discordWebhook}
                                onChange={(e) => setDiscordWebhook(e.target.value)}
                                style={{ ...input, borderColor: "#c4b5fd" }}
                                placeholder="https://discord.com/api/webhooks/..."
                            />
                            {discordWebhook && (
                                <button
                                    type="button"
                                    onClick={() => setDiscordWebhook("")}
                                    style={{ fontSize: "12px", color: "#dc2626", background: "none", border: "none", cursor: "pointer", padding: 0, marginTop: "-10px", marginBottom: "12px" }}
                                >
                                    Remove webhook
                                </button>
                            )}
                        </div>

                        <div style={{ display: "flex", gap: "10px", marginTop: "8px" }}>
                            <button onClick={handleSave} style={{
                                padding: "9px 22px", backgroundColor: "#16a34a",
                                color: "white", border: "none", borderRadius: "6px", cursor: "pointer",
                                fontSize: "14px", fontWeight: "600"
                            }}>Save Changes</button>
                            <button onClick={handleCancel} style={{
                                padding: "9px 18px", backgroundColor: "#f3f4f6",
                                color: "#374151", border: "1px solid #d1d5db", borderRadius: "6px", cursor: "pointer",
                                fontSize: "14px"
                            }}>Cancel</button>
                        </div>
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
}

export default OrganizerProfile;
