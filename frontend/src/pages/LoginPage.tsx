import { useState } from "react";
import type { FormEvent } from "react";
import { post } from "../lib/apiClient";
import type { LoginRequest, TokenResponse } from "../lib/types";

function LoginPage() {
  const [email, setEmail] = useState("");
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

    const payload: LoginRequest = {
      email,
      password,
    };

    try {
      await post<TokenResponse>("/auth/login", payload);
      setSuccess(true);
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
    <div>
      <h1>Login</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="border px-3 py-2 rounded w-full"
          />
        </div>

        <div>
          <label htmlFor="password" className="block mb-1">
            Password
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            className="border px-3 py-2 rounded w-full"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {loading ? "Logging in..." : "Login"}
        </button>
      </form>

      {error ? <p className="text-red-600 mt-3">{error}</p> : null}
      {success ? <p className="text-green-600 mt-3">Login successful</p> : null}
    </div>
  );
}

export default LoginPage;