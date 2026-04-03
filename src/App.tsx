import { useConvexAuth, useQuery, useMutation, useAction } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import { useState, useEffect, useRef } from "react";
import { KittVisualizer } from "./components/KittVisualizer";
import { NavigationPanel } from "./components/NavigationPanel";
import { ChatPanel } from "./components/ChatPanel";
import { ProfileSetup } from "./components/ProfileSetup";
import { AuthScreen } from "./components/AuthScreen";
import { Toast } from "./components/Toast";

export default function App() {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const profile = useQuery(api.profiles.get);
  const [activeTab, setActiveTab] = useState<"chat" | "nav">("chat");
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(null);

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  if (profile === undefined) {
    return <LoadingScreen />;
  }

  if (!profile) {
    return <ProfileSetup />;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      {/* Animated background */}
      <div className="fixed inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      <div className="fixed inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/30 via-transparent to-transparent" />
      </div>

      {/* Scanlines effect */}
      <div className="fixed inset-0 pointer-events-none opacity-10 z-50"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.3) 2px, rgba(0,0,0,0.3) 4px)',
          backgroundSize: '100% 4px'
        }}
      />

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col">
        {/* Header */}
        <Header userName={profile.name} activeTab={activeTab} setActiveTab={setActiveTab} />

        {/* KITT Visualizer */}
        <div className="flex justify-center py-4 md:py-8">
          <KittVisualizer />
        </div>

        {/* Main Panel */}
        <div className="flex-1 px-3 md:px-6 pb-20">
          {activeTab === "chat" ? (
            <ChatPanel userName={profile.name} showToast={showToast} />
          ) : (
            <NavigationPanel userName={profile.name} showToast={showToast} />
          )}
        </div>

        {/* Footer */}
        <footer className="fixed bottom-0 left-0 right-0 py-3 text-center bg-gradient-to-t from-black via-black/90 to-transparent">
          <p className="text-[10px] md:text-xs text-gray-600 tracking-widest font-mono">
            Requested by <span className="text-gray-500">@LBallz77283</span> · Built by <span className="text-gray-500">@clonkbot</span>
          </p>
        </footer>
      </div>

      {/* Toast notifications */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

function Header({
  userName,
  activeTab,
  setActiveTab
}: {
  userName: string;
  activeTab: "chat" | "nav";
  setActiveTab: (tab: "chat" | "nav") => void;
}) {
  const { signOut } = useAuthActions();

  return (
    <header className="relative px-4 md:px-8 py-4 md:py-6">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="relative">
            <div className="w-10 h-10 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center shadow-lg shadow-red-500/30">
              <span className="font-black text-lg md:text-2xl tracking-tighter text-white">K</span>
            </div>
            <div className="absolute -inset-1 rounded-full bg-red-500/20 blur-md -z-10 animate-pulse" />
          </div>
          <div className="hidden sm:block">
            <h1 className="font-black text-xl md:text-2xl tracking-tight bg-gradient-to-r from-red-400 via-red-500 to-orange-500 bg-clip-text text-transparent">
              K.I.T.T.
            </h1>
            <p className="text-[10px] md:text-xs text-gray-500 tracking-widest uppercase">
              Knight Industries Two Thousand
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1 md:gap-2 bg-gray-900/50 rounded-full p-1 border border-gray-800">
          <button
            onClick={() => setActiveTab("chat")}
            className={`px-3 md:px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition-all ${
              activeTab === "chat"
                ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            CHAT
          </button>
          <button
            onClick={() => setActiveTab("nav")}
            className={`px-3 md:px-5 py-2 rounded-full text-xs md:text-sm font-semibold transition-all ${
              activeTab === "nav"
                ? "bg-red-600 text-white shadow-lg shadow-red-500/30"
                : "text-gray-400 hover:text-white"
            }`}
          >
            NAV
          </button>
        </div>

        {/* User info */}
        <div className="flex items-center gap-2 md:gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs md:text-sm font-semibold text-white">{userName}</p>
            <p className="text-[10px] text-gray-500">OPERATOR</p>
          </div>
          <button
            onClick={() => signOut()}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors border border-gray-700"
            title="Sign Out"
          >
            <svg className="w-4 h-4 md:w-5 md:h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  );
}

function LoadingScreen() {
  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 rounded-full bg-gradient-to-r from-red-600 to-red-900 animate-ping opacity-20" />
          <div className="relative w-20 h-20 rounded-full bg-gradient-to-br from-red-600 to-red-900 flex items-center justify-center">
            <span className="font-black text-3xl text-white">K</span>
          </div>
        </div>
        <p className="text-gray-500 font-mono text-sm tracking-widest animate-pulse">INITIALIZING...</p>
      </div>
    </div>
  );
}
