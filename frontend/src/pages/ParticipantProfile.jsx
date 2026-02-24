import { useEffect, useState } from "react";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";

const INTEREST_OPTIONS = [
    "competition",
    "workshop",
    "academic-talk",
    "cultural",
    "social",
    "sports",
    "recreational",
    "miscellaneous"
];

const INTEREST_LABELS = {
    "competition":   "Competition",
    "workshop":      "Workshop",
    "academic-talk": "Academic / Talk",
    "cultural":      "Cultural",
    "social":        "Social",
    "sports":        "Sports",
    "recreational":  "Recreational",
    "miscellaneous": "Miscellaneous"
};

function ParticipantProfile() {
    const user = JSON.parse(localStorage.getItem("user"));
    const [profile, setProfile] = useState(null);
    const [message, setMessage] = useState("");
    const [msgType, setMsgType] = useState("");
    const [editing, setEditing] = useState(false);

    // Editable fields
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [contactNumber, setContactNumber] = useState("");
    const [collegeName, setCollegeName] = useState("");
    const [interests, setInterests] = useState([]);

    // Password change
    const [showPasswordChange, setShowPasswordChange] = useState(false);
    const [oldPassword, setOldPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [pwMessage, setPwMessage] = useState("");
    const [pwMsgType, setPwMsgType] = useState("");

    useEffect(() => { fetchProfile(); }, []);

    const fetchProfile = async () => {
        try {
            const res = await API.get("/api/users/profile");
            setProfile(res.data);
            setFirstName(res.data.first_name || "");
            setLastName(res.data.last_name || "");
            setContactNumber(res.data.contact_number || "");
            setCollegeName(res.data.college_name || "");
            setInterests(res.data.interests || []);
        } catch {
            setMessage("Failed to load profile");
            setMsgType("err");
        }
    };

    const handleSave = async () => {
        try {
            await API.patch("/api/users/update-profile", {
                first_name: firstName,
                last_name: lastName,
                contact_number: contactNumber,
                college_name: collegeName,
                interests
            });
            setMessage("Profile updated successfully!");
            setMsgType("ok");
            setEditing(false);
            fetchProfile();
        } catch {
            setMessage("Update failed");
            setMsgType("err");
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        setPwMessage("");

        if (!oldPassword || !newPassword || !confirmPassword) {
            setPwMessage("All password fields are required");
            setPwMsgType("err");
            return;
        }
        if (newPassword.length < 6) {
            setPwMessage("New password must be at least 6 characters");
            setPwMsgType("err");
            return;
        }
        if (newPassword !== confirmPassword) {
            setPwMessage("New passwords do not match");
            setPwMsgType("err");
            return;
        }

        try {
            const res = await API.patch("/api/users/change-password", {
                old_password: oldPassword,
                new_password: newPassword
            });
            setPwMessage(res.data.message);
            setPwMsgType("ok");
            setOldPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (err) {
            setPwMessage(err.response?.data?.message || "Password change failed");
            setPwMsgType("err");
        }
    };

    const toggleInterest = (interest) => {
        setInterests((prev) =>
            prev.includes(interest)
                ? prev.filter((i) => i !== interest)
                : [...prev, interest]
        );
    };

    if (!profile) {
        return <DashboardLayout><p>Loading...</p></DashboardLayout>;
    }



    return (
        <DashboardLayout>
            <h2 style={{ marginBottom: "6px" }}>My Profile</h2>
            <p style={{ color: "#64748b", marginTop: 0, marginBottom: "20px" }}>Manage your personal information and security settings</p>

            {message && (
                <p className={`msg-banner ${msgType === "err" ? "error" : "success"}`}>
                    {message}
                </p>
            )}

            {/* profile info */}
            <div className="section-box">
                <h3 style={{ marginTop: 0, marginBottom: "16px", color: "#1e293b" }}>Personal Information</h3>

                {!editing ? (
                    <>
                        <p><strong>First Name:</strong> {profile.first_name || "N/A"}</p>
                        <p><strong>Last Name:</strong> {profile.last_name || "N/A"}</p>
                        <p><strong>Email:</strong> {profile.email}</p>
                        <p><strong>Participant Type:</strong>
                            <span style={{
                                marginLeft: "8px", padding: "2px 10px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold",
                                backgroundColor: profile.participant_type === "IIIT" ? "#dbeafe" : "#fef3c7",
                                color: profile.participant_type === "IIIT" ? "#1e40af" : "#92400e"
                            }}>
                                {profile.participant_type}
                            </span>
                        </p>
                        <p><strong>College / Organization:</strong> {profile.college_name || "N/A"}</p>
                        <p><strong>Contact Number:</strong> {profile.contact_number || "N/A"}</p>
                        <p><strong>Interests:</strong>{" "}
                            {profile.interests && profile.interests.length > 0
                                ? profile.interests.map((i) => (
                                    <span key={i} style={{
                                        display: "inline-block", padding: "2px 10px", margin: "2px 4px", borderRadius: "12px",
                                        backgroundColor: "#e0e7ff", color: "#3730a3", fontSize: "12px", fontWeight: "500"
                                    }}>{INTEREST_LABELS[i] || i}</span>
                                ))
                                : <span style={{ color: "#94a3b8" }}>None selected</span>
                            }
                        </p>

                        <button onClick={() => setEditing(true)} style={{
                            marginTop: "10px", padding: "10px 20px", backgroundColor: "#2563eb",
                            color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600", fontSize: "14px"
                        }}>Edit Profile</button>
                    </>
                ) : (
                    <>
                        <label className="form-label">First Name</label>
                        <input type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} className="form-input" />

                        <label className="form-label">Last Name</label>
                        <input type="text" value={lastName} onChange={(e) => setLastName(e.target.value)} className="form-input" />

                        <label className="form-label">Email <span style={{ fontWeight: "normal", color: "#94a3b8", fontSize: "12px" }}>(non-editable)</span></label>
                        <input type="text" value={profile.email} disabled className="form-input" style={{ backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }} />

                        <label className="form-label">Participant Type <span style={{ fontWeight: "normal", color: "#94a3b8", fontSize: "12px" }}>(non-editable)</span></label>
                        <input type="text" value={profile.participant_type} disabled className="form-input" style={{ backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }} />

                        <label className="form-label">College / Organization Name {profile.participant_type === "IIIT" && <span style={{ fontWeight: "normal", color: "#94a3b8", fontSize: "12px" }}>(non-editable)</span>}</label>
                        {profile.participant_type === "IIIT" ? (
                            <input type="text" value={profile.college_name || "IIIT"} disabled className="form-input" style={{ backgroundColor: "#f1f5f9", color: "#64748b", cursor: "not-allowed" }} />
                        ) : (
                            <input type="text" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} className="form-input" />
                        )}

                        <label className="form-label">Contact Number</label>
                        <input type="text" value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} className="form-input" />

                        <label className="form-label">Areas of Interest</label>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "14px" }}>
                            {INTEREST_OPTIONS.map((opt) => (
                                <button
                                    key={opt}
                                    type="button"
                                    onClick={() => toggleInterest(opt)}
                                    style={{
                                        padding: "6px 14px", borderRadius: "20px", border: "1px solid",
                                        cursor: "pointer", fontSize: "13px", fontWeight: "500",
                                        backgroundColor: interests.includes(opt) ? "#2563eb" : "white",
                                        color: interests.includes(opt) ? "white" : "#334155",
                                        borderColor: interests.includes(opt) ? "#2563eb" : "#cbd5e1"
                                    }}
                                >
                                    {interests.includes(opt) ? "" : ""}{INTEREST_LABELS[opt]}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: "flex", gap: "10px" }}>
                            <button onClick={handleSave} style={{
                                padding: "10px 20px", backgroundColor: "#16a34a",
                                color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600"
                            }}>Save Changes</button>
                            <button onClick={() => { setEditing(false); fetchProfile(); }} style={{
                                padding: "10px 20px", backgroundColor: "#6b7280",
                                color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600"
                            }}>Cancel</button>
                        </div>
                    </>
                )}
            </div>

            {/* password section */}
            <div className="section-box">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <h3 style={{ margin: 0, color: "#1e293b" }}>Security Settings</h3>
                    <button
                        onClick={() => { setShowPasswordChange(!showPasswordChange); setPwMessage(""); }}
                        style={{
                            padding: "8px 16px", backgroundColor: showPasswordChange ? "#6b7280" : "#f59e0b",
                            color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "13px", fontWeight: "600"
                        }}
                    >
                        {showPasswordChange ? "Close" : "Change Password"}
                    </button>
                </div>

                {showPasswordChange && (
                    <form onSubmit={handlePasswordChange} style={{ marginTop: "16px" }}>
                        {pwMessage && (
                            <p className={`msg-banner ${pwMsgType === "err" ? "error" : "success"}`}>
                                {pwMessage}
                            </p>
                        )}

                        <label className="form-label">Current Password</label>
                        <input type="password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} className="form-input" />

                        <label className="form-label">New Password</label>
                        <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="form-input" />

                        <label className="form-label">Confirm New Password</label>
                        <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="form-input" />

                        <button type="submit" style={{
                            padding: "10px 20px", backgroundColor: "#dc2626",
                            color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600"
                        }}>Update Password</button>
                    </form>
                )}
            </div>
        </DashboardLayout>
    );
}

export default ParticipantProfile;
