import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

const ALLOWED_FIELDS = {
  submissions: ["status", "optin", "notes"],
  releases: ["context", "status", "notes"]
};

export default async (req) => {
  if (req.method !== "PATCH") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const body = await req.json();
    const { table, id, fields } = body || {};

    if (!["submissions", "releases"].includes(table) || !id || !fields || typeof fields !== "object") {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const allowed = ALLOWED_FIELDS[table];
    for (const key of Object.keys(fields)) {
      if (!allowed.includes(key)) {
        return new Response(JSON.stringify({ error: `Field not editable: ${key}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    const db = getDatabase();

    if (table === "submissions") {
      await db.sql`
        UPDATE submissions
        SET status = COALESCE(${fields.status ?? null}, status),
            optin = COALESCE(${fields.optin ?? null}, optin),
            notes = COALESCE(${fields.notes ?? null}, notes)
        WHERE id = ${id}
      `;
    } else {
      await db.sql`
        UPDATE releases
        SET context = COALESCE(${fields.context ?? null}, context),
            status = COALESCE(${fields.status ?? null}, status),
            notes = COALESCE(${fields.notes ?? null}, notes)
        WHERE id = ${id}
      `;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("admin-update error", err);
    return new Response(JSON.stringify({ error: "Update failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
