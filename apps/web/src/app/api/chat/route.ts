import { OpenAIStream, StreamingTextResponse } from "ai";
import OpenAI from "openai";
import { adminDb } from "@/lib/firebase-admin";

// Create OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

// Validate env vars for debugging
if (!process.env.OPENAI_API_KEY) {
  console.error("Missing OPENAI_API_KEY");
}

export async function POST(req: Request) {
  try {
    const { messages, storeId } = await req.json();

    if (!storeId || storeId === "unknown") {
      return new Response("Missing storeId", { status: 400 });
    }

    console.log(`AI Request for store: ${storeId}`);

    // 3. Define Tools (Native JSON Schema)
    const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = [
      {
        type: "function",
        function: {
          name: "listProducts",
          description: "List the store's products.",
          parameters: {
            type: "object",
            properties: {
              search: {
                type: "string",
                description: "Optional name to search for",
              },
            },
          },
        },
      },
      {
        type: "function",
        function: {
          name: "updateStoreName",
          description: "Update the store name.",
          parameters: {
            type: "object",
            properties: {
              newName: { type: "string", description: "The new name" },
            },
            required: ["newName"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "setStoreStatus",
          description: "Open (live) or Close (maintenance) the store.",
          parameters: {
            type: "object",
            properties: {
              isLive: {
                type: "boolean",
                description: "true for Live, false for Closed",
              },
            },
            required: ["isLive"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getRecentOrders",
          description: "Get recent 5 orders.",
          parameters: { type: "object", properties: {} },
        },
      },
      {
        type: "function",
        function: {
          name: "updateProduct",
          description: "Update product price/stock.",
          parameters: {
            type: "object",
            properties: {
              productId: {
                type: "string",
                description:
                  "The product ID OR the exact product name (e.g. 'Shorts 1')",
              },
              price: { type: "number" },
              stock: { type: "number" },
              name: { type: "string" },
            },
            required: ["productId"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "batchUpdateProducts",
          description:
            "Apply a bulk update to products (e.g. discount or fixed price).",
          parameters: {
            type: "object",
            properties: {
              operation: {
                type: "string",
                enum: [
                  "discount_percent",
                  "increase_percent",
                  "set_price",
                  "set_stock",
                ],
                description: "Type of update",
              },
              value: {
                type: "number",
                description: "The value to apply (e.g. 20 for 20% discount)",
              },
              searchFilter: {
                type: "string",
                description:
                  "Optional: Only update products matching this name",
              },
            },
            required: ["operation", "value"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "deleteProduct",
          description: "Delete a product by ID or name.",
          parameters: {
            type: "object",
            properties: {
              productId: {
                type: "string",
                description: "The product ID OR exact product name",
              },
            },
            required: ["productId"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "getPromotionalContext",
          description: "Retrieve product details for generating a promo card.",
          parameters: {
            type: "object",
            properties: {
              productId: {
                type: "string",
                description: "The product ID OR exact product name",
              },
            },
            required: ["productId"],
          },
        },
      },
      // --- CATEGORY TOOLS ---
      {
        type: "function",
        function: {
          name: "addCategory",
          description: "Create a new product category.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the category (e.g. 'Sneakers')",
              },
            },
            required: ["name"],
          },
        },
      },
      {
        type: "function",
        function: {
          name: "deleteCategory",
          description: "Delete a global category.",
          parameters: {
            type: "object",
            properties: {
              name: {
                type: "string",
                description: "Name of the category to delete",
              },
            },
            required: ["name"],
          },
        },
      },
      // --- ORDER TOOLS ---
      {
        type: "function",
        function: {
          name: "updateOrderStatus",
          description: "Update status for specific order OR last N orders.",
          parameters: {
            type: "object",
            properties: {
              status: {
                type: "string",
                enum: ["packaged", "sent-out", "delivered", "paid"],
                description: "New status",
              },
              orderId: {
                type: "string",
                description: "Specific Order ID (optional)",
              },
              limit: {
                type: "number",
                description:
                  "Update the last N orders (if no orderId provided)",
              },
            },
            required: ["status"],
          },
        },
      },
      // --- INSIGHTS TOOLS ---
      {
        type: "function",
        function: {
          name: "getStoreInsights",
          description:
            "Get financial data, plan details, and recent transactions for strategic advice.",
          parameters: { type: "object", properties: {} },
        },
      },
    ];

    // 4. Initial Call
    const systemMessage: OpenAI.Chat.Completions.ChatCompletionMessageParam = {
      role: "system",
      content:
        "You are a helpful Store Admin Assistant. When listing data, use clean Markdown tables. \n\n" +
        "You can now manage Categories, Orders, and providing Financial Strategy. \n" +
        "If the user asks for 'marketing advice' or 'how to boost sales', ALWAYS start by calling `getStoreInsights` to understand their revenue and plan context. \n" +
        "When explaining fees or payouts, use the data from `getStoreInsights`. \n" +
        "Be concise but professional.",
    };

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      stream: true,
      messages: [systemMessage, ...messages],
      tools,
      tool_choice: "auto",
    });

    // 5. OpenAI Stream with Tool Execution
    const stream = OpenAIStream(response as any, {
      experimental_onToolCall: async (callPayload: any, context: any) => {
        console.log("Device Tool Payload:", JSON.stringify(callPayload));

        const msgHistory = context?.messages || [];

        const toolCalls = callPayload.tools || [callPayload]; // Fallback
        const toolCall = toolCalls[0];

        if (!toolCall) return null;

        const fnName = toolCall.func?.name || toolCall.function?.name;
        const rawArgs =
          toolCall.func?.arguments || toolCall.function?.arguments;

        let fnArgs: any = {};
        if (typeof rawArgs === "string") {
          try {
            fnArgs = JSON.parse(rawArgs);
          } catch (e) {
            console.error("JSON Parse Error for args:", rawArgs);
          }
        } else if (typeof rawArgs === "object" && rawArgs !== null) {
          fnArgs = rawArgs;
        }

        console.log(`[Tool Call] ${fnName}:`, fnArgs);

        // Execute Tool
        let result = "";
        try {
          // --- EXISTING TOOLS ---
          if (fnName === "listProducts") {
            const search = (fnArgs as any).search?.toLowerCase();
            const snap = await adminDb
              .collection("stores")
              .doc(storeId)
              .collection("products")
              .limit(50)
              .limit(50)
              .get();

            console.log(
              `[listProducts] Path: stores/${storeId}/products, Found: ${snap.size} docs`
            );

            let products = snap.docs.map((d: any) => ({
              id: d.id,
              ...d.data(),
            }));

            if (search) {
              products = products.filter((p: any) =>
                p.name?.toLowerCase().includes(search)
              );
            }

            result =
              products.length === 0
                ? "No products found."
                : products
                    .map(
                      (p: any) =>
                        `[ID: ${p.id}] ${p.name} ($${p.price}) - Stock: ${
                          p.stock ?? "N/A"
                        }`
                    )
                    .join("\n");
          } else if (fnName === "batchUpdateProducts") {
            const op = (fnArgs as any).operation;
            const val = (fnArgs as any).value;
            const filter = (fnArgs as any).searchFilter?.toLowerCase();

            const snap = await adminDb
              .collection("stores")
              .doc(storeId)
              .collection("products")
              .limit(100)
              .get();
            let docs = snap.docs;

            if (filter) {
              docs = docs.filter((d: any) =>
                d.data().name.toLowerCase().includes(filter)
              );
            }

            const batch = adminDb.batch();
            let count = 0;

            docs.forEach((doc: any) => {
              const data = doc.data();
              let update: any = null;

              if (op === "discount_percent") {
                const newPrice = Math.max(0, data.price * (1 - val / 100));
                update = { price: Number(newPrice.toFixed(2)) };
              } else if (op === "increase_percent") {
                const newPrice = data.price * (1 + val / 100);
                update = { price: Number(newPrice.toFixed(2)) };
              } else if (op === "set_price") {
                update = { price: val };
              } else if (op === "set_stock") {
                update = { stock: val };
              }

              if (update) {
                batch.update(doc.ref, update);
                count++;
              }
            });

            if (count > 0) await batch.commit();
            result = `Batch updated ${count} products (${op} ${val}).`;
          } else if (fnName === "updateStoreName") {
            await adminDb
              .collection("stores")
              .doc(storeId)
              .update({ name: (fnArgs as any).newName });
            result = `Updated name to ${(fnArgs as any).newName}`;
          } else if (fnName === "setStoreStatus") {
            const status = (fnArgs as any).isLive ? "live" : "maintenance";
            await adminDb.collection("stores").doc(storeId).update({ status });
            result = `Status updated to ${status}`;
          } else if (fnName === "getRecentOrders") {
            const snap = await adminDb
              .collection("stores")
              .doc(storeId)
              .collection("orders")
              .orderBy("createdAt", "desc")
              .limit(5)
              .get();
            result = snap.empty
              ? "No orders."
              : snap.docs
                  .map(
                    (d: any) =>
                      `Order ${d.id} - Total: $${d.data().total} - Status: ${
                        d.data().status
                      } - Customer: ${d.data().customerName}`
                  )
                  .join("\n");
          } else if (fnName === "updateProduct") {
            const args = fnArgs as any;
            const up: any = {};
            if (args.price) up.price = args.price;
            if (args.stock !== undefined) up.stock = args.stock;
            if (args.name) up.name = args.name;

            const productsRef = adminDb
              .collection("stores")
              .doc(storeId)
              .collection("products");
            let targetId = args.productId;

            const docSnap = await productsRef.doc(targetId).get();
            if (!docSnap.exists) {
              console.log(
                `Product ID ${targetId} not found, searching by name (fuzzy)...`
              );
              const listSnap = await productsRef.limit(100).get();
              const normalize = (s: string) =>
                s.toLowerCase().replace(/[^a-z0-9]/g, "");
              const targetClean = normalize(targetId);

              const match = listSnap.docs.find((d: any) => {
                const name = d.data().name || "";
                return normalize(name) === targetClean;
              });

              if (match) {
                targetId = match.id;
              } else {
                const partial = listSnap.docs.find((d: any) =>
                  normalize(d.data().name || "").includes(targetClean)
                );
                if (partial) {
                  targetId = partial.id;
                } else {
                  throw new Error(
                    `Product not found: "${args.productId}". Try using the exact name.`
                  );
                }
              }
            }

            await productsRef.doc(targetId).update(up);
            result = `Product updated (ID: ${targetId}).`;

            // --- NEW TOOLS ---
          } else if (fnName === "deleteProduct") {
            const args = fnArgs as any;
            const productsRef = adminDb
              .collection("stores")
              .doc(storeId)
              .collection("products");
            let targetId = args.productId;

            const docSnap = await productsRef.doc(targetId).get();
            if (!docSnap.exists) {
              console.log(
                `Product ID ${targetId} not found, searching by name (fuzzy)...`
              );
              const listSnap = await productsRef.limit(100).get();
              const normalize = (s: string) =>
                s.toLowerCase().replace(/[^a-z0-9]/g, "");
              const targetClean = normalize(targetId);

              const match = listSnap.docs.find((d: any) => {
                const name = d.data().name || "";
                return normalize(name) === targetClean;
              });

              if (match) {
                targetId = match.id;
              } else {
                throw new Error(`Product not found: "${args.productId}".`);
              }
            }

            await productsRef.doc(targetId).delete();
            result = `Product deleted (ID: ${targetId}).`;
          } else if (fnName === "getPromotionalContext") {
            const args = fnArgs as any;
            const productsRef = adminDb
              .collection("stores")
              .doc(storeId)
              .collection("products");
            let targetId = args.productId;
            let productData: any = {};

            const docSnap = await productsRef.doc(targetId).get();
            if (docSnap.exists) {
              productData = { id: docSnap.id, ...docSnap.data() };
            } else {
              console.log(
                `Product ID ${targetId} not found, searching by name (fuzzy)...`
              );
              const listSnap = await productsRef.limit(100).get();
              const normalize = (s: string) =>
                s.toLowerCase().replace(/[^a-z0-9]/g, "");
              const targetClean = normalize(targetId);

              const match = listSnap.docs.find((d: any) => {
                const name = d.data().name || "";
                return normalize(name) === targetClean;
              });

              if (match) {
                targetId = match.id;
                productData = { id: match.id, ...match.data() };
              } else {
                throw new Error(`Product not found: "${args.productId}".`);
              }
            }

            result = `[PROMO_DATA_JSON]${JSON.stringify(productData)}`;

            // --- NEW CATEGORY & ORDER TOOLS ---
          } else if (fnName === "addCategory") {
            const name = (fnArgs as any).name;
            const slug = name.toLowerCase().replace(/\s+/g, "-");
            await adminDb.collection("categories").add({
              name,
              slug,
              createdAt: new Date(),
            });
            result = `Category created: ${name} (/${slug})`;
          } else if (fnName === "deleteCategory") {
            const targetName = (fnArgs as any).name.toLowerCase();
            const snap = await adminDb.collection("categories").get();

            const match = snap.docs.find((d: any) =>
              d.data().name.toLowerCase().includes(targetName)
            );
            if (match) {
              await adminDb.collection("categories").doc(match.id).delete();
              result = `Category deleted: ${match.data().name}`;
            } else {
              result = `Category '${targetName}' not found.`;
            }
          } else if (fnName === "updateOrderStatus") {
            const status = (fnArgs as any).status;
            const orderId = (fnArgs as any).orderId;
            const limitCount = (fnArgs as any).limit;
            const ordersRef = adminDb
              .collection("stores")
              .doc(storeId)
              .collection("orders");

            let count = 0;

            if (orderId) {
              // Single Update
              await ordersRef.doc(orderId).update({ status });
              result = `Order ${orderId} updated to ${status}.`;
            } else {
              // Bulk Update (Last N)
              const q = await ordersRef
                .orderBy("createdAt", "desc")
                .limit(limitCount || 5)
                .get();
              const batch = adminDb.batch();
              q.docs.forEach((d: any) => {
                batch.update(d.ref, { status });
                count++;
              });
              if (count > 0) await batch.commit();
              result = `Updated ${count} recent orders to ${status}.`;
            }
          } else if (fnName === "getStoreInsights") {
            // 1. Wallet
            const walletSnap = await adminDb
              .collection("stores")
              .doc(storeId)
              .collection("wallet")
              .doc("main")
              .get();
            const wallet = walletSnap.exists
              ? walletSnap.data()
              : { currentBalance: 0, pendingBalance: 0, totalEarned: 0 };

            // 2. Store Config (Plan)
            const storeSnap = await adminDb
              .collection("stores")
              .doc(storeId)
              .get();
            const store = storeSnap.exists ? storeSnap.data() : {};

            console.log(
              `[getStoreInsights] Path: stores/${storeId}, Exists: ${storeSnap.exists}`
            );

            // 3. Recent Tx
            const txSnap = await adminDb
              .collection("stores")
              .doc(storeId)
              .collection("wallet_transactions")
              .orderBy("createdAt", "desc")
              .limit(5)
              .get();
            const txs = txSnap.docs
              .map(
                (d: any) =>
                  `${d.data().type}: ${d.data().amount} (${
                    d.data().description
                  })`
              )
              .join(", ");

            result = `
### Store Insights
- **Plan**: ${store?.plan || "Unknown"} (Status: ${store?.status})
- **Balance**: GHS ${wallet?.currentBalance} (Available), GHS ${
              wallet?.pendingBalance
            } (Pending)
- **Total Earned**: GHS ${wallet?.totalEarned}
- **Recent Transactions**: ${txs || "None"}
- **Payout Config**: ${store?.payoutConfig ? "Configured" : "Not Configured"}

Use this data to advise the user on cash flow, upgrading their plan, or marketing (e.g. if sales are low).
             `.trim();
          } else {
            result = "Unknown tool.";
          }
        } catch (e: any) {
          console.error(e);
          result = `Error: ${e.message}`;
        }

        const normalizedToolCall = {
          id: toolCall.id,
          type: "function",
          function: {
            name: fnName,
            arguments:
              typeof rawArgs === "object"
                ? JSON.stringify(rawArgs)
                : rawArgs || "{}",
          },
        };

        const newMessages = [
          ...msgHistory,
          {
            role: "assistant",
            content: null,
            tool_calls: [normalizedToolCall],
          },
          {
            role: "tool",
            tool_call_id: toolCall.id,
            name: fnName,
            content: result,
          },
        ];

        return openai.chat.completions.create({
          model: "gpt-4o-mini",
          stream: true,
          messages: [systemMessage, ...newMessages] as any, // Ensure System Prompt is preserved
          tools,
        }) as any;
      },
    });

    return new StreamingTextResponse(stream);
  } catch (error: any) {
    console.error("Chat Error:", error);
    return new Response(error.message, { status: 500 });
  }
}
