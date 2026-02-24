import { useState } from "react";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";

function AdminCreateOrganizer() {
    const [organizerName, setOrganizerName] = useState("");
    const [category, setCategory] = useState("");
    const [description, setDescription] = useState("");
    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [msgType, setMsgType] = useState("");

    const user = JSON.parse(localStorage.getItem("user"));

    const createOrganizer = async (e) => {
        e.preventDefault();
        try {
            const res = await API.post(
                "/api/admin/create-organizer",
                { organizer_name: organizerName, category, description, email }
            );

            setMessage(
                `Organizer created. Temp password: ${res.data.temp_password}`
            );
            setMsgType("ok");

            setOrganizerName("");
            setCategory("");
            setDescription("");
            setEmail("");
        } catch (err) {
            setMessage(err.response?.data?.message || "Error");
            setMsgType("err");
        }
    };

    return (
        <DashboardLayout>
            <h2>Create Organizer</h2>

            {message && (
                <p style={{
                    color: msgType === "err" ? "red" : "green",
                    fontWeight: "bold",
                    padding: message.includes("Temp password") ? "12px" : "0",
                    backgroundColor: message.includes("Temp password") ? "#dcfce7" : "transparent",
                    borderRadius: "6px"
                }}>
                    {message}
                    {message.includes("Temp password") && (
                        <span style={{ display: "block", fontSize: "13px", color: "#64748b", marginTop: "4px" }}>
                            Credentials have been sent to the organizer via email.
                        </span>
                    )}
                </p>
            )}

            <div style={{
                border: "1px solid #ddd",
                padding: "20px",
                borderRadius: "8px",
                backgroundColor: "#f8fafc"
            }}>
                <form onSubmit={createOrganizer}>
                    <input
                        type="text"
                        placeholder="Organizer Name"
                        value={organizerName}
                        onChange={(e) => setOrganizerName(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" }}
                    />

                    <input
                        type="text"
                        placeholder="Category"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" }}
                    />

                    <input
                        type="text"
                        placeholder="Description"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" }}
                    />

                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px", marginBottom: "12px", boxSizing: "border-box" }}
                    />

                    <button type="submit" style={{
                        padding: "10px 20px",
                        backgroundColor: "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "4px",
                        cursor: "pointer"
                    }}>
                        Create Organizer
                    </button>
                </form>
            </div>
        </DashboardLayout>
    );
}

export default AdminCreateOrganizer;
