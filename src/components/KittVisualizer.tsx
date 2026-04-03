import { useState, useEffect } from "react";

export function KittVisualizer() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const barCount = 15;

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveIndex((prev) => {
        const next = prev + direction;
        if (next >= barCount - 1) {
          setDirection(-1);
          return barCount - 1;
        }
        if (next <= 0) {
          setDirection(1);
          return 0;
        }
        return next;
      });
    }, 60);

    return () => clearInterval(interval);
  }, [direction]);

  return (
    <div className="relative">
      {/* Outer glow */}
      <div className="absolute -inset-4 bg-red-600/10 blur-2xl rounded-full" />

      {/* Main housing */}
      <div className="relative bg-gradient-to-b from-gray-800 to-gray-900 rounded-2xl p-3 md:p-4 border border-gray-700 shadow-2xl">
        {/* Inner bezel */}
        <div className="bg-black rounded-xl p-2 md:p-3 border border-gray-800">
          {/* Scanner area */}
          <div className="flex items-center gap-1 md:gap-1.5 px-2 md:px-4 py-2 md:py-3">
            {Array.from({ length: barCount }).map((_, i) => {
              const distance = Math.abs(i - activeIndex);
              const intensity = Math.max(0, 1 - distance * 0.25);

              return (
                <div
                  key={i}
                  className="w-2 md:w-3 h-6 md:h-10 rounded-sm transition-all duration-75"
                  style={{
                    backgroundColor: intensity > 0
                      ? `rgba(239, 68, 68, ${intensity})`
                      : 'rgba(55, 65, 81, 0.5)',
                    boxShadow: intensity > 0.5
                      ? `0 0 ${10 * intensity}px rgba(239, 68, 68, ${intensity * 0.8})`
                      : 'none',
                    transform: `scaleY(${0.7 + intensity * 0.3})`,
                  }}
                />
              );
            })}
          </div>

          {/* Reflection strip */}
          <div className="mt-1 md:mt-2 h-0.5 md:h-1 bg-gradient-to-r from-transparent via-gray-700 to-transparent rounded-full" />
        </div>

        {/* Status indicators */}
        <div className="flex justify-between mt-2 md:mt-3 px-2">
          <div className="flex items-center gap-1 md:gap-2">
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-green-500 animate-pulse shadow-lg shadow-green-500/50" />
            <span className="text-[8px] md:text-[10px] text-gray-500 font-mono">ONLINE</span>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <span className="text-[8px] md:text-[10px] text-gray-500 font-mono">AI CORE</span>
            <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-red-500 animate-pulse shadow-lg shadow-red-500/50" />
          </div>
        </div>
      </div>

      {/* Bottom accent */}
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-3/4 h-1 bg-gradient-to-r from-transparent via-red-600/50 to-transparent rounded-full blur-sm" />
    </div>
  );
}
