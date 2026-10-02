import { useMutation } from "@tanstack/react-query";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { askAdvisor } from "../api/advisor";
import { extractErrorMessage } from "../api/client";
import type { AdvisorResponse, ChatTurn } from "../types";

export type Turn =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string; result: AdvisorResponse | null };

// The server accepts at most 12 turns per request, so only the most recent
// ones are sent; the conversation on screen can be as long as it likes.
const HISTORY_WINDOW = 11;
// Keep the stored copy small.
const STORED_TURNS = 20;
const STORAGE_KEY = "autotrust_chat_v1";

interface AdvisorChat {
  turns: Turn[];
  pending: boolean;
  error: string | null;
  /** Whether the floating chat window is open. */
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Text in the message box; refilled when a send fails so nothing is lost. */
  draft: string;
  setDraft: (text: string) => void;
  send: (text: string) => void;
  reset: () => void;
}

const AdvisorChatContext = createContext<AdvisorChat | null>(null);

function loadStored(): { turns: Turn[]; open: boolean } {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.turns)) return { turns: parsed.turns, open: parsed.open === true };
    }
  } catch {
    // storage unavailable or corrupted — start fresh
  }
  return { turns: [], open: false };
}

/** Holds the one conversation shared by the floating chat window and the
 * full-page view, so it carries across navigation and a refresh (for the
 * lifetime of the browser tab). */
export function AdvisorChatProvider({ children }: { children: ReactNode }) {
  const [stored] = useState(loadStored);
  const [turns, setTurns] = useState<Turn[]>(stored.turns);
  const [open, setOpen] = useState(stored.open);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ turns: turns.slice(-STORED_TURNS), open }),
      );
    } catch {
      // ignore — persistence is a convenience only
    }
  }, [turns, open]);

  const mutation = useMutation({
    mutationFn: ({ history }: { history: ChatTurn[]; text: string }) => askAdvisor(history),
    onSuccess: (data) => {
      setTurns((t) => [...t, { role: "assistant", content: data.reply ?? "", result: data }]);
    },
    onError: (err, vars) => {
      // Take the message back out of the thread and into the box.
      setTurns((t) => t.slice(0, -1));
      setDraft(vars.text);
      setError(extractErrorMessage(err));
    },
  });

  function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || mutation.isPending) return;

    // Replies from the "unavailable" fallback have no real content to send back.
    const previous = turns.flatMap((t): ChatTurn[] =>
      t.role === "user"
        ? [{ role: "user", content: t.content }]
        : t.result?.ai_available && t.content
          ? [{ role: "assistant", content: t.content }]
          : [],
    );
    const newest: ChatTurn = { role: "user", content: trimmed };
    const history = [...previous, newest].slice(-HISTORY_WINDOW);

    setError(null);
    setDraft("");
    setTurns((t) => [...t, { role: "user", content: trimmed }]);
    mutation.mutate({ history, text: trimmed });
  }

  function reset() {
    setTurns([]);
    setError(null);
    setDraft("");
  }

  return (
    <AdvisorChatContext.Provider
      value={{
        turns,
        pending: mutation.isPending,
        error,
        open,
        setOpen,
        draft,
        setDraft,
        send,
        reset,
      }}
    >
      {children}
    </AdvisorChatContext.Provider>
  );
}

export function useAdvisorChat(): AdvisorChat {
  const ctx = useContext(AdvisorChatContext);
  if (!ctx) throw new Error("useAdvisorChat must be used inside <AdvisorChatProvider>");
  return ctx;
}
