import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthCardLayout from "../components/layout/AuthCardLayout";
import { useAuth } from "../hooks/useAuth";
import { post } from "../lib/apiClient";
import type { LoginRequest, TokenResponse } from "../lib/types";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const { setToken } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (loading) {
      return;
    }

    setError("");
    setSuccess(false);
    setLoading(true);

    const payload: LoginRequest = {
      email,
      password,
    };

    try {
      const response = await post<TokenResponse>("/auth/login", payload);
      const { access_token } = response;
      setToken(access_token);
      setSuccess(true);
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
      title="Sign in to SecureMeet"
      description="Use your account credentials to continue."
      footer={
        <>
          New to SecureMeet?{" "}
          <Link
            to="/register"
            className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-400"
          >
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:focus:ring-slate-700"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md px-4 py-2.5 text-sm font-medium text-white transition bg-black hover:bg-neutral-800 disabled:bg-gray-300 disabled:text-white disabled:cursor-not-allowed disabled:hover:bg-gray-300 !disabled:opacity-100 dark:bg-blue-900 dark:hover:bg-blue-800 dark:disabled:bg-blue-900 dark:disabled:text-white"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {success ? (
        <p className="mt-4 text-sm text-green-600 dark:text-green-400">
          Login successful
        </p>
      ) : null}
    </AuthCardLayout>
  );
}

export default LoginPage;
