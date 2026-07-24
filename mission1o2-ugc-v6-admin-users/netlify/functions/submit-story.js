import { getDatabase } from "@netlify/database";
import { getStore } from "@netlify/blobs";

export default async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const form = await req.formData();

    // Honeypot — bots that fill this out get a silent fake-success.
    if ((form.get("company") || "").toString().trim() !== "") {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" }
      });
    }

    const fullName = (form.get("fullName") || "").toString().trim();
    const email = (form.get("email") || "").toString().trim();
    const handle = (form.get("handle") || "").toString().trim();
    const platform = (form.get("platform") || "").toString().trim();
    const product = (form.get("product") || "").toString().trim();
    const comment = (form.get("comment") || "").toString().trim();
    const releaseAgree = form.get("releaseAgree");
    const tagConsent = !!form.get("tagConsent");
    const ambassadorInterest = !!form.get("ambassadorInterest");

    if (!fullName || !email || !handle || !comment || !releaseAgree) {
      return new Response(JSON.stringify({ error: "Please fill in all required fields." }), {
        status: 400,
        headers: { "Content-Type": "application/json" }
      });
    }

    const optin = platform === "Prefer not to be tagged" ? "no-tag" : "opted";

    let mediaKey = null;
    let mediaType = null;
    const mediaFile = form.get("media");
    if (mediaFile && typeof mediaFile.arrayBuffer === "function" && mediaFile.size > 0) {
      const store = getStore("media");
      const safeName = (mediaFile.name || "upload").replace(/[^a-zA-Z0-9._-]/g, "_");
      mediaKey = `submissions/${Date.now()}-${crypto.randomUUID()}-${safeName}`;
      await store.set(mediaKey, await mediaFile.arrayBuffer(), {
        metadata: { contentType: mediaFile.type || "application/octet-stream" }
      });
      mediaType = mediaFile.type || null;
    }

    const db = getDatabase();
    await db.sql`
      INSERT INTO submissions
        (full_name, email, handle, platform, product, comment, media_key, media_type, optin, tag_consent, ambassador_interest)
      VALUES
        (${fullName}, ${email}, ${handle}, ${platform}, ${product}, ${comment}, ${mediaKey}, ${mediaType}, ${optin}, ${tagConsent}, ${ambassadorInterest})
    `;

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    console.error("submit-story error", err);
    return new Response(JSON.stringify({ error: "Something went wrong. Please try again." }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
};
