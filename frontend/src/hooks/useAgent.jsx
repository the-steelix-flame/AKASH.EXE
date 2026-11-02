import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

// Lets any level make the flying Akash companion say something short ("Say it now!").
// Messages are transient; narration captions (from the audio player) are shown by the agent on their own.
const ActionsCtx = createContext({ say: () => {}, hush: () => {} });
const MessageCtx = createContext(null);

export function AgentProvider({ children }) {
  const [message, setMessage] = useState(null); // {id, text, mood}
  const timer = useRef(null);
  const seq = useRef(0);

  const say = useCallback((text, opts = {}) => {
    clearTimeout(timer.current);
    seq.current += 1;
    setMessage({ id: seq.current, text, mood: opts.mood || null });
    timer.current = setTimeout(() => setMessage(null), opts.ms ?? 3800);
  }, []);
  const hush = useCallback(() => { clearTimeout(timer.current); setMessage(null); }, []);

  const actions = useMemo(() => ({ say, hush }), [say, hush]);
  return (
    <ActionsCtx.Provider value={actions}>
      <MessageCtx.Provider value={message}>{children}</MessageCtx.Provider>
    </ActionsCtx.Provider>
  );
}

export const useAgentActions = () => useContext(ActionsCtx);
export const useAgentMessage = () => useContext(MessageCtx);
