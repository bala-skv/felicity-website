const jwt = require("jsonwebtoken");
const auth_middleware = (req, res, next) => {
    try {
        const auth_header = req.headers.authorization;
        if (!auth_header) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        const token = auth_header.split(" ")[1];
        if (!token) {
            return res.status(401).json({ message: "Unauthorized" })
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Invalid or expired token " })
    }
}

module.exports = auth_middleware;