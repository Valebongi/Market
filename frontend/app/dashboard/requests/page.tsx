"use client";

import { useState, useEffect, useRef } from "react";
import Avatar from "@/components/ui/Avatar";
import { RequestStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Send, CheckCircle, XCircle, ArrowLeft } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { requestsService as requestsApi } from "@/services/requests.service";
import { usersService as usersApi } from "@/services/users.service";
import DealClosureModal, { type DealClosureData } from "@/components/ui/DealClosureModal";

interface Thread {
  id: string;
  assetId: string;
  assetTitle: string;
  requesterId: string;
  ownerId: string;
  status: string;
  lastMessage?: string;
  lastMessageAt: string;
}

interface Message {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
}

const FILTER_OPTIONS = ["Todas", "Pendientes", "Activas", "Cerradas"] as const;
type Filter = (typeof FILTER_OPTIONS)[number];

export default function RequestsPage() {
  const { user } = useAuth();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true);
  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [filter, setFilter] = useState<Filter>("Todas");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [actioning, setActioning] = useState(false);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [showDealModal, setShowDealModal] = useState(false);
  const [showMobileConversation, setShowMobileConversation] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load thread list once
  useEffect(() => {
    requestsApi.list("all")
      .then((res) => {
        const mapped: Thread[] = (res.data || []).map((r: any) => ({
          id: r.id,
          assetId: r.assetId,
          assetTitle: r.assetTitle || `Activo ${r.assetId?.slice(0, 6)}`,
          requesterId: r.requesterId,
          ownerId: r.ownerId,
          status: r.status,
          lastMessage: r.messages?.[0]?.content || r.initialMessage || "",
          lastMessageAt: r.updatedAt || r.createdAt,
        }));
        setThreads(mapped);
        if (mapped.length > 0) setActiveThreadId(mapped[0].id);

        // Fetch profiles for all unique participants (excluding self)
        const uniqueIds = [...new Set(
          mapped.flatMap((t) => [t.requesterId, t.ownerId])
        )];
        uniqueIds.forEach((id) => {
          usersApi.getProfile(id)
            .then((p) => {
              if (p?.displayName) {
                setProfiles((prev) => ({ ...prev, [id]: p.displayName }));
              }
            })
            .catch(() => {});
        });
      })
      .catch((err) => {
        console.error("Error cargando solicitudes:", err);
        setThreads([]);
      })
      .finally(() => setLoadingThreads(false));
  }, []);

  // Load conversation when thread changes
  useEffect(() => {
    if (!activeThreadId || !user) return;
    setLoadingMessages(true);
    requestsApi.get(activeThreadId)
      .then((req) => {
        let msgs: Message[] = (req.messages || []).map((m: any) => ({
          id: m.id,
          senderId: m.senderId,
          content: m.content,
          createdAt: m.createdAt,
        }));
        // Fallback: if no messages but initialMessage exists, synthesise the first message
        if (msgs.length === 0 && req.initialMessage) {
          msgs = [{
            id: req.id + "_init",
            senderId: req.requesterId,
            content: req.initialMessage,
            createdAt: req.createdAt,
          }];
        }
        setMessages(msgs);
        // Sync status
        setThreads((prev) =>
          prev.map((t) => (t.id === activeThreadId ? { ...t, status: req.status } : t))
        );
      })
      .catch(() => setMessages([]))
      .finally(() => setLoadingMessages(false));
  }, [activeThreadId, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const getName = (userId: string, fallback: string) =>
    profiles[userId] || fallback;

  const handleSend = async () => {
    if (!message.trim() || !activeThreadId || !user) return;
    const content = message;
    setMessage("");
    setSending(true);
    try {
      const sent = await requestsApi.sendMessage(activeThreadId, content);
      setMessages((prev) => [
        ...prev,
        { id: sent.id, senderId: user.id, content: sent.content, createdAt: sent.createdAt },
      ]);
      setThreads((prev) =>
        prev.map((t) =>
          t.id === activeThreadId ? { ...t, lastMessage: content, lastMessageAt: sent.createdAt } : t
        )
      );
    } catch {
      setMessage(content); // Restore message on error
    } finally {
      setSending(false);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    if (!activeThreadId) return;
    // Show deal closure modal before finalizing rejected/closed status
    if (status === "rejected" || status === "closed") {
      setPendingStatus(status);
      setShowDealModal(true);
      return;
    }
    setActioning(true);
    try {
      await requestsApi.updateStatus(activeThreadId, status);
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, status } : t))
      );
    } finally {
      setActioning(false);
    }
  };

  const handleDealClosure = async (data: DealClosureData) => {
    if (!activeThreadId || !pendingStatus) return;
    setShowDealModal(false);
    setActioning(true);
    try {
      // Finalize the status change
      await requestsApi.updateStatus(activeThreadId, pendingStatus);
      // Send a system message summarising the outcome
      const summary = data.agreed
        ? `✅ Acuerdo cerrado${data.licenseType ? ` — Licencia ${data.licenseType}` : ""}${data.estimatedValue ? ` — ${data.currency} ${data.estimatedValue.toLocaleString()}` : ""}${data.notes ? `\n${data.notes}` : ""}`
        : `❌ Sin acuerdo${data.notes ? ` — ${data.notes}` : ""}`;
      await requestsApi.sendMessage(activeThreadId, summary);
      setMessages((prev) => [
        ...prev,
        {
          id: `closure_${Date.now()}`,
          senderId: user?.id || "",
          content: summary,
          createdAt: new Date().toISOString(),
        },
      ]);
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, status: pendingStatus } : t))
      );
    } finally {
      setActioning(false);
      setPendingStatus(null);
    }
  };

  const handleSkipDealClosure = async () => {
    if (!activeThreadId || !pendingStatus) return;
    setShowDealModal(false);
    setActioning(true);
    try {
      await requestsApi.updateStatus(activeThreadId, pendingStatus);
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, status: pendingStatus } : t))
      );
    } finally {
      setActioning(false);
      setPendingStatus(null);
    }
  };

  const filteredThreads = threads.filter((t) => {
    if (filter === "Pendientes") return t.status === "pending";
    if (filter === "Activas") return t.status === "accepted";
    if (filter === "Cerradas") return t.status === "rejected" || t.status === "closed";
    return true;
  });

  const currentThread = threads.find((t) => t.id === activeThreadId);
  const isOwner = currentThread && user?.id === currentThread.ownerId;

  const mapStatus = (s: string): "pending" | "accepted" | "rejected" => {
    if (s === "accepted") return "accepted";
    if (s === "rejected" || s === "closed") return "rejected";
    return "pending";
  };

  // The "other" user in the current conversation
  const otherUserId = currentThread
    ? isOwner ? currentThread.requesterId : currentThread.ownerId
    : null;
  const otherUserName = otherUserId
    ? getName(otherUserId, isOwner ? "Emprendedor" : "Titular")
    : "Usuario";

  const isClosed = currentThread?.status === "rejected" || currentThread?.status === "closed";

  return (
    <div className="flex h-full overflow-hidden">
      {/* LEFT: Thread list — full width on mobile when no conversation open */}
      <div className={cn(
        "border-r border-fog-gray dark:border-white/10 flex flex-col bg-white dark:bg-gray-900 shrink-0",
        "w-full md:w-80",
        showMobileConversation ? "hidden md:flex" : "flex"
      )}>
        <div className="p-4 border-b border-fog-gray dark:border-white/10">
          <h2 className="text-lg font-semibold text-carbon-gray dark:text-gray-100">Mensajes</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as Filter)}
            className="mt-2 w-full h-8 px-3 border border-fog-gray dark:border-white/10 rounded-lg text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-200 focus:outline-none"
          >
            {FILTER_OPTIONS.map((f) => <option key={f}>{f}</option>)}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingThreads ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-fog-gray dark:bg-white/5 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredThreads.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-sm text-slate-gray dark:text-gray-400">No hay conversaciones</p>
            </div>
          ) : (
            filteredThreads.map((thread) => {
              const otherId = user?.id === thread.ownerId ? thread.requesterId : thread.ownerId;
              const otherName = getName(otherId, user?.id === thread.ownerId ? "Emprendedor" : "Titular");
              return (
                <button
                  key={thread.id}
                  onClick={() => { setActiveThreadId(thread.id); setShowMobileConversation(true); }}
                  className={cn(
                    "w-full flex items-start gap-3 p-4 border-b border-fog-gray dark:border-white/10 text-left hover:bg-snow-gray dark:hover:bg-white/5 transition-colors",
                    activeThreadId === thread.id && "bg-snow-gray dark:bg-white/5 border-l-[3px] border-l-electric-blue dark:border-l-blue-400"
                  )}
                >
                  <Avatar name={otherName} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-carbon-gray dark:text-gray-200 truncate">{otherName}</p>
                      <span className="text-xs text-slate-gray dark:text-gray-500 shrink-0">{formatRelativeTime(thread.lastMessageAt)}</span>
                    </div>
                    <p className="text-xs text-slate-gray dark:text-gray-400 truncate mt-0.5">{thread.assetTitle}</p>
                    <p className="text-xs text-slate-gray dark:text-gray-500 truncate mt-0.5">{thread.lastMessage}</p>
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT: Conversation — full width on mobile when open */}
      {currentThread ? (
        <div className={cn(
          "flex-1 flex flex-col min-w-0 bg-white dark:bg-[#0d1117]",
          showMobileConversation ? "flex" : "hidden md:flex"
        )}>
          {/* Header */}
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-fog-gray dark:border-white/10 flex items-center gap-3">
            {/* Mobile back button */}
            <button
              onClick={() => setShowMobileConversation(false)}
              className="md:hidden p-1.5 -ml-1 rounded-lg text-slate-gray hover:text-carbon-gray hover:bg-snow-gray transition-colors"
              aria-label="Volver a mensajes"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="flex flex-1 items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar name={otherUserName} size="sm" />
              <div>
                <p className="font-semibold text-carbon-gray dark:text-gray-100">{otherUserName}</p>
                <p className="text-xs text-slate-gray dark:text-gray-400">
                  Solicitud para{" "}
                  <span className="text-electric-blue dark:text-blue-400">{currentThread.assetTitle}</span>
                </p>
              </div>
            </div>
            <RequestStatusBadge status={mapStatus(currentThread.status)} />
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {loadingMessages ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className={cn("h-12 bg-fog-gray dark:bg-white/5 rounded-xl animate-pulse", i % 2 === 0 ? "ml-auto w-2/3" : "w-2/3")} />
                ))}
              </div>
            ) : messages.length === 0 ? (
              <p className="text-sm text-slate-gray dark:text-gray-400 text-center">No hay mensajes aún.</p>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === user?.id;
                const senderName = isMe
                  ? (user?.profile?.displayName || getName(user?.id || "", "Yo"))
                  : otherUserName;
                return (
                  <div key={msg.id} className={cn("flex items-start gap-2.5", isMe && "flex-row-reverse")}>
                    <Avatar name={senderName} size="sm" />
                    <div className="max-w-[70%]">
                      <div className={cn(
                        "px-4 py-3 rounded-2xl text-sm leading-relaxed",
                        isMe
                          ? "bg-blue-50 dark:bg-blue-950/50 text-carbon-gray dark:text-gray-100 rounded-tr-none"
                          : "bg-snow-gray dark:bg-gray-800 text-carbon-gray dark:text-gray-100 rounded-tl-none"
                      )}>
                        {msg.content}
                      </div>
                      <p className={cn("text-xs text-slate-gray dark:text-gray-500 mt-1", isMe && "text-right")}>
                        {formatRelativeTime(msg.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Owner quick actions for pending requests */}
          {currentThread.status === "pending" && isOwner && (
            <div className="px-6 py-3 border-t border-fog-gray dark:border-white/10 bg-snow-gray dark:bg-gray-900 flex gap-2">
              <Button
                variant="success"
                size="sm"
                icon={<CheckCircle className="h-4 w-4" />}
                loading={actioning}
                onClick={() => handleUpdateStatus("accepted")}
              >
                Aceptar solicitud
              </Button>
              <Button
                variant="ghost"
                size="sm"
                icon={<XCircle className="h-4 w-4" />}
                loading={actioning}
                onClick={() => handleUpdateStatus("rejected")}
              >
                Rechazar
              </Button>
            </div>
          )}

          {/* Close conversation button for accepted threads */}
          {currentThread.status === "accepted" && isOwner && (
            <div className="px-6 py-2 border-t border-fog-gray dark:border-white/10 bg-snow-gray dark:bg-gray-900 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                loading={actioning}
                onClick={() => handleUpdateStatus("closed")}
                className="text-slate-gray dark:text-gray-400 hover:text-soft-coral"
              >
                Cerrar conversación
              </Button>
            </div>
          )}

          {/* Message Composer */}
          {!isClosed ? (
            <div className="px-6 py-4 border-t border-fog-gray dark:border-white/10">
              <div className="flex items-end gap-3">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Escribí un mensaje..."
                  rows={2}
                  maxLength={1000}
                  className="flex-1 px-4 py-3 border border-fog-gray dark:border-white/10 rounded-xl text-sm bg-white dark:bg-gray-800 text-carbon-gray dark:text-gray-100 placeholder:text-slate-gray dark:placeholder:text-gray-500 focus:outline-none focus:border-electric-blue dark:focus:border-blue-500 resize-none transition-colors"
                />
                <Button
                  onClick={handleSend}
                  icon={<Send className="h-4 w-4" />}
                  disabled={!message.trim()}
                  loading={sending}
                >
                  Enviar
                </Button>
              </div>
            </div>
          ) : (
            <div className="px-6 py-4 border-t border-fog-gray dark:border-white/10 bg-snow-gray dark:bg-gray-900">
              <p className="text-sm text-slate-gray dark:text-gray-400 text-center">Esta conversación está cerrada.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="hidden md:flex flex-1 items-center justify-center bg-snow-gray dark:bg-[#0d1117]">
          <div className="text-center">
            <p className="text-4xl mb-4">💬</p>
            <p className="font-semibold text-carbon-gray dark:text-gray-100">No hay conversación seleccionada</p>
            <p className="text-sm text-slate-gray dark:text-gray-400 mt-1">Seleccioná un mensaje para comenzar</p>
          </div>
        </div>
      )}

      {/* Deal Closure Modal */}
      {showDealModal && currentThread && (
        <DealClosureModal
          assetTitle={currentThread.assetTitle}
          counterpartName={otherUserName}
          onConfirm={handleDealClosure}
          onSkip={handleSkipDealClosure}
        />
      )}
    </div>
  );
}
