export type NoticeType =
  | "new_message"
  | "swap_created"
  | "swap_status"
  | "mail_failed"
  | "shipping_reminder";

export type AppNotification = {
  id: string;
  user_id: string;
  type: NoticeType;
  swap_request_id: string | null;
  message_id: string | null;
  title: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  notify_in_app: boolean;
  notify_email: boolean;
  notify_push: boolean;
  email_invalid: boolean;
};

export const DEFAULT_PREFS: Omit<NotificationPreferences, "user_id"> = {
  notify_in_app: true,
  notify_email: false,
  notify_push: false,
  email_invalid: false,
};
