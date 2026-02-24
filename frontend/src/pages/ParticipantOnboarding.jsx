import { useEffect, useState } from "react";
import API from "../api";
import { useNavigate } from "react-router-dom";

const INTEREST_OPTIONS = [
    { value: "competition",   label: "Competition" },
    { value: "workshop",      label: "Workshop" },
    { value: "academic-talk", label: "Academic / Talk" },
    { value: "cultural",      label: "Cultural" },
    { value: "social",        label: "Social" },
    { value: "sports",        label: "Sports" },
    { value: "recreational",  label: "Recreational" },
    { value: "miscellaneous", label: "Miscellaneous" },
];

function ParticipantOnboarding() {
    const navigate = useNavigate();
    const user = JSON.parse(localStorage.getItem("user"));

    const [step, setStep] = useState(1); // 1 = interests, 2 = clubs
    const [interests, setInterests] = useState([]);
    const [organizers, setOrganizers] = useState([]);
    const [followed, setFollowed] = useState(new Set());
    const [saving, setSaving] = useState(false);
    const [loadingOrgs, setLoadingOrgs] = useState(false);

    useEffect(() => {
        if (step === 2) loadOrganizers();
    }, [step]);

    const loadOrganizers = async () => {
        setLoadingOrgs(true);
        try {
            const res = await API.get("/api/users/organizers");
            setOrganizers(res.data);
        } catch { /* ignore */ }
        setLoadingOrgs(false);
    };

    const toggleInterest = (val) => {
        setInterests((prev) =>
            prev.includes(val) ? prev.filter((i) => i !== val) : [...prev, val]
        );
    };

    const toggleFollow = (id) => {
        setFollowed((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const saveInterests = async () => {
        if (interests.length === 0) { setStep(2); return; }
        setSaving(true);
        try {
            await API.patch(
                "/api/users/update-profile",
                { interests }
            );
        } catch { /* keep going */ }
        setSaving(false);
        setStep(2);
    };

    const saveFollows = async () => {
        setSaving(true);
        try {
            await Promise.all(
                [...followed].map((id) =>
                    API.post(
                        `/api/users/follow/${id}`,
                        {}
                    ).catch(() => {}) // ignore "already following"
                )
            );
        } catch { /* ignore */ }
        setSaving(false);
        navigate("/participant/dashboard");
    };

    const skip = () => navigate("/participant/dashboard");

    const pill = (active) => ({
        padding: "10px 18px", borderRadius: "24px", border: "1.5px solid",
        cursor: "pointer", fontSize: "14px", fontWeight: "600", transition: "all 0.15s",
        backgroundColor: active ? "#7c3aed" : "white",
        color: active ? "white" : "#6d28d9",
        borderColor: "#7c3aed",
        userSelect: "none",
    });

    const orgCard = (isFollowed) => ({
        border: `1.5px solid ${isFollowed ? "#7c3aed" : "#e5e7eb"}`,
        borderRadius: "10px", padding: "14px 16px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        backgroundColor: isFollowed ? "#f5f3ff" : "white",
        cursor: "pointer", transition: "all 0.15s",
    });

    return (
        <div style={{
            minHeight: "100vh", backgroundColor: "#f3f4f6",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "24px"
        }}>
            <div style={{
                backgroundColor: "white", borderRadius: "16px", padding: "40px",
                maxWidth: "600px", width: "100%",
                boxShadow: "0 8px 32px rgba(0,0,0,0.10)"
            }}>
                {/* Progress bar */}
                <div style={{ display: "flex", gap: "8px", marginBottom: "32px" }}>
                    {[1, 2].map((s) => (
                        <div key={s} style={{
                            flex: 1, height: "5px", borderRadius: "4px",
                            backgroundColor: s <= step ? "#7c3aed" : "#e5e7eb",
                            transition: "background-color 0.3s"
                        }} />
                    ))}
                </div>

                {/* step 1: interests */}
                {step === 1 && (
                    <>
                        <div style={{ marginBottom: "28px" }}>
                            <h2 style={{ margin: "0 0 6px", color: "#1e1b4b", fontSize: "22px" }}>
                                What are you into?
                            </h2>
                            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
                                Pick the types of events you care about. We'll use this to personalise your feed.
                            </p>
                        </div>

                        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "32px" }}>
                            {INTEREST_OPTIONS.map(({ value, label }) => (
                                <button key={value} type="button"
                                    onClick={() => toggleInterest(value)}
                                    style={pill(interests.includes(value))}
                                >
                                    {label}
                                </button>
                            ))}
                        </div>

                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button onClick={skip} style={{
                                padding: "10px 20px", borderRadius: "8px",
                                border: "1px solid #d1d5db", background: "white",
                                color: "#6b7280", cursor: "pointer", fontSize: "14px"
                            }}>Skip for now</button>

                            <button onClick={saveInterests} disabled={saving} style={{
                                padding: "10px 28px", borderRadius: "8px", border: "none",
                                backgroundColor: "#7c3aed", color: "white",
                                cursor: "pointer", fontSize: "14px", fontWeight: "600"
                            }}>
                                {saving ? "Saving…" : "Next"}
                            </button>
                        </div>
                    </>
                )}

                {/* step 2: follow clubs */}
                {step === 2 && (
                    <>
                        <div style={{ marginBottom: "24px" }}>
                            <h2 style={{ margin: "0 0 6px", color: "#1e1b4b", fontSize: "22px" }}>
                                Follow clubs & organizers
                            </h2>
                            <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>
                                Stay updated on events from clubs you like. You can always change this later.
                            </p>
                        </div>

                        {loadingOrgs ? (
                            <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>Loading clubs…</p>
                        ) : organizers.length === 0 ? (
                            <p style={{ color: "#9ca3af", textAlign: "center", padding: "20px 0" }}>No clubs found.</p>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "320px", overflowY: "auto", marginBottom: "24px", paddingRight: "4px" }}>
                                {organizers.map((org) => {
                                    const isFollowed = followed.has(org._id);
                                    return (
                                        <div key={org._id}
                                            style={orgCard(isFollowed)}
                                            onClick={() => toggleFollow(org._id)}
                                        >
                                            <div>
                                                <p style={{ margin: "0 0 2px", fontWeight: "600", fontSize: "15px", color: "#1e1b4b" }}>
                                                    {org.organizer_name}
                                                </p>
                                                {org.category && (
                                                    <p style={{ margin: 0, fontSize: "12px", color: "#9ca3af" }}>{org.category}</p>
                                                )}
                                                {org.description && (
                                                    <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280", maxWidth: "380px" }}>
                                                        {org.description.substring(0, 100)}{org.description.length > 100 ? "…" : ""}
                                                    </p>
                                                )}
                                            </div>
                                            <span style={{
                                                padding: "5px 14px", borderRadius: "20px", fontSize: "13px", fontWeight: "600",
                                                whiteSpace: "nowrap", flexShrink: 0,
                                                backgroundColor: isFollowed ? "#7c3aed" : "#ede9fe",
                                                color: isFollowed ? "white" : "#7c3aed",
                                                border: "none",
                                            }}>
                                                {isFollowed ? "Following" : "+ Follow"}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {followed.size > 0 && (
                            <p style={{ fontSize: "13px", color: "#7c3aed", marginBottom: "16px" }}>
                                {followed.size} club{followed.size > 1 ? "s" : ""} selected
                            </p>
                        )}

                        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
                            <button onClick={skip} style={{
                                padding: "10px 20px", borderRadius: "8px",
                                border: "1px solid #d1d5db", background: "white",
                                color: "#6b7280", cursor: "pointer", fontSize: "14px"
                            }}>Skip</button>

                            <button onClick={saveFollows} disabled={saving} style={{
                                padding: "10px 28px", borderRadius: "8px", border: "none",
                                backgroundColor: "#7c3aed", color: "white",
                                cursor: "pointer", fontSize: "14px", fontWeight: "600"
                            }}>
                                {saving ? "Saving…" : "Finish"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default ParticipantOnboarding;
