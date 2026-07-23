import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

export default async (req) => {
  if (req.method !== "DELETE") {
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
    const { table, id } = body || {};

    if (!["submissions", "releases"].includes(table) || !id) {
      return new Response(JSON.stringify({ error: "Invalid request" }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const db = getDatabase();
    if (table === "submissions") {
      await db.sql`DELETE FROM submissions WHERE id = ${id}`;
    } else {
      await db.sql`DELETE FROM releases WHERE id = ${id}`;
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("admin-delete error", err);
    return new Response(JSON.stringify({ error: "Delete failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
