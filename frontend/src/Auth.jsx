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
  const [loggedIn, setLoggedIn] = useState(false);

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
      window.currentToken = idToken; // temporarily store for test buttons below

      const res = await fetch("http://localhost:8000/me", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      const data = await res.json();

      setMessage(`Success! Logged in as: ${data.email} (${data.role} at ${data.client_name})`);
      setLoggedIn(true);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
      setLoggedIn(false);
    }
  };

  const tryAccessDataset = async (dataset) => {
    try {
      const res = await fetch(`http://localhost:8000/query-dataset?dataset=${dataset}`, {
        headers: { Authorization: `Bearer ${window.currentToken}` },
      });
      const data = await res.json();
      setMessage(JSON.stringify(data));
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

      {loggedIn && (
        <div style={{ marginTop: 20 }}>
          <button
            onClick={() => tryAccessDataset("client_retailmart")}
            style={{ display: "block", width: "100%", marginBottom: 10, padding: 8 }}
          >
            Try: Access RetailMart (should succeed)
          </button>

          <button
            onClick={() => tryAccessDataset("client_foodgo")}
            style={{ display: "block", width: "100%", padding: 8 }}
          >
            Try: Access FoodGo (should be BLOCKED)
          </button>
        </div>
      )}

      {message && <p style={{ marginTop: 10, wordBreak: "break-word" }}>{message}</p>}
    </div>
  );
}