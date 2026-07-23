import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

export default async (req) => {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  try {
    const db = getDatabase();
    const submissions = await db.sql`SELECT * FROM submissions ORDER BY created_at DESC`;
    const releases = await db.sql`SELECT * FROM releases ORDER BY created_at DESC`;

    return new Response(JSON.stringify({ submissions, releases }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("admin-data error", err);
    return new Response(JSON.stringify({ error: "Failed to load data" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
