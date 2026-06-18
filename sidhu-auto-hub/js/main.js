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
    name: "Lamborghini Huracán EVO",
    year: 2021, price: "$289,900", cat: "sport", tag: "New Arrival",
    sub: "5.2L Naturally Aspirated V10 · RWD",
    hp: "631 HP", zero: "3.1s", trans: "7-Speed DCT", km: "9,400 km",
    img: "assets/cars/huracan.jpg",
    desc: "A mid-engine V10 exotic in arancio orange. Naturally aspirated fury, scissor-sharp response, and a soundtrack nothing else can match."
  },
  {
    name: "Ford Mustang Mach 1",
    year: 1971, price: "$74,500", cat: "muscle", tag: "Featured",
    sub: "351 Cleveland V8 · RWD",
    hp: "330 HP", zero: "6.0s", trans: "4-Speed Manual", km: "Restored",
    img: "assets/cars/mustang.jpg",
    desc: "A fully sorted classic Mach 1 in candy red. Ram-air hood, shaker scoop, and the raw character only a true muscle-era pony delivers."
  },
  {
    name: "Mercedes-AMG GT R",
    year: 2020, price: "$164,900", cat: "sport", tag: "Just In",
    sub: "4.0L Biturbo V8 · RWD",
    hp: "577 HP", zero: "3.5s", trans: "7-Speed DCT", km: "12,800 km",
    img: "assets/cars/amggt.jpg",
    desc: "The 'Beast of the Green Hell' in matte black. Hand-built AMG V8, active aero, and rear-wheel steering for surgical precision."
  },
  {
    name: "BMW M5 Competition",
    year: 2021, price: "$112,500", cat: "sport", tag: "",
    sub: "4.4L Twin-Turbo V8 · M xDrive AWD",
    hp: "617 HP", zero: "3.2s", trans: "8-Speed M Steptronic", km: "18,500 km",
    img: "assets/cars/m5.jpg",
    desc: "The super-sedan benchmark. Switchable all-wheel drive, twin-turbo V8 thrust, and four-door, five-seat everyday usability."
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
    name: "Tesla Model 3 Performance",
    year: 2023, price: "$61,900", cat: "sport", tag: "Electric",
    sub: "Dual Motor · All-Wheel Drive · EV",
    hp: "510 HP", zero: "3.1s", trans: "Single-Speed", km: "14,200 km",
    img: "assets/cars/model3.jpg",
    desc: "Instant electric torque in a clean white finish. Silent launches, 500+ km range, and software that keeps getting better."
  },
  {
    name: "Ford Expedition Limited",
    year: 2022, price: "$72,300", cat: "suv", tag: "New Arrival",
    sub: "3.5L EcoBoost V6 · 4x4",
    hp: "400 HP", zero: "5.8s", trans: "10-Speed Auto", km: "21,600 km",
    img: "assets/cars/expedition.jpg",
    desc: "Full-size capability with twin-turbo punch. Three rows, trailer-grade towing, and long-haul comfort for the whole crew."
  },
  {
    name: "Dodge Challenger R/T Scat Pack",
    year: 2022, price: "$58,900", cat: "muscle", tag: "Featured",
    sub: "6.4L 392 HEMI V8 · RWD",
    hp: "485 HP", zero: "4.3s", trans: "6-Speed Manual", km: "16,900 km",
    img: "assets/cars/challenger.jpg",
    desc: "Blacked-out HEMI muscle, unfiltered. Naturally aspirated 392 V8, line-lock, and a stance that means business."
  },
  {
    name: "Chevrolet Camaro SS 1LE",
    year: 2021, price: "$52,400", cat: "muscle", tag: "Sold",
    sub: "6.2L LT1 V8 · RWD",
    hp: "455 HP", zero: "4.0s", trans: "6-Speed Manual", km: "19,900 km",
    img: "assets/cars/camaro.jpg",
    desc: "Track package in electric blue. LT1 V8, magnetic ride, and the 1LE aero that turns canyon roads into a playground."
  }
];

function buildCards() {
  const grid = document.getElementById("inventory-grid");
  if (!grid) return;
  grid.innerHTML = INVENTORY.map((v, i) => {
    const sold = v.tag.toLowerCase() === "sold";
    const tagHtml = v.tag ? `<span class="card__tag ${sold ? "card__tag--sold" : ""}">${v.tag}</span>` : "";
    return `
    <article class="card reveal" data-cat="${v.cat}" data-index="${i}" data-cursor="View">
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

/* ----- Modal (vehicle detail page) ----- */
let activeVehicle = "";
function openModal(i) {
  const v = INVENTORY[i];
  const m = document.getElementById("modal");
  activeVehicle = `${v.year} ${v.name}`;
  m.querySelector("[data-m-img]").src = v.img;
  m.querySelector("[data-m-title]").textContent = activeVehicle;
  m.querySelector("[data-m-price]").textContent = v.price;
  m.querySelector("[data-m-desc]").textContent = v.desc;
  m.querySelector("[data-m-specs]").innerHTML = [
    ["Power", v.hp], ["0–100 km/h", v.zero], ["Drivetrain", v.sub.split("·").pop().trim()],
    ["Transmission", v.trans], ["Mileage", v.km], ["Engine", v.sub.split("·")[0].trim()]
  ].map(([k, val]) => `<div class="spec"><span class="s-val">${val}</span><span class="s-lbl">${k}</span></div>`).join("");
  // wire modal action buttons to the chosen vehicle + price for the calculator
  m.querySelectorAll("[data-m-action]").forEach(btn => btn.dataset.vehicle = activeVehicle);
  m.dataset.price = (v.price.match(/[\d,]+/) || ["0"])[0].replace(/,/g, "");
  m.classList.add("open");
  document.body.style.overflow = "hidden";
}
function initModal() {
  const m = document.getElementById("modal");
  m.querySelector(".modal__close").addEventListener("click", closeModal);
  m.addEventListener("click", e => { if (e.target === m) closeModal(); });
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
  // modal actions: prefill lead form / calculator, then jump there
  m.querySelectorAll("[data-m-action]").forEach(btn => btn.addEventListener("click", () => {
    const act = btn.dataset.m_action || btn.dataset.mAction || btn.getAttribute("data-m-action");
    if (act === "finance" && m.dataset.price) prefillCalculator(+m.dataset.price);
    else setLeadForm(act, activeVehicle);
    closeModal();
  }));
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
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x0a0a0b, 0.05);

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
  // faint champagne-gold motes drifting on the ink (additive glow)
  const PALETTE = [0xc9a86a, 0xe7cd97, 0xa98847, 0xf5f3ee, 0xb89a64];
  const colors = new Float32Array(COUNT * 3);
  const tmp = new THREE.Color();
  for (let i = 0; i < COUNT; i++) {
    tmp.setHex(PALETTE[i % PALETTE.length]);
    colors[i * 3] = tmp.r; colors[i * 3 + 1] = tmp.g; colors[i * 3 + 2] = tmp.b;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  pGeo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const pMat = new THREE.PointsMaterial({
    size: 0.085, transparent: true, opacity: 0.55, vertexColors: true,
    sizeAttenuation: true, depthWrite: false, blending: THREE.AdditiveBlending
  });
  const points = new THREE.Points(pGeo, pMat);
  scene.add(points);

  // --- a few slow gold wireframe forms, very subtle ---
  const shapes = [];
  const geos = [
    new THREE.IcosahedronGeometry(1.6, 0),
    new THREE.TorusGeometry(1.4, 0.4, 16, 64),
    new THREE.OctahedronGeometry(1.6, 0),
    new THREE.TorusKnotGeometry(1, 0.3, 100, 14)
  ];
  for (let i = 0; i < 5; i++) {
    const m = new THREE.MeshBasicMaterial({ color: 0xc9a86a, wireframe: true, transparent: true, opacity: 0.14 });
    const mesh = new THREE.Mesh(geos[i % geos.length], m);
    const s = 0.6 + Math.random() * 0.9;
    mesh.scale.setScalar(s);
    mesh.position.set((Math.random() - 0.5) * 28, (Math.random() - 0.5) * 26, -i * 11 - 6);
    mesh.userData.rot = (Math.random() - 0.5) * 0.007;
    mesh.userData.float = Math.random() * Math.PI * 2;
    shapes.push(mesh);
    scene.add(mesh);
  }

  // --- dim warm lighting ---
  const key = new THREE.DirectionalLight(0xfff3df, 1.4); key.position.set(5, 8, 10); scene.add(key);
  const rim = new THREE.PointLight(0xc9a86a, 14, 70); rim.position.set(-9, -4, 4); scene.add(rim);
  const rim2 = new THREE.PointLight(0xe7cd97, 10, 70); rim2.position.set(9, 5, 2); scene.add(rim2);
  const rim3 = new THREE.PointLight(0xa98847, 8, 70); rim3.position.set(0, -8, 6); scene.add(rim3);
  scene.add(new THREE.AmbientLight(0x2a2a2e, 0.8));

  // pointer parallax
  if (!isTouch) {
    window.addEventListener("mousemove", e => {
      pointer.tx = (e.clientX / window.innerWidth - 0.5);
      pointer.ty = (e.clientY / window.innerHeight - 0.5);
    });
  }

  // --- UnrealBloom post-processing (subtle gold glow on the ink) ---
  let composer = null, bloom = null;
  if (!isTouch) {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import("./vendor/jsm/postprocessing/EffectComposer.js"),
        import("./vendor/jsm/postprocessing/RenderPass.js"),
        import("./vendor/jsm/postprocessing/UnrealBloomPass.js"),
        import("./vendor/jsm/postprocessing/OutputPass.js")
      ]);
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(scene, camera));
      bloom = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight), 0.5, 0.7, 0.6);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      composer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      composer.setSize(window.innerWidth, window.innerHeight);
    } catch (e) {
      console.warn("Bloom post-processing unavailable, falling back to direct render:", e);
      composer = null;
    }
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

    rim.intensity  = 18 + Math.sin(t * 2.0) * 8;
    rim2.intensity = 16 + Math.sin(t * 1.6 + 2) * 8;
    rim3.intensity = 14 + Math.sin(t * 2.4 + 4) * 6;

    if (composer) composer.render();
    else renderer.render(scene, camera);
    requestAnimationFrame(render);
  }
  render();

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    if (composer) composer.setSize(window.innerWidth, window.innerHeight);
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

  // hero starts hidden; playIntro() reveals it after the preloader lifts
  gsap.set(".hero h1 .line > span", { yPercent: 110 });

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
  const label = ring.querySelector(".cursor__label");
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
  document.querySelectorAll("a, button, .card__cta, .filter").forEach(el => {
    el.addEventListener("mouseenter", () => ring.classList.add("is-active"));
    el.addEventListener("mouseleave", () => ring.classList.remove("is-active"));
  });
  // contextual cursor label (Lusion / Active Theory style)
  document.querySelectorAll("[data-cursor]").forEach(el => {
    el.addEventListener("mouseenter", () => {
      label.textContent = el.dataset.cursor;
      ring.classList.add("is-active", "is-label");
    });
    el.addEventListener("mouseleave", () => ring.classList.remove("is-active", "is-label"));
  });
}

/* ----- Magnetic buttons (Cuberto / Obys) ----- */
function initMagnetic() {
  if (isTouch || reduceMotion) return;
  document.querySelectorAll("[data-magnetic], .btn").forEach(el => {
    const strength = el.classList.contains("btn") ? 0.35 : 0.5;
    el.addEventListener("mousemove", e => {
      const r = el.getBoundingClientRect();
      const mx = e.clientX - (r.left + r.width / 2);
      const my = e.clientY - (r.top + r.height / 2);
      el.style.transform = `translate(${mx * strength}px, ${my * strength}px)`;
    });
    el.addEventListener("mouseleave", () => { el.style.transform = ""; });
  });
}

/* ----- Preloader: counter + curtain reveal (Active Theory / Obys) ----- */
function initPreloader() {
  const pre = document.getElementById("preloader");
  if (!pre) return;
  const fill = pre.querySelector(".preloader__fill");
  const video = document.getElementById("intro-video");
  const skip = document.getElementById("intro-skip");
  if (lenis) lenis.stop();
  document.body.style.overflow = "hidden";

  let done = false, fallback;
  const reveal = () => {
    if (done) return; done = true;
    clearTimeout(fallback);
    try { sessionStorage.setItem("sah_intro", "1"); } catch (e) {}
    pre.classList.add("done");
    document.body.style.overflow = "";
    if (lenis) lenis.start();
    playIntro();
    setTimeout(() => pre.remove(), 1200);
  };

  let seen = false;
  try { seen = !!sessionStorage.getItem("sah_intro"); } catch (e) {}

  // already watched this session, or no video element -> reveal swiftly
  if (seen || !video) { fallback = setTimeout(reveal, seen ? 350 : 0); if (skip) skip.addEventListener("click", reveal); return; }

  // first visit: play the brand intro, hard cap so it never traps the visitor
  fallback = setTimeout(reveal, 8000);
  video.addEventListener("timeupdate", () => {
    if (video.duration) fill.style.width = Math.min(100, video.currentTime / video.duration * 100) + "%";
  });
  video.addEventListener("ended", reveal);
  video.addEventListener("error", reveal);
  const play = video.play();
  if (play && play.catch) play.catch(() => reveal());  // autoplay blocked -> skip straight in
  if (skip) skip.addEventListener("click", reveal);
}

/* hero intro plays after preloader lifts */
function playIntro() {
  // (re)play the animated logo film as the hero appears
  const film = document.querySelector(".hero__logo--film");
  if (film) { try { film.currentTime = 0; } catch (e) {} const pl = film.play && film.play(); if (pl && pl.catch) pl.catch(() => {}); }
  if (!window.gsap) return;
  gsap.fromTo(".hero h1 .line > span", { yPercent: 110 },
    { yPercent: 0, duration: 1.3, stagger: 0.14, ease: "expo.out" });
  gsap.fromTo(".hero__logo, .hero .eyebrow, .hero__sub, .hero__actions, .hero__meta, .hero__scroll",
    { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 1.1, stagger: 0.1, ease: "power3.out", delay: 0.25 });
}

/* ----- Kinetic word split + reveal (Obys / Zentry) ----- */
function initKinetic() {
  document.querySelectorAll(".kinetic").forEach(el => {
    if (el.dataset.split) return;
    el.dataset.split = "1";
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="word"><span>${w}</span></span>`).join(" ");
    if (!window.gsap || !window.ScrollTrigger || reduceMotion) return;
    gsap.set(el.querySelectorAll(".word > span"), { yPercent: 110 });
    gsap.to(el.querySelectorAll(".word > span"), {
      yPercent: 0, duration: 0.9, stagger: 0.08, ease: "expo.out",
      scrollTrigger: { trigger: el, start: "top 85%" }
    });
  });
}

/* ----- Spotlight (pinned scroll-scrub through featured vehicles) ----- */
const CINEMA = [
  { img: "assets/cars/huracan.jpg",    title: "Huracán EVO" },
  { img: "assets/cars/amggt.jpg",      title: "AMG GT R" },
  { img: "assets/cars/challenger.jpg", title: "Challenger" }
];
function initCinema() {
  const sec = document.getElementById("spotlight");
  if (!sec || !window.gsap || !window.ScrollTrigger || reduceMotion) return;
  const img = sec.querySelector("[data-cinema-img]");
  const titleEl = sec.querySelector("[data-cinema-title]");
  const bar = sec.querySelector("[data-cinema-bar]");
  const chapters = [...sec.querySelectorAll(".spotlight__chapter")];
  const n = chapters.length;

  // chapter timeline scrubbed by scroll
  const tl = gsap.timeline({
    scrollTrigger: { trigger: sec, start: "top top", end: "bottom bottom", scrub: 0.6 }
  });
  chapters.forEach((ch, i) => {
    tl.fromTo(ch, { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 0.5 }, i)
      .to(ch, { opacity: 0, y: -40, duration: 0.5 }, i + 0.5);
  });

  // image zoom + crossfade per chapter, title swap, progress bar
  ScrollTrigger.create({
    trigger: sec, start: "top top", end: "bottom bottom", scrub: 0.6,
    onUpdate: self => {
      const prog = self.progress;
      bar.style.width = (prog * 100) + "%";
      gsap.set(img, { scale: 1.15 + prog * 0.18, yPercent: -prog * 6 });
      const idx = Math.min(n - 1, Math.floor(prog * n));
      if (CINEMA[idx] && img.dataset.cur !== String(idx)) {
        img.dataset.cur = String(idx);
        gsap.to(img, { opacity: 0, duration: 0.25, onComplete: () => {
          img.src = CINEMA[idx].img;
          titleEl.textContent = CINEMA[idx].title;
          gsap.to(img, { opacity: 1, duration: 0.45 });
        }});
      }
    }
  });
}

/* ----- Locomotive-style horizontal pinned gallery ----- */
function initGarage() {
  const sec = document.getElementById("garage");
  if (!sec || !window.gsap || !window.ScrollTrigger || reduceMotion) return;
  const track = sec.querySelector("[data-garage-track]");
  const getScroll = () => track.scrollWidth - track.parentElement.offsetWidth + window.innerWidth * 0.12;
  gsap.to(track, {
    x: () => -getScroll(),
    ease: "none",
    scrollTrigger: {
      trigger: sec, start: "top top",
      end: () => "+=" + getScroll(),
      scrub: 0.7, pin: sec.querySelector(".garage__pin"), invalidateOnRefresh: true
    }
  });
}

/* ----------------------------------------------------------------
   5.  DEALERSHIP INTERACTION PATTERNS
---------------------------------------------------------------- */

/* ----- Right-rail scroll dots ----- */
function initDots() {
  const rail = document.getElementById("dots");
  if (!rail) return;
  const secs = [...document.querySelectorAll("[data-dot]")];
  rail.innerHTML = secs.map((s, i) =>
    `<button data-i="${i}" aria-label="${s.dataset.dot}"><span>${s.dataset.dot}</span></button>`).join("");
  const btns = [...rail.querySelectorAll("button")];
  btns.forEach((b, i) => b.addEventListener("click", () => {
    const t = secs[i];
    if (lenis) lenis.scrollTo(t, { offset: -60 });
    else t.scrollIntoView({ behavior: "smooth" });
  }));
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const i = secs.indexOf(e.target);
        btns.forEach(b => b.classList.remove("active"));
        if (btns[i]) btns[i].classList.add("active");
      }
    });
  }, { rootMargin: "-45% 0px -45% 0px" });
  secs.forEach(s => io.observe(s));
}

/* ----- 3D Showroom: tab swap + drag-to-explore parallax ----- */
const SHOWROOM_VIEWS = {
  exterior: "assets/showroom/exterior.jpg",
  interior: "assets/showroom/interior.jpg",
  engine:   "assets/showroom/engine.jpg"
};
function initShowroom() {
  const viewer = document.getElementById("viewer");
  const img = document.getElementById("viewer-img");
  if (!viewer || !img) return;

  // tabs
  document.querySelectorAll(".showroom__tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".showroom__tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      const src = SHOWROOM_VIEWS[tab.dataset.view];
      if (!src) return;
      img.style.opacity = "0";
      setTimeout(() => { img.src = src; img.onload = () => img.style.opacity = "1"; }, 200);
    });
  });

  // drag to parallax/rotate the car (touch + mouse)
  let dragging = false, sx = 0, rotX = 0, rotY = 0, tRotX = 0, tRotY = 0;
  const base = 1.08;
  img.style.transform = `scale(${base})`;
  const down = x => { dragging = true; sx = x; viewer.classList.add("dragging"); };
  const move = (x, y, rect) => {
    if (!dragging) {
      // gentle hover parallax
      tRotY = ((x - rect.left) / rect.width - 0.5) * 10;
      tRotX = ((y - rect.top) / rect.height - 0.5) * -6;
    } else {
      tRotY += (x - sx) * 0.25; sx = x;
    }
  };
  const up = () => { dragging = false; viewer.classList.remove("dragging"); };

  viewer.addEventListener("mousedown", e => down(e.clientX));
  window.addEventListener("mouseup", up);
  viewer.addEventListener("mousemove", e => move(e.clientX, e.clientY, viewer.getBoundingClientRect()));
  viewer.addEventListener("mouseleave", () => { if (!dragging) { tRotX = 0; tRotY = 0; } });
  viewer.addEventListener("touchstart", e => down(e.touches[0].clientX), { passive: true });
  window.addEventListener("touchend", up);
  viewer.addEventListener("touchmove", e => { move(e.touches[0].clientX, e.touches[0].clientY, viewer.getBoundingClientRect()); }, { passive: true });

  (function loop() {
    rotX += (tRotX - rotX) * 0.08;
    rotY += (tRotY - rotY) * 0.08;
    img.style.transform = `scale(${base}) perspective(1200px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateX(${-rotY * 0.4}%)`;
    requestAnimationFrame(loop);
  })();
}

/* ----- Finance / monthly payment calculator ----- */
const calcState = { price: 80000, down: 8000, apr: 6.9, term: 60 };
function fmt(n) { return Math.round(n).toLocaleString(); }
function computeMonthly() {
  const principal = Math.max(0, calcState.price - calcState.down);
  const r = calcState.apr / 100 / 12;
  const n = calcState.term;
  const m = r === 0 ? principal / n : principal * r / (1 - Math.pow(1 + r, -n));
  return principal === 0 ? 0 : m;
}
function renderCalc() {
  const price = document.getElementById("calc-price");
  const down = document.getElementById("calc-down");
  const apr = document.getElementById("calc-apr");
  document.getElementById("o-price").textContent = "$" + fmt(calcState.price);
  document.getElementById("o-down").textContent = "$" + fmt(calcState.down);
  document.getElementById("o-apr").textContent = calcState.apr.toFixed(1) + "%";
  const setFill = (el, min, max) => el && el.style.setProperty("--p", ((el.value - min) / (max - min) * 100) + "%");
  setFill(price, 20000, 320000); setFill(down, 0, 100000); setFill(apr, 0, 15);
  const monthly = computeMonthly();
  const out = document.getElementById("o-monthly");
  if (window.gsap) {
    const o = { v: +out.textContent.replace(/,/g, "") || 0 };
    gsap.to(o, { v: monthly, duration: 0.5, ease: "power2.out", onUpdate: () => out.textContent = fmt(o.v) });
  } else out.textContent = fmt(monthly);
}
function prefillCalculator(price) {
  const el = document.getElementById("calc-price");
  if (!el) return;
  calcState.price = Math.min(320000, Math.max(20000, price));
  el.value = calcState.price;
  if (calcState.down > calcState.price) { calcState.down = Math.round(calcState.price * 0.1); document.getElementById("calc-down").value = calcState.down; }
  renderCalc();
  const sec = document.getElementById("finance");
  if (lenis) lenis.scrollTo(sec, { offset: -60 }); else sec.scrollIntoView({ behavior: "smooth" });
}
function initCalculator() {
  const price = document.getElementById("calc-price");
  if (!price) return;
  const down = document.getElementById("calc-down");
  const apr = document.getElementById("calc-apr");
  price.addEventListener("input", () => { calcState.price = +price.value; if (+down.value > calcState.price) { down.value = calcState.price; calcState.down = calcState.price; } renderCalc(); });
  down.addEventListener("input", () => { calcState.down = Math.min(+down.value, calcState.price); down.value = calcState.down; renderCalc(); });
  apr.addEventListener("input", () => { calcState.apr = +apr.value; renderCalc(); });
  document.querySelectorAll("#calc-terms button").forEach(b => b.addEventListener("click", () => {
    document.querySelectorAll("#calc-terms button").forEach(x => x.classList.remove("active"));
    b.classList.add("active"); calcState.term = +b.dataset.term; renderCalc();
  }));
  renderCalc();
}

/* ----- Lead forms: tabs, vehicle prefill, mailto submit ----- */
function setLeadForm(type, vehicle) {
  const map = { testdrive: "testdrive", quote: "quote", trade: "trade" };
  type = map[type] || "quote";
  const tab = document.querySelector(`.lead__tab[data-form="${type}"]`);
  if (tab) tab.click();
  if (vehicle) { const vf = document.querySelector('#lead-form [name="vehicle"]'); if (vf) vf.value = vehicle; }
  const sec = document.getElementById("contact");
  if (lenis) lenis.scrollTo(sec, { offset: -60 }); else sec.scrollIntoView({ behavior: "smooth" });
}
function initLeadForm() {
  const form = document.getElementById("lead-form");
  if (!form) return;
  let current = "testdrive";
  const rows = { date: form.querySelector('[data-row="date"]'), trade: form.querySelector('[data-row="trade"]'), vehicle: form.querySelector('[data-row="vehicle"]') };
  const submit = document.getElementById("lead-submit");
  const labels = { testdrive: "Book Test Drive", quote: "Send Quote Request", trade: "Get Trade Value" };

  function apply(type) {
    current = type;
    document.querySelectorAll(".lead__tab").forEach(t => t.classList.toggle("active", t.dataset.form === type));
    rows.date.hidden = type !== "testdrive";
    rows.trade.hidden = type !== "trade";
    submit.textContent = labels[type];
  }
  document.querySelectorAll(".lead__tab").forEach(t => t.addEventListener("click", () => apply(t.dataset.form)));

  form.addEventListener("submit", e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form).entries());
    if (!d.name || !d.phone || !d.email) { form.reportValidity && form.reportValidity(); return; }
    const subjMap = { testdrive: "Test Drive Request", quote: "Quote Request", trade: "Trade-In Valuation" };
    const subject = `${subjMap[current]} — Sidhu Auto Hub`;
    const lines = [
      `Request type: ${subjMap[current]}`,
      `Name: ${d.name}`, `Phone: ${d.phone}`, `Email: ${d.email}`,
      d.vehicle ? `Vehicle: ${d.vehicle}` : "",
      current === "testdrive" && d.datetime ? `Preferred date/time: ${d.datetime}` : "",
      current === "trade" && d.trade ? `Trade-in: ${d.trade}` : "",
      d.message ? `Message: ${d.message}` : ""
    ].filter(Boolean);
    window.location.href = `mailto:Sidhu4747@icloud.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n"))}`;
    document.getElementById("form-ok").classList.add("show");
  });
  apply("testdrive");
}

/* any element with [data-lead] opens the matching form (and prefills vehicle) */
function initLeadTriggers() {
  document.querySelectorAll("[data-lead]").forEach(el => el.addEventListener("click", e => {
    if (el.tagName === "A" && el.getAttribute("href") === "#contact") e.preventDefault();
    setLeadForm(el.dataset.lead, el.dataset.vehicle || "");
  }));
}

/* ----- Sticky action bar (show after hero) ----- */
function initActionBar() {
  const bar = document.getElementById("enquirebar");
  if (!bar) return;
  const onScroll = () => bar.classList.toggle("show", window.scrollY > window.innerHeight * 0.7);
  window.addEventListener("scroll", onScroll, { passive: true }); onScroll();
}

/* ----- Chat / message widget ----- */
function initChat() {
  const chat = document.getElementById("chat");
  if (!chat) return;
  document.getElementById("chat-btn").addEventListener("click", () => chat.classList.toggle("open"));
  document.addEventListener("click", e => { if (!chat.contains(e.target)) chat.classList.remove("open"); });
}

/* ----------------------------------------------------------------
   BOOT
---------------------------------------------------------------- */
document.addEventListener("DOMContentLoaded", () => {
  buildCards();
  initFilters();
  initModal();
  initThree();
  initScroll();          // registers ScrollTrigger + Lenis
  initKinetic();         // split + reveal kinetic headings
  initBandParallax();
  initCinema();          // Apple-style pinned product story
  initGarage();          // Locomotive-style horizontal scroll
  initShowroom();        // 3D showroom: tabs + drag
  initCalculator();      // finance / payment calculator
  initLeadForm();        // test drive / quote / trade-in
  initLeadTriggers();    // [data-lead] buttons across the page
  initDots();            // right-rail scroll dots
  initActionBar();       // sticky call/text/quote bar
  initChat();            // message widget
  initNav();
  initCursor();
  initMagnetic();
  refreshReveals();
  document.getElementById("year").textContent = new Date().getFullYear();
  initPreloader();       // last: counter + curtain, then playIntro()
  if (window.ScrollTrigger) setTimeout(() => ScrollTrigger.refresh(), 400);
});
