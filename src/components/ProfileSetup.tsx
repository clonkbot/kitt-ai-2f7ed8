import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { KittVisualizer } from "./KittVisualizer";

export function ProfileSetup() {
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const createProfile = useMutation(api.profiles.create);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    try {
      await createProfile({ name: name.trim() });
    } catch (err) {
      console.error("Failed to create profile:", err);
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

      <div className="relative z-10 w-full max-w-md">
        {/* KITT Visualizer */}
        <div className="flex justify-center mb-8">
          <KittVisualizer />
        </div>

        {/* Setup form */}
        <div className="bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-6 md:p-8 border border-gray-800 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-2">OPERATOR IDENTIFICATION</h2>
            <p className="text-gray-500 text-sm">
              Greetings, new arrival. What should I call you? And please, make it something I can pronounce without cringing.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs text-gray-400 mb-2 tracking-wider">YOUR NAME</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-500 transition-colors text-lg"
                placeholder="Enter your name..."
                autoFocus
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 rounded-lg transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  INITIALIZING...
                </span>
              ) : (
                "CONFIRM IDENTITY"
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-[10px] text-gray-600 mt-8 tracking-widest">
          Requested by <span className="text-gray-500">@LBallz77283</span> · Built by <span className="text-gray-500">@clonkbot</span>
        </p>
      </div>
    </div>
  );
}
