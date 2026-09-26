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

  if (screen === "auth" || screen === "role-select") {
    return (
      <div className="split-auth-screen">
        <div className="split-auth-left">
          <div className="split-auth-graphic">
            <svg viewBox="0 0 500 500" className="split-auth-svg" preserveAspectRatio="xMidYMid slice">
              <defs>
                <linearGradient id="waveGrad1" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#06b6d4" />
                </linearGradient>
                <linearGradient id="waveGrad2" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#8b5cf6" />
                  <stop offset="100%" stopColor="#ec4899" />
                </linearGradient>
              </defs>
              <path d="M-20,260 C80,220 140,300 220,260 C300,220 340,300 420,260 C480,235 500,260 520,250"
                stroke="url(#waveGrad1)" strokeWidth="1.5" fill="none" opacity="0.55" />
              <path d="M-20,290 C80,250 140,330 220,290 C300,250 340,330 420,290 C480,265 500,290 520,280"
                stroke="url(#waveGrad2)" strokeWidth="1.2" fill="none" opacity="0.4" />
              <path d="M-20,230 C80,195 140,265 220,230 C300,195 340,265 420,230 C480,205 500,230 520,220"
                stroke="url(#waveGrad1)" strokeWidth="1" fill="none" opacity="0.35" />
              <path d="M-20,320 C80,285 140,355 220,320 C300,285 340,355 420,320 C480,300 500,320 520,310"
                stroke="url(#waveGrad2)" strokeWidth="1" fill="none" opacity="0.3" />
              <path d="M40,60 L130,60 L130,150 L230,150" stroke="url(#waveGrad1)" strokeWidth="1.2" fill="none" opacity="0.45" />
              <path d="M70,420 L70,340 L190,340 L190,290" stroke="url(#waveGrad1)" strokeWidth="1.2" fill="none" opacity="0.45" />
              <path d="M300,80 L400,80 L400,180 L360,180" stroke="url(#waveGrad2)" strokeWidth="1.2" fill="none" opacity="0.45" />
              <path d="M420,400 L340,400 L340,440" stroke="url(#waveGrad1)" strokeWidth="1.2" fill="none" opacity="0.4" />
              <rect x="350" y="60" width="70" height="50" rx="7" fill="none" stroke="url(#waveGrad2)" strokeWidth="1.3" opacity="0.55" />
              <circle cx="385" cy="85" r="15" fill="none" stroke="url(#waveGrad2)" strokeWidth="1.3" opacity="0.55" />
              <rect x="40" y="330" width="55" height="42" rx="6" fill="none" stroke="url(#waveGrad1)" strokeWidth="1.3" opacity="0.55" />
              <rect x="220" y="380" width="60" height="45" rx="6" fill="none" stroke="url(#waveGrad2)" strokeWidth="1.3" opacity="0.5" />
              {[...Array(45)].map((_, i) => {
                const x = (i * 53 + (i % 7) * 17) % 500;
                const y = 200 + Math.sin(i * 0.7) * 80 + ((i * 29) % 120) - 60;
                const r = 1 + (i % 3) * 0.7;
                return <circle key={i} cx={x} cy={y} r={r} fill={i % 2 === 0 ? "#8b5cf6" : "#06b6d4"} opacity={0.4 + (i % 4) * 0.1} />;
              })}
            </svg>
          </div>
          <div className="split-auth-brand">
            <div className="split-auth-title-row">
              <div className="brand-logo split-auth-logo">
                <svg width="34" height="34" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h10v4H4v-4z" fill="url(#logoGradient2)" />
                  <defs>
                    <linearGradient id="logoGradient2" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#6366f1" />
                      <stop offset="0.5" stopColor="#8b5cf6" />
                      <stop offset="1" stopColor="#06b6d4" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>
              <h1 className="split-auth-title">Data Engineer Assistant</h1>
            </div>
            <p className="split-auth-subtitle">Multi-Agent AI for Secure KPI-Driven ETL</p>
          </div>
        </div>

        <div className="split-auth-right">
          {screen === "auth" && <Auth onAuthed={checkUser} />}
          {screen === "role-select" && <RoleSelect token={token} onRegistered={() => checkUser(token)} />}
        </div>
      </div>
    );
  }

  return (
    <div className="main-app-shell">
      <div className="top-header-bar">
        <div className="top-header-user">
          <div className="avatar">{userInfo?.email?.[0]?.toUpperCase()}</div>
          <div>
            <div className="top-header-email">{userInfo?.email}</div>
            <div className="top-header-meta">
              <span className="badge badge-role">{userInfo?.role}</span>{" "}
              <span style={{ marginLeft: 4 }}>at {userInfo?.client_name}</span>
            </div>
          </div>
        </div>

        <div className="top-header-brand">
          <div className="brand-logo top-header-logo">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4h16v4H4V4zm0 6h16v4H4v-4zm0 6h10v4H4v-4z" fill="url(#logoGradient3)" />
              <defs>
                <linearGradient id="logoGradient3" x1="4" y1="4" x2="20" y2="20" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#6366f1" />
                  <stop offset="0.5" stopColor="#8b5cf6" />
                  <stop offset="1" stopColor="#06b6d4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="top-header-title">Data Engineer Assistant</span>
        </div>

        <button className="btn btn-secondary" style={{ width: "auto", justifySelf: "end" }} onClick={handleLogout}>
          Log out
        </button>
      </div>

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
        <Dashboard token={token} userInfo={userInfo} />
      )}
      {activeTab === "dashboard" && (
        <DashboardBuilder token={token} userInfo={userInfo} />
      )}
    </div>
  );
}

export default App;