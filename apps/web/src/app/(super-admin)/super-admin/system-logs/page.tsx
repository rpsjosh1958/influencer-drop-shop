"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { AlertTriangle, Info, XCircle } from "lucide-react";

interface Log {
  id: string;
  type: "error" | "info" | "warning";
  message: string;
  context?: any;
  createdAt: any;
}

export default function LogsPage() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const q = query(
        collection(db, "system_logs"),
        orderBy("createdAt", "desc"),
        limit(50)
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Log[];
      setLogs(data);
    } catch (error) {
      console.error("Error fetching logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "error":
        return <XCircle className="text-red-500" />;
      case "warning":
        return <AlertTriangle className="text-amber-500" />;
      default:
        return <Info className="text-blue-500" />;
    }
  };

  if (loading) return <div>Loading logs...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          System Logs
        </h1>
        <p className="text-zinc-400">
          Monitoring platform health (Last 50 events).
        </p>
      </div>

      <div className="border border-zinc-800 rounded-2xl overflow-hidden bg-zinc-900/50">
        <table className="w-full text-left font-mono text-sm">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-500">
            <tr>
              <th className="p-4 w-16">Type</th>
              <th className="p-4">Message</th>
              <th className="p-4 w-48 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-white/5">
                <td className="p-4">{getIcon(log.type)}</td>
                <td className="p-4 text-zinc-300">
                  <div className="font-bold">{log.message}</div>
                  {log.context && (
                    <pre className="mt-1 text-xs text-zinc-500 overflow-x-auto">
                      {JSON.stringify(log.context, null, 2)}
                    </pre>
                  )}
                </td>
                <td className="p-4 text-right text-zinc-500">
                  {log.createdAt?.seconds
                    ? new Date(log.createdAt.seconds * 1000).toLocaleString()
                    : "Just now"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="p-12 text-center text-zinc-500">
            No logs found. System is healthy (or logging is broken).
          </div>
        )}
      </div>
    </div>
  );
}
