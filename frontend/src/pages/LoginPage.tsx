import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCardLayout from "../components/layout/AuthCardLayout";
import { SmButton, SmField } from "../components/sm";
import { useAuth } from "../hooks/useAuth";
import { post } from "../lib/apiClient";
import type { LoginRequest, TokenResponse } from "../lib/types";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setToken, loadUser } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setLoading(true);

    const payload: LoginRequest = {
      email,
      password,
    };

    try {
      const response = await post<TokenResponse>("/auth/login", payload);
      const { access_token } = response;
      setToken(access_token);
      await loadUser(access_token);
      navigate("/dashboard");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to log in right now. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCardLayout
      title="Welcome back"
      description="Sign in to your SecureMeet account to start or join a private meeting."
      footer={
        <>
          New to SecureMeet?{" "}
          <Link
            to="/register"
            style={{
              color: "var(--sm-accent)",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Create an account
          </Link>
        </>
      }
    >
      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 18 }}
      >
        <SmField
          id="email"
          type="email"
          label="Email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@company.com"
          autoComplete="email"
          required
        />

        <SmField
          id="password"
          type="password"
          label="Password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />

        <SmButton type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </SmButton>
      </form>

      {error ? (
        <div
          role="alert"
          style={{
            marginTop: 18,
            borderRadius: 14,
            padding: "12px 14px",
            background: "var(--sm-danger-soft)",
            color: "var(--sm-danger)",
            fontSize: 13.5,
            border: "1px solid rgba(222, 58, 58, 0.12)",
          }}
        >
          {error}
        </div>
      ) : null}
    </AuthCardLayout>
  );
}

export default LoginPage;
