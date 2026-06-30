import React from "react";
import { createBrowserRouter, Navigate, Outlet } from "react-router";
import InvestigationDashboard from "./pages/InvestigationDashboard";
import FundFlowGraph from "./pages/FundFlowGraph";
import STRGeneration from "./pages/STRGeneration";
import EntityProfile from "./pages/EntityProfile";
import AnalyticsDashboard from "./pages/AnalyticsDashboard";
import MobileAlert from "./pages/MobileAlert";
import AdminConfig from "./pages/AdminConfig";
import BlockchainAudit from "./pages/BlockchainAudit";
import NLQuery from "./pages/NLQuery";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import { useAuth } from "../context/AuthContext";
import { ShieldAlert } from "lucide-react";

// Protected Layout Guard
function ProtectedLayout() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#E31E24]" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Layout />;
}

// Admin Route Guard
function AdminGuard() {
  const { hasPermission } = useAuth();
  
  if (!hasPermission("CONFIG_MANAGE")) {
    return <Navigate to="/unauthorized" replace />;
  }
  
  return <AdminConfig />;
}

// Unauthorized Access View
function Unauthorized() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 max-w-md w-full text-center shadow-2xl space-y-4">
        <div className="w-16 h-16 bg-red-950/50 border border-red-800/80 rounded-full flex items-center justify-center mx-auto text-red-500">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne' }}>Access Denied</h1>
        <p className="text-sm text-slate-400">
          Your active user role does not possess the permissions required to access this system configuration section.
        </p>
        <button
          onClick={() => window.location.href = '/'}
          className="px-4 py-2.5 bg-[#E31E24] hover:bg-[#d4183d] text-white rounded-xl text-xs font-bold transition-all"
          style={{ fontFamily: 'Syne' }}
        >
          Return to Dashboard
        </button>
      </div>
    </div>
  );
}

export const router = createBrowserRouter([
  {
    path: "/login",
    Component: Login,
  },
  {
    path: "/unauthorized",
    Component: Unauthorized,
  },
  {
    path: "/",
    Component: ProtectedLayout,
    children: [
      {
        index: true,
        Component: InvestigationDashboard,
      },
      {
        path: "graph",
        Component: FundFlowGraph,
      },
      {
        path: "str-generation",
        Component: STRGeneration,
      },
      {
        path: "entity/:accountId",
        Component: EntityProfile,
      },
      {
        path: "analytics",
        Component: AnalyticsDashboard,
      },
      {
        path: "mobile",
        Component: MobileAlert,
      },
      {
        path: "admin",
        Component: AdminGuard,
      },
      {
        path: "blockchain",
        Component: BlockchainAudit,
      },
      {
        path: "query",
        Component: NLQuery,
      },
    ],
  },
]);