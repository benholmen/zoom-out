// Background service worker for Zoom Out
const ZOOM_PATTERN = /^https:\/\/.*\.zoom\..*\/j\/[0-9]+/;
const TIMER_DURATION = 3 * 1000;

const activeTimers = new Map();

console.log("Zoom Out: Background script loaded");

async function handleZoomTab(tab, source = "unknown") {
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

            const { totalClosed } = await chrome.storage.local.get([
                "totalClosed",
            ]);
            const newCount = (totalClosed || 0) + 1;
            await chrome.storage.local.set({
                totalClosed: newCount,
            });
            console.log("Zoom Out has closed", newCount, "Zoom meeting tabs");

            activeTimers.delete(tab.id);
        } catch (error) {
            activeTimers.delete(tab.id);
        }
    }, TIMER_DURATION);

    activeTimers.set(tab.id, timerId);
}

chrome.runtime.onInstalled.addListener(async () => {
    console.log("Zoom Out: Extension installed/updated");
    const result = await chrome.storage.local.get(["totalClosed"]);

    console.log("Zoom Out: Current storage state:", result);

    if (result.totalClosed === undefined) {
        await chrome.storage.local.set({ totalClosed: 0 });
    }
});

chrome.tabs.onCreated.addListener(async (tab) => {
    console.log("Zoom Out: New tab created:", tab.url);
    await handleZoomTab(tab, "created");
});

chrome.tabs.onRemoved.addListener((tabId) => {
    console.log("Zoom Out: Tab removed:", tabId);
    const timerId = activeTimers.get(tabId);
    if (timerId) {
        console.log("Zoom Out: Cleaning up timer for tab", tabId);
        clearTimeout(timerId);
        activeTimers.delete(tabId);
    }
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
    if (changeInfo.url) {
        const existingTimerId = activeTimers.get(tabId);
        if (existingTimerId) {
            console.log(
                "Zoom Out: Cleaning up existing timer due to navigation for tab:",
                tabId
            );
            clearTimeout(existingTimerId);
            activeTimers.delete(tabId);
        }

        await handleZoomTab(tab, "navigation");
    }
});
