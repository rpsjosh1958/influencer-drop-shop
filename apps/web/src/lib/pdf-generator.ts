import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Order } from "@/types";

interface ExportOptions {
  fileName?: string;
  storeName: string;
  storeAddress?: string;
  storePhone?: string;
  storeIcon?: string;
  columns: {
    header: string;
    dataKey: keyof Order | "customerInfo" | "orderDate" | "itemsSummary";
  }[];
}

export const generateOrdersPDF = (orders: Order[], options: ExportOptions) => {
  const doc = new jsPDF();

  // --- Header ---
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // Store Icon (if available) - checking functionality first, might need base64 or valid URL
  // Ideally, use addImage. For now, let's try assuming valid URL if provided.
  // Note: addImage allows URL but might fail if CORS, better if it was preloaded or base64.
  // We'll skip complex image handling for V1 unless user insists or we handle it safely.
  // Text Header
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text(options.storeName.toUpperCase(), 14, yPos);

  // Icon placeholder logic (if requested, tricky with CORS)
  // if (options.storeIcon) {
  //   try { doc.addImage(options.storeIcon, 'PNG', pageWidth - 40, 10, 20, 20); } catch(e){}
  // }

  yPos += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);

  if (options.storeAddress) {
    doc.text(options.storeAddress, 14, yPos);
    yPos += 5;
  }
  if (options.storePhone) {
    doc.text(options.storePhone, 14, yPos);
    yPos += 5;
  }

  // Title
  yPos += 10;
  doc.setFontSize(14);
  doc.setTextColor(0);
  doc.setFont("helvetica", "bold");
  doc.text("Orders Report", 14, yPos);

  // Date
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(new Date().toLocaleDateString(), pageWidth - 14, yPos, {
    align: "right",
  });

  // --- Table ---
  const tableData = orders.map((order, index) => {
    const row: any = {};
    options.columns.forEach((col) => {
      if (col.dataKey === "id") {
        row[col.header] = (index + 1).toString();
      } else if (col.dataKey === "customerInfo") {
        row[col.header] = `${order.customerName || order.customerEmail}\n${
          order.shipping?.address || ""
        }, ${order.shipping?.city || ""}`.trim();
      } else if (col.dataKey === "orderDate") {
        row[col.header] = order.createdAt?.seconds
          ? new Date(order.createdAt.seconds * 1000).toLocaleDateString()
          : "-";
      } else if (col.dataKey === "itemsSummary") {
        row[col.header] = order.items
          .map((i) => `${i.quantity}x ${i.name}`)
          .join("\n");
      } else {
        row[col.header] = order[col.dataKey] || "-";
      }
    });
    return Object.values(row);
  });

  const headers = options.columns.map((c) => c.header);

  autoTable(doc, {
    startY: yPos + 10,
    head: [headers],
    body: tableData as any[],
    theme: "grid",
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 10 }, // #
      1: { cellWidth: 50 }, // Customer
      2: { cellWidth: 25 }, // Date
      3: { cellWidth: 60 }, // Items
    },
  });

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    const text = `Page ${i} of ${pageCount} - Powered by The Drop`;
    doc.text(text, pageWidth / 2, doc.internal.pageSize.height - 10, {
      align: "center",
    });
  }

  doc.save(options.fileName || "orders_export.pdf");
};

export const generateFinancePDF = (
  transactions: any[],
  options: {
    fileName?: string;
    storeName: string;
    storeIcon?: string;
    month: string;
    year: string;
    totalEarned: number;
    currency?: string;
  }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  let yPos = 20;

  // --- Header ---
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text(options.storeName.toUpperCase(), 14, yPos);

  yPos += 10;
  doc.setFontSize(16);
  doc.setTextColor(100);
  doc.text("Financial Statement", 14, yPos);

  // Period Badge
  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(
    `Period: ${options.month} ${options.year}`,
    pageWidth - 14,
    yPos - 5,
    { align: "right" }
  );

  yPos += 15;

  // --- Summary Card ---
  doc.setFillColor(248, 248, 248);
  doc.roundedRect(14, yPos, pageWidth - 28, 25, 3, 3, "F");

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text("Total Revenue (Period)", 20, yPos + 10);

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 128, 0); // Green
  doc.text(
    `${options.currency || "GHS"} ${options.totalEarned.toFixed(2)}`,
    20,
    yPos + 20
  );

  yPos += 35;

  // --- Transactions Table ---
  const tableData = transactions.map((tx) => [
    tx.createdAt
      ? new Date(tx.createdAt.seconds * 1000).toLocaleDateString()
      : "-",
    tx.description || "Transaction",
    tx.type?.toUpperCase() || "-",
    `${tx.type === "credit" ? "+" : "-"} ${options.currency || "GHS"} ${
      tx.amount?.toFixed(2) || "0.00"
    }`,
    tx.status?.toUpperCase() || "-",
  ]);

  autoTable(doc, {
    startY: yPos,
    head: [["Date", "Description", "Type", "Amount", "Status"]],
    body: tableData,
    theme: "grid",
    headStyles: {
      fillColor: [0, 0, 0],
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    styles: { fontSize: 9, cellPadding: 4 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: "auto" },
      2: { cellWidth: 20 },
      3: { cellWidth: 35, halign: "right" },
      4: { cellWidth: 25 },
    },
    didParseCell: function (data) {
      if (data.section === "body" && data.column.index === 3) {
        const raw = data.cell.raw as string;
        if (raw.startsWith("+")) {
          data.cell.styles.textColor = [0, 128, 0];
        } else {
          data.cell.styles.textColor = [0, 0, 0];
        }
      }
    },
  });

  // --- Footer ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    const text = `Page ${i} of ${pageCount} - Generated by The Drop`;
    doc.text(text, pageWidth / 2, doc.internal.pageSize.height - 10, {
      align: "center",
    });
  }

  doc.save(
    options.fileName ||
      `statement_${options.year}_${options.month.toLowerCase()}.pdf`
  );
};
