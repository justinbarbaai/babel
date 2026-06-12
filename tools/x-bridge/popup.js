const hub = document.getElementById("hub");
const key = document.getElementById("key");
const toggle = document.getElementById("toggle");
const status = document.getElementById("status");

chrome.storage.local.get(["hub", "key", "enabled"], (v) => {
  hub.value = v.hub || "https://market-bubble-hub.onrender.com";
  key.value = v.key || "";
  render(!!v.enabled);
});
function render(on) {
  toggle.textContent = on ? "Stop" : "Start";
  toggle.className = on ? "on" : "";
  status.textContent = on ? "Bridge running — keep the X tab open." : "Stopped.";
}
toggle.onclick = () => {
  chrome.storage.local.get(["enabled"], (v) => {
    const on = !v.enabled;
    chrome.storage.local.set({ hub: hub.value.trim(), key: key.value.trim(), enabled: on }, () => render(on));
  });
};
[hub, key].forEach((el) =>
  el.addEventListener("change", () =>
    chrome.storage.local.set({ hub: hub.value.trim(), key: key.value.trim() })
  )
);
