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
  const gaugeAnchor = hero || document.querySelector(".cs-hero");
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
    ".about-copy h2",
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

  // Interactive hover states — delegated to avoid per-element listeners
  const LINK_SELECTOR =
    "a, button, [role='button'], .magnetic, input, textarea, select, label[for]";
  const VIEW_SELECTOR = ".project-image, .bento-item, .image-placeholder";

  document.addEventListener(
    "pointerover",
    (event) => {
      const view = event.target.closest(VIEW_SELECTOR);
      const link = event.target.closest(LINK_SELECTOR);
      ring.classList.toggle("is-view", !!view);
      ring.classList.toggle("is-hover", !view && !!link);
    },
    { passive: true }
  );

  document.addEventListener(
    "pointerout",
    (event) => {
      if (!event.relatedTarget) {
        ring.classList.remove("is-hover", "is-view");
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
    uniform float uTime;
    uniform float uWater;
    uniform float uAmp;
    uniform float uAspect;
    uniform vec4 uRipples[${MAX_RIPPLES}];

    void main() {
      vec2 uv = vUv;
      float crestEnergy = 0.0;

      if (uv.y < uWater) {
        // depth: 0 at horizon/waterline, 1 at bottom (closest to camera)
        float depth = (uWater - uv.y) / uWater;
        float fade = smoothstep(0.0, 0.10, uWater - uv.y);

        // Calm ambient surface chop — three superposed long-wavelength
        // waves, perspective-foreshortened toward the horizon. Slightly
        // taller now so the surface always looks alive by default.
        float chop =
          sin(uv.x * 22.0 + uTime * 0.70) * 0.0028 +
          sin(uv.x * 11.0 - uTime * 0.45 + depth * 5.0) * 0.0036 +
          sin(uv.x * 42.0 + uTime * 1.10) * 0.0014;
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
          float dy = carrier * envelope * decay * 0.013 * horizBand * perspective;

          offset += vec2(0.0, dy);
          crestEnergy += envelope * decay * horizBand;
        }

        uv = clamp(uv + offset, 0.001, 0.999);
        vec4 color = texture2D(uTex, uv);

        // Subtle crest brightening and cool tint — kept gentle for calm
        float shimmer = (chop * 28.0 + crestEnergy * 0.35) * depth;
        color.rgb *= 1.0 + shimmer;
        color.rgb += vec3(0.78, 0.88, 1.00) * crestEnergy * 0.08 * color.a;
        color.rgb = min(color.rgb, vec3(color.a));
        gl_FragColor = color;
      } else {
        gl_FragColor = texture2D(uTex, uv);
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
  };

  gl.uniform1f(uniforms.water, 1.0 - WATERLINE);

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

  const resizeCanvas = () => {
    const rect = visual.getBoundingClientRect();
    if (!rect.width || !rect.height) {
      return;
    }
    const dpr = Math.min(window.devicePixelRatio || 1, DPR_CAP);
    const w = Math.round(rect.width * dpr);
    const h = Math.round(rect.height * dpr);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
      gl.viewport(0, 0, w, h);
      gl.uniform1f(uniforms.aspect, w / h);
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
  };

  source.onerror = () => {
    /* image failed — static <img> remains the experience */
  };

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
    addRipple(u, 1 - WATERLINE, 0.22);
  };
  // First one shortly after the shader is ready, then on a loose cadence
  // with a bit of jitter so the rhythm doesn't feel mechanical.
  let autoRippleTimer = 0;
  const scheduleAutoRipple = () => {
    autoRippleTimer = window.setTimeout(() => {
      autoRipple();
      scheduleAutoRipple();
    }, 1800 + Math.random() * 1600);
  };
  window.setTimeout(scheduleAutoRipple, 900);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) stop();
    else start();
  });

  if ("ResizeObserver" in window) {
    new ResizeObserver(() => resizeCanvas()).observe(visual);
  } else {
    window.addEventListener("resize", resizeCanvas);
  }

  canvas.addEventListener("webglcontextlost", (event) => {
    event.preventDefault();
    stop();
    visual.classList.remove("water-ready");
  });
})();
