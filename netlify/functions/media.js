import { getStore } from "@netlify/blobs";
import { getUser } from "@netlify/identity";

// Serves a stored photo/video/signature, gated behind admin login since
// this can contain customer photos, video, and signatures.
export default async (req) => {
  const user = await getUser();
  if (!user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  if (!key) return new Response("Missing key", { status: 400 });

  try {
    const store = getStore("media");
    const result = await store.getWithMetadata(key, { type: "arrayBuffer" });
    if (!result) return new Response("Not found", { status: 404 });

    return new Response(result.data, {
      status: 200,
      headers: {
        "Content-Type": result.metadata?.contentType || "application/octet-stream",
        "Cache-Control": "private, max-age=60"
      }
    });
  } catch (err) {
    console.error("media error", err);
    return new Response("Failed to load media", { status: 500 });
  }
};
