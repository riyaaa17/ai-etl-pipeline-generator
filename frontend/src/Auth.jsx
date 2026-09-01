import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";
import { auth } from "./firebase";

export default function Auth() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login"); // "login" or "signup"
  const [message, setMessage] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");
    try {
      let userCredential;
      if (mode === "signup") {
        userCredential = await createUserWithEmailAndPassword(auth, email, password);
      } else {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      }

      const idToken = await userCredential.user.getIdToken();

      // Call the protected backend endpoint to verify it works end-to-end
      const res = await fetch("http://localhost:8000/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();
      setMessage(`Success! Logged in as: ${data.email} (${data.role} at ${data.client_name})`);
      

    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: "50px auto", fontFamily: "sans-serif" }}>
      <h2>{mode === "signup" ? "Sign Up" : "Login"}</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
          required
        />
        <button type="submit" style={{ padding: 8, width: "100%" }}>
          {mode === "signup" ? "Sign Up" : "Login"}
        </button>
      </form>
      <p style={{ marginTop: 10 }}>
        {mode === "login" ? (
          <span onClick={() => setMode("signup")} style={{ color: "blue", cursor: "pointer" }}>
            Need an account? Sign up
          </span>
        ) : (
          <span onClick={() => setMode("login")} style={{ color: "blue", cursor: "pointer" }}>
            Already have an account? Login
          </span>
        )}
      </p>
      {message && <p style={{ marginTop: 10 }}>{message}</p>}
    </div>
  );
}