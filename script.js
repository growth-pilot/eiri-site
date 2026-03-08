// Fade-in on scroll
(() => {
  const els = document.querySelectorAll(".fade-in");

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

  // Hide all elements initially via JS
  els.forEach(el => {
    el.style.opacity = "0";
    el.style.transform = "translateY(20px)";
    el.style.transition = "opacity 0.7s ease, transform 0.7s ease";
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = "1";
        entry.target.style.transform = "translateY(0)";
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: "0px 0px -5% 0px"
  });

  els.forEach(el => observer.observe(el));
})();


// Email capture
function handleSubmit(form, noteElId) {
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const email = new FormData(form).get("email")?.toString().trim();
    if (!email) return;

    const key = "eiri_waitlist_emails";
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({ email, ts: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(existing));

    form.reset();
    const noteEl = document.getElementById(noteElId);
    if (noteEl) noteEl.textContent = "You're in. We'll email you first.";
  });
}

const form1 = document.getElementById("emailForm");
const form2 = document.getElementById("emailForm2");
const form3 = document.getElementById("emailForm3");
if (form1) handleSubmit(form1, "formNote");
if (form2) handleSubmit(form2, "formNote2");
if (form3) handleSubmit(form3, "formNote3");
// FAQ Accordion
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const isOpen = answer.classList.contains('open');

    // Close all
    document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
    document.querySelectorAll('.faq-q').forEach(b => b.setAttribute('aria-expanded', 'false'));

    // Open clicked if it was closed
    if (!isOpen) {
      answer.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});

// Currency conversion based on user locale
(async () => {
  const priceEl = document.getElementById('price-display');
  if (!priceEl) return;

  const locale = navigator.language || 'en-GB';
  const region = locale.split('-')[1] || 'GB';

  const currencyMap = { 'US': 'USD', 'CA': 'CAD', 'AU': 'AUD', 'GB': 'GBP' };
  const symbolMap  = { 'USD': '$', 'CAD': 'CA$', 'AUD': 'A$', 'GBP': '£' };

  const targetCurrency = currencyMap[region] || null;
  if (!targetCurrency || targetCurrency === 'GBP') return;

  try {
    const res = await fetch(`https://api.frankfurter.app/latest?from=GBP&to=${targetCurrency}`);
    const data = await res.json();
    const rate = data.rates[targetCurrency];
    if (!rate) return;

    const converted = Math.ceil(50 * rate / 5) * 5; // round to nearest 5
    const symbol = symbolMap[targetCurrency] || targetCurrency + ' ';
    priceEl.textContent = `Under ${symbol}${converted}`;
  } catch (e) {
    // Silently fail, keep GBP price
  }
})();

// Render email at runtime to prevent obfuscation
const emailEl = document.getElementById('contact-email');
if (emailEl) {
  const u = 'thoughts';
  const d = 'eirisleep.com';
  const email = u + '@' + d;
  const link = document.createElement('a');
  link.href = 'mailto:' + email;
  link.textContent = email;
  link.className = 'cta-email-link';
  emailEl.appendChild(link);
}