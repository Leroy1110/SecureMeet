import { useAuth } from "../hooks/useAuth";

function DashboardPage() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) {
    return <p>Loading session...</p>;
  }

  if (!isAuthenticated) {
    return <p>You are not logged in</p>;
  }

  return (
    <div>
      <h1>Welcome {user?.username}</h1>
      <p>Email: {user?.email}</p>
    </div>
  );
}

export default DashboardPage;
