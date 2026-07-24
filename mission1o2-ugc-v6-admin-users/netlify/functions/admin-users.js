// Mission 1o2 — admin user management (Netlify Identity admin API).
// Lets an already-signed-in admin invite, list, delete, and trigger a
// password reset for other Mission1o2 staff admin accounts, without
// needing to use Netlify's own dashboard UI.
import { getUser, admin, requestPasswordRecovery } from "@netlify/identity";

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}

function safeUser(u) {
  return {
    id: u.id,
    email: u.email,
    role: u.role || (u.appMetadata && u.appMetadata.roles && u.appMetadata.roles[0]) || "admin",
    confirmedAt: u.confirmedAt || null,
    invitedAt: u.invitedAt || null,
    createdAt: u.createdAt || null,
    lastSignInAt: u.lastSignInAt || null
  };
}

function randomPassword() {
  // Never surfaced to the user — the account is created, then a
  // password-recovery email is sent so the new admin sets their own.
  var bytes = crypto.getRandomValues(new Uint8Array(24));
  return Array.from(bytes, function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async (req) => {
  const currentUser = await getUser();
  if (!currentUser) {
    return json({ error: "Unauthorized" }, 401);
  }

  try {
    if (req.method === "GET") {
      const users = await admin.listUsers();
      const sorted = (users || []).slice().sort(function (a, b) {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      });
      return json({ users: sorted.map(safeUser) });
    }

    if (req.method === "POST") {
      const body = await req.json();
      const email = (body && body.email || "").trim().toLowerCase();

      if (!email || !EMAIL_RE.test(email)) {
        return json({ error: "Enter a valid email address." }, 400);
      }

      const existing = await admin.listUsers();
      if ((existing || []).some(function (u) { return (u.email || "").toLowerCase() === email; })) {
        return json({ error: "That email is already an admin user." }, 400);
      }

      const newUser = await admin.createUser({
        email: email,
        password: randomPassword(),
        data: { role: "admin" }
      });

      // Send them a link to set their own password (reuses the same
      // recovery flow already wired up on admin.html).
      try {
        await requestPasswordRecovery(email);
      } catch (e) {
        console.error("admin-users: recovery email failed", e);
      }

      return json({ user: safeUser(newUser) }, 201);
    }

    if (req.method === "PATCH") {
      const body = await req.json();
      const id = body && body.id;
      const action = body && body.action;

      if (!id || action !== "reset-password") {
        return json({ error: "Invalid request" }, 400);
      }

      const target = await admin.getUser(id);
      if (!target || !target.email) {
        return json({ error: "User not found" }, 404);
      }

      await requestPasswordRecovery(target.email);
      return json({ ok: true });
    }

    if (req.method === "DELETE") {
      const body = await req.json();
      const id = body && body.id;
      if (!id) {
        return json({ error: "Invalid request" }, 400);
      }

      if (id === currentUser.id) {
        return json({ error: "You can't delete your own account while signed in." }, 400);
      }

      const users = await admin.listUsers();
      if ((users || []).length <= 1) {
        return json({ error: "Can't delete the last remaining admin user." }, 400);
      }

      await admin.deleteUser(id);
      return json({ ok: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err) {
    console.error("admin-users error", err);
    return json({ error: (err && err.message) || "Request failed" }, 500);
  }
};
