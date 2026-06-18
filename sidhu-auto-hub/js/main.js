/* ============================================================
   SIDHU AUTO HUB — interaction + 3D depth engine
   Three.js (module) + GSAP ScrollTrigger + Lenis smooth scroll

   Three.js is loaded lazily as progressive enhancement — if the
   module CDN is unreachable the rest of the site still renders.
   ============================================================ */

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const isTouch = window.matchMedia("(hover: none)").matches;

/* ----------------------------------------------------------------
   1.  SAMPLE INVENTORY
---------------------------------------------------------------- */
const INVENTORY = [
  {
    name: "Dodge Charger SRT Hellcat",
    year: 2023, price: "$78,900", cat: "muscle", tag: "New Arrival",
    sub: "6.2L Supercharged HEMI V8 · RWD",
    hp: "717 HP", zero: "3.6s", trans: "8-Speed Auto", km: "12,400 km",
    img: "assets/cars/charger.jpg",
    desc: "A street-legal monster. Supercharged HEMI thunder, launch control, and a presence that owns every lane it touches."
  },
  {
    name: "Ford Mustang GT Premium",
    year: 2022, price: "$54,500", cat: "muscle", tag: "Featured",
    sub: "5.0L Coyote V8 · RWD",
    hp: "460 HP", zero: "4.2s", trans: "6-Speed Manual", km: "21,800 km",
    img: "assets/cars/mustang.jpg",
    desc: "American icon with a row-your-own gearbox, active exhaust, and that unmistakable V8 bark."
  },
  {
    name: "Chevrolet Corvette C8 Z51",
    year: 2023, price: "$112,000", cat: "sport", tag: "Just In",
    sub: "6.2L Mid-Engine V8 · RWD",
    hp: "495 HP", zero: "2.9s", trans: "8-Speed DCT", km: "6,200 km",
    img: "assets/cars/corvette.jpg",
    desc: "Mid-engine supercar performance at a fraction of the cost. Razor-sharp handling and brutal straight-line pace."
  },
  {
    name: "BMW M4 Competition",
    year: 2021, price: "$84,750", cat: "sport", tag: "",
    sub: "3.0L Twin-Turbo I6 · AWD",
    hp: "503 HP", zero: "3.4s", trans: "8-Speed M Steptronic", km: "18,500 km",
    img: "assets/cars/m4.jpg",
    desc: "Track-bred precision with daily-driver comfort. Carbon trim, M differential, and surgical throttle response."
  },
  {
    name: "Mercedes-AMG G63",
    year: 2023, price: "$214,900", cat: "suv", tag: "Premium",
    sub: "4.0L Biturbo V8 · 4MATIC",
    hp: "577 HP", zero: "4.5s", trans: "9-Speed Auto", km: "9,100 km",
    img: "assets/cars/g63.jpg",
    desc: "The undisputed king of statement SUVs. Hand-built AMG V8, military DNA, first-class luxury throughout."
  },
  {
    name: "Audi RS7 Sportback",
    year: 2022, price: "$129,500", cat: "sport", tag: "",
    sub: "4.0L Twin-Turbo V8 · quattro",
    hp: "591 HP", zero: "3.5s", trans: "8-Speed Tiptronic", km: "15,300 km",
    img: "assets/cars/rs7.jpg",
    desc: "Four-door grand tourer with supercar muscle. Effortless quattro grip and a cabin built for long-haul pace."
  },
  {
    name: "Jeep Wrangler Rubicon 392",
    year: 2023, price: "$92,300", cat: "suv", tag: "New Arrival",
    sub: "6.4L HEMI V8 · 4x4",
    hp: "470 HP", zero: "4.5s", trans: "8-Speed Auto", km: "8,700 km",
    img: "assets/cars/wrangler.jpg",
    desc: "V8 power meets go-anywhere capability. Locking diffs, sway-bar disconnect, and trail-rated dominance."
  },
  {
    name: "Nissan GT-R Premium",
    year: 2021, price: "$138,000", cat: "sport", tag: "Featured",
    sub: "3.8L Twin-Turbo V6 · AWD",
    hp: "565 HP", zero: "2.9s", trans: "6-Speed DCT", km: "14,600 km",
    img: "assets/cars/gtr.jpg",
    desc: "Godzilla. The legendary all-wheel-drive launch and relentless turbocharged thrust that humble exotics."
  },
  {
    name: "Chevrolet Camaro ZL1",
    year: 2022, price: "$71,400", cat: "muscle", tag: "Sold",
    sub: "6.2L Supercharged V8 · RWD",
    hp: "650 HP", zero: "3.5s", trans: "10-Speed Auto", km: "19,900 km",
    img: "assets/cars/camaro.jpg",
    desc: "The most track-capable Camaro ever built. Supercharged fury with magnetic ride and aggressive aero."
  }
];

function buildCards() {
  const grid = document.getElementById("inventory-grid");
  if (!grid) return;
  grid.innerHTML = INVENTORY.map((v, i) => {
    const sold = v.tag.toLowerCase() === "sold";
    const tagHtml = v.tag ? `<span class="card__tag ${sold ? "card__tag--sold" : ""}">${v.tag}</span>` : "";
    return `
    <article class="card reveal" data-cat="${v.cat}" data-index="${i}">
      ${tagHtml}
      <button class="card__fav" aria-label="Save vehicle" data-fav>♥</button>
      <div class="card__media">
        <img src="${v.img}" alt="${v.year} ${v.name}" loading="lazy"
             onerror="this.style.display='none';this.nextElementSibling.style.display='grid';">
        <div class="card__media-fallback">${v.year}<br>${v.name}</div>
      </div>
      <div class="card__body">
        <div class="card__row">
          <div>
            <div class="card__name">${v.year} ${v.name}</div>
            <div class="card__sub">${v.sub}</div>
          </div>
          <div class="card__price">${v.price}</div>
        </div>
        <div class="card__specs">
          <div class="spec"><span class="s-val">${v.hp}</span><span class="s-lbl">Power</span></div>
          <div class="spec"><span class="s-val">${v.zero}</span><span class="s-lbl">0–100</span></div>
          <div class="spec"><span class="s-val">${v.km}</span><span class="s-lbl">Mileage</span></div>
        </div>
        <div class="card__cta" data-view="${i}">
          View Details <span class="arrow">→</span>
        </div>
      </div>
    </article>`;
  }).join("");

  // favourite toggle
  grid.querySelectorAll("[data-fav]").forEach(b =>
    b.addEventListener("click", e => { e.stopPropagation(); b.classList.toggle("on"); }));

  // open modal
  grid.querySelectorAll("[data-view]").forEach(el =>
    el.addEventListener("click", () => openModal(+el.dataset.view)));

  if (!isTouch) attachTilt(grid);
  refreshReveals();
}

/* ----- 3D tilt on cards (mouse parallax) ----- */
function attachTilt(scope) {
  scope.querySelectorAll(".card").forEach(card => {
    card.addEventListener("mousemove", e => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - 0.5;
      const py = (e.clientY - r.top) / r.height - 0.5;
      card.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-6px)`;
    });
    card.addEventListener("mouseleave", () => { card.style.transform = ""; });
  });
}

/* ----- Filters ----- */
function initFilters() {
  document.querySelectorAll(".filter").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".filter").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      const f = btn.dataset.filter;
      document.querySelectorAll(".card").forEach(c => {
        const show = f === "all" || c.dataset.cat === f;
        c.style.display = show ? "" : "none";
      });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    });
  });
}

/* ----- Modal ----- */
function openModal(i) {
  const v = INVENTORY[i];
  const m = document.getElementById("modal");
  m.querySelector("[data-m-img]").src = v.img;
  m.querySelector("[data-m-title]").textContent = `${v.year} ${v.name}`;
  m.querySelector("[data-m-price]").textContent = v.price;
  m.querySelector("[data-m-desc]").textContent = v.desc;
  m.querySelector("[data-m-specs]").innerHTML = [
    ["Power", v.hp], ["0–100 km/h", v.zero], ["Drivetrain", v.sub.split("·").pop().trim()],
    ["Transmission", v.trans], ["Mileage", v.km], ["Engine", v.sub.split("·")[0].trim()]
  ].map(([k, val]) => `<div class="spec"><span class="s-val">${val}</span><span class="s-lbl">${k}</span></div>`).join("");
  m.classList.add("open");
  document.body.style.overflow = "hidden";
}
function initModal() {
  const m = document.getElementById("modal");
  m.querySelector(".modal__close").addEventListener("click", closeModal);
  m.addEventListener("click", e => { if (e.target === m) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  function closeModal() { m.classList.remove("open"); document.body.style.overflow = ""; }
}

/* ----------------------------------------------------------------
   2.  THREE.JS  — depth field that reacts to scroll + mouse
---------------------------------------------------------------- */
let scrollProgress = 0;          // 0..1 over whole page
const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

async function initThree() {
  const canvas = document.getElementById("bg-canvas");
  if (!canvas || reduceMotion) return;

  let THREE;
  try {
    THREE = await import("three");
  } catch (e) {
    console.warn("3D background unavailable (Three.js failed to load):", e);
    return; // progressive enhancement — page works without it
  }

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07080a, 0.055);

  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 0, 12);

  // --- particle starfield (depth) ---
  const COUNT = isTouch ? 1400 : 2800;
  const positions = new Float32Array(COUNT * 3);
  const speeds = new Float32Array(COUNT);
  for (let i = 0; i < COUNT; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * 60;
    positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
    positions[i * 3 + 2] = (Math.random() - 0.5) * 120;
    speeds[i] = 0.6 + Math.random();
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const pMat = new THREE.PointsMaterial({
    color: 0xc3c7d0, size: 0.09, transparent: true, opacity: 0.85,
    sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // --- floating metallic chrome shapes ---
  const shapes = [];
  const geos = [
    new THREE.IcosahedronGeometry(1.5, 0),
    new THREE.TorusGeometry(1.4, 0.42, 16, 60),
    new THREE.OctahedronGeometry(1.5, 0),
    new THREE.TorusKnotGeometry(1, 0.32, 90, 14)
  ];
  const mat = new THREE.MeshStandardMaterial({
    color: 0x9a9da6, metalness: 1, roughness: 0.28, wireframe: false
  });
  const wireMat = new THREE.MeshBasicMaterial({ color: 0x3a3d44, wireframe: true });

  for (let i = 0; i < 7; i++) {
    const useWire = i % 2 === 0;
    const mesh = new THREE.Mesh(geos[i % geos.length], useWire ? wireMat : mat);
    const s = 0.5 + Math.random() * 0.9;
    mesh.scale.setScalar(s);
    mesh.position.set((Math.random() - 0.5) * 26, (Math.random() - 0.5) * 26, -i * 9 - 4);
    mesh.userData.rot = (Math.random() - 0.5) * 0.01;
    mesh.userData.float = Math.random() * Math.PI * 2;
    shapes.push(mesh);
    scene.add(mesh);
  }

  // --- accent red light + chrome key light ---
  const key = new THREE.DirectionalLight(0xffffff, 2.2); key.position.set(5, 8, 10); scene.add(key);
  const rim = new THREE.PointLight(0xe10600, 18, 60); rim.position.set(-8, -4, 4); scene.add(rim);
  scene.add(new THREE.AmbientLight(0x404550, 0.7));

  // pointer parallax
  if (!isTouch) {
    window.addEventListener("mousemove", e => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5);
      pointer.ty = (e.clientY / window.innerHeight - 0.5);
    });
  }

  const clock = new THREE.Clock();
  function render() {
    const t = clock.getElapsedTime();
    const dt = clock.getDelta();

    // particles drift toward camera = motion through space
    const pos = pGeo.attributes.position.array;
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3 + 2] += speeds[i] * (0.05 + scrollProgress * 0.25);
      if (pos[i * 3 + 2] > camera.position.z) pos[i * 3 + 2] = -120;
    }
    pGeo.attributes.position.needsUpdate = true;

    // smooth pointer
    pointer.x += (pointer.tx - pointer.x) * 0.05;
    pointer.y += (pointer.ty - pointer.y) * 0.05;

    points.rotation.y = t * 0.02 + pointer.x * 0.4;
    points.rotation.x = pointer.y * 0.25;

    shapes.forEach((m, i) => {
      m.rotation.x += m.userData.rot;
      m.rotation.y += m.userData.rot * 1.4;
      m.position.y += Math.sin(t * 0.5 + m.userData.float) * 0.004;
    });

    // camera travels deeper with scroll => real depth motion
    camera.position.z = 12 - scrollProgress * 16;
    camera.position.x += (pointer.x * 3 - camera.position.x) * 0.04;
    camera.position.y += (-pointer.y * 3 - camera.position.y) * 0.04;
    camera.lookAt(0, 0, camera.position.z - 10);

    rim.intensity = 14 + Math.sin(t * 2) * 6;

    renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  render();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
}

/* ----------------------------------------------------------------
   3.  SMOOTH SCROLL + GSAP CHOREOGRAPHY
---------------------------------------------------------------- */
let lenis;
function initScroll() {
  // Lenis smooth scroll
  if (window.Lenis && !reduceMotion) {
    lenis = new Lenis({ lerp: 0.09, wheelMultiplier: 1 });
    lenis.on("scroll", () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? window.scrollY / max : 0;
      const bar = document.querySelector(".scroll-progress");
      if (bar) bar.style.width = (scrollProgress * 100) + "%";
    });
    function raf(time) { lenis.raf(time); requestAnimationFrame(raf); }
    requestAnimationFrame(raf);
    if (window.ScrollTrigger) {
      lenis.on("scroll", ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    }
  } else {
    window.addEventListener("scroll", () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      scrollProgress = max > 0 ? window.scrollY / max : 0;
      const bar = document.querySelector(".scroll-progress");
      if (bar) bar.style.width = (scrollProgress * 100) + "%";
    }, { passive: true });
  }

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);

  // hero headline reveal
  gsap.set(".hero h1 .line > span", { yPercent: 110 });
  gsap.to(".hero h1 .line > span", {
    yPercent: 0, duration: 1.1, stagger: 0.12, ease: "expo.out", delay: 0.25
  });
  gsap.from(".hero__sub, .hero__actions, .hero__logo", {
    opacity: 0, y: 30, duration: 1, stagger: 0.12, ease: "power3.out", delay: 0.8
  });

  // hero parallax out
  gsap.to(".hero__inner", {
    yPercent: -18, opacity: 0.2, ease: "none",
    scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true }
  });
}

/* generic reveal on scroll */
function refreshReveals() {
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) {
    document.querySelectorAll(".reveal").forEach(el => el.style.opacity = 1);
    return;
  }
  document.querySelectorAll(".reveal").forEach(el => {
    if (el.dataset.revealed) return;
    el.dataset.revealed = "1";
    gsap.to(el, {
      opacity: 1, y: 0, duration: 0.95, ease: "power3.out",
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });
}

/* depth-band background parallax */
function initBandParallax() {
  if (!window.gsap || !window.ScrollTrigger || reduceMotion) return;
  document.querySelectorAll(".depth-band__bg").forEach(bg => {
    gsap.fromTo(bg, { yPercent: -12 }, {
      yPercent: 12, ease: "none",
      scrollTrigger: { trigger: bg.closest(".depth-band"), start: "top bottom", end: "bottom top", scrub: true }
    });
  });
  // count-up stats
  document.querySelectorAll("[data-count]").forEach(el => {
    const end = +el.dataset.count;
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: 1.8, ease: "power2.out",
      scrollTrigger: { trigger: el, start: "top 88%" },
      onUpdate: () => { el.firstChild.textContent = Math.round(obj.v).toLocaleString(); }
    });
  });
}

/* ----------------------------------------------------------------
   4.  NAV + CURSOR + MISC
---------------------------------------------------------------- */
function initNav() {
  const nav = document.querySelector(".nav");
  const onScroll = () => nav.classList.toggle("scrolled", window.scrollY > 40);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();

  const burger = document.querySelector(".nav__burger");
  const links = document.querySelector(".nav__links");
  burger.addEventListener("click", () => links.classList.toggle("open"));
  links.querySelectorAll("a").forEach(a => a.addEventListener("click", e => {
    links.classList.remove("open");
    const href = a.getAttribute("href");
    if (href && href.startsWith("#") && lenis) {
      const tgt = document.querySelector(href);
      if (tgt) { e.preventDefault(); lenis.scrollTo(tgt, { offset: -70 }); }
    }
  }));
}

function initCursor() {
  if (isTouch) return;
  const ring = document.querySelector(".cursor");
  const dot = document.querySelector(".cursor-dot");
  let rx = 0, ry = 0;
  window.addEventListener("mousemove", e => {
    dot.style.transform = `translate(${e.clientX}px, ${e.clientY}px) translate(-50%,-50%)`;
    rx = e.clientX; ry = e.clientY;
  });
  let cx = 0, cy = 0;
  (function follow() {
    cx += (rx - cx) * 0.18;
    cy += (ry - cy) * 0.18;
    ring.style.transform = `translate(${cx}px, ${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(follow);
  })();
  document.querySelectorAll("a, button, .card__cta, .filter, .card").forEach(el => {
    el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
    el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
  });
}

/* ----------------------------------------------------------------
   BOOT
---------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  buildCards();
  initFilters();
  initModal();
  initThree();
  initScroll();
  initBandParallax();
  initNav();
  initCursor();
  refreshReveals();
  document.getElementById("year").textContent = new Date().getFullYear();
});
