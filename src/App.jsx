import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';

// ─── Guard untuk user biasa ───────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token_admin');
  if (!token) return <Navigate to="/login" replace />;
  return children;
};

// ─── Guard khusus admin ───────────────────────────────────────────────────
const AdminRoute = ({ children }) => {
  const token = localStorage.getItem('token_admin');
  const user  = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token)                 return <Navigate to="/login" replace />;
  if (user.role !== 'admin')  return <Navigate to="/dashboard" replace />;
  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login"    element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Dashboard warga biasa */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        {/* Dashboard admin */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminDashboard />
            </AdminRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}