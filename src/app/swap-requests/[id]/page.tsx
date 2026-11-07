"use client";

import { FormEvent, use, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  SWAP_REQUEST_SELECT,
  SWAP_STATUS,
  SWAP_STATUS_LABEL,
  bothReceiptsConfirmed,
  type SwapRequest,
  type SwapStatus,
} from "@/lib/swapRequests";
import {
  POST_LABEL_INLAND,
  POST_WAYBILL_INTL,
  sanitizeTrackingCode,
  trackingUrl,
} from "@/lib/shipping";
import {
  SWAP_SHIPMENT_SELECT,
  inboundShipment,
  outboundShipment,
  type SwapShipment,
} from "@/lib/shipments";
import { publicShippingConfig } from "@/lib/shippingConfig";

const MAX_BODY = 2000;

type ChatMessage = {
  id: string;
  swap_request_id: string;
  sender_id: string;
  body: string;
  created_at: string;
};

export default function SwapRequestChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [userId, setUserId] = useState<string | null>(null);
  const [request, setRequest] = useState<SwapRequest | null>(null);
  const [shipments, setShipments] = useState<SwapShipment[]>([]);
  const [itemTitle, setItemTitle] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [body, setBody] = useState("");
  const [blocked, setBlocked] = useState(false);
  const [ownTracking, setOwnTracking] = useState("");
  const [ownAddress, setOwnAddress] = useState("");
  const [shippingConfig, setShippingConfig] = useState(publicShippingConfig());
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const canWrite =
    request?.status === SWAP_STATUS.created ||
    request?.status === SWAP_STATUS.accepted ||
    request?.status === SWAP_STATUS.disputed;

  const load = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = "/login";
      return;
    }

    setUserId(user.id);
    const configRes = await fetch("/api/shipping/config");
    if (configRes.ok) setShippingConfig(await configRes.json());

    const { data: requestRow, error: requestError } = await supabase
      .from("swap_requests")
      .select(SWAP_REQUEST_SELECT)
      .eq("id", id)
      .single();

    if (requestError || !requestRow) {
      setError("Anfrage nicht gefunden oder kein Zugriff.");
      setLoading(false);
      return;
    }

    const current = requestRow as SwapRequest;
    if (current.requester_id !== user.id && current.owner_id !== user.id) {
      setError("Kein Zugriff auf diese Anfrage.");
      setLoading(false);
      return;
    }

    setRequest(current);

    const { data: shipmentRows } = await supabase
      .from("swap_shipments")
      .select(SWAP_SHIPMENT_SELECT)
      .eq("swap_request_id", id);
    const loaded = (shipmentRows || []) as SwapShipment[];
    setShipments(loaded);
    const outbound = outboundShipment(loaded, user.id);
    const inbound = inboundShipment(loaded, user.id);
    setOwnTracking(outbound?.tracking_code || "");
    setOwnAddress(inbound?.recipient_address || "");

    const { data: itemRow } = await supabase
      .from("items")
      .select("title")
      .eq("id", current.item_id)
      .single();
    setItemTitle((itemRow as { title?: string } | null)?.title || "Artikel");

    const { data: messageRows, error: messageError } = await supabase
      .from("swap_messages")
      .select("id, swap_request_id, sender_id, body, created_at")
      .eq("swap_request_id", id)
      .order("created_at", { ascending: true });

    if (messageError) {
      setError(messageError.message);
      setLoading(false);
      return;
    }

    setMessages((messageRows || []) as ChatMessage[]);

    const otherId = current.requester_id === user.id ? current.owner_id : current.requester_id;
    const { data: blocks } = await supabase
      .from("user_blocks")
      .select("id")
      .eq("blocker_id", user.id)
      .eq("blocked_id", otherId);
    setBlocked(Boolean(blocks?.length));

    await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("swap_request_id", id)
      .is("read_at", null);

    setLoading(false);
  };

  useEffect(() => {
    load();
    const timer = setInterval(load, 5000);
    return () => clearInterval(timer);
  }, [id]);

  const send = async (event: FormEvent) => {
    event.preventDefault();
    const text = body.trim();
    if (!text || !userId || !canWrite) return;
    if (text.length > MAX_BODY) {
      setError(`Maximal ${MAX_BODY} Zeichen.`);
      return;
    }

    setError("");
    const { data, error: sendError } = await supabase
      .from("swap_messages")
      .insert({
        swap_request_id: id,
        sender_id: userId,
        body: text,
      })
      .select("id, swap_request_id, sender_id, body, created_at");

    if (sendError || !data?.length) {
      setError(sendError?.message || "Nachricht konnte nicht gesendet werden.");
      return;
    }

    setBody("");
    setMessages((old) => [...old, data[0] as ChatMessage]);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("notify_push")
      .eq("user_id", user?.id || "")
      .maybeSingle();
    if (
      prefs?.notify_push &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      new Notification("Nachricht gesendet", { body: "Die andere Partei erhält einen In-App-Hinweis." });
    }
  };

  const applyRpc = (data: unknown) => {
    const payload = data as { request?: SwapRequest; shipments?: SwapShipment[] } | null;
    if (payload?.request) setRequest(payload.request);
    if (payload?.shipments) {
      setShipments(payload.shipments);
      if (userId) {
        const outbound = outboundShipment(payload.shipments, userId);
        const inbound = inboundShipment(payload.shipments, userId);
        if (outbound?.tracking_code != null) setOwnTracking(outbound.tracking_code);
        if (inbound?.recipient_address != null) setOwnAddress(inbound.recipient_address);
      }
    }
  };

  const callShippingRpc = async (name: string, args: Record<string, string | boolean>) => {
    const { data, error: rpcError } = await supabase.rpc(name, args);
    if (rpcError || !data) {
      setError(rpcError?.message || "Aktion nicht erlaubt.");
      return;
    }
    setError("");
    applyRpc(data);
  };

  const shippingAuthHeaders = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return {
      Authorization: `Bearer ${session?.access_token || ""}`,
      "Content-Type": "application/json",
    };
  };

  const requestSandboxLabel = async (shipmentId: string) => {
    if (!request) return;
    const res = await fetch("/api/shipping/sandbox-label", {
      method: "POST",
      headers: await shippingAuthHeaders(),
      body: JSON.stringify({ p_swap_request_id: request.id, p_shipment_id: shipmentId }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok || !data) {
      setError(data?.message || "Sandbox-Etikett nicht erzeugt.");
      return;
    }
    setError("");
    applyRpc(data);
  };

  const simulateCarrier = async (shipmentId: string) => {
    const res = await fetch("/api/shipping/sandbox-simulate", {
      method: "POST",
      headers: await shippingAuthHeaders(),
      body: JSON.stringify({ shipment_id: shipmentId, carrier_status: "in_transit" }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      setError(data?.message || "Testereignis fehlgeschlagen.");
      return;
    }
    setError("");
    await load();
  };

  const saveTracking = async (event: FormEvent) => {
    event.preventDefault();
    if (!request || !userId) return;
    const outbound = outboundShipment(shipments, userId);
    await callShippingRpc("set_shipment_tracking", {
      p_swap_request_id: request.id,
      p_shipment_id: outbound?.id || "",
      p_tracking_code: sanitizeTrackingCode(ownTracking),
    });
  };

  const otherId =
    request && userId
      ? request.requester_id === userId
        ? request.owner_id
        : request.requester_id
      : null;

  const report = async (messageId: string) => {
    const { error: reportError } = await supabase
      .from("swap_messages")
      .update({ reported: true })
      .eq("id", messageId);
    if (reportError) setError(reportError.message);
    else setError("Nachricht gemeldet.");
  };

  const blockOther = async () => {
    if (!otherId) return;
    const { error: blockError } = await supabase.from("user_blocks").insert({ blocked_id: otherId });
    if (blockError) setError(blockError.message);
    else setBlocked(true);
  };

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        Lade Nachrichten...
      </main>
    );
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col p-8">
      <a href="/swap-requests" className="text-sm text-gray-500 hover:text-[#16A34A]">
        ← Tauschanfragen
      </a>
      <h1 className="mt-6 text-3xl font-bold">{itemTitle}</h1>
      <p className="mt-2 text-gray-500">
        {request ? SWAP_STATUS_LABEL[request.status as SwapStatus] : ""}
      </p>
      {error && (
        <p className="mt-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>
      )}

      {(request?.status === SWAP_STATUS.accepted ||
        request?.status === SWAP_STATUS.disputed ||
        request?.status === SWAP_STATUS.completed ||
        request?.status === SWAP_STATUS.cancelled) &&
        request &&
        userId && (
        <section className="mt-8 space-y-4">
          <div className="rounded-2xl border border-gray-100 p-5">
            <h2 className="text-xl font-semibold">Versand (je eigenes Paket)</h2>
            <p className="mt-2 text-sm text-gray-600">
              Zwei unabhängige Sendungen. «Als versendet», Carrier-Tracking und Empfang sind getrennt.
              Der Tausch endet erst, wenn beide den Erhalt bestätigt haben und kein Problem offen ist.
              Die Adresse der Gegenseite erscheint erst, wenn sie sie teilt.
            </p>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>
                Inland:{" "}
                <a href={POST_LABEL_INLAND} className="font-semibold text-[#16A34A]" target="_blank" rel="noreferrer">
                  Paketetiketten Inland (Die Post)
                </a>
              </li>
              <li>
                Ausland:{" "}
                <a href={POST_WAYBILL_INTL} className="font-semibold text-[#16A34A]" target="_blank" rel="noreferrer">
                  Frachtbrief erstellen
                </a>
              </li>
            </ul>
            {request.problem && (
              <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-800">
                Problem gemeldet — Abschluss ist gesperrt, Chat bleibt offen.
              </p>
            )}
            {(request.status === SWAP_STATUS.accepted || request.status === SWAP_STATUS.disputed) &&
              !bothReceiptsConfirmed(request) &&
              !(request.owner_received_at && request.requester_received_at) && (
              <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                Tausch noch nicht abgeschlossen
                {request.owner_received_at || request.requester_received_at
                  ? " — bisher nur ein Empfang bestätigt."
                  : "."}
              </p>
            )}
          </div>

          {(() => {
            const outbound = outboundShipment(shipments, userId);
            const inbound = inboundShipment(shipments, userId);
            const otherAddress = outbound?.address_shared_at ? outbound.recipient_address : "";
            const open =
              request.status === SWAP_STATUS.accepted || request.status === SWAP_STATUS.disputed;
            return (
              <>
                <div className="rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold">Adressen</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Adresse der Gegenseite: {otherAddress ? otherAddress : "noch nicht geteilt"}
                  </p>
                  {open && inbound && (
                    <form
                      className="mt-4 flex flex-col gap-2"
                      onSubmit={(event) => {
                        event.preventDefault();
                        callShippingRpc("share_my_shipping_address", {
                          p_swap_request_id: request.id,
                          p_shipment_id: inbound.id,
                          p_address: ownAddress,
                        });
                      }}
                    >
                      <textarea
                        value={ownAddress}
                        onChange={(event) => setOwnAddress(event.target.value)}
                        maxLength={500}
                        rows={3}
                        placeholder="Deine Lieferadresse (wird erst nach Speichern sichtbar)"
                        className="w-full rounded-2xl border px-4 py-3"
                      />
                      <button type="submit" className="min-h-11 rounded-full border px-4 py-2 text-sm font-semibold">
                        Adresse teilen
                      </button>
                    </form>
                  )}
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                <article className="rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold">Dein Paket an die Gegenseite</h3>
                  <p className="mt-1 text-sm text-gray-500">Status: {outbound?.status || "—"}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Als versendet: {outbound?.marked_sent_at ? "ja (Nutzer)" : "nein"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Empfang bestätigt: {outbound?.received_at ? "ja (Empfänger)" : "nein"}
                  </p>
                  {outbound?.cancelled_at && (
                    <p className="mt-1 text-sm text-red-700">Du hast diese Sendung storniert.</p>
                  )}
                  {outbound?.label_ref && (
                    <p className="mt-2 text-sm text-gray-500">Testetikett: {outbound.label_ref}</p>
                  )}
                  {outbound?.carrier_first_scan_at && (
                    <p className="mt-1 text-sm text-gray-500">Carrier-Scan (Sandbox): ja</p>
                  )}
                  {outbound?.tracking_code && trackingUrl(outbound.tracking_code) && (
                    <a
                      href={trackingUrl(outbound.tracking_code)}
                      className="mt-2 block text-sm text-[#16A34A]"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Carrier-Tracking (nicht gleich Empfang)
                    </a>
                  )}
                  {open && outbound && !outbound.cancelled_at && (
                    <>
                      {shippingConfig.sandboxLabel && !outbound.label_ref && (
                        <button
                          type="button"
                          className="mt-4 min-h-11 w-full rounded-full border px-4 py-2 text-sm font-semibold"
                          onClick={() => requestSandboxLabel(outbound.id)}
                        >
                          Sandbox-Etikett (kein Kauf)
                        </button>
                      )}
                      {shippingConfig.sandboxLabel && outbound.label_ref && (
                        <button
                          type="button"
                          className="mt-3 min-h-11 w-full rounded-full border px-4 py-2 text-sm font-semibold"
                          onClick={() => simulateCarrier(outbound.id)}
                        >
                          Testereignis: unterwegs
                        </button>
                      )}
                      <form onSubmit={saveTracking} className="mt-4 flex flex-col gap-2">
                        <input
                          value={ownTracking}
                          onChange={(event) => setOwnTracking(event.target.value)}
                          placeholder="Deine Sendungsnummer"
                          className="min-h-11 w-full rounded-2xl border px-4 py-3"
                          maxLength={40}
                        />
                        <button type="submit" className="min-h-11 rounded-full border px-4 py-2 text-sm font-semibold">
                          Tracking speichern
                        </button>
                      </form>
                      {!outbound.marked_sent_at && (
                        <>
                          <button
                            type="button"
                            className="mt-3 min-h-11 w-full rounded-full bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white"
                            onClick={() =>
                              callShippingRpc("mark_shipment_sent", {
                                p_swap_request_id: request.id,
                                p_shipment_id: outbound.id,
                              })
                            }
                          >
                            Als versendet markieren
                          </button>
                          <button
                            type="button"
                            className="mt-2 min-h-11 w-full rounded-full border px-4 py-2 text-sm font-semibold"
                            onClick={() =>
                              callShippingRpc("cancel_shipment", {
                                p_swap_request_id: request.id,
                                p_shipment_id: outbound.id,
                              })
                            }
                          >
                            Sendung stornieren
                          </button>
                        </>
                      )}
                    </>
                  )}
                </article>
                <article className="rounded-2xl border border-gray-100 p-5">
                  <h3 className="font-semibold">Paket der Gegenseite an dich</h3>
                  <p className="mt-1 text-sm text-gray-500">Status: {inbound?.status || "—"}</p>
                  <p className="mt-2 text-sm text-gray-500">
                    Als versendet: {inbound?.marked_sent_at ? "ja (Nutzer)" : "nein"}
                  </p>
                  <p className="mt-1 text-sm text-gray-500">
                    Empfang bestätigt: {inbound?.received_at ? "ja (du)" : "nein"}
                  </p>
                  {inbound?.cancelled_at && (
                    <p className="mt-1 text-sm text-red-700">Gegenseite hat storniert.</p>
                  )}
                  {inbound?.tracking_code && trackingUrl(inbound.tracking_code) ? (
                    <a
                      href={trackingUrl(inbound.tracking_code)}
                      className="mt-2 block text-sm text-[#16A34A]"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Carrier-Tracking (nicht gleich Empfang)
                    </a>
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">Noch keine Sendungsnummer der Gegenseite.</p>
                  )}
                  {open && inbound && !inbound.received_at && !inbound.cancelled_at && (
                    <button
                      type="button"
                      className="mt-4 min-h-11 w-full rounded-full bg-[#16A34A] px-4 py-2 text-sm font-semibold text-white"
                      onClick={() =>
                        callShippingRpc("confirm_shipment_received", {
                          p_swap_request_id: request.id,
                          p_shipment_id: inbound.id,
                        })
                      }
                    >
                      Empfang bestätigen
                    </button>
                  )}
                  {open && inbound?.received_at && !inbound.return_marked_at && (
                    <button
                      type="button"
                      className="mt-3 min-h-11 w-full rounded-full border px-4 py-2 text-sm font-semibold"
                      onClick={() =>
                        callShippingRpc("mark_shipment_return", {
                          p_swap_request_id: request.id,
                          p_shipment_id: inbound.id,
                        })
                      }
                    >
                      Rücksendung markieren
                    </button>
                  )}
                  {inbound?.return_marked_at && (
                    <p className="mt-3 text-sm text-gray-600">Rücksendung ist markiert.</p>
                  )}
                </article>
                </div>
                {open && (
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button
                      type="button"
                      className="min-h-11 rounded-full border px-4 py-2 text-sm font-semibold"
                      onClick={() =>
                        callShippingRpc("remind_swap_peer", { p_swap_request_id: request.id })
                      }
                    >
                      Gegenseite erinnern
                    </button>
                    {!request.problem && (
                      <button
                        type="button"
                        className="min-h-11 rounded-full border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                        onClick={() =>
                          callShippingRpc("report_swap_problem", { p_swap_request_id: request.id })
                        }
                      >
                        Problem melden
                      </button>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </section>
      )}

      <div className="mt-8 flex-1 space-y-3">
        {messages.length === 0 && (
          <p className="text-gray-500">Noch keine Nachrichten.</p>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              message.sender_id === userId
                ? "ml-auto bg-[#16A34A] text-white"
                : "bg-gray-100 text-[#111827]"
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.body}</p>
            {message.sender_id !== userId && (
              <button
                type="button"
                className="mt-2 text-xs opacity-70"
                onClick={() => report(message.id)}
              >
                Melden
              </button>
            )}
          </div>
        ))}
      </div>

      {otherId && (
        <button type="button" className="mt-6 text-sm text-gray-500" onClick={blockOther}>
          {blocked ? "Gegenseite ist gesperrt" : "Gegenseite sperren"}
        </button>
      )}

      {canWrite && !blocked ? (
        <form onSubmit={send} className="mt-8 flex gap-3">
          <textarea
            value={body}
            onChange={(event) => setBody(event.target.value)}
            maxLength={MAX_BODY}
            rows={3}
            placeholder="Nachricht an die andere Partei"
            className="w-full rounded-2xl border px-4 py-3"
          />
          <button
            type="submit"
            className="self-end rounded-full bg-[#16A34A] px-5 py-3 font-semibold text-white"
          >
            Senden
          </button>
        </form>
      ) : (
        <p className="mt-8 rounded-2xl bg-gray-50 p-4 text-gray-600">
          Schreiben ist bei diesem Status nicht mehr möglich.
        </p>
      )}
    </main>
  );
}
