// Initialise Lucide icons
if (typeof lucide !== 'undefined') lucide.createIcons();


// Meta Pixel — loads immediately for all visitors
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
document,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','2147066502784504');
fbq('track','PageView');

// Cookie notice — just informational, dismiss once
(function initCookieNotice() {
  if (localStorage.getItem('cookie_dismissed')) return;
  const banner = document.getElementById('cookie-banner');
  if (!banner) return;
  banner.style.display = 'flex';
  document.getElementById('cookie-accept').addEventListener('click', function() {
    localStorage.setItem('cookie_dismissed', '1');
    banner.style.display = 'none';
  });
})();

// Fade-in on scroll
(() => {
  const els = document.querySelectorAll(".fade-in");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return;

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
  }, { threshold: 0.15, rootMargin: "0px 0px -5% 0px" });

  els.forEach(el => observer.observe(el));
})();


// Supabase config
const SUPABASE_URL = 'https://jamfflkocebwrqnsascq.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImphbWZmbGtvY2Vid3JxbnNhc2NxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI5MzI0NzcsImV4cCI6MjA4ODUwODQ3N30.CbSjEb6IIAa31cGD1sRO0fSVxeBkh-4KghbH8m5mNJs';
const STRIPE_PK = 'pk_live_51TDl07IXJGD5MAi40SVos0PCglHpWkM6qfiTsac2aDTyJbq0hR28dMFhzVG6piAmxeGdvhxDz60qAqtpQkAk5pYb00QUEXAHE5';


// Founders Club tier buttons → Stripe checkout
document.querySelectorAll('.tier-btn').forEach(btn => {
  btn.addEventListener('click', async () => {
    const tier = btn.dataset.tier;
    const original = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Loading...';
    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`
        },
        body: JSON.stringify({ tier })
      });
      const { url, error } = await res.json();
      if (url) {
        window.location.href = url;
      } else {
        btn.textContent = error || 'Something went wrong';
        setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
      }
    } catch {
      btn.textContent = 'Something went wrong';
      setTimeout(() => { btn.textContent = original; btn.disabled = false; }, 3000);
    }
  });
});


// Email signup - sends to Supabase Edge Function
async function handleSubmit(form, noteElId) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = new FormData(form).get("email")?.toString().trim();
    if (!email) return;

    const btn = form.querySelector('button');
    const noteEl = document.getElementById(noteElId);
    btn.disabled = true;
    btn.textContent = 'Sending...';

    try {
      const res = await fetch(`${SUPABASE_URL}/functions/v1/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON}`
        },
        body: JSON.stringify({ email })
      });
      const data = await res.json();

      form.reset();
      if (data.error === 'invalid_email') {
        if (noteEl) noteEl.textContent = "Please enter a valid email address.";
      } else if (data.message === 'already_subscribed' || data.message === 'already_verified') {
        if (noteEl) noteEl.textContent = "You're already on the list.";
      } else if (data.message === 'subscribed') {
        if (noteEl) noteEl.textContent = "You're on the list! Check your inbox for a welcome email.";
        if (window.fbq) fbq('track', 'CompleteRegistration');
      } else {
        if (noteEl) noteEl.textContent = "Something went wrong. Please try again.";
      }
    } catch (err) {
      if (noteEl) noteEl.textContent = "Something went wrong. Please try again.";
    }

    btn.disabled = false;
    btn.textContent = form.querySelector('button')?.dataset.label || 'Join the early list';
  });
}

const form3 = document.getElementById("emailForm3");
if (form3) handleSubmit(form3, "formNote3");


// FAQ Accordion
document.querySelectorAll('.faq-q').forEach(btn => {
  btn.addEventListener('click', () => {
    const answer = btn.nextElementSibling;
    const isOpen = answer.classList.contains('open');
    document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
    document.querySelectorAll('.faq-q').forEach(b => b.setAttribute('aria-expanded', 'false'));
    if (!isOpen) {
      answer.classList.add('open');
      btn.setAttribute('aria-expanded', 'true');
    }
  });
});


// Render email at runtime
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


// Currency conversion
(async () => {
  const priceEl = document.getElementById('price-display');
  if (!priceEl) return;
  try {
    const geoRes = await fetch('https://ipapi.co/json/');
    const geo = await geoRes.json();
    const currency = geo.currency;
    if (!currency || currency === 'GBP') return;
    const rateRes = await fetch(`https://api.frankfurter.app/latest?from=GBP&to=${currency}`);
    const rateData = await rateRes.json();
    const rate = rateData.rates[currency];
    if (!rate) return;
    const converted = Math.ceil(50 * rate / 5) * 5;
    const formatted = new Intl.NumberFormat(navigator.language || 'en', {
      style: 'currency', currency, maximumFractionDigits: 0
    }).format(converted);
    priceEl.textContent = `Under ${formatted}`;
  } catch (e) {}
})();