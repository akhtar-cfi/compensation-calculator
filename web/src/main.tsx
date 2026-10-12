import { render } from "preact";
import { App, startLang } from "./app";
import { loadHindi } from "./i18n";
import "./styles.css";

// After a new version is deployed, a page opened earlier may ask for a file that no longer exists: reload once
// to get the new version instead of failing.
addEventListener("vite:preloadError", (e) => {
  try {
    if (sessionStorage.getItem("reloaded-for-update")) return;
    sessionStorage.setItem("reloaded-for-update", "1");
  } catch {
    return;
  }
  e.preventDefault();
  location.reload();
});

const start = () => render(<App />, document.getElementById("app")!);
// In Hindi, wait for the Hindi text (a small file) rather than flash English first.
if (startLang() === "hi") loadHindi().then(start, start);
else start();
