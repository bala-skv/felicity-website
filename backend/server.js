const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();
console.log("Server file loaded");
const authRoutes = require("./routes/authorization");
const role_middleware = require("./middleware/role_middleware");
const bcrypt = require("bcryptjs");
const User = require("./models/User");
const admin_routes = require("./routes/admin");
const event_routes = require("./routes/events");



const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/admin", admin_routes);
app.use("/api/events", event_routes);
const user_routes = require("./routes/users");
app.use("/api/users", user_routes);
const discussion_routes = require("./routes/discussions");
app.use("/api/discussions", discussion_routes);
const notification_routes = require("./routes/notifications");
app.use("/api/notifications", notification_routes);


const create_admin_if_not_exists = async () => {
    const existing_admin = await User.findOne({ role: "admin" });

    if (!existing_admin) {
        const hashed_password = await bcrypt.hash(process.env.ADMIN_PASSWORD, 10);

        const admin_user = new User({
            role: "admin",
            email: process.env.ADMIN_EMAIL,
            password: hashed_password
        });

        await admin_user.save();
        console.log("Admin user created successfully");
    } else {
        console.log("Admin already exists");
    }
};

mongoose.connect(process.env.MONGO_URI)
    .then(async () => {
        console.log("MongoDB Connected")
        await create_admin_if_not_exists();
    })
    .catch(err => console.log(err));




app.get("/", (req, res) => {
    res.send("API Running");
});
const PORT = process.env.PORT || 5005;
app.use("/api/auth", authRoutes);
const auth_middleware = require("./middleware/auth_middleware");


app.get("/admin-test",
    auth_middleware,
    role_middleware(["admin"]),
    (req, res) => {
        res.json({ message: "Admin route accessed" });
    }
);


app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
