SIDHU AUTO HUB — Immersive 3D Inventory Website (Offline Build)
================================================================

HOW TO RUN ON YOUR PC
---------------------
This is a fully self-contained website. Everything it needs (3D engine,
animations, fonts, car photos) is bundled inside this folder — no internet
required.

Easiest way:
  1. Unzip this folder anywhere.
  2. Double-click  index.html  to open it in your browser.
     (Chrome, Edge, Firefox or Safari all work.)

If the 3D background does not appear when opening the file directly
(some browsers restrict JavaScript modules on file://), run a tiny
local server instead:

  • If you have Python:    open a terminal in this folder and run
        python -m http.server 8000
    then visit  http://localhost:8000  in your browser.

  • If you have Node.js:   npx serve
    then open the address it prints.

WHAT'S INSIDE
-------------
  index.html        the website
  css/style.css     styling
  js/main.js        interactions, inventory, 3D scene
  js/vendor/        bundled libraries (Three.js, GSAP, Lenis)
  assets/cars/      sample inventory photos
  assets/fonts/     bundled web fonts
  assets/logo.jpeg  Sidhu Auto Hub logo
  assets/hero.mp4   hero background video

NOTES
-----
• The sample inventory and car photos are placeholders for demonstration.
  Swap the images in assets/cars/ and edit the INVENTORY list at the top of
  js/main.js to use your real stock.
• The contact map only loads when online (it's a live Google Map); all
  contact details are shown as text regardless.

Contact: 22 Bramsteele Rd, Brampton, ON L6W 1B3
Phone:   +1 (437) 230-3608
Email:   Sidhu4747@icloud.com
