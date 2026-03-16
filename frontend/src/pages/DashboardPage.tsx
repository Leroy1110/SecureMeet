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
      <h1>Welcome {user?.username}</h1>
      <p>Email: {user?.email}</p>
      <button type="button" onClick={handleLogout}>
        Logout
      </button>
    </div>
  );
}

export default DashboardPage;
