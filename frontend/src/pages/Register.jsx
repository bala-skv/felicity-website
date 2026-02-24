import { useState, useRef } from "react";
import API from "../api";
import { useNavigate, Link } from "react-router-dom";
import ReCAPTCHA from "react-google-recaptcha";

const RECAPTCHA_SITE_KEY = "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI";

function Register() {
    const navigate = useNavigate();

    const [form, setForm] = useState({
        first_name: "",
        last_name: "",
        email: "",
        password: "",
        participant_type: "IIIT",
        college_name: "",
        contact_number: ""
    });

    const [message, setMessage] = useState("");
    const [captchaToken, setCaptchaToken] = useState(null);
    const recaptchaRef = useRef(null);

    const handleChange = (e) => {
        setForm({
            ...form,
            [e.target.name]: e.target.value
        });
    };

    const handleRegister = async (e) => {
        e.preventDefault();

        if (!captchaToken) {
            setMessage("Please complete the CAPTCHA.");
            return;
        }

        try {
            const res = await API.post(
                "/api/auth/register",
                { ...form, captcha_token: captchaToken }
            );

            setMessage(res.data.message);

            setTimeout(() => {
                navigate("/");
            }, 1500);

        } catch (err) {
            setMessage(err.response?.data?.message || "Registration failed");
            recaptchaRef.current?.reset();
            setCaptchaToken(null);
        }
    };

    return (
        <div style={{ padding: "40px" }}>
            <h2>Register</h2>

            {message && <p>{message}</p>}

            <form onSubmit={handleRegister}>
                <input name="first_name" placeholder="First Name" onChange={handleChange} required />
                <br /><br />

                <input name="last_name" placeholder="Last Name" onChange={handleChange} required />
                <br /><br />

                <div style={{ marginBottom: "12px" }}>
                    <label style={{ fontWeight: "bold", marginRight: "15px" }}>College Type:</label>
                    <label style={{ marginRight: "15px", cursor: "pointer" }}>
                        <input
                            type="radio"
                            name="participant_type"
                            value="IIIT"
                            checked={form.participant_type === "IIIT"}
                            onChange={handleChange}
                            style={{ marginRight: "5px" }}
                        />
                        IIIT
                    </label>
                    <label style={{ cursor: "pointer" }}>
                        <input
                            type="radio"
                            name="participant_type"
                            value="Non-IIIT"
                            checked={form.participant_type === "Non-IIIT"}
                            onChange={handleChange}
                            style={{ marginRight: "5px" }}
                        />
                        Non-IIIT
                    </label>
                </div>

                <input name="email" type="email" placeholder="Email" onChange={handleChange} required />
                <br /><br />

                <input name="password" type="password" placeholder="Password" onChange={handleChange} required />
                <br /><br />

                {form.participant_type === "Non-IIIT" && (
                    <>
                        <input name="college_name" placeholder="College / Organization Name" onChange={handleChange} required />
                        <br /><br />
                    </>
                )}

                <input name="contact_number" placeholder="Contact Number" onChange={handleChange} required />
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
                    style={{ opacity: captchaToken ? 1 : 0.5, cursor: captchaToken ? "pointer" : "not-allowed" }}
                >
                    Register
                </button>
            </form>

            <p style={{ marginTop: "15px" }}>
                Already have an account?{" "}
                <Link to="/" style={{ color: "blue" }}>
                    Login
                </Link>
            </p>
        </div>
    );
}

export default Register;
