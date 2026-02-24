import { useEffect, useState } from "react";
import API from "../api";
import DashboardLayout from "../layouts/DashboardLayout";

function AdminOrganizerList() {
    const [organizers, setOrganizers] = useState([]);
    const [message, setMessage] = useState("");

    const user = JSON.parse(localStorage.getItem("user"));

    useEffect(() => {
        fetchOrganizers();
    }, []);

    const fetchOrganizers = async () => {
        try {
            const res = await API.get(
                "/api/admin/all-organizers"
            );
            setOrganizers(res.data);
        } catch (err) {
            console.log(err);
        }
    };

    const disableOrganizer = async (id) => {
        try {
            await API.patch(
                `/api/admin/disable-organizer/${id}`,
                {}
            );
            setMessage("Organizer disabled");
            fetchOrganizers();
        } catch {
            setMessage("Error disabling organizer");
        }
    };

    const enableOrganizer = async (id) => {
        try {
            await API.patch(
                `/api/admin/enable-organizer/${id}`,
                {}
            );
            setMessage("Organizer enabled");
            fetchOrganizers();
        } catch {
            setMessage("Error enabling organizer");
        }
    };

    const deleteOrganizer = async (id) => {
        const confirmDelete = window.confirm(
            "Are you sure you want to permanently delete this organizer?"
        );
        if (!confirmDelete) return;

        try {
            await API.delete(
                `/api/admin/delete-organizer/${id}`
            );
            setMessage("Organizer deleted permanently");
            fetchOrganizers();
        } catch {
            setMessage("Error deleting organizer");
        }
    };

    return (
        <DashboardLayout>
            <h2>Manage Organizers</h2>

            {message && (
                <p style={{ color: "green", fontWeight: "bold" }}>
                    {message}
                </p>
            )}

            {organizers.length === 0 ? (
                <p>No organizers found.</p>
            ) : (
                organizers.map((org) => (
                    <div
                        key={org._id}
                        style={{
                            border: "1px solid #ccc",
                            padding: "15px",
                            marginBottom: "10px",
                            borderRadius: "6px",
                            backgroundColor: "#f1f5f9"
                        }}
                    >
                        <h4>{org.organizer_name}</h4>
                        <p>Email: {org.email}</p>

                        <p>
                            Status:{" "}
                            <span style={{
                                color: org.is_active ? "green" : "red",
                                fontWeight: "bold"
                            }}>
                                {org.is_active ? "Active" : "Disabled"}
                            </span>
                        </p>

                        {org.is_active ? (
                            <button onClick={() => disableOrganizer(org._id)}>
                                Disable
                            </button>
                        ) : (
                            <button onClick={() => enableOrganizer(org._id)}>
                                Enable
                            </button>
                        )}

                        <button
                            onClick={() => deleteOrganizer(org._id)}
                            style={{
                                marginLeft: "10px",
                                color: "white",
                                backgroundColor: "red",
                                border: "none",
                                padding: "5px 10px",
                                borderRadius: "4px",
                                cursor: "pointer"
                            }}
                        >
                            Delete
                        </button>
                    </div>
                ))
            )}
        </DashboardLayout>
    );
}

export default AdminOrganizerList;
