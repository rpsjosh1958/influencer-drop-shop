const { z } = require("zod/v3");

console.log("Loading Zod from zod/v3...");

const schema = z.object({
  newName: z.string()
});

console.log("\n1. Schema Construction Test:");
try {
    const result = schema.safeParse({ newName: "test" });
    console.log("Parse Result:", result.success ? "Success" : "Failure");
} catch(e) {
    console.log("Parse Error:", e.message);
}

console.log("\n2. Internal Definition (_def):");
console.log(JSON.stringify(schema._def, (key, value) => {
    if (key === "schema") return "[Circular]";
    return value;
}, 2));

console.log("\n3. Is this Zod v3?");
// Zod v3 schemas usually have a _def property.
console.log("Has _def:", !!schema._def);
// Zod v4 might different.
console.log("Constructor Name:", schema.constructor.name);
