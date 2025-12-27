"use client";

import { useEffect, useState } from "react";
import { collection, getDocs, limit, query } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { User, Mail } from "lucide-react";

interface UserProfile {
  id: string;
  email: string;
  name?: string;
  phone?: string;
  createdAt?: any;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const q = query(collection(db, "users"), limit(50)); // Limit for performance
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as UserProfile[];
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading users...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">
          User Management
        </h1>
        <p className="text-zinc-400">
          View registered customers (Showing last 50).
        </p>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-zinc-900 border-b border-zinc-800 text-xs uppercase text-zinc-500 font-bold">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Contact</th>
              <th className="p-4">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-white/5 transition-colors">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500">
                      <User size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-white">
                        {user.name || "Anonymous User"}
                      </div>
                      <div className="text-xs text-zinc-500 font-mono">
                        {user.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-sm text-zinc-300">
                      <Mail size={14} className="text-zinc-500" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="text-xs text-zinc-500">{user.phone}</div>
                    )}
                  </div>
                </td>
                <td className="p-4 text-sm text-zinc-500">
                  {user.createdAt?.seconds
                    ? new Date(
                        user.createdAt.seconds * 1000
                      ).toLocaleDateString()
                    : "Unknown"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
