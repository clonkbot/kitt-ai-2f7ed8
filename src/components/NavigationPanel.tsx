import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface NavigationPanelProps {
  userName: string;
  showToast: (message: string, type: "error" | "success") => void;
}

interface Location {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

interface SearchResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
}

const KITT_NAV_PROMPTS = [
  "Plotting course for {destination}. Try not to get us pulled over this time, {name}.",
  "Ah, {destination}. Let's hope your driving has improved since our last outing, {name}.",
  "Navigation set to {destination}. I'll be monitoring your speed, {name}. Closely.",
  "Route calculated to {destination}. Don't worry {name}, I'll keep you from getting hopelessly lost.",
  "Setting course for {destination}. {name}, maybe let me handle the driving metaphorically.",
];

export function NavigationPanel({ userName, showToast }: NavigationPanelProps) {
  const savedDestinations = useQuery(api.navigation.listSaved);
  const navHistory = useQuery(api.navigation.getHistory);
  const saveDestination = useMutation(api.navigation.saveDestination);
  const removeDestination = useMutation(api.navigation.removeDestination);
  const addToHistory = useMutation(api.navigation.addToHistory);
  const textToSpeech = useAction(api.ai.textToSpeech);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [isNavigating, setIsNavigating] = useState(false);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCurrentLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error("Geolocation error:", error);
        }
      );
    }
  }, []);

  const pcmToWav = (base64Pcm: string): string => {
    const pcm = Uint8Array.from(atob(base64Pcm), c => c.charCodeAt(0));
    const sampleRate = 24000;
    const header = new ArrayBuffer(44);
    const view = new DataView(header);
    const writeStr = (o: number, s: string) => s.split('').forEach((c, i) => view.setUint8(o + i, c.charCodeAt(0)));
    writeStr(0, 'RIFF'); view.setUint32(4, 36 + pcm.length, true);
    writeStr(8, 'WAVE'); writeStr(12, 'fmt ');
    view.setUint32(16, 16, true); view.setUint16(20, 1, true);
    view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true);
    view.setUint16(34, 16, true); writeStr(36, 'data');
    view.setUint32(40, pcm.length, true);
    const wav = new Uint8Array(44 + pcm.length);
    wav.set(new Uint8Array(header), 0);
    wav.set(pcm, 44);
    return URL.createObjectURL(new Blob([wav], { type: 'audio/wav' }));
  };

  const speakNavigation = async (destination: string) => {
    setIsSpeaking(true);
    try {
      const prompt = KITT_NAV_PROMPTS[Math.floor(Math.random() * KITT_NAV_PROMPTS.length)]
        .replace("{destination}", destination)
        .replace("{name}", userName);

      const base64Pcm = await textToSpeech({ text: prompt, voice: "Charon" });
      if (base64Pcm) {
        const audioUrl = pcmToWav(base64Pcm);
        const audio = new Audio(audioUrl);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        await audio.play();
      } else {
        setIsSpeaking(false);
      }
    } catch (err) {
      console.error("TTS error:", err);
      setIsSpeaking(false);
    }
  };

  const searchLocation = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
      );
      const data: SearchResult[] = await response.json();
      setSearchResults(data);
    } catch (err) {
      console.error("Search error:", err);
      showToast("Search failed. Even the internet is having a bad day.", "error");
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, showToast]);

  const selectLocation = (result: SearchResult) => {
    const nameParts = result.display_name.split(",");
    const location: Location = {
      name: nameParts[0].trim(),
      address: result.display_name,
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
    };
    setSelectedLocation(location);
    setSearchResults([]);
    setSearchQuery("");
  };

  const startNavigation = async () => {
    if (!selectedLocation) return;

    setIsNavigating(true);

    try {
      // Add to history
      await addToHistory({
        destination: selectedLocation.name,
        address: selectedLocation.address,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });

      // Speak navigation announcement
      await speakNavigation(selectedLocation.name);

      // Open in external maps
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${selectedLocation.latitude},${selectedLocation.longitude}`;
      window.open(mapsUrl, "_blank");

      showToast(`Navigation to ${selectedLocation.name} started!`, "success");
    } catch (err) {
      showToast("Navigation failed. My circuits must be scrambled.", "error");
    } finally {
      setIsNavigating(false);
    }
  };

  const handleSaveDestination = async () => {
    if (!selectedLocation) return;

    try {
      await saveDestination({
        name: selectedLocation.name,
        address: selectedLocation.address,
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });
      showToast("Location saved. You're welcome.", "success");
    } catch (err) {
      showToast("Failed to save. Memory banks overloaded.", "error");
    }
  };

  const handleRemoveDestination = async (id: Id<"destinations">) => {
    try {
      await removeDestination({ id });
      showToast("Removed from favorites.", "success");
    } catch (err) {
      showToast("Removal failed.", "error");
    }
  };

  const quickNavigate = async (location: Location) => {
    setSelectedLocation(location);
    setIsNavigating(true);

    try {
      await addToHistory({
        destination: location.name,
        address: location.address,
        latitude: location.latitude,
        longitude: location.longitude,
      });

      await speakNavigation(location.name);

      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${location.latitude},${location.longitude}`;
      window.open(mapsUrl, "_blank");
    } catch (err) {
      showToast("Navigation failed.", "error");
    } finally {
      setIsNavigating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Search & Selected Location */}
        <div className="space-y-4">
          {/* Search box */}
          <div className="bg-gradient-to-b from-gray-900/80 to-gray-950/80 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-sm p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <h3 className="font-bold text-sm md:text-base">SEARCH DESTINATION</h3>
            </div>

            <div className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && searchLocation()}
                placeholder="Where to, boss?"
                className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 text-white text-sm focus:outline-none focus:border-red-500 transition-colors placeholder-gray-500"
              />
              <button
                onClick={searchLocation}
                disabled={isSearching || !searchQuery.trim()}
                className="px-4 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all disabled:opacity-50"
              >
                {isSearching ? (
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Search results */}
            {searchResults.length > 0 && (
              <div className="mt-3 space-y-2">
                {searchResults.map((result) => (
                  <button
                    key={result.place_id}
                    onClick={() => selectLocation(result)}
                    className="w-full text-left bg-gray-800/50 hover:bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 transition-colors group"
                  >
                    <p className="text-sm text-white group-hover:text-red-400 transition-colors line-clamp-1">
                      {result.display_name.split(",")[0]}
                    </p>
                    <p className="text-xs text-gray-500 line-clamp-1">
                      {result.display_name}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected destination */}
          {selectedLocation && (
            <div className="bg-gradient-to-b from-gray-900/80 to-gray-950/80 rounded-2xl border border-red-600/30 shadow-2xl backdrop-blur-sm p-4 md:p-6">
              <div className="flex items-center gap-2 mb-4">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <h3 className="font-bold text-sm md:text-base">SELECTED DESTINATION</h3>
              </div>

              <div className="mb-4">
                <p className="text-lg font-semibold text-white">{selectedLocation.name}</p>
                <p className="text-sm text-gray-400 line-clamp-2">{selectedLocation.address}</p>
                <p className="text-xs text-gray-600 mt-1 font-mono">
                  {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={startNavigation}
                  disabled={isNavigating || isSpeaking}
                  className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isNavigating || isSpeaking ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <span>PLOTTING...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      <span>NAVIGATE</span>
                    </>
                  )}
                </button>
                <button
                  onClick={handleSaveDestination}
                  className="p-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all border border-gray-700"
                  title="Save location"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Current location */}
          {currentLocation && (
            <div className="bg-gray-900/50 rounded-xl border border-gray-800 p-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                <span className="text-xs text-gray-400">YOUR LOCATION</span>
              </div>
              <p className="text-xs text-gray-500 font-mono mt-1">
                {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
              </p>
            </div>
          )}
        </div>

        {/* Saved & History */}
        <div className="space-y-4">
          {/* Saved destinations */}
          <div className="bg-gradient-to-b from-gray-900/80 to-gray-950/80 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-sm p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
              </svg>
              <h3 className="font-bold text-sm md:text-base">SAVED LOCATIONS</h3>
            </div>

            {savedDestinations === undefined ? (
              <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
            ) : savedDestinations.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No saved locations yet. {userName}, you need to get out more.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {savedDestinations.map((dest: { _id: Id<"destinations">; name: string; address: string; latitude: number; longitude: number }) => (
                  <div
                    key={dest._id}
                    className="flex items-center gap-2 bg-gray-800/50 rounded-lg p-3 group"
                  >
                    <button
                      onClick={() => quickNavigate({
                        name: dest.name,
                        address: dest.address,
                        latitude: dest.latitude,
                        longitude: dest.longitude,
                      })}
                      className="flex-1 text-left"
                    >
                      <p className="text-sm text-white group-hover:text-red-400 transition-colors">
                        {dest.name}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-1">{dest.address}</p>
                    </button>
                    <button
                      onClick={() => handleRemoveDestination(dest._id)}
                      className="p-2 text-gray-600 hover:text-red-500 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Navigation history */}
          <div className="bg-gradient-to-b from-gray-900/80 to-gray-950/80 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-sm p-4 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-bold text-sm md:text-base">RECENT TRIPS</h3>
            </div>

            {navHistory === undefined ? (
              <div className="text-gray-500 text-sm animate-pulse">Loading...</div>
            ) : navHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">
                No navigation history. Go somewhere interesting, {userName}.
              </p>
            ) : (
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {navHistory.map((trip: { _id: string; destination: string; address: string; latitude: number; longitude: number; createdAt: number }) => (
                  <button
                    key={trip._id}
                    onClick={() => quickNavigate({
                      name: trip.destination,
                      address: trip.address,
                      latitude: trip.latitude,
                      longitude: trip.longitude,
                    })}
                    className="w-full flex items-center gap-3 bg-gray-800/30 hover:bg-gray-800/50 rounded-lg p-3 transition-colors text-left group"
                  >
                    <svg className="w-4 h-4 text-gray-600 group-hover:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-white group-hover:text-red-400 transition-colors truncate">
                        {trip.destination}
                      </p>
                      <p className="text-[10px] text-gray-600">
                        {new Date(trip.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Speaking indicator */}
      {isSpeaking && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-gray-900 border border-red-600/50 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg shadow-red-500/20">
          <div className="flex items-center gap-1">
            <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" />
            <div className="w-1 h-5 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "100ms" }} />
            <div className="w-1 h-4 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "200ms" }} />
            <div className="w-1 h-6 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            <div className="w-1 h-3 bg-red-500 rounded-full animate-pulse" style={{ animationDelay: "400ms" }} />
          </div>
          <span className="text-xs text-red-400 font-medium">SPEAKING</span>
        </div>
      )}
    </div>
  );
}
