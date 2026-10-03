import type {
  CategoryRow,
  TransactionType,
} from "@/lib/database.types";

export interface ParsedTransactionDraft {
  type: TransactionType;
  amount: number;
  category_id: string | null;
  description: string;
  merchant: null;
  transaction_date: string;
  source: "text" | "voice";
  currency: "NPR";
}

const incomeWords = /\b(received|receive|salary|earned|income|freelance|refund|got)\b/i;
const expenseWords = /\b(spent|spend|paid|pay|bought|purchase|expense|cost)\b/i;
const amountPattern = /(?:rs\.?|npr|रु\.?)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i;
const categoriesByKeyword: Record<string, string> = {
  lunch: "Food",
  dinner: "Food",
  breakfast: "Food",
  groceries: "Food",
  grocery: "Food",
  restaurant: "Food",
  rent: "Housing",
  housing: "Housing",
  fuel: "Transport",
  taxi: "Transport",
  bus: "Transport",
  travel: "Transport",
  internet: "Bills",
  electricity: "Bills",
  water: "Bills",
  hospital: "Health",
  medicine: "Health",
  school: "Education",
  tuition: "Education",
  books: "Education",
  shopping: "Shopping",
  movie: "Entertainment",
  salary: "Salary",
  freelance: "Freelance",
  refund: "Refund",
};

export function parseTransactionText(
  text: string,
  categories: CategoryRow[],
  source: "text" | "voice" = "text",
): ParsedTransactionDraft | null {
  const cleanText = text.trim();
  if (!cleanText || /\b(borrow|borrowed|loan|lend|lent|owe|owed)\b/i.test(cleanText)) {
    return null;
  }

  const amountMatch = cleanText.match(amountPattern);
  const amount = amountMatch
    ? Number(amountMatch[1].replaceAll(",", ""))
    : Number.NaN;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const isIncome = incomeWords.test(cleanText);
  const isExpense = expenseWords.test(cleanText);
  if (isIncome === isExpense) return null;

  const type: TransactionType = isIncome ? "income" : "expense";
  const availableCategories = categories.filter((category) => category.type === type);
  const normalized = cleanText.toLowerCase();
  let category: CategoryRow | undefined;

  for (const [keyword, categoryName] of Object.entries(categoriesByKeyword)) {
    if (normalized.includes(keyword)) {
      category = availableCategories.find(
        (item) => item.name.toLowerCase() === categoryName.toLowerCase(),
      );
      if (category) break;
    }
  }

  const description = cleanText
    .replace(amountPattern, " ")
    .replace(
      /\b(i|a|an|the|on|for|to|today|yesterday|spent|spend|paid|pay|bought|purchase|expense|cost|received|receive|salary|earned|income|freelance|refund|got)\b/gi,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();

  return {
    type,
    amount,
    category_id: category?.id ?? null,
    description,
    merchant: null,
    transaction_date: new Date().toISOString(),
    source,
    currency: "NPR",
  };
}