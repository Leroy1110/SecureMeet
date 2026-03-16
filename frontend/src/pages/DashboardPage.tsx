import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function DashboardPage() {
  const { user, clearToken } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearToken();
    navigate("/login");
  };

  return (
    <div>
      <h1>Welcome to your dashboard</h1>
      <p>This is where your SecureMeet rooms and activity will appear.</p>
      {user?.username && <p>Signed in as {user.username}</p>}
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default DashboardPage;
