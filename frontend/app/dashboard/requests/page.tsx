"use client";

import { useState, useEffect, useRef } from "react";
import Avatar from "@/components/ui/Avatar";
import { RequestStatusBadge } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { cn, formatRelativeTime } from "@/lib/utils";
import { Send, CheckCircle, XCircle, ArrowLeft, AlertCircle, X } from "lucide-react";
import EmptyState from "@/components/ui/EmptyState";
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

/**
 * Cierre de un hilo. `summary` null significa que ya no hay resumen pendiente
 * de enviar: o el usuario omitió registrarlo, o ya se envió y sólo falta el
 * cambio de estado. Se guarda en estado para poder reintentar el paso que falló
 * sin perder lo que el usuario cargó en el modal.
 */
type ThreadClosure = {
  threadId: string;
  status: string;
  summary: string | null;
};

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
  const [closureError, setClosureError] = useState<string | null>(null);
  const [failedClosure, setFailedClosure] = useState<ThreadClosure | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Espejo de activeThreadId para no inyectar el mensaje de cierre en la
  // conversación equivocada si el usuario cambia de hilo mientras el POST vuela.
  const activeThreadIdRef = useRef<string | null>(null);
  activeThreadIdRef.current = activeThreadId;

  // Load thread list once
  useEffect(() => {
    requestsApi.list("all")
      .then((res) => {
        const mapped: Thread[] = (res.data || []).map((r) => ({
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
        let msgs: Message[] = (req.messages || []).map((m) => ({
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
    setClosureError(null);
    setActioning(true);
    try {
      await requestsApi.updateStatus(activeThreadId, status);
      setThreads((prev) =>
        prev.map((t) => (t.id === activeThreadId ? { ...t, status } : t))
      );
      setFailedClosure(null);
    } catch {
      setFailedClosure({ threadId: activeThreadId, status, summary: null });
      setClosureError("No pudimos actualizar el estado de la solicitud. Reintentá en unos segundos.");
    } finally {
      setActioning(false);
    }
  };

  /**
   * Ejecuta el cierre de un hilo en dos pasos, en este orden y no al revés:
   *
   *   1. Se envía el resumen del acuerdo (si lo hay).
   *   2. Recién después se cambia el estado a rejected/closed.
   *
   * El backend rechaza con 403 cualquier mensaje sobre un hilo ya cerrado, así
   * que hacerlo en el orden inverso perdía el resumen SIEMPRE y dejaba la UI a
   * medio actualizar. Si falla el paso 1 el hilo queda abierto a propósito: es
   * la única forma de que el usuario pueda reintentar sin perder el dato.
   */
  const runClosure = async ({ threadId, status, summary }: ThreadClosure) => {
    setClosureError(null);
    setActioning(true);

    if (summary) {
      try {
        const sent = await requestsApi.sendMessage(threadId, summary);
        const createdAt = sent?.createdAt || new Date().toISOString();
        if (activeThreadIdRef.current === threadId) {
          setMessages((prev) => [
            ...prev,
            {
              id: sent?.id || `closure_${Date.now()}`,
              senderId: user?.id || "",
              content: sent?.content || summary,
              createdAt,
            },
          ]);
        }
        setThreads((prev) =>
          prev.map((t) =>
            t.id === threadId ? { ...t, lastMessage: summary, lastMessageAt: createdAt } : t
          )
        );
      } catch {
        setFailedClosure({ threadId, status, summary });
        setClosureError(
          "No pudimos registrar el resumen del acuerdo. La conversación sigue abierta para que puedas reintentar."
        );
        setActioning(false);
        return;
      }
    }

    try {
      await requestsApi.updateStatus(threadId, status);
      setThreads((prev) => prev.map((t) => (t.id === threadId ? { ...t, status } : t)));
      setFailedClosure(null);
    } catch {
      // El resumen ya quedó guardado: al reintentar sólo falta el cambio de estado.
      setFailedClosure({ threadId, status, summary: null });
      setClosureError(
        summary
          ? "El resumen quedó registrado, pero no pudimos cerrar la solicitud. Reintentá en unos segundos."
          : "No pudimos actualizar el estado de la solicitud. Reintentá en unos segundos."
      );
    } finally {
      setActioning(false);
    }
  };

  const handleDealClosure = (data: DealClosureData) => {
    if (!activeThreadId || !pendingStatus) return;
    const summary = data.agreed
      ? `✅ Acuerdo cerrado${data.licenseType ? ` — Licencia ${data.licenseType}` : ""}${data.estimatedValue ? ` — ${data.currency} ${data.estimatedValue.toLocaleString()}` : ""}${data.notes ? `\n${data.notes}` : ""}`
      : `❌ Sin acuerdo${data.notes ? ` — ${data.notes}` : ""}`;
    const closure: ThreadClosure = { threadId: activeThreadId, status: pendingStatus, summary };
    setShowDealModal(false);
    setPendingStatus(null);
    void runClosure(closure);
  };

  const handleSkipDealClosure = () => {
    if (!activeThreadId || !pendingStatus) return;
    const closure: ThreadClosure = { threadId: activeThreadId, status: pendingStatus, summary: null };
    setShowDealModal(false);
    setPendingStatus(null);
    void runClosure(closure);
  };

  const dismissClosureError = () => {
    setClosureError(null);
    setFailedClosure(null);
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
            // Un buzón realmente vacío no es lo mismo que un filtro que no matchea.
            threads.length === 0 ? (
              <EmptyState
                size="sm"
                iconStyle="bare"
                icon="💬"
                title="Todavía no tenés solicitudes"
                description="Cuando alguien te escriba por un activo tuyo —o vos solicites licenciar uno— la conversación aparece acá."
                action={{ label: "Explorar activos", href: "/dashboard/explore", variant: "link" }}
              />
            ) : (
              <EmptyState
                size="sm"
                iconStyle="bare"
                icon="💬"
                title={`Sin conversaciones ${filter.toLowerCase()}`}
                description="Tenés solicitudes en otros estados. Probá cambiando el filtro."
                action={{ label: "Ver todas", onClick: () => setFilter("Todas"), variant: "link" }}
              />
            )
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
              <EmptyState
                size="sm"
                iconStyle="bare"
                icon="💬"
                title="No hay mensajes aún"
                description={isClosed ? undefined : "Escribí el primero para arrancar la conversación."}
              />
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

          {/* Aviso de error del cierre — con reintento, para que un fallo no
              se coma silenciosamente el resumen del acuerdo */}
          {closureError && (
            <div className="px-6 py-3 border-t border-soft-coral/40 bg-red-50 dark:bg-red-950/30">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-4 w-4 text-soft-coral dark:text-red-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-soft-coral dark:text-red-400">{closureError}</p>
                  {failedClosure && (
                    <div className="flex flex-wrap items-center gap-4 mt-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        loading={actioning}
                        onClick={() => runClosure(failedClosure)}
                      >
                        Reintentar
                      </Button>
                      {failedClosure.summary && (
                        <button
                          type="button"
                          disabled={actioning}
                          onClick={() => runClosure({ ...failedClosure, summary: null })}
                          className="text-xs font-medium text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 underline disabled:opacity-50 transition-colors"
                        >
                          Cerrar sin registrar el resumen
                        </button>
                      )}
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={dismissClosureError}
                  aria-label="Descartar aviso"
                  className="shrink-0 p-1 -mr-1 rounded-lg text-slate-gray dark:text-gray-400 hover:text-carbon-gray dark:hover:text-gray-200 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
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
          {threads.length === 0 && !loadingThreads ? (
            <EmptyState
              iconStyle="bare"
              icon="💬"
              title="Todavía no tenés solicitudes"
              description="Explorá el marketplace y solicitá licenciar un activo, o publicá el tuyo para empezar a recibir consultas."
              action={{ label: "Explorar activos", href: "/dashboard/explore" }}
              secondaryAction={{
                label: "Publicar un activo",
                href: "/dashboard/assets/new",
                variant: "link",
              }}
            />
          ) : (
            <EmptyState
              iconStyle="bare"
              icon="💬"
              title="No hay conversación seleccionada"
              description="Seleccioná un mensaje para comenzar."
            />
          )}
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
