import { useRef, useState } from "react";
import jsQR from "jsqr";
import API from "../../api";

export default function QrScanner({ eventId, analyticsMode, onScanComplete }) {
    const [open, setOpen] = useState(false);
    const [scanMode, setScanMode] = useState("camera");
    const [scanResult, setScanResult] = useState(null);
    const [cameraActive, setCameraActive] = useState(false);
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    const animFrameRef = useRef(null);
    const streamRef = useRef(null);

    const scanTicket = async (ticketId) => {
        try {
            const res = await API.post(`/api/events/${eventId}/scan-qr`, { ticket_id: ticketId });
            const d = res.data;
            setScanResult({
                ok: true,
                mode: d.mode,
                already_marked: d.already_marked,
                name: d.participant?.name,
                email: d.participant?.email,
                time: d.attendance_time || d.collection_time,
                items: d.items
            });
            if (onScanComplete) onScanComplete();
        } catch (err) {
            setScanResult({ ok: false, error: err.response?.data?.message || "Scan failed" });
        }
    };

    const startCamera = async () => {
        setScanResult(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
            }
            setCameraActive(true);
            scanFrame();
        } catch {
            setScanResult({ ok: false, error: "Camera access denied or unavailable" });
        }
    };

    const stopCamera = () => {
        cancelAnimationFrame(animFrameRef.current);
        if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
            streamRef.current = null;
        }
        if (videoRef.current) videoRef.current.srcObject = null;
        setCameraActive(false);
    };

    const scanFrame = () => {
        animFrameRef.current = requestAnimationFrame(() => {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) { scanFrame(); return; }
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            if (code?.data) { stopCamera(); scanTicket(code.data); }
            else scanFrame();
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setScanResult(null);
        const img = new Image();
        const url = URL.createObjectURL(file);
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            canvas.getContext("2d").drawImage(img, 0, 0);
            const imageData = canvas.getContext("2d").getImageData(0, 0, canvas.width, canvas.height);
            const code = jsQR(imageData.data, imageData.width, imageData.height);
            URL.revokeObjectURL(url);
            if (code?.data) scanTicket(code.data);
            else setScanResult({ ok: false, error: "No QR code found in the image" });
        };
        img.src = url;
        e.target.value = "";
    };

    const isMerch = analyticsMode === "merchandise";

    return (
        <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: "16px", marginTop: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                <h4 style={{ margin: 0 }}>{isMerch ? "📦 Scan Collection Request" : "📷 QR Attendance Scanner"}</h4>
                <button onClick={() => { setOpen((o) => !o); stopCamera(); setScanResult(null); }}
                    style={{ padding: "6px 16px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "13px", fontWeight: "600",
                        backgroundColor: open ? "#6b7280" : "#7c3aed", color: "white" }}>
                    {open ? "Close Scanner" : "Open Scanner"}
                </button>
            </div>

            {open && (
                <div style={{ backgroundColor: "white", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "20px" }}>
                    <div style={{ display: "flex", gap: "8px", marginBottom: "16px" }}>
                        {["camera", "upload"].map((m) => (
                            <button key={m} onClick={() => { setScanMode(m); stopCamera(); setScanResult(null); }}
                                style={{ padding: "7px 18px", borderRadius: "20px", border: "1.5px solid #7c3aed", cursor: "pointer",
                                    fontSize: "13px", fontWeight: "600",
                                    backgroundColor: scanMode === m ? "#7c3aed" : "white",
                                    color: scanMode === m ? "white" : "#7c3aed" }}>
                                {m === "camera" ? "📷 Camera" : "📁 Upload Image"}
                            </button>
                        ))}
                    </div>

                    {scanMode === "camera" && (
                        <div style={{ textAlign: "center" }}>
                            <video ref={videoRef}
                                style={{ width: "100%", maxWidth: "380px", borderRadius: "8px",
                                    border: "2px solid #7c3aed", display: cameraActive ? "block" : "none", margin: "0 auto" }}
                                playsInline muted />
                            <canvas ref={canvasRef} style={{ display: "none" }} />
                            {!cameraActive ? (
                                <button onClick={startCamera} style={{ padding: "10px 28px", backgroundColor: "#7c3aed", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                                    Start Camera
                                </button>
                            ) : (
                                <button onClick={stopCamera} style={{ marginTop: "10px", padding: "8px 20px", backgroundColor: "#ef4444", color: "white", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "13px" }}>
                                    Stop Camera
                                </button>
                            )}
                            {cameraActive && <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>Point camera at participant's QR code…</p>}
                        </div>
                    )}

                    {scanMode === "upload" && (
                        <div style={{ textAlign: "center" }}>
                            <label style={{ display: "inline-block", padding: "10px 28px", backgroundColor: "#7c3aed", color: "white", borderRadius: "8px", cursor: "pointer", fontSize: "14px", fontWeight: "600" }}>
                                Choose QR Image
                                <input type="file" accept="image/*" onChange={handleFileUpload} style={{ display: "none" }} />
                            </label>
                            <p style={{ fontSize: "13px", color: "#6b7280", marginTop: "8px" }}>Upload a screenshot or photo of the QR code</p>
                        </div>
                    )}

                    {scanResult && (
                        <div style={{ marginTop: "16px", padding: "14px 18px", borderRadius: "8px",
                            backgroundColor: !scanResult.ok ? "#fef2f2" : scanResult.already_marked ? "#fefce8" : "#f0fdf4",
                            border: `1px solid ${!scanResult.ok ? "#fecaca" : scanResult.already_marked ? "#fde68a" : "#bbf7d0"}` }}>
                            {!scanResult.ok ? (
                                <p style={{ margin: 0, color: "#dc2626", fontWeight: "600" }}>❌ {scanResult.error}</p>
                            ) : scanResult.mode === "merchandise" ? (
                                scanResult.already_marked ? (
                                    <>
                                        <p style={{ margin: "0 0 4px", color: "#92400e", fontWeight: "700" }}>Items already collected</p>
                                        <p style={{ margin: "0 0 4px", color: "#78350f", fontSize: "14px" }}>{scanResult.name} ({scanResult.email})</p>
                                        {scanResult.time && <p style={{ margin: "0 0 6px", color: "#78350f", fontSize: "13px" }}>Collected at: {new Date(scanResult.time).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}</p>}
                                        {scanResult.items?.map((it, i) => <p key={i} style={{ margin: "1px 0", color: "#78350f", fontSize: "13px" }}>• {it.item_name} — {it.size} / {it.color} × {it.quantity}</p>)}
                                    </>
                                ) : (
                                    <>
                                        <p style={{ margin: "0 0 4px", color: "#166534", fontWeight: "700" }}>✅ Collection confirmed!</p>
                                        <p style={{ margin: "0 0 4px", color: "#14532d", fontSize: "14px" }}>{scanResult.name} ({scanResult.email})</p>
                                        {scanResult.time && <p style={{ margin: "0 0 6px", color: "#14532d", fontSize: "13px" }}>Collected at: {new Date(scanResult.time).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}</p>}
                                        {scanResult.items?.map((it, i) => <p key={i} style={{ margin: "1px 0", color: "#14532d", fontSize: "13px" }}>• {it.item_name} — {it.size} / {it.color} × {it.quantity}</p>)}
                                    </>
                                )
                            ) : scanResult.already_marked ? (
                                <>
                                    <p style={{ margin: "0 0 4px", color: "#92400e", fontWeight: "700" }}>Already marked present</p>
                                    <p style={{ margin: "0 0 2px", color: "#78350f", fontSize: "14px" }}>{scanResult.name} ({scanResult.email})</p>
                                    <p style={{ margin: 0, color: "#78350f", fontSize: "13px" }}>Marked at: {new Date(scanResult.time).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}</p>
                                </>
                            ) : (
                                <>
                                    <p style={{ margin: "0 0 4px", color: "#166534", fontWeight: "700" }}>✅ Attendance marked!</p>
                                    <p style={{ margin: "0 0 2px", color: "#14532d", fontSize: "14px" }}>{scanResult.name} ({scanResult.email})</p>
                                    <p style={{ margin: 0, color: "#14532d", fontSize: "13px" }}>Time: {new Date(scanResult.time).toLocaleString("en-GB", { timeZone: "Asia/Kolkata" })}</p>
                                </>
                            )}
                            <button onClick={() => { setScanResult(null); if (scanMode === "camera") startCamera(); }}
                                style={{ marginTop: "10px", padding: "5px 14px", fontSize: "12px", borderRadius: "4px", border: "1px solid #d1d5db", background: "white", cursor: "pointer" }}>
                                Scan Next
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
