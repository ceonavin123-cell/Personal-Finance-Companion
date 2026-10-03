export type TransactionType = "income" | "expense";
export type TransactionSource = "manual" | "text" | "voice";
export type CategoryType = "income" | "expense";

export interface CategoryRow {
  id: string;
  user_id: string | null;
  name: string;
  type: CategoryType;
  icon: string | null;
  is_default: boolean;
  created_at: string;
}

export interface TransactionRow {
  id: string;
  user_id: string;
  category_id: string | null;
  type: TransactionType;
  amount: number;
  currency: string;
  description: string | null;
  merchant: string | null;
  transaction_date: string;
  source: TransactionSource;
  created_at: string;
  updated_at: string;
}

type CategoryInsert = {
  id?: string;
  user_id?: string | null;
  name: string;
  type: CategoryType;
  icon?: string | null;
  is_default?: boolean;
  created_at?: string;
};

type TransactionInsert = {
  id?: string;
  user_id?: string;
  category_id?: string | null;
  type: TransactionType;
  amount: number;
  currency?: string;
  description?: string | null;
  merchant?: string | null;
  transaction_date?: string;
  source?: TransactionSource;
  created_at?: string;
  updated_at?: string;
};

export interface DashboardSummary {
  lifetime_income: number;
  lifetime_expenses: number;
  recorded_balance: number;
  month_income: number;
  month_expenses: number;
  month_transaction_count: number;
}

export interface Database {
  public: {
    Tables: {
      categories: {
        Row: CategoryRow;
        Insert: CategoryInsert;
        Update: Partial<CategoryInsert>;
        Relationships: [];
      };
      transactions: {
        Row: TransactionRow;
        Insert: TransactionInsert;
        Update: Partial<TransactionInsert>;
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          email: string | null;
          currency: string;
          language: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          email?: string | null;
          currency?: string;
          language?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<{
          full_name: string | null;
          currency: string;
          language: string;
          timezone: string;
          updated_at: string;
        }>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_dashboard_summary: {
        Args: Record<string, never>;
        Returns: DashboardSummary[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
}

export type TransactionInput = Omit<
  TransactionInsert,
  "id" | "user_id" | "created_at" | "updated_at"
>;

export type TransactionUpdate = Partial<TransactionInput>;