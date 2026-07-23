// Mission 1o2 UGC prototype — shared front-end behavior

document.addEventListener("DOMContentLoaded", function () {
  // --- Release form modal (index.html) ---
  var openBtn = document.getElementById("openRelease");
  var closeBtn = document.getElementById("closeRelease");
  var modal = document.getElementById("releaseModal");

  if (openBtn && modal) {
    openBtn.addEventListener("click", function () {
      modal.classList.add("open");
    });
  }
  if (closeBtn && modal) {
    closeBtn.addEventListener("click", function () {
      modal.classList.remove("open");
    });
  }
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) modal.classList.remove("open");
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") modal.classList.remove("open");
    });
  }

  // --- File input filename preview ---
  var mediaInput = document.getElementById("media");
  var fileDrop = document.querySelector(".file-drop");
  if (mediaInput && fileDrop) {
    mediaInput.addEventListener("change", function () {
      var existing = fileDrop.querySelector(".file-chosen");
      if (existing) existing.remove();
      if (mediaInput.files && mediaInput.files.length > 0) {
        var span = document.createElement("div");
        span.className = "file-chosen";
        span.style.marginTop = "8px";
        span.style.fontWeight = "700";
        span.style.color = "#432D8B";
        span.textContent = "Selected: " + mediaInput.files[0].name;
        fileDrop.appendChild(span);
      }
    });
  }

  // --- Submit via fetch to the Netlify Function (writes to Postgres) ---
  var form = document.getElementById("ugcForm");
  var errorBox = document.getElementById("formError");
  var submitBtn = document.getElementById("submitBtn");

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ""; }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting..."; }

      var formData = new FormData(form);

      fetch("/api/submit-story", { method: "POST", body: formData })
        .then(function (res) {
          return res.json().then(function (data) { return { ok: res.ok, data: data }; });
        })
        .then(function (result) {
          if (result.ok) {
            window.location.href = "thank-you.html";
          } else {
            throw new Error((result.data && result.data.error) || "Something went wrong. Please try again.");
          }
        })
        .catch(function (err) {
          if (errorBox) {
            errorBox.textContent = err.message || "Something went wrong. Please try again.";
            errorBox.hidden = false;
            errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
          }
          if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Submit My Story"; }
        });
    });
  }
});
