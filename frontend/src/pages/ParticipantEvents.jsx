import { useEffect, useMemo, useState } from "react";
import API from "../api";
import Fuse from "fuse.js";
import { Link } from "react-router-dom";
import DashboardLayout from "../layouts/DashboardLayout";
import { formatDate, getComputedStatus, getStatusStyle, getParticipantStatusLabel, getCategoryLabel, CATEGORY_LABELS } from "../utils/helpers";

function ParticipantEvents() {
    const [events, setEvents] = useState([]);
    const [trending, setTrending] = useState([]);
    const [followedOrganizerIds, setFollowedOrganizerIds] = useState([]);
    const [userInterests, setUserInterests] = useState([]);
    const [interestFilter, setInterestFilter] = useState(false);
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [eligibilityFilter, setEligibilityFilter] = useState("any");
    const [clubFilter, setClubFilter] = useState("all");
    const [statusSort, setStatusSort] = useState("all");
    const [eventTypeSort, setEventTypeSort] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const user = JSON.parse(localStorage.getItem("user"));

    const EVENT_TAG_OPTIONS = Object.entries(CATEGORY_LABELS).map(([value, label]) => ({ value, label }));

    useEffect(() => { fetchEvents(); }, []);

    const fetchEvents = async () => {
        try {
            const [evRes, trRes, orgRes, profileRes] = await Promise.all([
                API.get("/api/events/list"),
                API.get("/api/events/trending"),
                API.get("/api/users/organizers"),
                API.get("/api/users/profile")
            ]);
            setEvents(evRes.data);
            setTrending(trRes.data);
            setFollowedOrganizerIds(
                orgRes.data
                    .filter((org) => org.is_followed)
                    .map((org) => org._id)
            );
            setUserInterests(profileRes.data.interests || []);
        } catch (err) { console.log(err); }
    };



    const getPrimaryEventTag = (event) => event.event_tags?.[0] || event.event_category || "miscellaneous";

    const searchableEvents = useMemo(() => {
        const query = search.trim();
        if (!query) return events;

        const fuse = new Fuse(events, {
            keys: [
                "event_name",
                "event_description",
                "organizer_id.organizer_name",
                "event_tags"
            ],
            threshold: 0.35,
            ignoreLocation: true,
            minMatchCharLength: 2,
        });

        return fuse.search(query).map((result) => result.item);
    }, [events, search]);

    const filtered = searchableEvents.filter((event) => {
        const matchesType = typeFilter === "all" || event.event_type === typeFilter;
        const matchesEligibility = eligibilityFilter === "any" || event.eligibility === eligibilityFilter;
        const matchesClub = clubFilter === "all" || followedOrganizerIds.includes(event.organizer_id?._id);
        const computedStatus = getComputedStatus(event);
        const participantStatus = getParticipantStatusLabel(computedStatus);
        const matchesStatus = statusSort === "all" || participantStatus === statusSort;
        const eventStart = new Date(event.event_start_date);
        const matchesFrom = !dateFrom || eventStart >= new Date(dateFrom);
        const matchesTo = !dateTo || eventStart <= new Date(dateTo + "T23:59:59");
        const matchesInterest = !interestFilter || userInterests.length === 0 ||
            userInterests.includes(getPrimaryEventTag(event));
        return matchesType && matchesEligibility && matchesClub && matchesStatus && matchesFrom && matchesTo && matchesInterest;
    });

    const sortedEvents = useMemo(() => {
        const statusRank = { upcoming: 0, ongoing: 1, closed: 2 };
        const selectedCategory = eventTypeSort;

        return [...filtered].sort((a, b) => {
            if (selectedCategory !== "all") {
                const aMatch = getPrimaryEventTag(a) === selectedCategory ? 0 : 1;
                const bMatch = getPrimaryEventTag(b) === selectedCategory ? 0 : 1;
                if (aMatch !== bMatch) return aMatch - bMatch;
            }

            const statusA = getParticipantStatusLabel(getComputedStatus(a));
            const statusB = getParticipantStatusLabel(getComputedStatus(b));
            const byStatus = statusRank[statusA] - statusRank[statusB];
            if (byStatus !== 0) return byStatus;
            return new Date(a.event_start_date) - new Date(b.event_start_date);
        });
    }, [filtered, eventTypeSort]);

    return (
        <DashboardLayout>
            <h2>Browse Events</h2>

            {/* Trending Events */}
            <div style={{ marginBottom: "24px" }}>
                <h3 style={{ margin: "0 0 12px", color: "#dc2626" }}>Trending Now</h3>
                {trending.length === 0 ? (
                    <p style={{ margin: 0, fontSize: "14px", color: "#64748b" }}>
                        No trending events right now.
                    </p>
                ) : (
                    <div style={{ display: "flex", gap: "12px", overflowX: "auto", paddingBottom: "8px" }}>
                        {trending.map((ev, idx) => (
                            <Link key={ev._id} to={`/event/${ev._id}`} style={{ textDecoration: "none", color: "inherit", minWidth: "260px", flex: "0 0 auto" }}>
                                <div style={{
                                    border: "1px solid #fecaca", padding: "14px", borderRadius: "10px",
                                    backgroundColor: "#fff5f5", cursor: "pointer", transition: "transform 0.15s, box-shadow 0.15s",
                                    position: "relative"
                                }}
                                    onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(220,38,38,0.15)"; }}
                                    onMouseOut={(e) => { e.currentTarget.style.transform = "none"; e.currentTarget.style.boxShadow = "none"; }}
                                >
                                    <span style={{
                                        position: "absolute", top: "-8px", left: "-8px",
                                        width: "28px", height: "28px", borderRadius: "50%",
                                        backgroundColor: idx === 0 ? "#dc2626" : idx === 1 ? "#f97316" : "#eab308",
                                        color: "white", fontWeight: "bold", fontSize: "13px",
                                        display: "flex", alignItems: "center", justifyContent: "center"
                                    }}>#{idx + 1}</span>
                                    <h4 style={{ margin: "0 0 4px", fontSize: "15px" }}>{ev.event_name}</h4>
                                    <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>by {ev.organizer_id?.organizer_name}</p>
                                    <p style={{ margin: "6px 0 0", fontSize: "13px", color: "#dc2626", fontWeight: "bold" }}>
                                        {ev.reg_count} registration{ev.reg_count !== 1 ? "s" : ""} in 24h
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Search + Filter Bar */}
            <div className="filter-bar">
                <div style={{ position: "relative", flex: 1 }}>
                    <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "14px", color: "#94a3b8" }}>Search</span>
                    <input
                        type="text"
                        placeholder="Search by name, description, organizer, or tags..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        style={{
                            width: "100%", padding: "10px 10px 10px 34px", boxSizing: "border-box",
                            border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px",
                            outline: "none"
                        }}
                    />
                </div>
                <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", backgroundColor: "white", cursor: "pointer" }}
                >
                    <option value="all">All Types</option>
                    <option value="normal">Normal Events</option>
                    <option value="merchandise">Merchandise</option>
                </select>
                <select
                    value={eligibilityFilter}
                    onChange={(e) => setEligibilityFilter(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", backgroundColor: "white", cursor: "pointer" }}
                >
                    <option value="any">All Eligibility</option>
                    <option value="iiit">IIIT Only</option>
                    <option value="all">Open to All</option>
                </select>
                <select
                    value={clubFilter}
                    onChange={(e) => setClubFilter(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", backgroundColor: "white", cursor: "pointer" }}
                >
                    <option value="all">All Clubs</option>
                    <option value="followed">Followed Clubs</option>
                </select>
                <select
                    value={statusSort}
                    onChange={(e) => setStatusSort(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", backgroundColor: "white", cursor: "pointer" }}
                >
                    <option value="all">All Status</option>
                    <option value="upcoming">Upcoming</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="closed">Closed</option>
                </select>
                <select
                    value={eventTypeSort}
                    onChange={(e) => setEventTypeSort(e.target.value)}
                    style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "14px", backgroundColor: "white", cursor: "pointer" }}
                >
                    <option value="all">Sort by Event Type (All)</option>
                    {EVENT_TAG_OPTIONS.map((tag) => (
                        <option key={tag.value} value={tag.value}>{tag.label}</option>
                    ))}
                </select>
            </div>

            {/* Date Range Filter */}
            <div className="filter-bar">
                <span style={{ fontSize: "13px", color: "#64748b", fontWeight: "bold" }}>Date Range:</span>
                <label style={{ fontSize: "13px", color: "#475569" }}>From</label>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                    style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }} />
                <label style={{ fontSize: "13px", color: "#475569" }}>To</label>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                    style={{ padding: "6px 10px", border: "1px solid #cbd5e1", borderRadius: "6px", fontSize: "13px" }} />
                {(dateFrom || dateTo) && (
                    <button onClick={() => { setDateFrom(""); setDateTo(""); }}
                        style={{ padding: "6px 12px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontSize: "12px" }}>
                        Clear
                    </button>
                )}
            </div>

            {/* My Interests toggle */}
            <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                <button
                    onClick={() => setInterestFilter((prev) => !prev)}
                    style={{
                        padding: "8px 18px", borderRadius: "20px", border: "1px solid",
                        cursor: "pointer", fontSize: "13px", fontWeight: "600", transition: "all 0.15s",
                        backgroundColor: interestFilter ? "#7c3aed" : "white",
                        color: interestFilter ? "white" : "#7c3aed",
                        borderColor: "#7c3aed"
                    }}
                >
                    {interestFilter ? "My Interests (on)" : "My Interests"}
                </button>
                {interestFilter && userInterests.length === 0 && (
                    <span style={{ fontSize: "12px", color: "#f59e0b" }}>
                        No interests set. <a href="/participant/profile" style={{ color: "#7c3aed" }}>Add them in your profile</a>.
                    </span>
                )}
                {interestFilter && userInterests.length > 0 && (
                    <span style={{ fontSize: "12px", color: "#6b7280" }}>
                        Filtering by: {userInterests.map((i) => (
                            <span key={i} style={{ display: "inline-block", margin: "0 3px", padding: "1px 8px", borderRadius: "10px", backgroundColor: "#ede9fe", color: "#6d28d9", fontSize: "11px" }}>{i}</span>
                        ))}
                    </span>
                )}
            </div>

            {/* Results count */}
            <p style={{ fontSize: "13px", color: "#64748b", marginBottom: "12px" }}>
                Showing {sortedEvents.length} of {events.length} events
                {search && <> matching "<strong>{search}</strong>"</>}
            </p>

            {/* Event Cards */}
            {sortedEvents.length === 0 ? (
                <p style={{ color: "#64748b", padding: "20px", textAlign: "center" }}>No events match your search.</p>
            ) : (
                sortedEvents.map((event) => {
                    const computedStatus = getComputedStatus(event);
                    const participantStatus = getParticipantStatusLabel(computedStatus);
                    const statusStyle = getStatusStyle(computedStatus);

                    return (
                    <Link key={event._id} to={`/event/${event._id}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                        <div className="event-card">
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <h4 style={{ margin: 0 }}>{event.event_name}</h4>
                                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                                    <span className={`badge ${event.event_type === "merchandise" ? "badge-merch" : "badge-normal"}`}>
                                        {event.event_type === "merchandise" ? "Merchandise" : "Normal"}
                                    </span>
                                    <span className={`badge badge-${participantStatus}`} style={statusStyle}>
                                        {participantStatus}
                                    </span>
                                    <span className="badge badge-category">
                                        {getCategoryLabel(getPrimaryEventTag(event))}
                                    </span>
                                </div>
                            </div>

                            <p style={{ fontSize: "13px", color: "#94a3b8", margin: "4px 0 0" }}>
                                by {event.organizer_id?.organizer_name || "Unknown"}
                            </p>

                            <p style={{ marginTop: "6px", color: "#475569" }}>
                                {event.event_description?.substring(0, 150)}{event.event_description?.length > 150 ? "..." : ""}
                            </p>

                            <p style={{ fontSize: "13px", color: "#64748b", margin: "4px 0" }}>
                                Deadline: {formatDate(event.registration_deadline)} |
                                Event: {formatDate(event.event_start_date)} — {formatDate(event.event_end_date)}
                            </p>

                            {event.event_type === "normal" && (
                                <p style={{ fontSize: "13px", color: "#64748b" }}>Fee: ₹{event.registration_fee} | Capacity: {event.registration_limit}</p>
                            )}

                            {event.event_type === "merchandise" && event.merchandise_items && (
                                <p style={{ fontSize: "13px", color: "#64748b" }}>
                                    {event.merchandise_items.length} items available | Limit: {event.purchase_limit}/person
                                </p>
                            )}

                            {event.event_tags?.length > 0 && (
                                <div style={{ marginTop: "6px" }}>
                                    {event.event_tags.map((tag, idx) => (
                                        <span key={idx} className="badge badge-category" style={{ marginRight: "4px" }}>
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            <span style={{ fontSize: "13px", color: "#2563eb", fontWeight: "bold", marginTop: "6px", display: "inline-block" }}>View Details</span>
                        </div>
                    </Link>
                );
                })
            )}
        </DashboardLayout>
    );
}

export default ParticipantEvents;
