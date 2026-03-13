import React from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import "./App.css";
import LandingPage from "./pages/LandingPage";
import LoginPage from "./pages/LoginPage";
import Dashboard from "./pages/Dashboard";
import Builder from "./pages/Builder";
import TemplatesPage from "./pages/TemplatesPage";
import SettingsPage from "./pages/SettingsPage";
import AuthCallback from "./pages/AuthCallback";
import GitHubCallback from "./pages/GitHubCallback";
import SharePage from "./pages/SharePage";
import { Toaster } from "./components/ui/sonner";

function AppRouter() {
  const location = useLocation();
  
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }
  
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/builder/:projectId" element={<Builder />} />
      <Route path="/templates" element={<TemplatesPage />} />
      <Route path="/settings" element={<SettingsPage />} />
      <Route path="/github/callback" element={<GitHubCallback />} />
      <Route path="/share/:slug" element={<SharePage />} />
    </Routes>
  );
}

function App() {
  return (
    <div className="App relative min-h-screen">
      <div className="gradient-mesh-bg"></div>
      <div className="gradient-orb gradient-orb-1"></div>
      <div className="gradient-orb gradient-orb-2"></div>
      <div className="gradient-orb gradient-orb-3"></div>
      <div className="noise-overlay" />
      <BrowserRouter>
        <AppRouter />
      </BrowserRouter>
      <Toaster position="bottom-right" />
    </div>
  );
}

export default App;
