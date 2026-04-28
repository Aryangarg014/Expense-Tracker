import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './components/Login';
import Register from './components/Register';
import ProtectedRoute from './components/ProtectedRoute';

// Placeholder for Dashboard component which will be built in Phase 6
const DashboardPlaceholder = () => (
  <div className="flex flex-col justify-center items-center h-screen bg-gray-50 text-center px-4">
    <h1 className="text-3xl font-bold text-gray-800 mb-4">Dashboard</h1>
    <p className="text-gray-600 max-w-md">This is a protected route. If you see this, authentication is working correctly. The actual Expense Dashboard will be built in Phase 6.</p>
  </div>
);

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<DashboardPlaceholder />} />
        </Route>

        {/* Redirect unknown routes to login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
