import { useState } from "react";
import Auth from "./Auth";
import RoleSelect from "./RoleSelect";
import Dashboard from "./Dashboard";
import DashboardBuilder from "./DashboardBuilder";

const API_BASE = "http://localhost:8001";

function App() {
  const [screen, setScreen] = useState("auth");
  const [token, setToken] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [activeTab, setActiveTab] = useState("generator");

  const checkUser = async (idToken) => {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { Authorization: `Bearer ${idToken}` },
    });

    setToken(idToken);

    if (res.status === 403) {
      setScreen("role-select");
      return;
    }

    const data = await res.json();
    setUserInfo(data);
    setScreen("dashboard");
  };

  const handleLogout = () => {
    setToken(null);
    setUserInfo(null);
    setScreen("auth");
    setActiveTab("generator");
  };

  return (
    <div className="app-shell">
      <div className="brand-header">
        <div className="brand-logo">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h10v4H4v-4z" fill="url(#logoGradient)" />
            <defs>
              <linearGradient id="logoGradient" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                <stop stopColor="#6366f1" />
                <stop offset="0.5" stopColor="#8b5cf6" />
                <stop offset="1" stopColor="#06b6d4" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <div>
          <h1 className="app-title">Data Engineer Assistant</h1>
          <p className="app-subtitle">Secure, AI-powered ETL pipelines from plain English</p>
        </div>
      </div>

      {screen === "auth" && <Auth onAuthed={checkUser} />}
      {screen === "role-select" && <RoleSelect token={token} onRegistered={() => checkUser(token)} />}

      {screen === "dashboard" && (
        <>
          <div className="tab-switcher">
            <span
              className={`tab-item ${activeTab === "generator" ? "active" : ""}`}
              onClick={() => setActiveTab("generator")}
            >
              ✨ Generator
            </span>
            <span
              className={`tab-item ${activeTab === "dashboard" ? "active" : ""}`}
              onClick={() => setActiveTab("dashboard")}
            >
              📌 Dashboard
            </span>
          </div>

          {activeTab === "generator" && (
            <Dashboard token={token} userInfo={userInfo} onLogout={handleLogout} />
          )}
          {activeTab === "dashboard" && (
            <DashboardBuilder token={token} userInfo={userInfo} />
          )}
        </>
      )}
    </div>
  );
}

export default App;