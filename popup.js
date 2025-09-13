// Popup script for Zoom Tab Auto-Closer
console.log("Zoom Tab Auto-Closer: Popup script loaded");

document.addEventListener("DOMContentLoaded", async () => {
    console.log("Zoom Tab Auto-Closer: Popup DOM loaded");
    const totalClosedEl = document.getElementById("totalClosed");

    // Load and display current state
    await loadState();

    async function loadState() {
        console.log("Zoom Tab Auto-Closer: Loading state from storage");
        const { totalClosed, isEnabled, whitelist } =
            await chrome.storage.local.get(["totalClosed"]);

        console.log("Zoom Tab Auto-Closer: Loaded state:", {
            totalClosed,
            isEnabled,
            whitelist,
        });

        totalClosedEl.textContent = totalClosed || 0;
    }

    // Listen for storage changes to update the UI
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (namespace === "local") {
            if (changes.totalClosed) {
                totalClosedEl.textContent = changes.totalClosed.newValue || 0;
            }
            if (changes.isEnabled) {
                updateToggle(changes.isEnabled.newValue);
            }
        }
    });
});
