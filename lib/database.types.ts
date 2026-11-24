/**
 * The `todos` table, shared with the Android app. Keep in step with its
 * supabase/migrations. Dates are "YYYY-MM-DD" and times of day are "HH:mm".
 */
export type Priority = "high" | "medium" | "low";

export type TodoRow = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  due_date: string;
  due_time: string | null;
  reminder_time: string | null;
  duration: number | null;
  priority: Priority;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

/** `updated_at` is stamped by the server on every write. */
export type TodoInsert = Omit<TodoRow, "updated_at"> & { updated_at?: string };

/** One row per account, shared with the Android app. The web only changes `appearance`. */
export type UserSettingsRow = {
  user_id: string;
  feedback: "vibrate" | "tick" | "tickVibrate" | "none";
  todo_view: "list" | "timeline";
  appearance: "light" | "dark" | "system";
  updated_at: string;
};

/** Readable by its owner. Only the google-calendar Edge Function writes it. */
export type CalendarConnectionRow = {
  user_id: string;
  connected: boolean;
  google_email: string | null;
  last_error: string | null;
  sync_todos: boolean;
  show_events: boolean;
  can_read_events: boolean;
};

/** The areas feedback can be about, the same as the Android app's Subject sheet. */
export type FeedbackSubject =
  | "bug"
  | "idea"
  | "todos"
  | "calendar"
  | "account"
  | "design"
  | "other";

/** Send only, shared with the Android app: people can add feedback but not read it back. */
export type FeedbackInsert = {
  subject: FeedbackSubject;
  message: string;
  app_version: string | null;
  platform: string | null;
};

export type Database = {
  public: {
    Tables: {
      todos: {
        Row: TodoRow;
        Insert: TodoInsert;
        Update: Partial<TodoInsert>;
        Relationships: [];
      };
      user_settings: {
        Row: UserSettingsRow;
        Insert: Partial<UserSettingsRow> & Pick<UserSettingsRow, "user_id">;
        Update: Partial<UserSettingsRow>;
        Relationships: [];
      };
      calendar_connections: {
        Row: CalendarConnectionRow;
        Insert: never;
        Update: never;
        Relationships: [];
      };
      feedback: {
        Row: FeedbackInsert & { id: string; user_id: string | null; created_at: string };
        Insert: FeedbackInsert;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
