import axios from "axios";

const API = axios.create({
    baseURL: "http://localhost:5005"
});

// auto-attach JWT
API.interceptors.request.use((config) => {
    const stored = localStorage.getItem("user");
    if (stored) {
        const { token } = JSON.parse(stored);
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

export default API;
