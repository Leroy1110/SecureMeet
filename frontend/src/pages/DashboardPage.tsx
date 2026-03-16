import { Navigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <p>Loading session...</p>;
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div>
      <h1>Welcome {user.username}</h1>
      <p>Email: {user.email}</p>
    </div>
  );
}

export default DashboardPage;
