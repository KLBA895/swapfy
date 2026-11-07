export const SWAP_REQUEST_SELECT =
  "id, item_id, requester_id, owner_id, status, created_at, owner_tracking, requester_tracking, owner_marked_sent_at, requester_marked_sent_at, owner_received_at, requester_received_at, owner_address, requester_address, problem, owner_cancelled_at, requester_cancelled_at, owner_return_at, requester_return_at";

export const SWAP_STATUS = {
  created: "erstellt",
  accepted: "angenommen",
  declined: "abgelehnt",
  withdrawn: "zurueckgezogen",
  completed: "abgeschlossen",
  disputed: "streit",
  cancelled: "abgebrochen",
} as const;

export type SwapStatus = (typeof SWAP_STATUS)[keyof typeof SWAP_STATUS];

export const SWAP_STATUS_LABEL: Record<SwapStatus, string> = {
  erstellt: "Offen",
  angenommen: "Angenommen",
  abgelehnt: "Abgelehnt",
  zurueckgezogen: "Zurückgezogen",
  abgeschlossen: "Abgeschlossen",
  streit: "Streitfall",
  abgebrochen: "Abgebrochen",
};

export type SwapRequest = {
  id: string;
  item_id: string;
  requester_id: string;
  owner_id: string;
  status: SwapStatus;
  created_at: string;
  owner_tracking?: string | null;
  requester_tracking?: string | null;
  owner_marked_sent_at?: string | null;
  requester_marked_sent_at?: string | null;
  owner_received_at?: string | null;
  requester_received_at?: string | null;
  owner_address?: string | null;
  requester_address?: string | null;
  problem?: boolean | null;
  owner_cancelled_at?: string | null;
  requester_cancelled_at?: string | null;
  owner_return_at?: string | null;
  requester_return_at?: string | null;
};

export function bothReceiptsConfirmed(row: SwapRequest) {
  return Boolean(row.owner_received_at && row.requester_received_at && !row.problem);
}
