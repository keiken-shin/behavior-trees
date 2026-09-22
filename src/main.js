import "./styles/app.css";
import { LESSONS } from "./data/lessons.js";
import { renderLesson } from "./ui/lesson.js";
document.getElementById("boot")?.classList.add("gone");
renderLesson(document.getElementById("app"), location.hash.slice(1) || LESSONS[0].id);
addEventListener("hashchange", () => renderLesson(document.getElementById("app"), location.hash.slice(1) || LESSONS[0].id));
