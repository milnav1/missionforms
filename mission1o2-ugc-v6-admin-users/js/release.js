// Mission 1o2 — release.html signature pad + submit guard

document.addEventListener("DOMContentLoaded", function () {
  var canvas = document.getElementById("signatureCanvas");
  if (!canvas) return;

  var ctx = canvas.getContext("2d");
  var hasSignature = false;
  var drawing = false;
  var lastX = 0, lastY = 0;

  function sizeCanvas() {
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#2f1f63";
  }
  sizeCanvas();

  function pointFromEvent(e) {
    var rect = canvas.getBoundingClientRect();
    var clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    var clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    return { x: clientX - rect.left, y: clientY - rect.top };
  }

  function start(e) {
    e.preventDefault();
    drawing = true;
    hasSignature = true;
    var p = pointFromEvent(e);
    lastX = p.x;
    lastY = p.y;
  }

  function move(e) {
    if (!drawing) return;
    e.preventDefault();
    var p = pointFromEvent(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    lastX = p.x;
    lastY = p.y;
  }

  function end() {
    drawing = false;
  }

  canvas.addEventListener("pointerdown", start);
  canvas.addEventListener("pointermove", move);
  window.addEventListener("pointerup", end);
  canvas.addEventListener("pointerleave", function () { if (drawing) drawing = false; });

  var clearBtn = document.getElementById("clearSignature");
  if (clearBtn) {
    clearBtn.addEventListener("click", function () {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasSignature = false;
    });
  }

  // Date display + hidden field
  var dateDisplay = document.getElementById("dateDisplay");
  var dateHidden = document.getElementById("dateSignedHidden");
  var today = new Date();
  var formatted = today.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  if (dateDisplay) dateDisplay.textContent = formatted;
  if (dateHidden) dateHidden.value = formatted;

  // Guard submission: require a drawn signature, then submit via fetch
  // as a real PNG file (not a giant base64 string) to the Netlify Function.
  var form = document.getElementById("releaseForm");
  var submitBtn = document.getElementById("releaseSubmitBtn");
  var errorBox = document.getElementById("formError");
  var sigError = null;

  function showSigError() {
    if (!sigError) {
      sigError = document.createElement("div");
      sigError.style.color = "#c0392b";
      sigError.style.fontSize = "0.85rem";
      sigError.style.marginTop = "-10px";
      sigError.style.marginBottom = "14px";
      sigError.textContent = "Please draw your signature before submitting.";
      canvas.closest(".signature-wrap").insertAdjacentElement("afterend", sigError);
    }
    canvas.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  if (form) {
    form.addEventListener("submit", function (e) {
      e.preventDefault();

      if (!hasSignature) {
        showSigError();
        return;
      }
      if (sigError) { sigError.remove(); sigError = null; }
      if (errorBox) { errorBox.hidden = true; errorBox.textContent = ""; }
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Submitting..."; }

      canvas.toBlob(function (blob) {
        var formData = new FormData(form);
        formData.append("signature", blob, "signature.png");

        fetch("/api/submit-release", { method: "POST", body: formData })
          .then(function (res) {
            return res.json().then(function (data) { return { ok: res.ok, data: data }; });
          })
          .then(function (result) {
            if (result.ok) {
              window.location.href = "release-thank-you.html";
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
            if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = "Sign & Submit Release"; }
          });
      }, "image/png");
    });
  }
});
