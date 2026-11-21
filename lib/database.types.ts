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

export type Database = {
  public: {
    Tables: {
      todos: {
        Row: TodoRow;
        Insert: TodoInsert;
        Update: Partial<TodoInsert>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
