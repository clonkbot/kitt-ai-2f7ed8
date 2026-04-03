import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { KittVisualizer } from "./KittVisualizer";

export function AuthScreen() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("email", email);
      formData.append("password", password);
      formData.append("flow", flow);
      await signIn("password", formData);
    } catch (err) {
      setError(flow === "signIn" ? "Invalid credentials. Try again, human." : "Registration failed. Perhaps try a stronger password?");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAnonymous = async () => {
    setIsLoading(true);
    try {
      await signIn("anonymous");
    } catch (err) {
      setError("Anonymous access denied. The universe is conspiring against you.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-gray-950 to-black" />
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-red-900/40 via-transparent to-transparent" />
      </div>

      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }}
      />

      <div className="relative z-10 w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-block mb-6">
            <KittVisualizer />
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-red-400 via-red-500 to-orange-500 bg-clip-text text-transparent">
            K.I.T.T.
          </h1>
          <p className="text-xs text-gray-500 tracking-[0.3em] uppercase mt-2">
            Knight Industries Two Thousand
          </p>
        </div>

        {/* Auth form */}
        <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-6 md:p-8 border border-gray-800 shadow-2xl">
          <h2 className="text-xl font-bold text-center mb-6">
            {flow === "signIn" ? "OPERATOR AUTHENTICATION" : "NEW OPERATOR REGISTRATION"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-2 tracking-wider">EMAIL ADDRESS</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
                placeholder="operator@knightindustries.com"
                required
              />
            </div>

            <div>
              <label className="block text-xs text-gray-400 mb-2 tracking-wider">ACCESS CODE</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors font-mono"
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg px-4 py-3 text-red-400 text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  PROCESSING...
                </span>
              ) : flow === "signIn" ? (
                "AUTHENTICATE"
              ) : (
                "REGISTER"
              )}
            </button>
          </form>

          <div className="mt-6 flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-800" />
            <span className="text-xs text-gray-600">OR</span>
            <div className="flex-1 h-px bg-gray-800" />
          </div>

          <button
            onClick={handleAnonymous}
            disabled={isLoading}
            className="w-full mt-4 bg-gray-800 hover:bg-gray-700 text-gray-300 font-semibold py-3 rounded-lg transition-all border border-gray-700 disabled:opacity-50"
          >
            CONTINUE AS GUEST
          </button>

          <p className="text-center mt-6 text-sm text-gray-500">
            {flow === "signIn" ? "Need access credentials?" : "Already registered?"}{" "}
            <button
              type="button"
              onClick={() => setFlow(flow === "signIn" ? "signUp" : "signIn")}
              className="text-red-500 hover:text-red-400 font-semibold"
            >
              {flow === "signIn" ? "Register here" : "Sign in"}
            </button>
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-600 mt-8 tracking-widest">
          Requested by <span className="text-gray-500">@LBallz77283</span> · Built by <span className="text-gray-500">@clonkbot</span>
        </p>
      </div>
    </div>
  );
}
