import * as XLSX from "xlsx";

interface FinanceTransaction {
  id: string;
  type: "credit" | "debit" | "payout";
  amount: number;
  description: string;
  status: string;
  createdAt: any; // Firestore Timestamp
}

interface ExportOptions {
  fileName: string;
  sheetName?: string;
}

export const generateFinanceExcel = (
  transactions: FinanceTransaction[],
  options: ExportOptions
) => {
  // 1. Format Data
  const data = transactions.map((tx) => ({
    Date: tx.createdAt?.toDate
      ? tx.createdAt.toDate().toLocaleDateString()
      : new Date().toLocaleDateString(),
    Time: tx.createdAt?.toDate
      ? tx.createdAt.toDate().toLocaleTimeString()
      : new Date().toLocaleTimeString(),
    Description: tx.description,
    Type: tx.type.toUpperCase(),
    Status: tx.status.toUpperCase(),
    Amount: tx.amount,
    "Transaction ID": tx.id,
  }));

  // 2. Create Worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 3. Create Workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    workbook,
    worksheet,
    options.sheetName || "Sheet1"
  );

  // 4. Generate File
  XLSX.writeFile(workbook, options.fileName);
};
