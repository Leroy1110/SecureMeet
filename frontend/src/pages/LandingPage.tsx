import { Navigate } from "react-router-dom";
import LandingPageContent from "../components/landing/LandingPageContent";
import { useAuth } from "../hooks/useAuth";

function LandingPage() {
  return <LandingPageContent />;
}

export function LandingHome() {
  const { loading, isAuthenticated } = useAuth();

  if (loading) return null;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <LandingPage />;
}

export default LandingPage;
