import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import RoomPage from "./pages/RoomPage";
import NotFoundPage from "./pages/NotFoundPage";

import PageShell from "./components/layout/PageShell";

function AppRouter() {
    return (
        <BrowserRouter>
            <PageShell>
                <Routes>
                    <Route path="/" element={<Navigate to="/login" replace/>} />
                    <Route path="/login" element={<LoginPage />} />
                    <Route path="/register" element={<RegisterPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/rooms/:roomCode" element={<RoomPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </PageShell>
        </BrowserRouter>
    );
}

export default AppRouter;