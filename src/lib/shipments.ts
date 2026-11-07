export const SWAP_SHIPMENT_SELECT =
  "id, swap_request_id, direction, sender_id, recipient_id, status, recipient_address, address_shared_at, tracking_code, carrier, provider, provider_env, provider_shipment_id, label_ref, marked_sent_at, carrier_first_scan_at, received_at, cancelled_at, return_marked_at, created_at";

export const SHIPMENT_DIRECTION = {
  ownerToRequester: "owner_to_requester",
  requesterToOwner: "requester_to_owner",
} as const;

export type ShipmentDirection = (typeof SHIPMENT_DIRECTION)[keyof typeof SHIPMENT_DIRECTION];

export type SwapShipment = {
  id: string;
  swap_request_id: string;
  direction: ShipmentDirection;
  sender_id: string;
  recipient_id: string;
  status: string;
  recipient_address?: string | null;
  address_shared_at?: string | null;
  tracking_code?: string | null;
  carrier?: string | null;
  provider?: string | null;
  provider_env?: string | null;
  provider_shipment_id?: string | null;
  label_ref?: string | null;
  marked_sent_at?: string | null;
  carrier_first_scan_at?: string | null;
  received_at?: string | null;
  cancelled_at?: string | null;
  return_marked_at?: string | null;
  created_at: string;
};

export function outboundShipment(rows: SwapShipment[], userId: string) {
  return rows.find((row) => row.sender_id === userId) || null;
}

export function inboundShipment(rows: SwapShipment[], userId: string) {
  return rows.find((row) => row.recipient_id === userId) || null;
}
