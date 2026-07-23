import { getDatabase } from "@netlify/database";
import { getUser } from "@netlify/identity";

function toCsvValue(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toCsv(rows, columns) {
  const header = columns.join(",");
  const lines = rows.map((row) => columns.map((col) => toCsvValue(row[col])).join(","));
  return [header, ...lines].join("\r\n");
}

export default async (req) => {
  const user = await getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" }
    });
  }

  const url = new URL(req.url);
  const table = url.searchParams.get("table");
  if (!["submissions", "releases"].includes(table)) {
    return new Response("Invalid table", { status: 400 });
  }

  try {
    const db = getDatabase();
    let rows, columns, filename;

    if (table === "submissions") {
      rows = await db.sql`
        SELECT id, full_name, email, handle, platform, product, comment, optin,
               tag_consent, ambassador_interest, status, notes, created_at
        FROM submissions ORDER BY created_at DESC
      `;
      columns = ["id", "full_name", "email", "handle", "platform", "product", "comment", "optin", "tag_consent", "ambassador_interest", "status", "notes", "created_at"];
      filename = "mission1o2-submissions.csv";
    } else {
      rows = await db.sql`
        SELECT id, full_name, email, phone, handle, context, status, notes, created_at
        FROM releases ORDER BY created_at DESC
      `;
      columns = ["id", "full_name", "email", "phone", "handle", "context", "status", "notes", "created_at"];
      filename = "mission1o2-releases.csv";
    }

    const csv = toCsv(rows, columns);

    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`
      }
    });
  } catch (err) {
    console.error("export-csv error", err);
    return new Response(JSON.stringify({ error: "Export failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
