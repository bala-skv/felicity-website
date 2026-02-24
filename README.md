# Felicity Event Management System

A centralized event management platform built for IIIT Hyderabad's annual fest. The system enables clubs and organizers to create and manage events, while participants can browse, register, purchase merchandise, and track their participation — all from a single web application.

---

## Table of Contents

1. [Technology Stack & Libraries](#technology-stack--libraries)
2. [Advanced Features (Tier A / B / C)](#advanced-features-tier-a--b--c)
3. [Setup & Installation](#setup--installation)
4. [Project Structure](#project-structure)

---

## Technology Stack & Libraries

### Backend

| Library | Version | Justification |
|---------|---------|---------------|
| **Express** | 5.2.1 | Lightweight and widely adopted Node.js web framework. Provides a clean routing API, middleware chaining, and integrates naturally with MongoDB through Mongoose. Chosen over alternatives like Fastify or Koa because the MERN stack requirement specifies Express, and its ecosystem has the most documentation and community support for REST API development. |
| **Mongoose** | 9.2.1 | MongoDB ODM that provides schema definitions, validation, middleware hooks, and query building. Essential for enforcing data integrity (e.g. required fields, enum constraints on roles and event types) and referencing between collections (User, Event, Registration). Chosen because it reduces boilerplate for common database operations and supports population of referenced documents. |
| **bcryptjs** | 3.0.3 | Pure JavaScript bcrypt implementation for password hashing. Every password stored in the database is hashed with a cost factor of 10. Chosen over the native `bcrypt` package because `bcryptjs` has no C++ compilation dependencies, making it portable across environments without needing build tools. |
| **jsonwebtoken** | 9.0.3 | Implements JWT-based stateless authentication. Tokens are signed with a secret key and carry the user ID and role. Every protected API route verifies the token through `auth_middleware`. Chosen because JWT is the standard approach for token-based auth in REST APIs and works cleanly with frontend localStorage persistence. |
| **Nodemailer** | 8.0.1 | Sends transactional emails for registration confirmations, organizer credential delivery, and password reset notifications. Supports SMTP transport with configurable host, port, and credentials via environment variables. Chosen because it is the most established Node.js email library, supports HTML emails with inline attachments (used for embedding QR codes in confirmation emails). |
| **cors** | 2.8.6 | Enables Cross-Origin Resource Sharing so the React frontend (running on a different port in development) can call the Express backend API. Without this, browsers block cross-origin requests by default. Chosen because it is the simplest and most standard Express middleware for this purpose. |
| **dotenv** | 17.3.1 | Loads environment variables from a `.env` file into `process.env`. Keeps secrets like database URIs, JWT keys, SMTP credentials, and reCAPTCHA keys out of source code. Chosen because it is the standard approach for managing environment configuration in Node.js projects. |
| **axios** | 1.13.5 | HTTP client used on the backend specifically for server-side Google reCAPTCHA verification. When a user submits a login or registration form, the backend sends the CAPTCHA token to Google's verification endpoint using axios. Also used for posting Discord webhook messages. Chosen for its simple promise-based API and automatic JSON handling. |
| **qrcode** | 1.5.4 | Generates QR codes as data URLs (base64 PNG) containing unique ticket IDs. QR codes are generated on successful event registration and merchandise payment approval. The data URL format lets us store the QR directly in the database and embed it in emails as inline CID attachments. Chosen because it is the most popular Node.js QR generation library with no native dependencies. |
| **uuid** | 13.0.0 | Generates universally unique identifiers (v4) used as ticket IDs. Each registration gets a UUID-based ticket that is encoded into the QR code and serves as the key for attendance marking and collection tracking. Chosen because UUID v4 provides sufficient randomness to prevent ticket guessing or duplication. |
| **nodemon** | 3.1.11 *(dev)* | Automatically restarts the Node.js server when source files change during development. Saves the manual stop-restart cycle. Chosen as a dev-only dependency because it is the most widely used hot-reload tool for Express development. |

### Frontend

| Library | Version | Justification |
|---------|---------|---------------|
| **React** | 18.2.0 | Component-based UI library specified by the MERN stack requirement. React's virtual DOM and declarative rendering model make it straightforward to build interactive pages like the event browsing interface, real-time notification panel, and discussion forum. Version 18 provides concurrent rendering and automatic batching for state updates. |
| **React DOM** | 18.2.0 | React's rendering package for web browsers. Required companion to React for mounting components into the DOM. |
| **React Router DOM** | 6.22.3 | Client-side routing library that enables single-page application navigation without full page reloads. Used to define role-based route trees (admin, organizer, participant) with protected route wrappers that check authentication and authorization before rendering pages. Chosen because it is the standard routing solution for React applications. |
| **Vite** | 5.2.10 *(dev)* | Fast build tool and development server with hot module replacement. Significantly faster than Create React App (Webpack-based) for both development startup and production builds. Chosen over CRA because Vite provides instant server start, faster HMR, and smaller build output, while supporting the same React development workflow. |
| **@vitejs/plugin-react** | 4.2.1 | Vite plugin that provides React Fast Refresh for hot module replacement and JSX transformation. Required for React support within the Vite build pipeline. |
| **axios** | 1.13.5 | HTTP client used for all frontend-to-backend API communication. A centralized axios instance (`api.js`) attaches JWT tokens automatically via a request interceptor, eliminating the need to manually include auth headers on every API call. Chosen over the native `fetch` API because axios provides automatic JSON parsing, request/response interceptors, and cleaner error handling. |
| **Fuse.js** | 7.1.0 | Client-side fuzzy search library. Powers the event search (matching on event name, description, organizer name, tags) and the registration search in the organizer view (matching on participant name, email, form responses). Configured with a threshold of 0.35 for balanced sensitivity. Chosen because it runs entirely on the client side with no backend search infrastructure needed, and handles typos and partial matches well. |
| **jsQR** | 1.4.0 | JavaScript QR code decoder that works with raw image data. Used in the QR Scanner component to decode QR codes from both live camera feeds (frame-by-frame canvas extraction) and uploaded image files. Chosen because it is a pure JavaScript library that works in the browser without any native dependencies or server round-trips. |
| **PapaParse** | 5.5.3 | CSV parser and serializer. Used to export registration data as downloadable CSV files from the organizer's registrations table. Converts filtered arrays of registration objects into CSV format and triggers a browser download. Chosen because it handles complex data structures (nested form responses, merchandise items) and is the most widely used CSV library in the JavaScript ecosystem. |
| **react-google-recaptcha** | 3.1.0 | React component wrapper for Google reCAPTCHA v2 checkbox widget. Renders the CAPTCHA challenge on both the login and registration pages. The token is sent to the backend for server-side verification. Chosen because it provides a clean React component API and handles the reCAPTCHA lifecycle (render, verify, reset) declaratively. |

---

## Advanced Features (Tier A / B / C)

### Tier A Features Implemented

#### 1. Merchandise Payment Approval Workflow (8 Marks)

**Why this feature:** Merchandise events at a fest involve real money — participants pay for T-shirts, hoodies, and other items. Without a payment verification step, there is no way for organizers to confirm that a participant actually paid before fulfilling their order. This workflow bridges the gap between placing an order and receiving a ticket, providing organizers with control and accountability over the payment process.

**Design Choices & Implementation:**

- **State machine for payment status:** Each merchandise registration follows a strict lifecycle: `pending_upload` → `pending_approval` → `approved` (or `rejected` → re-upload). This is tracked via the `payment_status` field on the Registration model. A ticket and QR code are generated *only* upon approval, not at order placement — this ensures that unverified orders do not produce valid tickets.

- **Payment proof as base64 image:** Participants upload a screenshot of their payment (UPI, bank transfer, etc.) which is stored as a base64-encoded string in the database. While file storage (S3, GridFS) would be more scalable, base64 keeps the implementation self-contained without external storage dependencies, and image sizes for payment screenshots are typically small.

- **Stock management with deferred decrement:** Stock is validated at order placement to prevent ordering out-of-stock items, but the actual decrement happens at approval time. This prevents the situation where a rejected order permanently blocks stock. On registration cancellation, stock is restored. Each approval re-validates stock availability before decrementing, handling race conditions where multiple orders for the same item might be pending simultaneously.

- **Organizer approval interface:** The PaymentApprovals component provides organizers with a dedicated panel to review pending payments. It displays the uploaded payment proof (viewable as a full image), participant details, ordered items with variants, and approve/reject actions. Rejected orders include a reason field, and participants can re-upload a new proof.

- **Email confirmation with QR:** On approval, the system generates a UUID ticket, creates a QR code encoding that ticket ID, sends a confirmation email with the QR code embedded as an inline CID image attachment, and updates the registration record with the ticket and QR data.

**Files involved:**
- Backend: `routes/events/registration.js` (order placement, proof upload), `routes/events/organizer.js` (approval/rejection with stock management), `models/Registration.js` (payment_status field), `utils/mailer.js` (confirmation email with QR)
- Frontend: `components/event/PaymentApprovals.jsx` (organizer review panel), `pages/EventDetails.jsx` (participant order flow, proof upload UI, status display)

---

#### 2. QR Scanner & Attendance Tracking (8 Marks)

**Why this feature:** Manually checking names off a list at an event entrance is slow and error-prone, especially for large events. QR-based scanning lets organizers validate tickets instantly and get a real-time view of who has shown up.

**Design Choices & Implementation:**

- **Two scanning modes — camera and image upload:** The scanner supports both a live camera feed and a static image upload. The camera mode uses the browser's `getUserMedia` API to access the device camera, renders frames to a hidden canvas, extracts pixel data, and passes it to `jsQR` for decoding on every animation frame. The image upload mode handles cases where the camera is not available or the participant has a screenshot of their QR code.

- **Dual-purpose scanner:** The same scanner component handles both normal events (marking attendance) and merchandise events (marking item collection). The backend endpoint (`/api/events/organizer/:eventId/scan-qr`) inspects the event type and routes to the appropriate logic — for normal events it sets the `attendance` flag, and for merchandise events it marks all ordered items as `collected`.

- **Duplicate scan rejection:** The backend checks whether attendance (or collection) is already marked before updating. If a ticket has already been scanned, it returns a message indicating the duplicate rather than silently succeeding. This prevents accidental double-scans at the event entrance.

- **Attendance summary and manual override:** The RegistrationsTable component shows live attendance/collection counts (present vs absent). Organizers can also manually toggle attendance/collection status per participant from the registrations table, covering edge cases where QR scanning is not practical (damaged QR, phone issues).

- **CSV export of attendance data:** The filtered registrations table (including attendance status) can be exported as a CSV file using PapaParse, giving organizers a downloadable report for post-event records.

- **Unique ticket ID design:** Each ticket ID is a UUID v4 generated at registration time, encoded into the QR code. UUIDs are sufficiently random (122 bits of entropy) that they cannot be guessed or enumerated, preventing unauthorized attendance marking.

**Files involved:**
- Backend: `routes/events/organizer.js` (QR scan endpoint, manual toggle endpoints), `routes/events/registration.js` (ticket + QR generation)
- Frontend: `components/event/QrScanner.jsx` (camera/image scanning with jsQR), `components/event/RegistrationsTable.jsx` (attendance display, manual toggle, CSV export)
- Libraries: `jsqr` (frontend QR decoding), `qrcode` (backend QR generation), `uuid` (ticket ID generation), `papaparse` (CSV export)

---

### Tier B Features Implemented

#### 1. Real-Time Discussion Forum (6 Marks)

**Why this feature:** During event preparation and the event itself, participants often have questions about rules, schedules, or logistics. Without a centralized communication channel, this information ends up scattered across WhatsApp groups and emails. A discussion forum tied to each event keeps all communication organized and accessible.

**Design Choices & Implementation:**

- **Access control:** Only confirmed registered participants and the event organizer can view or post in the forum. For merchandise events, only participants with `approved` payment status are allowed. This is enforced at the API level by checking the Registration collection before granting access.

- **Multi-level message threading:** Messages support replies via a `parent_id` reference. The frontend builds a recursive tree structure from the flat message list and renders nested replies with progressive indentation (up to 4 visual levels). This keeps conversations contextual while preventing deeply nested threads from becoming unreadable.

- **Announcements:** Organizers can mark a post as an announcement, which gets highlighted visually in the forum UI. Announcements generate notifications for all registered participants of the event, ensuring important information reaches everyone.

- **Pin/Unpin functionality:** Organizers can pin messages to the top of the forum. Pinned messages appear first regardless of timestamp, useful for FAQs, rules, or schedule changes. Pinning and unpinning generates a notification for participants.

- **Emoji reactions:** Participants and organizers can react to messages with one of six preset emojis. Each user can have one reaction per message — selecting a different emoji replaces the previous one, and re-selecting the same emoji removes it. Reactions are stored as an array of `{ user_id, emoji }` objects on each message.

- **Soft deletion:** When a message is deleted (by the author or the organizer), its content is replaced with a placeholder text rather than being removed from the database. This preserves the thread structure so that replies to deleted messages remain visible in context.

- **Auto-refresh with polling:** The forum polls for new messages every 10 seconds while the panel is open. An unread count badge (based on messages posted since the user's last seen timestamp) appears on the forum button, showing new activity without requiring a manual refresh.

- **Notification integration:** New announcements, replies to a user's posts, and pin actions generate in-app notifications that appear in the navbar notification panel. This creates a cohesive notification experience that ties the discussion forum to overall platform activity.

**Files involved:**
- Backend: `routes/discussions.js` (all forum CRUD, threading, reactions, pins, announcements), `models/Discussion.js` (message schema with parent_id, reactions, flags)
- Frontend: `components/event/DiscussionForum.jsx` (full forum UI with threading, reactions, pins, announcements, polling)

---

#### 2. Organizer Password Reset Workflow (6 Marks)

**Why this feature:** Since organizer accounts are created by the admin (no self-registration), organizers cannot reset their own passwords through a standard "forgot password" email flow. Instead, they need a way to request a reset from the admin, who verifies the request and issues a new password. This mirrors real organizational workflows where account management is centralized.

**Design Choices & Implementation:**

- **Request submission with rate limiting:** Organizers can submit a password reset request with a reason explaining why they need a reset. The system enforces that only one `pending` request can exist at a time per organizer, preventing request spam.

- **Admin review dashboard:** The admin sees all password reset requests on a dedicated page with request details (organizer name, club, date, reason) and current status. Each pending request has approve and reject actions.

- **Approval with auto-generated password:** When the admin approves a request, the backend generates a random 12-character password, hashes it with bcrypt, saves it to the organizer's account, and sends the new password to the organizer via email. The request status is updated to `approved`.

- **Rejection with comments:** The admin can reject a request with a comment explaining the reason. This comment is stored on the request record and visible to the organizer in their request history, providing transparency.

- **Request history:** Organizers can view all their past requests with statuses (pending, approved, rejected) and any admin comments, giving them full visibility into the process.

**Files involved:**
- Backend: `routes/users.js` (submit request, view own requests), `routes/admin.js` (list requests, approve, reject), `models/PasswordResetRequest.js` (request schema with status tracking)
- Frontend: `pages/OrganizerPasswordReset.jsx` (submit & view history), `pages/AdminPasswordResets.jsx` (admin review dashboard)

---

### Tier C Feature Implemented

#### 1. Bot Protection — Google reCAPTCHA v2 (2 Marks)

**Why this feature:** Login and registration endpoints are publicly accessible, making them vulnerable to automated brute-force attacks and bot-driven account creation. reCAPTCHA adds a challenge that is trivial for real users but blocks automated scripts.

**Design Choices & Implementation:**

- **reCAPTCHA v2 checkbox:** Chose v2 (checkbox) over v3 (invisible/score-based) because v2 provides a clear user-visible verification step. Users click the checkbox, and if suspicious behavior is detected, they solve an image puzzle. This is more deterministic than v3's score threshold, which would require tuning and could silently block legitimate users.

- **Server-side verification:** The CAPTCHA token generated by the frontend widget is sent with the login/registration request to the backend. The backend verifies this token against Google's `siteverify` API using axios. The request is rejected if verification fails, ensuring that the CAPTCHA cannot be bypassed by skipping the frontend.

- **Applied to both login and registration:** Both the Login and Register pages include the reCAPTCHA widget. The token is required for both operations, covering both the account creation and authentication attack surfaces.

- **Automatic reset on failure:** If a login or registration attempt fails (wrong credentials, duplicate email, etc.), the reCAPTCHA widget is automatically reset via its ref, requiring the user to re-verify. This prevents token reuse across multiple attempts.

**Files involved:**
- Backend: `routes/authorization.js` (verification function using Google's API, called in both login and register handlers)
- Frontend: `pages/Login.jsx`, `pages/Register.jsx` (reCAPTCHA widget integration with refs and state management)
- Library: `react-google-recaptcha` (frontend widget), `axios` (backend verification)

---

## Setup & Installation

### Prerequisites

- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (local instance or MongoDB Atlas)
- **SMTP email account** (Gmail with App Password recommended)

### 1. Clone the Repository

```bash
git clone <repository-url>
cd <roll_no>
```

### 2. Backend Setup

```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:

```env
MONGO_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/felicity
JWT_SECRET=your_jwt_secret_key
ADMIN_EMAIL=admin@felicity.com
ADMIN_PASSWORD=admin123
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_EMAIL=your_email@gmail.com
SMTP_PASSWORD=your_app_password
RECAPTCHA_SECRET_KEY=your_recaptcha_secret_key
```

| Variable | Description |
|----------|-------------|
| `MONGO_URI` | MongoDB connection string (Atlas or local) |
| `JWT_SECRET` | Secret key used to sign JWT tokens |
| `ADMIN_EMAIL` | Email for the auto-seeded admin account |
| `ADMIN_PASSWORD` | Password for the auto-seeded admin account |
| `SMTP_HOST` | SMTP server hostname |
| `SMTP_PORT` | SMTP port (587 for TLS) |
| `SMTP_SECURE` | Set to `false` for STARTTLS on port 587 |
| `SMTP_EMAIL` | Email address used to send transactional emails |
| `SMTP_PASSWORD` | SMTP password or App Password |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v2 secret key |

Start the backend server:

```bash
npm run dev     # development (with hot-reload via nodemon)
npm start       # production
```

The server runs on `http://localhost:5005` by default.

### 3. Frontend Setup

```bash
cd frontend
npm install
```

Start the development server:

```bash
npm run dev
```

The frontend runs on `http://localhost:5173` by default (Vite).

To build for production:

```bash
npm run build
npm run preview   # preview the production build locally
```

### 4. Verify the Setup

1. Open `http://localhost:5173` in a browser
2. The admin account is auto-created on first server startup using the `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the `.env` file
3. Login as admin and create an organizer account to begin testing the full workflow

### Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | Value of `ADMIN_EMAIL` in `.env` |
| Password | Value of `ADMIN_PASSWORD` in `.env` |

---

## Project Structure

```
├── backend/
│   ├── server.js                 # Express app, MongoDB connection, admin seeding
│   ├── middleware/
│   │   ├── auth_middleware.js     # JWT verification middleware
│   │   └── role_middleware.js     # Role-based access control middleware
│   ├── models/
│   │   ├── User.js               # User schema (admin, organizer, participant)
│   │   ├── Event.js              # Event schema (normal + merchandise)
│   │   ├── Registration.js       # Registration schema with tickets and payment
│   │   ├── Discussion.js         # Discussion message schema (threading, reactions)
│   │   ├── Notification.js       # In-app notification schema
│   │   └── PasswordResetRequest.js
│   ├── routes/
│   │   ├── authorization.js      # Login, register, reCAPTCHA verification
│   │   ├── admin.js              # Organizer CRUD, password reset management
│   │   ├── users.js              # Profile, follow/unfollow, password change
│   │   ├── events.js             # Event route aggregator
│   │   ├── events/
│   │   │   ├── crud.js           # Event CRUD, publish, trending
│   │   │   ├── registration.js   # Registration, merchandise orders, cancellation
│   │   │   └── organizer.js      # QR scan, attendance, payment approvals, analytics
│   │   ├── discussions.js        # Forum CRUD, threading, reactions, pins
│   │   └── notifications.js      # Notification fetch, mark read
│   └── utils/
│       ├── mailer.js             # Email sending with QR attachment support
│       ├── discord.js            # Discord webhook posting
│       └── constants.js          # Shared constants (event tags)
│
├── frontend/
│   ├── src/
│   │   ├── api.js                # Axios instance with JWT interceptor
│   │   ├── App.jsx               # Route definitions with role-based protection
│   │   ├── App.css               # Shared CSS classes
│   │   ├── utils/
│   │   │   └── helpers.js        # Status computation, date formatting, constants
│   │   ├── components/
│   │   │   ├── Navbar.jsx        # Role-aware navbar with notification panel
│   │   │   ├── EventCard.jsx     # Reusable event card component
│   │   │   └── event/
│   │   │       ├── DiscussionForum.jsx   # Threaded forum with reactions
│   │   │       ├── QrScanner.jsx         # Camera + image QR scanner
│   │   │       ├── PaymentApprovals.jsx  # Payment review panel
│   │   │       └── RegistrationsTable.jsx # Filterable table with CSV export
│   │   ├── layouts/
│   │   │   └── DashboardLayout.jsx       # Page wrapper with navbar
│   │   └── pages/
│   │       ├── Login.jsx
│   │       ├── Register.jsx
│   │       ├── ParticipantDashboard.jsx
│   │       ├── ParticipantEvents.jsx
│   │       ├── ParticipantProfile.jsx
│   │       ├── ParticipantOnboarding.jsx
│   │       ├── ParticipantOrganizers.jsx
│   │       ├── OrganizerDashboard.jsx
│   │       ├── OrganizerMyEvents.jsx
│   │       ├── OrganizerCreateEvent.jsx
│   │       ├── OrganizerEditEvent.jsx
│   │       ├── OrganizerProfile.jsx
│   │       ├── OrganizerPasswordReset.jsx
│   │       ├── OrganizerDetailPage.jsx
│   │       ├── EventDetails.jsx
│   │       ├── AdminDashboard.jsx
│   │       ├── AdminCreateOrganizer.jsx
│   │       ├── AdminOrganizerList.jsx
│   │       └── AdminPasswordResets.jsx
│   └── vite.config.js
│
├── README.md
└── package.json
```
