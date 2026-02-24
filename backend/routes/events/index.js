const express = require("express");
const router = express.Router();

const crudRoutes = require("./crud");
const registrationRoutes = require("./registration");
const organizerRoutes = require("./organizer");

// Mount sub-routers — order matters for Express path matching
router.use(crudRoutes);          // /create, /list, /trending, /my-events, /details/:id, etc.
router.use(registrationRoutes);  // /register/:id, /check-registration/:id, /my-registrations, etc.
router.use(organizerRoutes);     // /:event_id/registrations, /:event_id/analytics, etc.

module.exports = router;
