document.documentElement.classList.add("js");

const header = document.querySelector(".site-header");
const revealItems = document.querySelectorAll("[data-reveal]");
const navToggle = document.querySelector(".nav-toggle");
const mobileDrawerBackdrop = document.querySelector(".mobile-drawer-backdrop");
const mobileDrawerLinks = document.querySelectorAll(".mobile-drawer-link");
const mobileNavMedia = window.matchMedia("(max-width: 820px)");
const hero = document.querySelector(".hero");
const heroCursor = document.querySelector(".hero-cursor");

const updateHeaderState = () => {
  header.classList.toggle("is-scrolled", window.scrollY > 40);
};

const setNavOpen = (isOpen) => {
  header.classList.toggle("nav-open", isOpen);
  document.body.classList.toggle("nav-open", isOpen);

  if (!navToggle) {
    return;
  }

  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute(
    "aria-label",
    isOpen ? "Close navigation menu" : "Open navigation menu"
  );
};

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) {
          return;
        }

        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

revealItems.forEach((item, index) => {
  if (index < 2) {
    item.classList.add("is-visible");
  }
});

updateHeaderState();

if (navToggle) {
  navToggle.addEventListener("click", () => {
    setNavOpen(!header.classList.contains("nav-open"));
  });
}

if (hero && heroCursor) {
  const updateHeroCursor = (event) => {
    const rect = hero.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    heroCursor.style.transform = `translate3d(${x}px, ${y}px, 0)`;
  };

  hero.addEventListener("mouseenter", (event) => {
    updateHeroCursor(event);
    heroCursor.style.opacity = "1";
  });

  hero.addEventListener("mousemove", updateHeroCursor);

  hero.addEventListener("mouseleave", () => {
    heroCursor.style.opacity = "";
  });
}

mobileDrawerLinks.forEach((link) => {
  link.addEventListener("click", () => {
    setNavOpen(false);
  });
});

if (mobileDrawerBackdrop) {
  mobileDrawerBackdrop.addEventListener("click", () => {
    setNavOpen(false);
  });
}

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    setNavOpen(false);
  }
});

window.addEventListener("resize", () => {
  if (!mobileNavMedia.matches) {
    setNavOpen(false);
  }
});

window.addEventListener("scroll", updateHeaderState, { passive: true });
