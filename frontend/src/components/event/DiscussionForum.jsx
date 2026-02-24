import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import API from "../../api";

const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🤔", "👀"];

export default function DiscussionForum({ eventId, user, role, isRegistered }) {
    const [messages, setMessages] = useState([]);
    const [showPanel, setShowPanel] = useState(false);
    const [newMessage, setNewMessage] = useState("");
    const [replyingTo, setReplyingTo] = useState(null);
    const [isAnnouncement, setIsAnnouncement] = useState(false);
    const [loading, setLoading] = useState(false);
    const [newMsgCount, setNewMsgCount] = useState(0);
    const [lastSeenTime, setLastSeenTime] = useState(null);
    const endRef = useRef(null);
    const pollRef = useRef(null);

    const fetchMessages = useCallback(async () => {
        setLoading(true);
        try {
            const res = await API.get(`/api/discussions/${eventId}`);
            setMessages(res.data);
            setLastSeenTime(new Date().toISOString());
            setNewMsgCount(0);
        } catch {}
        setLoading(false);
    }, [eventId]);

    const openPanel = () => {
        setShowPanel(true);
        fetchMessages();
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(fetchMessages, 10000);
    };

    const closePanel = () => {
        setShowPanel(false);
        if (pollRef.current) clearInterval(pollRef.current);
    };

    useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

    // check unread count while panel closed
    useEffect(() => {
        if (showPanel || (!isRegistered && role !== "organizer")) return;
        const checkNew = async () => {
            if (!lastSeenTime) return;
            try {
                const res = await API.get(`/api/discussions/${eventId}/unread-count?since=${lastSeenTime}`);
                setNewMsgCount(res.data.count || 0);
            } catch {}
        };
        const interval = setInterval(checkNew, 15000);
        checkNew();
        return () => clearInterval(interval);
    }, [showPanel, lastSeenTime, eventId, isRegistered, role]);

    const postMsg = async () => {
        if (!newMessage.trim()) return;
        try {
            await API.post(`/api/discussions/${eventId}`, {
                content: newMessage.trim(),
                parent_id: replyingTo || null,
                is_announcement: isAnnouncement
            });
            setNewMessage("");
            setReplyingTo(null);
            setIsAnnouncement(false);
            fetchMessages();
            setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 300);
        } catch {}
    };

    const deleteMsg = async (msgId) => {
        try { await API.delete(`/api/discussions/${eventId}/${msgId}`); fetchMessages(); } catch {}
    };

    const togglePin = async (msgId) => {
        try { await API.patch(`/api/discussions/${eventId}/${msgId}/pin`); fetchMessages(); } catch {}
    };

    const react = async (msgId, emoji) => {
        try { await API.post(`/api/discussions/${eventId}/${msgId}/react`, { emoji }); fetchMessages(); } catch {}
    };

    // threaded view
    const threadedMessages = useMemo(() => {
        const msgMap = {};
        messages.forEach((m) => { msgMap[m._id] = { ...m, children: [] }; });
        const topLevel = [];
        messages.forEach((m) => {
            const pid = m.parent_id ? (typeof m.parent_id === "object" ? m.parent_id._id || m.parent_id : m.parent_id) : null;
            if (pid && msgMap[pid]) {
                msgMap[pid].children.push(msgMap[m._id]);
            } else {
                topLevel.push(msgMap[m._id]);
            }
        });
        const sortChildren = (node) => {
            node.children.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
            node.children.forEach(sortChildren);
        };
        topLevel.sort((a, b) => {
            if (a.is_pinned !== b.is_pinned) return b.is_pinned ? 1 : -1;
            if (a.is_announcement !== b.is_announcement) return b.is_announcement ? 1 : -1;
            return new Date(a.createdAt) - new Date(b.createdAt);
        });
        topLevel.forEach(sortChildren);
        return topLevel;
    }, [messages]);

    const renderMessage = (msg, depth = 0) => {
        const author = msg.author_id || {};
        const authorName = msg.author_role === "organizer"
            ? (author.organizer_name || "Organizer")
            : `${author.first_name || ""} ${author.last_name || ""}`.trim() || "User";
        const isOrg = msg.author_role === "organizer";
        const isMyMsg = author._id === user?.user_id;
        const isEventOrganizer = role === "organizer";
        const timeStr = new Date(msg.createdAt).toLocaleString("en-GB", { timeZone: "Asia/Kolkata", day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
        const isReply = depth > 0;
        const indentPx = Math.min(depth, 4) * 24;

        const reactionGroups = {};
        (msg.reactions || []).forEach((r) => {
            if (!reactionGroups[r.emoji]) reactionGroups[r.emoji] = [];
            reactionGroups[r.emoji].push(r.user_id);
        });

        return (
            <div key={msg._id} style={{
                marginLeft: `${indentPx}px`,
                padding: isReply ? "8px 12px" : "12px 16px",
                borderLeft: isReply ? "3px solid #e2e8f0" : msg.is_announcement ? "4px solid #f59e0b" : msg.is_pinned ? "4px solid #7c3aed" : "none",
                backgroundColor: msg.is_deleted ? "#f8f8f8" : msg.is_announcement ? "#fffbeb" : msg.is_pinned ? "#faf5ff" : isReply ? "#f8fafc" : "white",
                borderRadius: isReply ? "0 8px 8px 0" : "10px",
                border: isReply ? "none" : "1px solid #e2e8f0",
                marginBottom: isReply ? "4px" : "8px"
            }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: "600", fontSize: "13px", color: isOrg ? "#7c3aed" : "#1e293b" }}>{authorName}</span>
                        {isOrg && <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", backgroundColor: "#7c3aed", color: "white", fontWeight: "600" }}>ORGANIZER</span>}
                        {msg.is_announcement && <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", backgroundColor: "#f59e0b", color: "white", fontWeight: "600" }}>ANNOUNCEMENT</span>}
                        {msg.is_pinned && <span style={{ fontSize: "10px", padding: "1px 6px", borderRadius: "10px", backgroundColor: "#a78bfa", color: "white", fontWeight: "600" }}>PINNED</span>}
                        <span style={{ fontSize: "11px", color: "#94a3b8" }}>{timeStr}</span>
                    </div>
                    {!msg.is_deleted && (
                        <div style={{ display: "flex", gap: "4px", flexShrink: 0 }}>
                            {isEventOrganizer && !isReply && (
                                <button onClick={() => togglePin(msg._id)}
                                    style={{ fontSize: "12px", background: "none", border: "none", cursor: "pointer", padding: "2px 4px" }}
                                    title={msg.is_pinned ? "Unpin" : "Pin"}>Pin</button>
                            )}
                            {(isEventOrganizer || isMyMsg) && (
                                <button onClick={() => deleteMsg(msg._id)}
                                    style={{ fontSize: "12px", background: "none", border: "none", cursor: "pointer", padding: "2px 4px", color: "#dc2626" }}
                                    title="Delete">Del</button>
                            )}
                        </div>
                    )}
                </div>

                <p style={{ margin: "2px 0 8px", fontSize: "14px", color: msg.is_deleted ? "#94a3b8" : "#334155", fontStyle: msg.is_deleted ? "italic" : "normal", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                    {msg.content}
                </p>

                {!msg.is_deleted && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                        {Object.entries(reactionGroups).map(([emoji, users]) => (
                            <button key={emoji} onClick={() => react(msg._id, emoji)}
                                style={{
                                    padding: "2px 8px", borderRadius: "12px", border: "1px solid #e2e8f0",
                                    backgroundColor: users.includes(user?.user_id) ? "#ede9fe" : "white",
                                    cursor: "pointer", fontSize: "12px", display: "flex", alignItems: "center", gap: "3px"
                                }}>
                                {emoji} <span style={{ fontSize: "11px", color: "#64748b" }}>{users.length}</span>
                            </button>
                        ))}
                        <div style={{ display: "flex", gap: "2px", marginLeft: "4px" }}>
                            {REACTION_EMOJIS.map((em) => (
                                <button key={em} onClick={() => react(msg._id, em)}
                                    style={{ padding: "1px 4px", background: "none", border: "none", cursor: "pointer", fontSize: "13px", opacity: 0.5 }}
                                    title={em}>{em}</button>
                            ))}
                        </div>
                        <button onClick={() => setReplyingTo(msg._id)}
                            style={{ marginLeft: "auto", fontSize: "12px", color: "#7c3aed", background: "none", border: "none", cursor: "pointer", fontWeight: "600" }}>
                            Reply
                        </button>
                    </div>
                )}

                {msg.children?.length > 0 && (
                    <div style={{ marginTop: "4px" }}>
                        {msg.children.map((child) => renderMessage(child, depth + 1))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div style={{ marginTop: "20px" }}>
            <button onClick={showPanel ? closePanel : openPanel}
                style={{
                    padding: "12px 24px", borderRadius: "8px", border: "none", cursor: "pointer",
                    fontSize: "14px", fontWeight: "600",
                    backgroundColor: showPanel ? "#6b7280" : "#7c3aed", color: "white", position: "relative"
                }}>
                {showPanel ? "Close Discussion" : "💬 Discussion Forum"}
                {!showPanel && newMsgCount > 0 && (
                    <span style={{
                        position: "absolute", top: "-8px", right: "-8px",
                        backgroundColor: "#dc2626", color: "white", borderRadius: "50%",
                        width: "22px", height: "22px", display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "11px", fontWeight: "700"
                    }}>{newMsgCount > 9 ? "9+" : newMsgCount}</span>
                )}
            </button>

            {showPanel && (
                <div style={{ marginTop: "12px", border: "1px solid #e2e8f0", borderRadius: "12px", backgroundColor: "#f8fafc", overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", backgroundColor: "#7c3aed", color: "white" }}>
                        <h3 style={{ margin: 0 }}>💬 Discussion Forum</h3>
                        <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.85 }}>
                            {threadedMessages.length} messages • Auto-refreshes every 10s
                        </p>
                    </div>

                    <div style={{ maxHeight: "500px", overflowY: "auto", padding: "16px" }}>
                        {loading && threadedMessages.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8" }}>Loading messages…</p>}
                        {!loading && threadedMessages.length === 0 && <p style={{ textAlign: "center", color: "#94a3b8" }}>No messages yet. Start the conversation!</p>}
                        {threadedMessages.map((msg) => <div key={msg._id}>{renderMessage(msg, 0)}</div>)}
                        <div ref={endRef} />
                    </div>

                    {replyingTo && (
                        <div style={{ padding: "8px 20px", backgroundColor: "#ede9fe", borderTop: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "13px", color: "#6d28d9" }}>
                                Replying to {(() => {
                                    const m = messages.find((msg) => msg._id === replyingTo);
                                    if (!m) return "message";
                                    const a = m.author_id;
                                    return m.author_role === "organizer" ? (a?.organizer_name || "Organizer") : `${a?.first_name || ""} ${a?.last_name || ""}`.trim();
                                })()}
                            </span>
                            <button onClick={() => setReplyingTo(null)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "16px", color: "#6d28d9" }}>✕</button>
                        </div>
                    )}

                    <div style={{ padding: "12px 16px", borderTop: "1px solid #e2e8f0", backgroundColor: "white" }}>
                        {role === "organizer" && !replyingTo && (
                            <label style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "8px", fontSize: "13px", color: "#b45309", cursor: "pointer" }}>
                                <input type="checkbox" checked={isAnnouncement} onChange={(e) => setIsAnnouncement(e.target.checked)} />
                                Post as Announcement
                            </label>
                        )}
                        <div style={{ display: "flex", gap: "8px" }}>
                            <input
                                value={newMessage}
                                onChange={(e) => setNewMessage(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); postMsg(); } }}
                                placeholder={replyingTo ? "Write your reply…" : isAnnouncement ? "Write an announcement…" : "Write a message…"}
                                style={{ flex: 1, padding: "10px 14px", borderRadius: "8px", border: `1.5px solid ${isAnnouncement ? "#f59e0b" : "#d1d5db"}`, fontSize: "14px", outline: "none" }}
                            />
                            <button onClick={postMsg} disabled={!newMessage.trim()}
                                style={{
                                    padding: "10px 20px", borderRadius: "8px", border: "none", cursor: "pointer",
                                    backgroundColor: !newMessage.trim() ? "#d1d5db" : isAnnouncement ? "#f59e0b" : "#7c3aed",
                                    color: "white", fontWeight: "600", fontSize: "14px"
                                }}>
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
