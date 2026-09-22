import "./styles/app.css";
import { logoSvg, faviconDataUri } from "./ui/logo.js";
document.getElementById("app").innerHTML = `<h1 class="t-display">${logoSvg({ size: 40 })} Behavior Trees</h1>`;
document.querySelector('link[rel="icon"]').href = faviconDataUri();
document.getElementById("boot")?.classList.add("gone");
