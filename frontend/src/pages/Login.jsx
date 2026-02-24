import { useState, useRef } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";

const RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

function Login() {
    const navigate = useNavigate();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [captchaToken, setCaptchaToken] = useState(null);
    const recaptchaRef = useRef(null);

    const handleLogin = async (e) => {
        e.preventDefault();

        if (!captchaToken) {
            setError("Please complete the CAPTCHA.");
            return;
        }

        try {
            const res = await API.post(
                "/api/auth/login",
                { email, password, captcha_token: captchaToken }
            );

            const userData = {
                token: res.data.token,
                role: res.data.role,
                userId: res.data.userId,
                participant_type: res.data.participant_type,
            };

            localStorage.setItem("user", JSON.stringify(userData));

            if (res.data.role === "participant") {
                try {
                    const profileRes = await API.get(
                        "/api/users/profile"
                    );
                    const hasInterests = profileRes.data.interests && profileRes.data.interests.length > 0;
                    navigate(hasInterests ? "/participant/dashboard" : "/participant/onboarding");
                } catch {
                    navigate("/participant/dashboard");
                }
                return;
            }
            if (res.data.role === "organizer") navigate("/organizer/dashboard");
            if (res.data.role === "admin") navigate("/admin/dashboard");

        } catch (err) {
            setError(err.response?.data?.message || "Login failed");
            recaptchaRef.current?.reset();
            setCaptchaToken(null);
        }
    };

    return (
        <div style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh"
        }}>
            <div style={{
                padding: "40px",
                border: "1px solid #ddd",
                borderRadius: "8px",
                width: "300px"
            }}>
                <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
                    Login
                </h2>

                <form onSubmit={handleLogin}>
                    <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px" }}
                    />
                    <br /><br />

                    <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        style={{ width: "100%", padding: "8px" }}
                    />
                    <br /><br />

                    <div style={{ marginBottom: "16px" }}>
                        <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={RECAPTCHA_SITE_KEY}
                            onChange={(token) => setCaptchaToken(token)}
                            onExpired={() => setCaptchaToken(null)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={!captchaToken}
                        style={{
                            width: "100%",
                            padding: "10px",
                            background: captchaToken ? "#007bff" : "#94a3b8",
                            color: "white",
                            border: "none",
                            cursor: captchaToken ? "pointer" : "not-allowed"
                        }}
                    >
                        Login
                    </button>
                </form>

                {error && (
                    <p style={{ color: "red", marginTop: "10px" }}>
                        {error}
                    </p>
                )}

                <p style={{ marginTop: "15px", textAlign: "center" }}>
                    Don’t have an account?{" "}
                    <Link to="/register" style={{ color: "blue" }}>
                        Register
                    </Link>
                </p>
            </div>
        </div>
    );
}

export default Login;