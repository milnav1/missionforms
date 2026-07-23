// Mission 1o2 — admin.html: Netlify Identity auth + live Postgres data + CRUD + CSV export
import { getUser, login, logout, oauthLogin, handleAuthCallback } from "https://esm.sh/@netlify/identity@1";

(function () {
  var submissions = [];
  var releases = [];
  var subFilter = "all", subQuery = "";
  var relFilter = "all", relQuery = "";
  var editingSubId = null, editingRelId = null;

  var loginGate = document.getElementById("loginGate");
  var adminApp = document.getElementById("adminApp");
  var loginError = document.getElementById("loginError");

  function esc(str) {
    return (str || "").toString().replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function initials(name) {
    return (name || "").split(" ").map(function (p) { return p[0] || ""; }).join("").slice(0, 2).toUpperCase();
  }
  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }

  var STATUS_LABEL = { new: "New", review: "In review", approved: "Approved", posted: "Posted" };
  var STATUS_BADGE = { new: "badge-new", review: "badge-review", approved: "badge-approved", posted: "badge-posted" };

  // ---------- Auth ----------
  async function refreshAuthUI() {
    var user = null;
    try { user = await getUser(); } catch (e) { user = null; }

    if (user) {
      loginGate.hidden = true;
      adminApp.hidden = false;
      loadData();
    } else {
      loginGate.hidden = false;
      adminApp.hidden = true;
    }
  }

  document.getElementById("loginBtn").addEventListener("click", async function () {
    var email = document.getElementById("loginEmail").value.trim();
    var password = document.getElementById("loginPassword").value;
    loginError.hidden = true;
    try {
      await login(email, password);
      await refreshAuthUI();
    } catch (err) {
      loginError.textContent = (err && err.message) || "Login failed. Check your email and password.";
      loginError.hidden = false;
    }
  });

  document.getElementById("loginPassword").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("loginBtn").click();
  });

  document.getElementById("googleLoginBtn").addEventListener("click", function () {
    oauthLogin("google");
  });

  document.getElementById("logoutBtn").addEventListener("click", async function () {
    await logout();
    await refreshAuthUI();
  });

  // ---------- Data loading ----------
  async function loadData() {
    try {
      var res = await fetch("/api/admin-data");
      if (res.status === 401) { await refreshAuthUI(); return; }
      var data = await res.json();
      submissions = data.submissions || [];
      releases = data.releases || [];
      renderAll();
    } catch (err) {
      console.error("Failed to load admin data", err);
    }
  }

  // ---------- Media viewer ----------
  async function viewMedia(key) {
    try {
      var res = await fetch("/api/media?key=" + encodeURIComponent(key));
      if (!res.ok) { alert("Couldn't load that file."); return; }
      var blob = await res.blob();
      var url = URL.createObjectURL(blob);
      window.open(url, "_blank");
    } catch (err) {
      alert("Couldn't load that file.");
    }
  }

  // ---------- Stats ----------
  function renderStats() {
    var total = submissions.length;
    var byEmail = {};
    submissions.forEach(function (s) {
      var key = (s.email || "").toLowerCase();
      byEmail[key] = (byEmail[key] || 0) + 1;
    });
    var unique = Object.keys(byEmail).length;
    var optedCount = submissions.filter(function (s) { return s.optin === "opted"; }).length;
    var optedPct = total ? Math.round((optedCount / total) * 100) : 0;
    var ambassadors = Object.keys(byEmail).filter(function (k) { return byEmail[k] >= 3; }).length;

    document.getElementById("statsRow").innerHTML =
      statCard(total, "Total Submissions") +
      statCard(unique, "Unique Contributors") +
      statCard(optedPct + "%", "Opted In to Release") +
      statCard(ambassadors, "Potential Ambassadors (3+ submissions)");
  }
  function statCard(num, label) {
    return '<div class="stat-card"><div class="stat-num">' + esc(num) + '</div><div class="stat-label">' + esc(label) + '</div></div>';
  }

  function historyCountFor(email) {
    var key = (email || "").toLowerCase();
    return submissions.filter(function (s) { return (s.email || "").toLowerCase() === key; }).length;
  }

  // ---------- Render: Submissions ----------
  function renderSubmissions() {
    var body = document.getElementById("submissionsBody");
    var rows = submissions.filter(function (s) {
      if (subFilter !== "all" && s.status !== subFilter) return false;
      if (subQuery) {
        var hay = (s.full_name + " " + s.handle).toLowerCase();
        if (hay.indexOf(subQuery.toLowerCase()) === -1) return false;
      }
      return true;
    });

    body.innerHTML = rows.map(function (s) {
      var count = historyCountFor(s.email);
      var influencerBadge = count >= 3 ? ' <span class="badge badge-influencer">Ambassador candidate</span>' : "";
      var optinBadge = s.optin === "opted"
        ? '<span class="badge badge-optin">Opted in</span>'
        : '<span class="badge" style="background:#fde3e3; color:#9b2c2c;">Prefers no tag</span>';
      var mediaCell = s.media_key
        ? '<button class="icon-btn" data-view-media="' + esc(s.media_key) + '">View</button>'
        : '&mdash;';

      return (
        '<tr>' +
          '<td><div class="person-cell"><div class="avatar">' + esc(initials(s.full_name)) + '</div><div>' +
            '<div class="person-name">' + esc(s.full_name) + influencerBadge + '</div>' +
            '<div class="person-handle">' + esc(s.handle) + '</div>' +
          '</div></div></td>' +
          '<td>' + esc(s.platform) + '</td>' +
          '<td><span class="history-count">' + count + '</span> submission' + (count === 1 ? '' : 's') + '</td>' +
          '<td>&ldquo;' + esc(s.comment) + '&rdquo;<br><span class="hint" style="margin:0;">' + esc(fmtDate(s.created_at)) + '</span></td>' +
          '<td>' + mediaCell + '</td>' +
          '<td>' + esc(s.product) + '</td>' +
          '<td>' + optinBadge + '</td>' +
          '<td><span class="badge ' + STATUS_BADGE[s.status] + '">' + (STATUS_LABEL[s.status] || esc(s.status)) + '</span></td>' +
          '<td>' + (esc(s.notes) || '&mdash;') + '</td>' +
          '<td><div class="row-actions">' +
            '<button class="icon-btn" data-edit-sub="' + s.id + '">Edit</button>' +
            '<button class="icon-btn danger" data-del-sub="' + s.id + '">Delete</button>' +
          '</div></td>' +
        '</tr>'
      );
    }).join("") || '<tr><td colspan="10" style="text-align:center; color:#948d9e; padding:24px;">No submissions yet.</td></tr>';
  }

  // ---------- Render: Releases ----------
  function renderReleases() {
    var body = document.getElementById("releasesBody");
    var rows = releases.filter(function (r) {
      if (relFilter !== "all" && r.status !== relFilter) return false;
      if (relQuery) {
        var hay = (r.full_name + " " + r.email).toLowerCase();
        if (hay.indexOf(relQuery.toLowerCase()) === -1) return false;
      }
      return true;
    });

    body.innerHTML = rows.map(function (r) {
      var statusBadge = r.status === "active"
        ? '<span class="badge badge-active">Active</span>'
        : '<span class="badge badge-revoked">Revoked</span>';
      var sigCell = r.signature_key
        ? '<button class="icon-btn" data-view-media="' + esc(r.signature_key) + '">View</button>'
        : '&mdash;';

      return (
        '<tr>' +
          '<td><div class="person-cell"><div class="avatar">' + esc(initials(r.full_name)) + '</div><div>' +
            '<div class="person-name">' + esc(r.full_name) + '</div>' +
            '<div class="person-handle">' + esc(r.email) + (r.handle ? ' &middot; ' + esc(r.handle) : '') + '</div>' +
          '</div></div></td>' +
          '<td>' + esc(r.context) + '</td>' +
          '<td>' + esc(fmtDate(r.created_at)) + '</td>' +
          '<td>' + sigCell + '</td>' +
          '<td>' + statusBadge + '</td>' +
          '<td>' + (esc(r.notes) || '&mdash;') + '</td>' +
          '<td><div class="row-actions">' +
            '<button class="icon-btn" data-edit-rel="' + r.id + '">Edit</button>' +
            '<button class="icon-btn danger" data-del-rel="' + r.id + '">Delete</button>' +
          '</div></td>' +
        '</tr>'
      );
    }).join("") || '<tr><td colspan="7" style="text-align:center; color:#948d9e; padding:24px;">No releases yet.</td></tr>';
  }

  function renderAll() {
    renderStats();
    renderSubmissions();
    renderReleases();
  }

  // ---------- Tabs ----------
  document.querySelectorAll(".admin-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".admin-tab").forEach(function (t) { t.classList.remove("active"); });
      document.querySelectorAll(".admin-panel").forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      document.getElementById("panel-" + tab.getAttribute("data-tab")).classList.add("active");
    });
  });

  // ---------- Filters / search ----------
  document.getElementById("submissionFilterChips").addEventListener("click", function (e) {
    var chip = e.target.closest(".filter-chip");
    if (!chip) return;
    this.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
    chip.classList.add("active");
    subFilter = chip.getAttribute("data-status");
    renderSubmissions();
  });
  document.getElementById("submissionSearch").addEventListener("input", function () {
    subQuery = this.value.trim();
    renderSubmissions();
  });
  document.getElementById("releaseFilterChips").addEventListener("click", function (e) {
    var chip = e.target.closest(".filter-chip");
    if (!chip) return;
    this.querySelectorAll(".filter-chip").forEach(function (c) { c.classList.remove("active"); });
    chip.classList.add("active");
    relFilter = chip.getAttribute("data-status");
    renderReleases();
  });
  document.getElementById("releaseSearch").addEventListener("input", function () {
    relQuery = this.value.trim();
    renderReleases();
  });

  // ---------- Modal helpers ----------
  function openModal(id) { document.getElementById(id).classList.add("open"); }
  function closeModal(id) { document.getElementById(id).classList.remove("open"); }
  document.querySelectorAll("[data-close-modal]").forEach(function (btn) {
    btn.addEventListener("click", function () { closeModal(btn.getAttribute("data-close-modal")); });
  });
  document.querySelectorAll(".modal-overlay").forEach(function (overlay) {
    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // ---------- Row actions: view media / edit / delete (submissions) ----------
  document.getElementById("submissionsBody").addEventListener("click", function (e) {
    var viewBtn = e.target.closest("[data-view-media]");
    var editBtn = e.target.closest("[data-edit-sub]");
    var delBtn = e.target.closest("[data-del-sub]");

    if (viewBtn) viewMedia(viewBtn.getAttribute("data-view-media"));

    if (editBtn) {
      editingSubId = editBtn.getAttribute("data-edit-sub");
      var s = submissions.find(function (x) { return String(x.id) === editingSubId; });
      if (!s) return;
      document.getElementById("editSubmissionWho").textContent = s.full_name + " (" + s.handle + ")";
      document.getElementById("editSubStatus").value = s.status;
      document.getElementById("editSubOptin").value = s.optin;
      document.getElementById("editSubNotes").value = s.notes || "";
      openModal("editSubmissionModal");
    }

    if (delBtn) {
      var id = delBtn.getAttribute("data-del-sub");
      var target = submissions.find(function (x) { return String(x.id) === id; });
      if (target && confirm('Delete submission from "' + target.full_name + '"? This can\'t be undone.')) {
        fetch("/api/admin-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "submissions", id: id })
        }).then(function () { loadData(); });
      }
    }
  });

  document.getElementById("editSubmissionForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var fields = {
      status: document.getElementById("editSubStatus").value,
      optin: document.getElementById("editSubOptin").value,
      notes: document.getElementById("editSubNotes").value
    };
    fetch("/api/admin-update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "submissions", id: editingSubId, fields: fields })
    }).then(function () {
      closeModal("editSubmissionModal");
      loadData();
    });
  });

  // ---------- Row actions: view media / edit / delete (releases) ----------
  document.getElementById("releasesBody").addEventListener("click", function (e) {
    var viewBtn = e.target.closest("[data-view-media]");
    var editBtn = e.target.closest("[data-edit-rel]");
    var delBtn = e.target.closest("[data-del-rel]");

    if (viewBtn) viewMedia(viewBtn.getAttribute("data-view-media"));

    if (editBtn) {
      editingRelId = editBtn.getAttribute("data-edit-rel");
      var r = releases.find(function (x) { return String(x.id) === editingRelId; });
      if (!r) return;
      document.getElementById("editReleaseWho").textContent = r.full_name + " (" + r.email + ")";
      document.getElementById("editRelContext").value = r.context || "";
      document.getElementById("editRelStatus").value = r.status;
      document.getElementById("editRelNotes").value = r.notes || "";
      openModal("editReleaseModal");
    }

    if (delBtn) {
      var id = delBtn.getAttribute("data-del-rel");
      var target = releases.find(function (x) { return String(x.id) === id; });
      if (target && confirm('Delete release signed by "' + target.full_name + '"? This can\'t be undone.')) {
        fetch("/api/admin-delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ table: "releases", id: id })
        }).then(function () { loadData(); });
      }
    }
  });

  document.getElementById("editReleaseForm").addEventListener("submit", function (e) {
    e.preventDefault();
    var fields = {
      context: document.getElementById("editRelContext").value,
      status: document.getElementById("editRelStatus").value,
      notes: document.getElementById("editRelNotes").value
    };
    fetch("/api/admin-update", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ table: "releases", id: editingRelId, fields: fields })
    }).then(function () {
      closeModal("editReleaseModal");
      loadData();
    });
  });

  // ---------- CSV export ----------
  function downloadCsv(table, filename) {
    fetch("/api/export-csv?table=" + table)
      .then(function (res) { return res.blob(); })
      .then(function (blob) {
        var url = URL.createObjectURL(blob);
        var a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      });
  }
  document.getElementById("exportSubmissionsBtn").addEventListener("click", function () {
    downloadCsv("submissions", "mission1o2-submissions.csv");
  });
  document.getElementById("exportReleasesBtn").addEventListener("click", function () {
    downloadCsv("releases", "mission1o2-releases.csv");
  });

  // ---------- Boot ----------
  handleAuthCallback().catch(function () {}).then(refreshAuthUI);
})();
