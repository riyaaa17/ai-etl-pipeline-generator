import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";

export default function Auth({ onAuthed }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      let cred;
      if (mode === "signup") {
        cred = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        cred = await signInWithEmailAndPassword(auth, email, password);
      }
      const idToken = await cred.user.getIdToken();
      await onAuthed(idToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="split-auth-card">
      <h2 className="card-title">{mode === "signup" ? "Create an account" : "Welcome back"}</h2>
      <p className="card-subtitle">{mode === "signup" ? "Sign up to get started" : "Log in to continue"}</p>

      <form onSubmit={handleSubmit}>
        <div className="field-group">
          <input
            className="input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div className="field-group">
          <input
            className="input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: "100%", justifyContent: "center" }}
          disabled={busy}
        >
          {busy ? "Please wait..." : mode === "signup" ? "Sign Up" : "Login"}
        </button>
      </form>

      <p style={{ marginTop: 14, marginBottom: 0, textAlign: "center" }}>
        {mode === "login" ? (
          <span className="link" onClick={() => setMode("signup")}>Need an account? Sign up</span>
        ) : (
          <span className="link" onClick={() => setMode("login")}>Already have an account? Login</span>
        )}
      </p>

      {error && <div className="alert alert-error">⚠ {error}</div>}
    </div>
  );
}