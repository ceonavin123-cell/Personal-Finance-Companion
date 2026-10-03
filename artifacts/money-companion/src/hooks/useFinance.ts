import { useEffect, useMemo, useRef, useState } from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import type { Session, User } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

import { requireSupabase, supabaseConfigured } from "@/lib/supabase";
import type {
  CategoryType,
  DashboardSummary,
  TransactionInput,
  TransactionRow,
  TransactionType,
  TransactionUpdate,
} from "@/lib/database.types";

// The current Supabase client release is stricter than the schema's generated
// helper inference for RPCs and nullable category relations. Keep the service
// hooks as the sole data layer while retaining the domain-facing return types.
const db = () => requireSupabase() as SupabaseClient<any>;

export interface TransactionFilters {
  page?: number;
  pageSize?: number;
  search?: string;
  type?: TransactionType | "all";
}

export interface TransactionPage {
  items: TransactionRow[];
  count: number;
  page: number;
  pageSize: number;
}

export interface AuthSessionState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
}

const financeKeys = {
  all: ["finance"] as const,
  summary: ["finance", "summary"] as const,
  categories: (type?: CategoryType) => ["finance", "categories", type] as const,
  transactions: (filters: Required<TransactionFilters>) =>
    ["finance", "transactions", filters] as const,
};

export function useAuthSession(): AuthSessionState {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const previousUserId = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    if (!supabaseConfigured) {
      setIsLoading(false);
      return;
    }
    const auth = requireSupabase().auth;
    let alive = true;
    auth.getSession().then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        setSession(null);
      } else {
        setSession(data.session);
      }
      setIsLoading(false);
    });

    const {
      data: { subscription },
    } = auth.onAuthStateChange((_event, nextSession) => {
      const nextUserId = nextSession?.user.id ?? null;
      if (
        previousUserId.current !== undefined &&
        previousUserId.current !== nextUserId
      ) {
        queryClient.clear();
      }
      previousUserId.current = nextUserId;
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => {
      alive = false;
      subscription.unsubscribe();
    };
  }, [queryClient]);

  return useMemo(
    () => ({ session, user: session?.user ?? null, isLoading }),
    [session, isLoading],
  );
}

export async function signInWithPassword(email: string, password: string) {
  return requireSupabase().auth.signInWithPassword({ email, password });
}

export async function signUpWithPassword(
  email: string,
  password: string,
  fullName: string,
) {
  return requireSupabase().auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });
}

export async function signOut() {
  return requireSupabase().auth.signOut();
}

export function useDashboardSummary(enabled = true) {
  return useQuery({
    queryKey: financeKeys.summary,
    enabled,
    queryFn: async (): Promise<DashboardSummary> => {
      const { data, error } = await db().rpc("get_dashboard_summary");
      if (error) throw error;
      const summary = data?.[0];
      if (!summary) throw new Error("The dashboard summary is unavailable.");
      return {
        lifetime_income: Number(summary.lifetime_income),
        lifetime_expenses: Number(summary.lifetime_expenses),
        recorded_balance: Number(summary.recorded_balance),
        month_income: Number(summary.month_income),
        month_expenses: Number(summary.month_expenses),
        month_transaction_count: Number(summary.month_transaction_count),
      };
    },
  });
}

export function useCategories(type?: CategoryType, enabled = true) {
  return useQuery({
    queryKey: financeKeys.categories(type),
    enabled,
    queryFn: async () => {
      let query = db()
        .from("categories")
        .select("*")
        .order("name", { ascending: true });
      if (type) query = query.eq("type", type);

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTransactions(filters: TransactionFilters = {}, enabled = true) {
  const normalized: Required<TransactionFilters> = {
    page: Math.max(0, filters.page ?? 0),
    pageSize: Math.min(100, Math.max(1, filters.pageSize ?? 25)),
    search: filters.search?.trim() ?? "",
    type: filters.type ?? "all",
  };

  return useQuery({
    queryKey: financeKeys.transactions(normalized),
    enabled,
    queryFn: async (): Promise<TransactionPage> => {
      const from = normalized.page * normalized.pageSize;
      const to = from + normalized.pageSize - 1;
      let query = db()
        .from("transactions")
        .select("*", { count: "exact" })
        .order("transaction_date", { ascending: false })
        .range(from, to);

      if (normalized.type !== "all") {
        query = query.eq("type", normalized.type);
      }
      if (normalized.search) {
        const term = normalized.search.replace(/[,%()\\]/g, " ").trim();
        if (term) {
          query = query.or(
            `description.ilike.%${term}%,merchant.ilike.%${term}%`,
          );
        }
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return {
        items: data ?? [],
        count: count ?? 0,
        page: normalized.page,
        pageSize: normalized.pageSize,
      };
    },
  });
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: TransactionInput) => {
      const { data, error } = await db()
        .from("transactions")
        .insert(input)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.summary }),
        queryClient.invalidateQueries({
          queryKey: [...financeKeys.all, "transactions"],
        }),
      ]);
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      values,
    }: {
      id: string;
      values: TransactionUpdate;
    }) => {
      const { data, error } = await db()
        .from("transactions")
        .update(values)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.summary }),
        queryClient.invalidateQueries({
          queryKey: [...financeKeys.all, "transactions"],
        }),
      ]);
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await db()
        .from("transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: financeKeys.summary }),
        queryClient.invalidateQueries({
          queryKey: [...financeKeys.all, "transactions"],
        }),
      ]);
    },
  });
}