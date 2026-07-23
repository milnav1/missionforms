import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const form = await req.formData();

    if ((form.get("company") || "").toString().trim() !== "") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const fullName = (form.get("fullName") || "").toString().trim();
    const email = (form.get("email") || "").toString().trim();
    const phone = (form.get("phone") || "").toString().trim();
    const handle = (form.get("handle") || "").toString().trim();
    const context = (form.get("context") || "").toString().trim();
    const releaseAgree = form.get("releaseAgree");
    const signatureFile = form.get("signature");

    if (!fullName || !email || !releaseAgree || !signatureFile || signatureFile.size === 0) {
      return new Response(JSON.stringify({ error: "Please fill in all required fields and sign before submitting." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const store = getStore("media");
    const signatureKey = `signatures/${Date.now()}-${crypto.randomUUID()}.png`;
    await store.set(signatureKey, await signatureFile.arrayBuffer(), {
      metadata: { contentType: "image/png" }
    });

    const db = getDatabase();
    await db.sql`
      INSERT INTO releases
        (full_name, email, phone, handle, context, signature_key)
      VALUES
        (${fullName}, ${email}, ${phone}, ${handle}, ${context}, ${signatureKey})
    `;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("submit-release error", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
