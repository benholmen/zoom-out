// Background service worker for Zoom Out
const ZOOM_PATTERN = /^https:\/\/.*\.zoom\..*\/j\/[0-9]+.*$/;
const TIMER_DURATION = 2 * 1000; // 2 seconds

// Store active timers
const activeTimers = new Map();

console.log("Zoom Out: Background script loaded");

// Shared function to handle Zoom tab detection and timer setup
async function handleZoomTab(tab, source = "unknown") {
    // Check if extension is enabled
    const { isEnabled } = await chrome.storage.local.get(["isEnabled"]);

    if (!isEnabled) {
        return;
    }

    // Check if URL matches Zoom pattern
    if (!tab.url || !ZOOM_PATTERN.test(tab.url)) {
        return;
    }

    console.log(`Zoom Out: ${source} URL matches Zoom pattern!`);

    console.log(
        `Zoom Out: Setting timer for ${source} tab in`,
        TIMER_DURATION,
        "ms"
    );

    const timerId = setTimeout(async () => {
        console.log(
            `Zoom Out: Timer expired for ${source} tab, attempting to close:`,
            tab.id
        );
        try {
            await chrome.tabs.remove(tab.id);
            console.log(`Zoom Out: Successfully closed ${source} tab:`, tab.id);

            // Increment counter on successful closure
            const { totalClosed } = await chrome.storage.local.get([
                "totalClosed",
            ]);
            const newCount = (totalClosed || 0) + 1;
            await chrome.storage.local.set({
                totalClosed: newCount,
            });
            console.log("Zoom Out has closed", newCount, "Zoom meeting tabs");

            // Clean up timer reference
            activeTimers.delete(tab.id);
        } catch (error) {
            // Tab already closed or inaccessible - ignore silently
            activeTimers.delete(tab.id);
        }
    }, TIMER_DURATION);

    // Store timer reference
    activeTimers.set(tab.id, timerId);
    console.log("Zoom Out: Will close tab", tab.id);
}

// Initialize storage with default values
chrome.runtime.onInstalled.addListener(async () => {
    console.log("Zoom Out: Extension installed/updated");
    const result = await chrome.storage.local.get(["totalClosed", "isEnabled"]);

    console.log("Zoom Out: Current storage state:", result);

    if (result.totalClosed === undefined) {
        await chrome.storage.local.set({ totalClosed: 0 });
    }
    if (result.isEnabled === undefined) {
        await chrome.storage.local.set({ isEnabled: true });
    }
});

// Monitor new tab creation
chrome.tabs.onCreated.addListener(async (tab) => {
    console.log("Zoom Out: New tab created:", tab.url);
    await handleZoomTab(tab, "created");
});

// Clean up timers when tabs are closed manually
chrome.tabs.onRemoved.addListener((tabId) => {
    console.log("Zoom Out: Tab removed:", tabId);
    const timerId = activeTimers.get(tabId);
    if (timerId) {
        console.log("Zoom Out: Cleaning up timer for tab", tabId);
        clearTimeout(timerId);
        activeTimers.delete(tabId);
    }
});

// Handle tab updates (navigation)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        console.log("Zoom Out: Tab navigated to", tab.url);

        // Clean up existing timer if any
        const existingTimerId = activeTimers.get(tabId);
        if (existingTimerId) {
            console.log(
                "Zoom Out: Cleaning up existing timer due to navigation for tab:",
                tabId
            );
            clearTimeout(existingTimerId);
            activeTimers.delete(tabId);
        }

        // Handle the new URL
        await handleZoomTab(tab, "navigation");
    }
});
