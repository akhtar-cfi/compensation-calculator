import { render } from "preact";
import { App } from "./app";
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

render(<App />, document.getElementById("app")!);
