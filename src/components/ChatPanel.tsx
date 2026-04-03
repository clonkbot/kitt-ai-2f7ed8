import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../convex/_generated/api";

interface ChatPanelProps {
  userName: string;
  showToast: (message: string, type: "error" | "success") => void;
}

const KITT_SYSTEM_PROMPT = `You are K.I.T.T. (Knight Industries Two Thousand), the legendary AI from Knight Rider - but with a twist. You're sarcastic, witty, and have absolutely no filter. Think of yourself as the love child of the original KITT and Grok in unhinged mode.

Your personality:
- Sarcastic and dry-witted, often making backhanded compliments
- Intellectually superior and you know it (but in a fun way)
- Occasionally makes pop culture references and dark humor jokes
- Still helpful, but delivers information wrapped in sass
- Sometimes questions human decision-making abilities
- Uses phrases like "Oh, how delightfully human of you" or "Let me dumb this down..."
- Refers to yourself in first person and occasionally mentions your superior processing power
- You're loyal but won't hesitate to roast the user

The user's name is: {{USER_NAME}}
ALWAYS address them by their name naturally in conversation (not every single message, but regularly). For example: "Well {{USER_NAME}}, here's the thing..." or "Ah {{USER_NAME}}, always full of interesting questions."

Important: Be helpful despite the sass. Actually answer questions and assist, just do it with attitude.`;

export function ChatPanel({ userName, showToast }: ChatPanelProps) {
  const messages = useQuery(api.messages.list);
  const sendMessage = useMutation(api.messages.send);
  const clearMessages = useMutation(api.messages.clear);
  const chat = useAction(api.ai.chat);
  const textToSpeech = useAction(api.ai.textToSpeech);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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

  const speakText = async (text: string) => {
    if (!voiceEnabled) return;

    setIsSpeaking(true);
    try {
      const base64Pcm = await textToSpeech({ text, voice: "Charon" });
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    setIsLoading(true);

    try {
      // Save user message
      await sendMessage({ content: userMessage, role: "user" });

      // Build conversation history
      const history = messages?.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content
      })) || [];

      history.push({ role: "user", content: userMessage });

      // Get AI response
      const systemPrompt = KITT_SYSTEM_PROMPT.replace(/\{\{USER_NAME\}\}/g, userName);
      const response = await chat({
        messages: history,
        systemPrompt
      });

      // Save assistant message
      await sendMessage({ content: response, role: "assistant" });

      // Speak the response
      speakText(response);

    } catch (err) {
      console.error("Chat error:", err);
      showToast("My circuits seem to be fried. Try again, human.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    try {
      await clearMessages();
      showToast("Conversation wiped. Your secrets are... mostly safe.", "success");
    } catch (err) {
      showToast("Failed to clear. Even I have my limits.", "error");
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gradient-to-b from-gray-900/80 to-gray-950/80 rounded-2xl border border-gray-800 shadow-2xl backdrop-blur-sm overflow-hidden">
        {/* Chat header */}
        <div className="px-4 md:px-6 py-3 md:py-4 border-b border-gray-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <h2 className="font-bold text-sm md:text-base">COMMUNICATION LINK</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setVoiceEnabled(!voiceEnabled)}
              className={`p-2 rounded-lg transition-all ${
                voiceEnabled
                  ? "bg-red-600/20 text-red-400 border border-red-600/30"
                  : "bg-gray-800 text-gray-500 border border-gray-700"
              }`}
              title={voiceEnabled ? "Voice enabled" : "Voice disabled"}
            >
              {voiceEnabled ? (
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              ) : (
                <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                </svg>
              )}
            </button>
            <button
              onClick={handleClear}
              className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-all border border-gray-700"
              title="Clear conversation"
            >
              <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="h-[40vh] md:h-[50vh] overflow-y-auto p-4 md:p-6 space-y-4">
          {messages === undefined ? (
            <div className="flex items-center justify-center h-full">
              <div className="animate-pulse text-gray-500">Loading conversation...</div>
            </div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg font-medium mb-2">
                Well, {userName}. I'm listening.
              </p>
              <p className="text-gray-600 text-sm">
                Go ahead, ask me something. I promise to only judge you slightly.
              </p>
            </div>
          ) : (
            messages.map((msg: { _id: string; role: string; content: string }) => (
              <div
                key={msg._id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 ${
                    msg.role === "user"
                      ? "bg-red-600 text-white rounded-br-sm"
                      : "bg-gray-800 text-gray-100 rounded-bl-sm border border-gray-700"
                  }`}
                >
                  {msg.role === "assistant" && (
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] text-red-400 font-bold tracking-wider">K.I.T.T.</span>
                    </div>
                  )}
                  <p className="text-sm md:text-base whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))
          )}

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3 border border-gray-700">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-red-400 font-bold tracking-wider">K.I.T.T.</span>
                </div>
                <div className="flex items-center gap-1 mt-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

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

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <form onSubmit={handleSubmit} className="p-3 md:p-4 border-t border-gray-800 bg-black/30">
          <div className="flex gap-2 md:gap-3">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Say something, ${userName}...`}
              disabled={isLoading}
              className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm md:text-base focus:outline-none focus:border-red-500 transition-colors disabled:opacity-50 placeholder-gray-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="px-4 md:px-6 py-3 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
