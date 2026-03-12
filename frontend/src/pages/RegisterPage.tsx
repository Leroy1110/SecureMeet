import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import AuthCardLayout from "../components/layout/AuthCardLayout";
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
      title="Create your SecureMeet account"
      description="Set up your account to start hosting and joining secure meetings."
      footer={
        <>
          Already have an account?{" "}
          <Link
            to="/login"
            className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 hover:decoration-slate-500 dark:text-slate-100 dark:decoration-slate-600 dark:hover:decoration-slate-400"
          >
            Sign in
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
            htmlFor="username"
            className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-200"
          >
            Username
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
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
          className="w-full rounded-md bg-black px-4 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-black disabled:text-white dark:bg-blue-900 dark:hover:bg-blue-800 dark:disabled:bg-blue-900 dark:disabled:text-white"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>

      {error ? <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p> : null}
      {success ? (
        <p className="mt-4 text-sm text-green-600 dark:text-green-400">
          Registration successful
        </p>
      ) : null}
    </AuthCardLayout>
  );
}

export default RegisterPage;
