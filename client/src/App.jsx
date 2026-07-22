import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './features/auth/store/authStore';
import Login from './features/auth/pages/Login';
import ProtectedRoute from './components/ProtectedRoute';

const DashboardPlaceholder = () => {
  const { user, logout } = useAuthStore();
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-background">
      <h1 className="text-display font-bold mb-4">Dashboard</h1>
      <p className="text-body mb-6">Welcome, {user?.first_name} {user?.last_name} ({user?.role})</p>
      <button 
        onClick={logout}
        className="px-4 py-2 bg-destructive text-destructive-foreground rounded-md font-medium"
      >
        Logout
      </button>
    </div>
  );
};

const App = () => {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    // Check for existing session when app starts
    checkAuth();
  }, [checkAuth]);

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        
        {/* Protected Routes */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute>
              <DashboardPlaceholder />
            </ProtectedRoute>
          } 
        />
        
        {/* Redirect unknown routes to dashboard (which will redirect to login if unauthenticated) */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;