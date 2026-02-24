import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";
import Login from "./pages/Login";
import Register from "./pages/Register";

import ParticipantDashboard from "./pages/ParticipantDashboard";
import ParticipantEvents from "./pages/ParticipantEvents";
import ParticipantProfile from "./pages/ParticipantProfile";
import ParticipantOrganizers from "./pages/ParticipantOrganizers";
import ParticipantOnboarding from "./pages/ParticipantOnboarding";
import OrganizerDetailPage from "./pages/OrganizerDetailPage";

import OrganizerDashboard from "./pages/OrganizerDashboard";
import OrganizerCreateEvent from "./pages/OrganizerCreateEvent";
import OrganizerEditEvent from "./pages/OrganizerEditEvent";
import OrganizerProfile from "./pages/OrganizerProfile";
import OrganizerPasswordReset from "./pages/OrganizerPasswordReset";

import AdminDashboard from "./pages/AdminDashboard";
import AdminCreateOrganizer from "./pages/AdminCreateOrganizer";
import AdminOrganizerList from "./pages/AdminOrganizerList";
import AdminPasswordResets from "./pages/AdminPasswordResets";

import EventDetails from "./pages/EventDetails";

// Helper that reads user from localStorage at navigation time
function ProtectedRoute({ role, children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user || user.role !== role) {
    return <Navigate to="/" replace />;
  }
  return children;
}

function AuthRoute({ children }) {
  const user = JSON.parse(localStorage.getItem("user"));
  if (!user) return <Navigate to="/" replace />;
  return children;
}

function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Admin */}
      <Route path="/admin/dashboard" element={<ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/create-organizer" element={<ProtectedRoute role="admin"><AdminCreateOrganizer /></ProtectedRoute>} />
      <Route path="/admin/organizers" element={<ProtectedRoute role="admin"><AdminOrganizerList /></ProtectedRoute>} />
      <Route path="/admin/password-resets" element={<ProtectedRoute role="admin"><AdminPasswordResets /></ProtectedRoute>} />

      {/* Organizer */}
      <Route path="/organizer/dashboard" element={<ProtectedRoute role="organizer"><OrganizerDashboard /></ProtectedRoute>} />
      <Route path="/organizer/create-event" element={<ProtectedRoute role="organizer"><OrganizerCreateEvent /></ProtectedRoute>} />
      <Route path="/organizer/my-events" element={<Navigate to="/organizer/dashboard" replace />} />
      <Route path="/organizer/events/:id/edit" element={<ProtectedRoute role="organizer"><OrganizerEditEvent /></ProtectedRoute>} />
      <Route path="/organizer/profile" element={<ProtectedRoute role="organizer"><OrganizerProfile /></ProtectedRoute>} />
      <Route path="/organizer/password-reset" element={<ProtectedRoute role="organizer"><OrganizerPasswordReset /></ProtectedRoute>} />

      {/* Participant */}
      <Route path="/participant/dashboard" element={<ProtectedRoute role="participant"><ParticipantDashboard /></ProtectedRoute>} />
      <Route path="/participant/onboarding" element={<ProtectedRoute role="participant"><ParticipantOnboarding /></ProtectedRoute>} />
      <Route path="/participant/events" element={<ProtectedRoute role="participant"><ParticipantEvents /></ProtectedRoute>} />
      <Route path="/participant/profile" element={<ProtectedRoute role="participant"><ParticipantProfile /></ProtectedRoute>} />
      <Route path="/participant/organizers" element={<ProtectedRoute role="participant"><ParticipantOrganizers /></ProtectedRoute>} />
      <Route path="/participant/organizers/:id" element={<ProtectedRoute role="participant"><OrganizerDetailPage /></ProtectedRoute>} />

      {/* Shared: Event Details (any logged-in user) */}
      <Route path="/event/:id" element={<AuthRoute><EventDetails /></AuthRoute>} />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;