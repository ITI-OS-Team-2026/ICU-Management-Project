import { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../features/auth/store/authStore';
import { Activity } from 'lucide-react';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuthStore();
  const location = useLocation();

  // If the component mounts and we are in an unknown state (initially loading)
  // we check auth to see if there's a valid session cookie
  useEffect(() => {
    // If not authenticated and not already loading/checked, you could call checkAuth()
    // However, it's usually better to call checkAuth ONCE in the App.jsx root
    // to avoid multiple API calls. We assume App.jsx handles the initial load.
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background">
        <Activity className="h-10 w-10 text-primary animate-pulse mb-4" />
        <p className="text-muted-foreground text-sm font-medium">Verifying session...</p>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Redirect to login page but save the location they were trying to go to
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    // Redirect to an unauthorized page or home
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <div className="text-center space-y-4">
          <h2 className="text-display font-bold text-destructive">Access Denied</h2>
          <p className="text-body text-muted-foreground">
            You do not have the required permissions to view this page.
          </p>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
