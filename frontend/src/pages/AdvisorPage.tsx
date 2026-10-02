import { ChatWindow, SparkIcon } from "../components/ChatWindow";
import { useAdvisorChat } from "../context/AdvisorChatContext";

/** The same chat as the floating window, full size. */
export function AdvisorPage() {
  const { turns, reset } = useAdvisorChat();

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-brand-600">
            <SparkIcon />
            <span className="text-sm font-semibold uppercase tracking-wide">AutoTrust AI Assistant</span>
          </div>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Find the right car, by chatting
          </h1>
        </div>
        {turns.length > 0 && (
          <button
            onClick={reset}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            New chat
          </button>
        )}
      </div>

      <div className="mt-5 h-[calc(100vh-14rem)] min-h-[24rem] overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
        <ChatWindow />
      </div>
    </div>
  );
}
