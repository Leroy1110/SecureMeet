import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthCardLayout from "../components/layout/AuthCardLayout";
import { SmButton, SmField } from "../components/sm";
import { post } from "../lib/apiClient";
import type { RegisterRequest, User } from "../lib/types";

function RegisterPage() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setSuccess(false);
    setLoading(true);

    const payload: RegisterRequest = {
      email,
      username,
      password,
    };

    try {
      await post<User>("/auth/register", payload);
      setSuccess(true);

      setEmail("");
      setUsername("");
      setPassword("");
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : "Unable to register right now. Please try again.";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthCardLayout
      title="Create your account"
      description="Set up SecureMeet to start hosting and joining private, end-to-end encrypted meetings."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            style={{
              color: "var(--sm-accent)",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Sign in
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
          id="username"
          type="text"
          label="Username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          placeholder="yourname"
          autoComplete="username"
          required
        />

        <SmField
          id="password"
          type="password"
          label="Password"
          helper="At least 8 characters, mixing letters and numbers."
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          required
        />

        <SmButton type="submit" variant="primary" size="lg" fullWidth disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
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
      {success ? (
        <div
          role="status"
          style={{
            marginTop: 18,
            borderRadius: 14,
            padding: "12px 14px",
            background: "var(--sm-success-soft)",
            color: "var(--sm-success)",
            fontSize: 13.5,
            border: "1px solid rgba(52, 164, 92, 0.12)",
          }}
        >
          Account created - you can sign in now.
        </div>
      ) : null}
    </AuthCardLayout>
  );
}

export default RegisterPage;
