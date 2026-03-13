import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import RoomPage from "./pages/RoomPage";
import NotFoundPage from "./pages/NotFoundPage";

import AuthLayout from "./components/layout/AuthLayout";
import PageShell from "./components/layout/PageShell";

function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route element={<AuthLayout />}>
          <Route path="login" element={<LoginPage />} />
          <Route path="register" element={<RegisterPage />} />
        </Route>

        <Route element={<PageShell />}>
          <Route path="dashboard" element={<DashboardPage />} />
        </Route>

        <Route path="rooms/:roomCode" element={<RoomPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default AppRouter;