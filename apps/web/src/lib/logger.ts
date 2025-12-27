import { addDoc, collection } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type LogType = "info" | "error" | "warning";

interface LogOptions {
  message: string;
  type?: LogType;
  context?: any;
  userId?: string;
}

export async function logSystemEvent({
  message,
  type = "info",
  context = {},
  userId,
}: LogOptions) {
  try {
    // Note: This runs on Client or Server (if initialized properly)
    // For Server-side API routes, ensure 'db' is initialized.
    // If running in Edge runtime, this might need admin SDK, but for now assuming standard Node/Client.

    await addDoc(collection(db, "system_logs"), {
      message,
      type,
      context,
      userId: userId || "system",
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to write system log:", error);
  }
}
