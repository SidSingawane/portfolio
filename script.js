document.documentElement.classList.add("js");

const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
const finePointerMedia = window.matchMedia("(pointer: fine)");

/* ============================================================
   Theme manager
   ============================================================ */
(() => {
  const root = document.documentElement;
  const toggle = document.querySelector(".theme-toggle");
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const systemLight = window.matchMedia("(prefers-color-scheme: light)");

  const themeColors = { dark: "#050505", light: "#f2ede4" };

  const applyTheme = (theme, { animate = true } = {}) => {
    if (animate && !reducedMotionMedia.matches) {
      root.classList.add("theme-switching");
      window.setTimeout(() => root.classList.remove("theme-switching"), 380);
    }

    root.setAttribute("data-theme", theme);

    if (themeMeta) {
      themeMeta.setAttribute("content", themeColors[theme]);
    }

    if (toggle) {
      toggle.setAttribute(
        "aria-label",
        theme === "dark" ? "Switch to light theme" : "Switch to dark theme"
      );
    }

    // Each theme has its own hero iceberg art (same composition and
    // waterline, different grade). Swap before dispatching so the
    // water shader's themechange listener sees the new src.
    const heroIceberg = document.querySelector(".hero-iceberg");
    if (heroIceberg) {
      const nextSrc =
        theme === "light"
          ? "./assets/iceberg-light.webp?v=1"
          : "./assets/iceberg-dark.webp?v=1";
      if (heroIceberg.getAttribute("src") !== nextSrc) {
        heroIceberg.setAttribute("src", nextSrc);
      }
    }

    document.dispatchEvent(new CustomEvent("themechange", { detail: { theme } }));
  };

  // Sync the toggle label with the theme resolved by the inline head script
  applyTheme(root.getAttribute("data-theme") === "light" ? "light" : "dark", {
    animate: false,
  });

  if (toggle) {
    toggle.addEventListener("click", () => {
      const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      try {
        localStorage.setItem("theme", next);
      } catch (e) {
        /* private mode — theme simply won't persist */
      }
      applyTheme(next);
    });
  }

  // Follow OS preference live, but only while the user hasn't chosen
  systemLight.addEventListener?.("change", (event) => {
    let stored = null;
    try {
      stored = localStorage.getItem("theme");
    } catch (e) {
      /* ignore */
    }
    if (stored !== "light" && stored !== "dark") {
      applyTheme(event.matches ? "light" : "dark");
    }
  });
})();

/* ============================================================
   Header scroll state
   ============================================================ */
const header = document.querySelector(".site-header");

const updateHeaderState = () => {
  if (header) {
    header.classList.toggle("is-scrolled", window.scrollY > 40);
  }
};

updateHeaderState();
window.addEventListener("scroll", updateHeaderState, { passive: true });

/* ============================================================
   Reveal & stagger on scroll
   ============================================================ */
(() => {
  const revealItems = document.querySelectorAll("[data-reveal], [data-stagger]");

  document.querySelectorAll("[data-stagger]").forEach((group) => {
    Array.from(group.children).forEach((child, index) => {
      child.style.setProperty("--si", index);
    });
  });

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
        /* threshold:0 + rootMargin's negative bottom — fires the moment
           any pixel of the section enters the upper 92% of the viewport.
           A percentage threshold breaks for very tall sections (e.g. the
           case-study Design Solutions is ~4640px tall, so 0.18 of it is
           taller than the viewport itself and the reveal never fires —
           leaving the whole section stuck at opacity 0). */
        threshold: 0,
        rootMargin: "0px 0px -8% 0px",
      }
    );

    revealItems.forEach((item) => revealObserver.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("is-visible"));
  }

  // Above-the-fold content shows immediately — but DEFERRED by one
  // frame so the split-text IIFE (later in this file) can wrap each
  // word in .split-word-inner first. Otherwise the hero already has
  // .is-visible at the moment those spans are created, so the
  // .is-visible .split-word-inner rule applies on creation and the
  // slide-up animation never plays.
  requestAnimationFrame(() => {
    revealItems.forEach((item, index) => {
      if (index < 2) {
        item.classList.add("is-visible");
      }
    });
  });
})();

/* ============================================================
   Mobile drawer (with focus management)
   ============================================================ */
const navToggle = document.querySelector(".nav-toggle");
const drawerShell = document.querySelector(".mobile-drawer-shell");
const mobileDrawerBackdrop = document.querySelector(".mobile-drawer-backdrop");
const mobileNavMedia = window.matchMedia("(max-width: 820px)");

const drawerFocusables = () =>
  drawerShell
    ? Array.from(drawerShell.querySelectorAll("a[href], button:not([disabled])"))
    : [];

const trapDrawerFocus = (event) => {
  if (event.key !== "Tab") {
    return;
  }

  const focusables = [navToggle, ...drawerFocusables()].filter(Boolean);
  if (!focusables.length) {
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];

  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
};

const setNavOpen = (isOpen) => {
  if (!header) {
    return;
  }

  header.classList.toggle("nav-open", isOpen);
  document.body.classList.toggle("nav-open", isOpen);

  if (drawerShell) {
    drawerShell.toggleAttribute("inert", !isOpen);
  }

  if (navToggle) {
    navToggle.setAttribute("aria-expanded", String(isOpen));
    navToggle.setAttribute(
      "aria-label",
      isOpen ? "Close navigation menu" : "Open navigation menu"
    );
  }

  if (isOpen) {
    document.addEventListener("keydown", trapDrawerFocus);
    const [firstLink] = drawerFocusables();
    firstLink?.focus({ preventScroll: true });
  } else {
    document.removeEventListener("keydown", trapDrawerFocus);
  }
};

if (drawerShell) {
  drawerShell.toggleAttribute("inert", true);
}

if (navToggle) {
  navToggle.addEventListener("click", () => {
    setNavOpen(!header.classList.contains("nav-open"));
  });
}

document.querySelectorAll(".mobile-drawer-link, .mobile-drawer-cta").forEach((link) => {
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
  if (event.key === "Escape" && header?.classList.contains("nav-open")) {
    setNavOpen(false);
    navToggle?.focus();
  }
});

window.addEventListener("resize", () => {
  if (!mobileNavMedia.matches) {
    setNavOpen(false);
  }
});

/* ============================================================
   Scroll spy — nav links reflect the section in view
   ============================================================ */
(() => {
  const navLinks = Array.from(document.querySelectorAll('.nav-links a[href^="#"]'));
  if (!navLinks.length || !("IntersectionObserver" in window)) {
    return;
  }

  const sections = navLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if (!sections.length) {
    return;
  }

  const setActive = (id) => {
    navLinks.forEach((link) => {
      if (link.getAttribute("href") === `#${id}`) {
        link.setAttribute("aria-current", "true");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  };

  const spyObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          setActive(entry.target.id);
        }
      });
    },
    {
      rootMargin: "-30% 0px -55% 0px",
      threshold: 0,
    }
  );

  sections.forEach((section) => spyObserver.observe(section));
})();

/* ============================================================
   Hero "You" cursor tag
   ============================================================ */
const hero = document.querySelector(".hero");
const heroCursor = document.querySelector(".hero-cursor");

if (hero && heroCursor && !reducedMotionMedia.matches) {
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

/* ============================================================
   Depth gauge — scroll progress as metres below the surface
   ============================================================ */
(() => {
  // Homepage only — the depth gauge is part of the iceberg story there.
  // Case-study pages (which have .cs-hero, not .hero) opt out.
  const gaugeAnchor = hero;
  if (!gaugeAnchor) {
    return;
  }

  const gauge = document.createElement("div");
  gauge.className = "depth-gauge";
  gauge.setAttribute("aria-hidden", "true");
  gauge.innerHTML =
    '<span class="depth-reading">0 m</span>' +
    '<div class="depth-track"><span class="depth-fill"></span></div>' +
    '<span class="depth-label">Below the surface</span>';
  document.body.appendChild(gauge);

  const fill = gauge.querySelector(".depth-fill");
  const reading = gauge.querySelector(".depth-reading");
  const MAX_DEPTH_METRES = 42;

  let ticking = false;
  let lastMetres = -1;

  const update = () => {
    ticking = false;
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const progress = scrollable > 0 ? Math.min(window.scrollY / scrollable, 1) : 0;

    fill.style.setProperty("--depth", progress.toFixed(4));
    gauge.classList.toggle("is-active", window.scrollY > gaugeAnchor.offsetHeight * 0.45);

    const metres = Math.round(progress * MAX_DEPTH_METRES);
    if (metres !== lastMetres) {
      lastMetres = metres;
      reading.textContent = metres === 0 ? "0 m" : `−${metres} m`;
    }
  };

  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true }
  );
  update();
})();

/* ============================================================
   Magnetic CTAs (fine pointers only)
   The class can be on an HTML element directly, or added below to
   project links, footer rows, and the theme toggle.
   ============================================================ */
(() => {
  if (!finePointerMedia.matches || reducedMotionMedia.matches) {
    return;
  }

  // Extend the magnetic set without touching every HTML page
  const extra = [
    ".project-link",
    ".footer-social-link",
    ".theme-toggle",
    ".nav-toggle",
    ".mobile-drawer-cta",
  ];
  document
    .querySelectorAll(extra.join(","))
    .forEach((el) => el.classList.add("magnetic"));

  document.querySelectorAll(".magnetic").forEach((el) => {
    // Wider elements (footer rows) lean less so they don't drift off-grid
    const MAX_SHIFT = el.classList.contains("footer-social-link") ? 3 : 6;

    el.addEventListener("pointermove", (event) => {
      const rect = el.getBoundingClientRect();
      const dx = (event.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
      const dy = (event.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
      el.style.transition = "transform 80ms linear";
      el.style.transform = `translate3d(${(dx * MAX_SHIFT).toFixed(1)}px, ${(
        dy * MAX_SHIFT
      ).toFixed(1)}px, 0)`;
    });

    el.addEventListener("pointerleave", () => {
      el.style.transition = "transform 360ms cubic-bezier(0.34, 1.56, 0.64, 1)";
      el.style.transform = "";
    });
  });
})();

/* ============================================================
   Copy-to-clipboard buttons — looks up data-copy on the trigger,
   writes it, flashes the check icon, and announces via aria-live.
   ============================================================ */
(() => {
  document.querySelectorAll(".copy-button").forEach((btn) => {
    const live = btn.querySelector(".copy-live");
    const baseLabel = btn.getAttribute("aria-label") || "Copy";
    let resetTimer = 0;

    const fallbackCopy = (text) => {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (e) {
        ok = false;
      }
      document.body.removeChild(ta);
      return ok;
    };

    btn.addEventListener("click", async (event) => {
      event.preventDefault();
      const text = btn.dataset.copy;
      if (!text) return;

      let ok = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          ok = true;
        } else {
          ok = fallbackCopy(text);
        }
      } catch (e) {
        ok = fallbackCopy(text);
      }

      if (!ok) return;

      btn.classList.add("is-copied");
      btn.setAttribute("aria-label", "Copied to clipboard");
      if (live) live.textContent = "Email copied";

      window.clearTimeout(resetTimer);
      resetTimer = window.setTimeout(() => {
        btn.classList.remove("is-copied");
        btn.setAttribute("aria-label", baseLabel);
        if (live) live.textContent = "";
      }, 1800);
    });
  });
})();

/* ============================================================
   Click-anywhere project cards — the whole card opens its case
   study. Skips cards whose CTA is a "Coming soon" span, lets
   real link/button clicks through, and respects text selection.
   ============================================================ */
(() => {
  document.querySelectorAll(".project-card").forEach((card) => {
    const link = card.querySelector("a.project-link[href]");
    if (!link) return;

    card.setAttribute("data-clickable", "");

    card.addEventListener("click", (event) => {
      // Real interactive elements inside the card navigate themselves
      if (event.target.closest("a, button")) return;
      // Don't hijack a text selection in progress
      if (window.getSelection && window.getSelection().toString().length > 0) {
        return;
      }
      link.click();
    });
  });
})();

/* ============================================================
   Split-text reveal — wrap each word so it can slide up from a
   mask. The existing data-reveal IntersectionObserver already
   toggles .is-visible on parents; the CSS keys off that.
   ============================================================ */
(() => {
  const TARGETS = [
    ".hero h1",
    ".section-heading h2",
    ".about-copy h3",
    ".closing-panel h2",
  ];

  const splitNode = (node) => {
    // Walk children so we preserve <br>, <em>, etc.
    const result = document.createDocumentFragment();
    let wordIndex = 0;

    const walk = (parent, target) => {
      parent.childNodes.forEach((child) => {
        if (child.nodeType === Node.TEXT_NODE) {
          const tokens = child.textContent.split(/(\s+)/);
          tokens.forEach((token) => {
            if (!token) return;
            if (/^\s+$/.test(token)) {
              const space = document.createElement("span");
              space.className = "split-word-space";
              space.setAttribute("aria-hidden", "true");
              target.appendChild(space);
            } else {
              const word = document.createElement("span");
              word.className = "split-word";
              const inner = document.createElement("span");
              inner.className = "split-word-inner";
              inner.style.setProperty("--sw", String(wordIndex++));
              inner.textContent = token;
              word.appendChild(inner);
              target.appendChild(word);
            }
          });
        } else if (child.nodeType === Node.ELEMENT_NODE) {
          // <br> and inline elements pass through, descendants get split
          if (child.tagName === "BR") {
            target.appendChild(child.cloneNode(false));
          } else {
            const clone = child.cloneNode(false);
            walk(child, clone);
            target.appendChild(clone);
          }
        }
      });
    };

    walk(node, result);
    return result;
  };

  document.querySelectorAll(TARGETS.join(",")).forEach((node) => {
    if (node.dataset.split === "done") return;
    const original = node.textContent.trim();
    if (!original) return;

    // Preserve original for screen readers / copy-paste
    const aria = document.createElement("span");
    aria.className = "sr-only";
    aria.textContent = original;

    const fragment = splitNode(node);
    node.setAttribute("aria-label", original);
    node.dataset.split = "done";
    node.innerHTML = "";
    node.appendChild(aria);
    const visual = document.createElement("span");
    visual.className = "split-line";
    visual.setAttribute("aria-hidden", "true");
    visual.appendChild(fragment);
    node.appendChild(visual);

    // If the heading has no [data-reveal] ancestor, it would never
    // animate — mark the host itself.
    let ancestor = node.parentElement;
    let foundReveal = false;
    while (ancestor) {
      if (ancestor.hasAttribute && ancestor.hasAttribute("data-reveal")) {
        foundReveal = true;
        break;
      }
      ancestor = ancestor.parentElement;
    }
    if (!foundReveal) {
      node.classList.add("split-host");
      if ("IntersectionObserver" in window) {
        const io = new IntersectionObserver(
          (entries) => {
            entries.forEach((e) => {
              if (e.isIntersecting) {
                node.classList.add("is-visible");
                io.unobserve(node);
              }
            });
          },
          { threshold: 0.2, rootMargin: "0px 0px -8% 0px" }
        );
        io.observe(node);
      } else {
        node.classList.add("is-visible");
      }
    }
  });

  // Mirror the hero headline into the water as a faint reflection.
  // Cloning the split markup keeps the copy, line breaks, and word
  // gradient in sync with the real heading automatically.
  const heroTitle = document.querySelector(".hero-copy h1");
  const heroVisual = document.querySelector(".hero-visual");
  if (heroTitle && heroVisual) {
    const mirror = heroTitle.cloneNode(true);
    mirror.className = "hero-text-reflection";
    mirror.removeAttribute("aria-label");
    mirror.setAttribute("aria-hidden", "true");
    mirror.querySelector(".sr-only")?.remove();
    heroVisual.insertAdjacentElement("afterend", mirror);
  }
})();

/* ============================================================
   Custom site cursor — dot + ring with interactive states
   ============================================================ */
(() => {
  if (!finePointerMedia.matches) return;
  if (reducedMotionMedia.matches) return;

  const dot = document.createElement("div");
  dot.className = "site-cursor";
  dot.setAttribute("aria-hidden", "true");
  const ring = document.createElement("div");
  ring.className = "site-cursor-ring";
  ring.setAttribute("aria-hidden", "true");
  document.body.appendChild(dot);
  document.body.appendChild(ring);
  document.documentElement.classList.add("has-cursor");

  let mouseX = window.innerWidth / 2;
  let mouseY = window.innerHeight / 2;
  let ringX = mouseX;
  let ringY = mouseY;
  let hovered = false;

  const setReady = () => {
    dot.classList.add("is-ready");
    ring.classList.add("is-ready");
  };

  // First real pointer event reveals it (avoids a flash at center)
  document.addEventListener(
    "pointermove",
    (event) => {
      mouseX = event.clientX;
      mouseY = event.clientY;
      dot.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0)`;
      if (!hovered) setReady();
      hovered = true;
    },
    { passive: true }
  );

  document.addEventListener("pointerdown", () => {
    dot.classList.add("is-pressed");
    ring.classList.add("is-pressed");
  });

  document.addEventListener("pointerup", () => {
    dot.classList.remove("is-pressed");
    ring.classList.remove("is-pressed");
  });

  document.addEventListener("mouseleave", () => {
    dot.classList.add("is-hidden");
    ring.classList.add("is-hidden");
  });

  document.addEventListener("mouseenter", () => {
    dot.classList.remove("is-hidden");
    ring.classList.remove("is-hidden");
  });

  // Ring lerps toward dot for trailing feel
  const lerp = (a, b, n) => a + (b - a) * n;
  const tick = () => {
    ringX = lerp(ringX, mouseX, 0.18);
    ringY = lerp(ringY, mouseY, 0.18);
    ring.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);

  // Interactive hover states — delegated to avoid per-element listeners.
  // Project images / bento tiles use the same dot + ring as links/CTAs
  // (no separate "View" pill).
  const LINK_SELECTOR =
    "a, button, [role='button'], .magnetic, input, textarea, select, label[for]";
  const VIEW_SELECTOR = ".project-image, .bento-item, .image-placeholder";

  document.addEventListener(
    "pointerover",
    (event) => {
      const interactive =
        event.target.closest(LINK_SELECTOR) || event.target.closest(VIEW_SELECTOR);
      ring.classList.toggle("is-hover", !!interactive);
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerout",
    (event) => {
      if (!event.relatedTarget) {
        ring.classList.remove("is-hover");
      }
    },
    { passive: true }
  );

  // Inside the hero we hand the visual to the "You" cursor — hide ours
  const heroEl = document.querySelector(".hero");
  if (heroEl) {
    heroEl.addEventListener("pointerenter", () => {
      dot.classList.add("is-hidden");
      ring.classList.add("is-hidden");
    });
    heroEl.addEventListener("pointerleave", () => {
      dot.classList.remove("is-hidden");
      ring.classList.remove("is-hidden");
    });
  }
})();

/* ============================================================
   Smooth scroll inertia — fine-pointer wheel intercept only.
   Touch + anchor clicks keep native behaviour so nothing feels
   weird on phones or jump-links.
   ============================================================ */
(() => {
  if (!finePointerMedia.matches || reducedMotionMedia.matches) return;
  // Honour reduced data / mobile breakpoint
  if (window.innerWidth < 821) return;

  let target = window.scrollY;
  let current = window.scrollY;
  let ticking = false;
  const EASE = 0.11;
  const EPS = 0.4;

  // Native CSS smooth-scroll fights the lerp — switch it off here
  document.documentElement.style.scrollBehavior = "auto";

  const maxScroll = () =>
    Math.max(0, document.documentElement.scrollHeight - window.innerHeight);

  const tick = () => {
    const delta = target - current;
    if (Math.abs(delta) < EPS) {
      current = target;
      ticking = false;
      window.scrollTo(0, current);
      return;
    }
    current += delta * EASE;
    window.scrollTo(0, current);
    requestAnimationFrame(tick);
  };

  window.addEventListener(
    "wheel",
    (event) => {
      // Skip pinch-zoom, modifier-scroll, and horizontal scroll
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
      event.preventDefault();
      target = Math.max(0, Math.min(target + event.deltaY, maxScroll()));
      if (!ticking) {
        ticking = true;
        current = window.scrollY;
        requestAnimationFrame(tick);
      }
    },
    { passive: false }
  );

  // Programmatic / anchor scrolls — sync the lerp target so the next
  // wheel event doesn't snap back to a stale value
  window.addEventListener(
    "scroll",
    () => {
      if (!ticking) {
        target = window.scrollY;
        current = window.scrollY;
      }
    },
    { passive: true }
  );

  // Resize re-clamps the target into range
  window.addEventListener("resize", () => {
    target = Math.max(0, Math.min(target, maxScroll()));
  });
})();

/* ============================================================
   Page transition — internal links cover with a sheet, the next
   page enters lifting it away.
   ============================================================ */
(() => {
  if (reducedMotionMedia.matches) return;

  const overlay = document.createElement("div");
  overlay.className = "page-transition";
  overlay.setAttribute("aria-hidden", "true");
  document.body.appendChild(overlay);

  // Lift on load
  const playEnter = () => {
    overlay.classList.add("is-entering");
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        overlay.classList.add("is-revealing");
        window.setTimeout(() => {
          overlay.classList.remove("is-entering", "is-revealing");
        }, 700);
      });
    });
  };
  playEnter();

  // Same-document navigations get the sheet
  const isInternalNav = (link) => {
    if (!link) return false;
    const href = link.getAttribute("href");
    if (!href) return false;
    if (href.startsWith("#")) return false;
    if (href.startsWith("mailto:") || href.startsWith("tel:")) return false;
    if (link.target === "_blank") return false;
    if (link.hasAttribute("download")) return false;
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin;
  };

  document.addEventListener("click", (event) => {
    if (event.defaultPrevented) return;
    if (event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest("a[href]");
    if (!isInternalNav(link)) return;

    const url = new URL(link.getAttribute("href"), window.location.href);
    if (
      url.pathname === window.location.pathname &&
      url.search === window.location.search
    ) {
      // hash-only navigation — no transition needed
      return;
    }

    event.preventDefault();
    overlay.classList.add("is-leaving");
    window.setTimeout(() => {
      window.location.href = url.href;
    }, 520);
  });

  // BFCache returns — re-lift
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      overlay.classList.remove("is-leaving");
      playEnter();
    }
  });
})();

/* ============================================================
   Ambient particles (theme-aware)
   ============================================================ */
(() => {
  const canvas = document.getElementById("code-rain");
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  let particles = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let rafId = 0;
  let lastTime = 0;
  let spriteCanvas = null;
  let alphaScale = 1;
  const SPRITE_STEPS = 5;

  const CURRENT_SPEED = 0.1;
  const CURRENT_FREQ = 0.0003;

  const themeInk = () => {
    const styles = getComputedStyle(document.documentElement);
    return {
      rgb: styles.getPropertyValue("--particle-rgb").trim() || "255, 255, 255",
      alpha: parseFloat(styles.getPropertyValue("--particle-alpha")) || 1,
    };
  };

  const buildSprites = () => {
    const ink = themeInk();
    alphaScale = ink.alpha;
    spriteCanvas = new Array(SPRITE_STEPS);
    for (let i = 0; i < SPRITE_STEPS; i++) {
      const maxR = 1.2 + i * 0.5;
      const size = Math.ceil(maxR * 2 + 2);
      const c = document.createElement("canvas");
      c.width = c.height = Math.ceil(size * dpr);
      const sc = c.getContext("2d");
      sc.scale(dpr, dpr);
      const cx = size / 2;
      const g = sc.createRadialGradient(cx, cx, 0, cx, cx, maxR);
      g.addColorStop(0, `rgba(${ink.rgb},1)`);
      g.addColorStop(0.4, `rgba(${ink.rgb},0.5)`);
      g.addColorStop(1, `rgba(${ink.rgb},0)`);
      sc.fillStyle = g;
      sc.fillRect(0, 0, size, size);
      spriteCanvas[i] = { canvas: c, size: size };
    }
  };

  const makeParticle = (scatter) => {
    const depth = Math.random();
    return {
      x: Math.random() * width,
      y: scatter ? Math.random() * height : -Math.random() * 60,
      depth: depth,
      fallSpeed: 0.08 + depth * 0.32,
      wobbleAmp: 0.15 + Math.random() * 0.4,
      wobbleFreq: 0.0008 + Math.random() * 0.0015,
      wobblePhase: Math.random() * Math.PI * 2,
      twinkleFreq: 0.0006 + Math.random() * 0.001,
      twinklePhase: Math.random() * Math.PI * 2,
      baseAlpha: 0.25 + depth * 0.65,
      spriteIdx: Math.min(SPRITE_STEPS - 1, (depth * SPRITE_STEPS) | 0),
    };
  };

  const getCount = () => {
    const area = width * height;
    const base = Math.round(area / 12000);
    return Math.max(40, Math.min(base, 150));
  };

  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = width + "px";
    canvas.style.height = height + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    buildSprites();

    const target = getCount();
    while (particles.length < target) particles.push(makeParticle(true));
    if (particles.length > target) particles.length = target;
  };

  const draw = (time) => {
    const dt = lastTime ? Math.min((time - lastTime) / 16.6667, 3) : 1;
    lastTime = time;

    ctx.clearRect(0, 0, width, height);

    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      const currentX = Math.sin(time * CURRENT_FREQ + p.y * 0.002) * CURRENT_SPEED;
      const wobble = Math.sin(time * p.wobbleFreq + p.wobblePhase) * p.wobbleAmp;

      p.y += p.fallSpeed * dt;
      p.x += (currentX + wobble) * dt;

      if (p.y > height + 10) {
        p.y = -10 - Math.random() * 40;
        p.x = Math.random() * width;
      }

      if (p.x < -20) p.x += width + 40;
      else if (p.x > width + 20) p.x -= width + 40;

      const twinkle = 0.6 + 0.4 * Math.sin(time * p.twinkleFreq + p.twinklePhase);
      const alpha = p.baseAlpha * twinkle * alphaScale;

      ctx.globalAlpha = alpha;
      const sprite = spriteCanvas[p.spriteIdx];
      const half = sprite.size / 2;
      ctx.drawImage(sprite.canvas, p.x - half, p.y - half, sprite.size, sprite.size);
    }

    ctx.globalAlpha = 1;

    rafId = requestAnimationFrame(draw);
  };

  const drawStatic = () => {
    ctx.clearRect(0, 0, width, height);
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = p.baseAlpha * 0.7 * alphaScale;
      const sprite = spriteCanvas[p.spriteIdx];
      const half = sprite.size / 2;
      ctx.drawImage(sprite.canvas, p.x - half, p.y - half, sprite.size, sprite.size);
    }
    ctx.globalAlpha = 1;
  };

  const start = () => {
    cancelAnimationFrame(rafId);
    lastTime = 0;
    if (reducedMotionMedia.matches) {
      drawStatic();
      return;
    }
    rafId = requestAnimationFrame(draw);
  };

  const stop = () => {
    cancelAnimationFrame(rafId);
    rafId = 0;
  };

  resize();
  start();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      resize();
      start();
    }, 120);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  document.addEventListener("themechange", () => {
    buildSprites();
    if (reducedMotionMedia.matches) drawStatic();
  });

  reducedMotionMedia.addEventListener?.("change", start);
})();

/* ============================================================
   Hero water — WebGL ripple & wave shader over the iceberg
   Progressive enhancement: any failure leaves the <img> intact.
   ============================================================ */
(() => {
  const visual = document.querySelector(".hero-visual[data-water]");
  const image = visual?.querySelector(".hero-iceberg");
  if (!visual || !image || !hero || reducedMotionMedia.matches) {
    return;
  }

  // Fraction of the image height (from the top) where the waterline sits
  const WATERLINE = 0.62;
  const MAX_RIPPLES = 10;
  const DPR_CAP = 1.5;

  const canvas = document.createElement("canvas");
  canvas.className = "hero-water";
  canvas.setAttribute("aria-hidden", "true");

  const gl =
    canvas.getContext("webgl", { alpha: true, antialias: false }) ||
    canvas.getContext("experimental-webgl", { alpha: true, antialias: false });
  if (!gl) {
    return;
  }

  const VERT = `
    attribute vec2 aPos;
    varying vec2 vUv;
    void main() {
      vUv = aPos * 0.5 + 0.5;
      gl_Position = vec4(aPos, 0.0, 1.0);
    }
  `;

  // uv.y runs bottom→top; the waterline converts to 1.0 - WATERLINE.
  // Side-on view near the water surface. Ripples are modelled as calm
  // vertical travelling-wave packets — wave fronts are horizontal bands
  // that propagate outward in y from the click point (toward the camera
  // and toward the horizon), like watching a stone-drop in still water
  // from a low angle.
  const FRAG = `
    precision mediump float;
    varying vec2 vUv;
    uniform sampler2D uTex;
    uniform sampler2D uText;
    uniform float uTime;
    uniform float uWater;
    uniform float uAmp;
    uniform float uAspect;
    // The canvas extends below the visual so the headline's reflection
    // rides the same water. uExt = fraction of canvas height that is
    // extension; uTextTop/uTextBottom = the text band in visual space.
    uniform float uExt;
    uniform float uTextTop;
    uniform float uTextBottom;
    // The canvas is wider than the berg so the mirrored headline can match
    // the real headline's width. uTexScaleX = berg width / canvas width, so
    // the berg texture stays centred at natural size instead of stretching.
    uniform float uTexScaleX;
    uniform vec4 uRipples[${MAX_RIPPLES}];

    void main() {
      // Visual-space uv: y continues negative into the extension zone,
      // so depth/chop/ripple formulas extrapolate seamlessly below.
      vec2 uv = vec2(vUv.x, (vUv.y - uExt) / (1.0 - uExt));
      float crestEnergy = 0.0;

      if (uv.y < uWater) {
        // depth: 0 at horizon/waterline, 1 at bottom (closest to camera)
        float depth = (uWater - uv.y) / uWater;
        float fade = smoothstep(0.0, 0.10, uWater - uv.y);

        // Ambient surface chop — four superposed waves, perspective-
        // foreshortened toward the horizon. The slow fourth term drifts
        // diagonally (x + depth coupling) and reads as a lazy swirl.
        float chop =
          sin(uv.x * 22.0 + uTime * 0.70) * 0.0050 +
          sin(uv.x * 11.0 - uTime * 0.45 + depth * 5.0) * 0.0065 +
          sin(uv.x * 42.0 + uTime * 1.10) * 0.0026 +
          sin(uv.x * 6.0 + uTime * 0.30 + depth * 8.0) * 0.0044;
        chop *= (0.30 + depth * 0.70) * uAmp * fade;

        vec2 offset = vec2(0.0, chop);

        // Pointer-driven vertical wave packets
        for (int i = 0; i < ${MAX_RIPPLES}; i++) {
          vec4 r = uRipples[i];
          if (r.w <= 0.0) continue;
          float age = uTime - r.z;
          if (age <= 0.0 || age > 6.0) continue;

          vec2 d = uv - r.xy;

          // Wave front travels outward in y at a calm speed
          float speed = 0.17;
          float radius = age * speed;
          float wavelength = 0.090;

          // Soft Gaussian envelope — wider, smoother, no sharp ridges
          float frontDist = abs(d.y) - radius;
          float envelope = exp(-pow(frontDist * 4.5, 2.0));
          float carrier = sin(frontDist / wavelength * 6.2831);

          // Slow rise-in then long, gentle decay — kills the "punchy"
          // onset that reads as electric. Wave eases up over ~0.5s.
          float rise = smoothstep(0.0, 0.55, age);
          float decay = rise * exp(-age * 0.65) * r.w;

          // Confine to a horizontal band around the click's x position
          float horizBand = exp(-pow(d.x * uAspect * 0.65, 2.0));

          // Pure vertical displacement — surface rising and falling
          float perspective = 0.50 + depth * 0.50;
          float dy = carrier * envelope * decay * 0.017 * horizBand * perspective;

          offset += vec2(0.0, dy);
          crestEnergy += envelope * decay * horizBand;
        }

        vec2 disp = uv + offset;
        // Berg sits centred at natural width inside the wider canvas; the
        // spread-out sides are open water (transparent → text reflection).
        vec2 dispBerg = vec2((disp.x - 0.5) / uTexScaleX + 0.5, disp.y);
        vec4 color = (dispBerg.x < 0.0 || dispBerg.x > 1.0)
          ? vec4(0.0)
          : texture2D(uTex, clamp(dispBerg, 0.001, 0.999));

        // Subtle crest brightening and cool tint — kept gentle for calm
        float shimmer = (chop * 28.0 + crestEnergy * 0.35) * depth;
        color.rgb *= 1.0 + shimmer;
        color.rgb += vec3(0.78, 0.88, 1.00) * crestEnergy * 0.08 * color.a;
        color.rgb = min(color.rgb, vec3(color.a));

        // Headline reflection: sampled through the same displaced
        // coordinate, so it deforms with the identical wave field.
        // Water composites over the text (premultiplied alpha).
        if (uTextBottom < uTextTop) {
          float tV = (disp.y - uTextBottom) / (uTextTop - uTextBottom);
          if (tV > 0.0 && tV < 1.0) {
            vec4 txt = texture2D(uText, vec2(disp.x, tV));
            color.rgb += txt.rgb * (1.0 - color.a);
            color.a += txt.a * (1.0 - color.a);
          }
        }
        gl_FragColor = color;
      } else {
        vec2 uvBerg = vec2((uv.x - 0.5) / uTexScaleX + 0.5, uv.y);
        gl_FragColor = (uvBerg.x < 0.0 || uvBerg.x > 1.0)
          ? vec4(0.0)
          : texture2D(uTex, clamp(uvBerg, 0.001, 0.999));
      }
    }
  `;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
    }
    return shader;
  };

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "program link failed");
    }
  } catch (error) {
    console.warn("Hero water effect unavailable:", error.message);
    return;
  }

  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(program, "aPos");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    time: gl.getUniformLocation(program, "uTime"),
    water: gl.getUniformLocation(program, "uWater"),
    amp: gl.getUniformLocation(program, "uAmp"),
    aspect: gl.getUniformLocation(program, "uAspect"),
    ripples: gl.getUniformLocation(program, "uRipples"),
    tex: gl.getUniformLocation(program, "uTex"),
    text: gl.getUniformLocation(program, "uText"),
    ext: gl.getUniformLocation(program, "uExt"),
    textTop: gl.getUniformLocation(program, "uTextTop"),
    textBottom: gl.getUniformLocation(program, "uTextBottom"),
    texScaleX: gl.getUniformLocation(program, "uTexScaleX"),
  };

  gl.uniform1f(uniforms.water, 1.0 - WATERLINE);
  gl.uniform1i(uniforms.tex, 0);
  gl.uniform1i(uniforms.text, 1);
  gl.uniform1f(uniforms.ext, 0);
  gl.uniform1f(uniforms.texScaleX, 1);
  // textBottom >= textTop disables the text sample until it's built
  gl.uniform1f(uniforms.textTop, 0);
  gl.uniform1f(uniforms.textBottom, 0);

  const ripples = new Float32Array(MAX_RIPPLES * 4);
  let rippleIndex = 0;

  const addRipple = (u, v, strength) => {
    const i = rippleIndex * 4;
    ripples[i] = u;
    ripples[i + 1] = v;
    ripples[i + 2] = performance.now() / 1000 - startTime;
    ripples[i + 3] = strength;
    rippleIndex = (rippleIndex + 1) % MAX_RIPPLES;
  };

  let rafId = 0;
  let running = false;
  let inView = true;
  let ready = false;
  const startTime = performance.now() / 1000;

  // The canvas covers the visual plus the headline-reflection band
  // below it, so the text rides the same simulated water surface.
  const reflectionEl = () => document.querySelector(".hero-text-reflection");

  // Water/reflection canvas spreads wider than the berg so the mirrored
  // headline can match the real headline's width. Never narrower than the
  // berg; capped at 1.7x so the ripple field doesn't over-stretch.
  const canvasWidth = (visualW) => {
    const h1 = document.querySelector(".hero-copy h1");
    const h1W = h1 ? h1.getBoundingClientRect().width : visualW;
    return Math.max(visualW, Math.min(h1W, visualW * 1.7));
  };

  const resizeCanvas = () => {
    const rect = visual.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const clone = reflectionEl();
    const cloneRect = clone?.getBoundingClientRect();
    const ext = cloneRect ? Math.max(0, cloneRect.bottom - rect.bottom) : 0;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const cssW = canvasWidth(rect.width);
    const w = Math.round(cssW * dpr);
    const h = Math.round((rect.height + ext) * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      canvas.style.bottom = "auto";
      canvas.style.height = `${rect.height + ext}px`;
      // Wider than the berg and centred over it, so the reflection can
      // span the headline width without stretching the berg.
      canvas.style.width = `${cssW}px`;
      canvas.style.left = "50%";
      canvas.style.right = "auto";
      canvas.style.transform = "translateX(-50%)";
      gl.viewport(0, 0, w, h);
      // Aspect spans the full (wider) canvas; texScaleX keeps the berg at
      // its natural width, centred, so only the water/text spread out.
      gl.uniform1f(uniforms.aspect, cssW / rect.height);
      gl.uniform1f(uniforms.texScaleX, rect.width / cssW);
      gl.uniform1f(uniforms.ext, ext / (rect.height + ext));
    }
    if (cloneRect && cloneRect.height > 0) {
      // Text band in visual space (uv y runs bottom→top of the visual)
      const top = 1 - (cloneRect.top - rect.top) / rect.height;
      const bottom = 1 - (cloneRect.bottom - rect.top) / rect.height;
      gl.uniform1f(uniforms.textTop, top);
      gl.uniform1f(uniforms.textBottom, bottom);
    }
  };

  const render = () => {
    if (!running) {
      return;
    }
    const now = performance.now() / 1000 - startTime;
    const swell = 1 + Math.min(window.scrollY / Math.max(hero.offsetHeight, 1), 1) * 1.5;

    gl.uniform1f(uniforms.time, now);
    gl.uniform1f(uniforms.amp, swell);
    gl.uniform4fv(uniforms.ripples, ripples);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    rafId = requestAnimationFrame(render);
  };

  const start = () => {
    if (running || !ready || !inView || document.hidden) {
      return;
    }
    running = true;
    rafId = requestAnimationFrame(render);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(rafId);
  };

  const texture = gl.createTexture();
  const source = new Image();
  source.decoding = "async";

  // Defer texture fetch + GL upload past first paint to keep TBT low
  const beginLoad = () => {
    source.src = image.currentSrc || image.src;
  };
  if ("requestIdleCallback" in window) {
    requestIdleCallback(beginLoad, { timeout: 1500 });
  } else {
    window.setTimeout(beginLoad, 350);
  }

  source.onload = () => {
    try {
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    } catch (error) {
      console.warn("Hero water effect unavailable:", error.message);
      return;
    }

    visual.appendChild(canvas);
    resizeCanvas();
    ready = true;
    visual.classList.add("water-ready");
    start();
    buildTextTexture();
  };

  source.onerror = () => {
    /* image failed — static <img> remains the experience */
  };

  // ---- Headline reflection texture -------------------------------
  // The static DOM clone (.hero-text-reflection) keeps reserving the
  // layout space and remains the reduced-motion / no-WebGL fallback;
  // once the shader owns the effect we hide it and draw the same text
  // into the water via texture unit 1.
  const textTexture = gl.createTexture();
  let textStage = null;
  let textBlock = null;

  const buildTextTexture = () => {
    const clone = reflectionEl();
    const title = document.querySelector(".hero-copy h1");
    if (!clone || !title || !ready) return;
    const rect = visual.getBoundingClientRect();
    const cloneRect = clone.getBoundingClientRect();
    if (!rect.width || cloneRect.height < 4) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    // Match the (wider) canvas so the mirrored type renders at the
    // headline's width instead of being squeezed to the berg's.
    const w = Math.max(2, Math.round(canvasWidth(rect.width) * dpr));
    const h = Math.max(2, Math.round(cloneRect.height * dpr));

    // Lines exactly as the heading breaks them (split at <br>)
    const lines = [];
    let current = [];
    title.querySelectorAll(".split-line > *").forEach((n) => {
      if (n.tagName === "BR") {
        lines.push(current.join(" "));
        current = [];
      } else if (n.classList?.contains("split-word")) {
        current.push(n.textContent);
      }
    });
    if (current.length) lines.push(current.join(" "));
    if (!lines.length) {
      lines.push(title.getAttribute("aria-label") || title.textContent.trim());
    }

    const cs = getComputedStyle(title);
    const rootCs = getComputedStyle(document.documentElement);
    const gradTop = rootCs.getPropertyValue("--display-grad-top").trim() || "#ffffff";
    const gradBottom = rootCs.getPropertyValue("--display-grad-bottom").trim() || "#a0a0a0";
    const alpha = parseFloat(getComputedStyle(clone).opacity) || 0.22;

    // Draw the block upright first, then stamp it flipped — that gives
    // reversed line order plus mirrored glyphs, same as the CSS clone.
    textBlock = textBlock || document.createElement("canvas");
    textBlock.width = w;
    textBlock.height = h;
    const bctx = textBlock.getContext("2d");
    bctx.clearRect(0, 0, w, h);
    let fontSize = parseFloat(cs.fontSize) * dpr;
    bctx.font = `${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
    const widest = Math.max(...lines.map((l) => bctx.measureText(l).width));
    if (widest > w * 0.96) fontSize *= (w * 0.96) / widest;
    bctx.font = `${cs.fontWeight} ${fontSize}px ${cs.fontFamily}`;
    const lineH = fontSize * 1.14;
    bctx.textAlign = "center";
    bctx.textBaseline = "alphabetic";
    if (typeof bctx.filter === "string") bctx.filter = `blur(${1.5 * dpr}px)`;
    lines.forEach((line, i) => {
      const baseline = fontSize * 0.94 + i * lineH;
      const g = bctx.createLinearGradient(0, baseline - fontSize * 0.72, 0, baseline + fontSize * 0.22);
      g.addColorStop(0, gradTop);
      g.addColorStop(1, gradBottom);
      bctx.fillStyle = g;
      bctx.fillText(line, w / 2, baseline);
    });

    textStage = textStage || document.createElement("canvas");
    textStage.width = w;
    textStage.height = h;
    const ctx = textStage.getContext("2d");
    ctx.clearRect(0, 0, w, h);

    // Low-angle mirror: the block is stamped upside down row by row,
    // squeezed to SQUEEZE of its height overall, and compressed
    // progressively (GAMMA) the farther a row sits from the waterline
    // — like a mountain reflected across a lake seen from the shore.
    const SQUEEZE = 0.62;
    const GAMMA = 1.7;
    const blockH = Math.ceil(lines.length * lineH + fontSize * 0.5);
    const destH = Math.min(h, Math.round(blockH * SQUEEZE));
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let d = 0; d < destH; d++) {
      const p0 = Math.pow(d / destH, GAMMA);
      const p1 = Math.pow((d + 1) / destH, GAMMA);
      const srcTop = blockH * (1 - p1);
      const srcH = Math.max(blockH * (p1 - p0), 0.5);
      ctx.drawImage(textBlock, 0, srcTop, w, srcH, 0, d, w, 1);
    }
    ctx.restore();

    // Fade downwards on screen: erase progressively toward the tail
    // of the squeezed block. White-on-black needs more surviving ink
    // than ink-on-paper, so the dark theme fades more gently.
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light";
    const fadeMid = isLight ? 0.4 : 0.28;
    const fadeTail = isLight ? 0.92 : 0.8;
    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    const fadeEnd = Math.min(1, destH / h);
    const fade = ctx.createLinearGradient(0, 0, 0, h);
    fade.addColorStop(0, "rgba(0, 0, 0, 0)");
    fade.addColorStop(fadeEnd * 0.55, `rgba(0, 0, 0, ${fadeMid})`);
    fade.addColorStop(fadeEnd, `rgba(0, 0, 0, ${fadeTail})`);
    fade.addColorStop(1, "rgba(0, 0, 0, 1)");
    ctx.fillStyle = fade;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();

    try {
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, textTexture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, textStage);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.activeTexture(gl.TEXTURE0);
    } catch (error) {
      return;
    }

    resizeCanvas();
    clone.style.visibility = "hidden";
  };

  const rebuildTextReflection = () => {
    if (!ready) return;
    resizeCanvas();
    buildTextTexture();
  };

  document.fonts?.ready?.then(() => rebuildTextReflection());
  document.addEventListener("themechange", () => {
    // Theme swap changes the berg art — reload the texture from the
    // swapped <img> src; its onload re-uploads and rebuilds the text.
    const src = image.currentSrc || image.src;
    if (ready && src && source.src !== new URL(src, location.href).href) {
      source.src = src;
    } else {
      rebuildTextReflection();
    }
  });

  // Pointer → ripples. In side-on view every wave originates at the
  // waterline, so we keep the x of the cursor but lock y to the surface.
  let lastRippleAt = 0;
  const pointerRipple = (event, strength) => {
    if (!ready) {
      return;
    }
    const rect = visual.getBoundingClientRect();
    const u = (event.clientX - rect.left) / rect.width;
    const vTop = (event.clientY - rect.top) / rect.height;
    if (u < 0 || u > 1 || vTop < 0 || vTop > 1) {
      return;
    }
    addRipple(u, 1 - WATERLINE, strength);
  };

  hero.addEventListener(
    "pointermove",
    (event) => {
      const now = performance.now();
      if (now - lastRippleAt > 280) {
        lastRippleAt = now;
        pointerRipple(event, 0.4);
      }
    },
    { passive: true }
  );

  hero.addEventListener(
    "pointerdown",
    (event) => pointerRipple(event, 0.55),
    { passive: true }
  );

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { threshold: 0 }
    ).observe(visual);
  }

  // Ambient auto-ripples — small rolling wave packets at random x along
  // the waterline, every couple of seconds. Keeps the surface looking
  // alive when no one is hovering. Strength is well below click/hover
  // so user interactions still feel more emphatic.
  const autoRipple = () => {
    if (!ready || !inView || document.hidden) return;
    const u = 0.12 + Math.random() * 0.76; // stay away from the edges
    addRipple(u, 1 - WATERLINE, 0.34);
  };
  // First one shortly after the shader is ready, then on a brisk cadence
  // with a bit of jitter so the rhythm doesn't feel mechanical. Kept
  // below pointer strength (0.4/0.55) so interaction still stands out.
  let autoRippleTimer = 0;
  const scheduleAutoRipple = () => {
    autoRippleTimer = window.setTimeout(() => {
      autoRipple();
      scheduleAutoRipple();
    }, 1000 + Math.random() * 1100);
  };
  window.setTimeout(scheduleAutoRipple, 500);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => rebuildTextReflection()).observe(visual);
  } else {
    window.addEventListener("resize", rebuildTextReflection);
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
    visual.classList.remove("water-ready");
    // Bring the static DOM reflection back as the fallback
    reflectionEl()?.style.removeProperty("visibility");
  });
})();

/* ============================================================
   SideRays — corner light-ray accent for the hero.
   Ported from the React Bits "SideRays" component to a
   self-mounting vanilla module on raw WebGL (no ogl / no React),
   matching the hero water shader above. The GLSL is unchanged.
   Progressive enhancement: any failure leaves the hero intact.
   ============================================================ */
(() => {
  const container = document.querySelector("[data-side-rays]");
  if (!container || reducedMotionMedia.matches) {
    return;
  }

  const hexToRgb = (hex) => {
    const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return m
      ? [
          parseInt(m[1], 16) / 255,
          parseInt(m[2], 16) / 255,
          parseInt(m[3], 16) / 255,
        ]
      : [1, 1, 1];
  };

  const originToFlip = (origin) => {
    switch (origin) {
      case "top-left":
        return [1, 0];
      case "bottom-right":
        return [0, 1];
      case "bottom-left":
        return [1, 1];
      default:
        return [0, 0]; // top-right
    }
  };

  // Hero accent defaults — icy palette tuned to the iceberg scene.
  // Overridable per-instance via data-* attributes on the container.
  const num = (name, fallback) => {
    const v = parseFloat(container.dataset[name]);
    return Number.isFinite(v) ? v : fallback;
  };
  const cfg = {
    speed: num("speed", 2.2),
    rayColor1: container.dataset.rayColor1 || "#ffffff",
    rayColor2: container.dataset.rayColor2 || "#75b7ff",
    intensity: num("intensity", 1.4),
    spread: num("spread", 2),
    origin: container.dataset.origin || "top-right",
    tilt: num("tilt", 0),
    saturation: num("saturation", 1.4),
    blend: num("blend", 0.75),
    falloff: num("falloff", 1.6),
    opacity: num("opacity", 1.0),
  };

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  canvas.style.display = "block";

  // premultipliedAlpha:false so the browser composites the canvas over
  // the page using the shader's straight (non-premultiplied) RGBA.
  const gl =
    canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    }) ||
    canvas.getContext("experimental-webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    });
  if (!gl) {
    return;
  }

  const VERT = `
attribute vec2 position;
void main() {
  gl_Position = vec4(position, 0.0, 1.0);
}`;

  const FRAG = `precision highp float;

uniform float iTime;
uniform vec2 iResolution;
uniform float iSpeed;
uniform vec3 iRayColor1;
uniform vec3 iRayColor2;
uniform float iIntensity;
uniform float iSpread;
uniform float iFlipX;
uniform float iFlipY;
uniform float iTilt;
uniform float iSaturation;
uniform float iBlend;
uniform float iFalloff;
uniform float iOpacity;

float rayStrength(vec2 raySource, vec2 rayRefDirection, vec2 coord, float seedA, float seedB, float speed) {
  vec2 sourceToCoord = coord - raySource;
  float cosAngle = dot(normalize(sourceToCoord), rayRefDirection);
  return clamp(
    (0.45 + 0.15 * sin(cosAngle * seedA + iTime * speed)) +
    (0.3 + 0.2 * cos(-cosAngle * seedB + iTime * speed)),
    0.0, 1.0) *
    clamp((iResolution.x - length(sourceToCoord)) / iResolution.x, 0.5, 1.0);
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  if (iFlipX > 0.5) fragCoord.x = iResolution.x - fragCoord.x;
  if (iFlipY > 0.5) fragCoord.y = iResolution.y - fragCoord.y;

  vec2 coord = vec2(fragCoord.x, iResolution.y - fragCoord.y);
  vec2 rayPos = vec2(iResolution.x * 1.1, -0.5 * iResolution.y);

  float tiltRad = iTilt * 3.14159265 / 180.0;
  float cs = cos(tiltRad);
  float sn = sin(tiltRad);
  vec2 rel = coord - rayPos;
  vec2 tiltedCoord = vec2(rel.x * cs - rel.y * sn, rel.x * sn + rel.y * cs) + rayPos;

  float halfSpread = iSpread * 0.275;
  vec2 rayRefDir1 = normalize(vec2(cos(0.785398 + halfSpread), sin(0.785398 + halfSpread)));
  vec2 rayRefDir2 = normalize(vec2(cos(0.785398 - halfSpread), sin(0.785398 - halfSpread)));

  vec4 rays1 = vec4(iRayColor1, 1.0) * rayStrength(rayPos, rayRefDir1, tiltedCoord, 36.2214, 21.11349, iSpeed);
  vec4 rays2 = vec4(iRayColor2, 1.0) * rayStrength(rayPos, rayRefDir2, tiltedCoord, 22.3991, 18.0234, iSpeed * 0.2);

  vec4 color = rays1 * (1.0 - iBlend) * 0.9 + rays2 * iBlend * 0.9;

  float distanceToLight = length(fragCoord.xy - vec2(rayPos.x, iResolution.y - rayPos.y)) / iResolution.y;
  float brightness = iIntensity * 0.4 / pow(max(distanceToLight, 0.001), iFalloff);
  color.rgb *= brightness;

  float gray = dot(color.rgb, vec3(0.299, 0.587, 0.114));
  color.rgb = mix(vec3(gray), color.rgb, iSaturation);

  color.a = max(color.r, max(color.g, color.b)) * iOpacity;
  gl_FragColor = color;
}`;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || "shader compile failed");
    }
    return shader;
  };

  let program;
  try {
    program = gl.createProgram();
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || "program link failed");
    }
  } catch (error) {
    console.warn("SideRays effect unavailable:", error.message);
    return;
  }

  gl.useProgram(program);

  const quad = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, quad);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 3, -1, -1, 3]),
    gl.STATIC_DRAW
  );
  const aPos = gl.getAttribLocation(program, "position");
  gl.enableVertexAttribArray(aPos);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

  const U = {};
  [
    "iTime",
    "iResolution",
    "iSpeed",
    "iRayColor1",
    "iRayColor2",
    "iIntensity",
    "iSpread",
    "iFlipX",
    "iFlipY",
    "iTilt",
    "iSaturation",
    "iBlend",
    "iFalloff",
    "iOpacity",
  ].forEach((n) => {
    U[n] = gl.getUniformLocation(program, n);
  });

  const [flipX, flipY] = originToFlip(cfg.origin);
  gl.uniform1f(U.iSpeed, cfg.speed);
  gl.uniform1f(U.iSpread, cfg.spread);
  gl.uniform1f(U.iFlipX, flipX);
  gl.uniform1f(U.iFlipY, flipY);
  gl.uniform1f(U.iTilt, cfg.tilt);
  gl.uniform1f(U.iSaturation, cfg.saturation);
  gl.uniform1f(U.iBlend, cfg.blend);
  gl.uniform1f(U.iFalloff, cfg.falloff);
  gl.uniform1f(U.iOpacity, cfg.opacity);

  // Colour + intensity are theme-aware: bright whites/blues that glow
  // over the dark hero (screen blend), and saturated blues that tint
  // the light paper (multiply blend). Re-applied on theme change.
  const PALETTES = {
    dark: { c1: "#ffffff", c2: "#75b7ff", intensity: 2.2 },
    light: { c1: "#ffffff", c2: "#75b7ff", intensity: 2.2 },
  };
  const applyPalette = () => {
    const p =
      document.documentElement.getAttribute("data-theme") === "light"
        ? PALETTES.light
        : PALETTES.dark;
    gl.uniform3fv(U.iRayColor1, hexToRgb(cfg.rayColor1 !== "#ffffff" ? cfg.rayColor1 : p.c1));
    gl.uniform3fv(U.iRayColor2, hexToRgb(cfg.rayColor2 !== "#75b7ff" ? cfg.rayColor2 : p.c2));
    gl.uniform1f(U.iIntensity, p.intensity);
  };
  applyPalette();
  document.addEventListener("themechange", applyPalette);

  const DPR_CAP = 2;
  const resize = () => {
    const w = container.clientWidth;
    const h = container.clientHeight;
    if (!w || !h) return;
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const cw = Math.round(w * dpr);
    const ch = Math.round(h * dpr);
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
      gl.viewport(0, 0, cw, ch);
      gl.uniform2f(U.iResolution, cw, ch);
    }
  };

  let rafId = 0;
  let running = false;
  let inView = true;

  const render = (t) => {
    if (!running) return;
    gl.uniform1f(U.iTime, t * 0.001);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    rafId = requestAnimationFrame(render);
  };

  const start = () => {
    if (running || !inView || document.hidden) return;
    running = true;
    rafId = requestAnimationFrame(render);
  };

  const stop = () => {
    running = false;
    cancelAnimationFrame(rafId);
  };

  container.appendChild(canvas);
  resize();
  start();

  window.addEventListener("resize", resize);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if ("IntersectionObserver" in window) {
    new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) start();
        else stop();
      },
      { threshold: 0 }
    ).observe(container);
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
  });
})();
