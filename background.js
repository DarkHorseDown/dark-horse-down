let bookManifestData = null;
let requestLog = {
    pageIds: [],
    requestIds: []
};

function sendBookInfoToCurrentTab() {
    const pendingPages = (bookManifestData.pages || []).filter(page => !page.Downloaded);

    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs.length > 0) {
            const tabId = tabs[0].id;

            chrome.tabs.sendMessage(tabId, { action: "ping" }, (response) => {
                if (chrome.runtime.lastError) {
                    console.log("Content script not found. Injecting now...");

                    chrome.tabs.executeScript(tabId, { file: "content-script.js" }, () => {
                        if (chrome.runtime.lastError) {
                            console.error("Error injecting content script:", chrome.runtime.lastError.message);
                        } else {
                            console.log("Content script injected. Sending update message...");
                            chrome.tabs.sendMessage(tabId, {
                                action: "updateBookInfo",
                                data: {
                                    bookName: bookManifestData.bookName || "Unknown",
                                    downloadComplete: bookManifestData.downloadComplete || false,
                                    pageCount: bookManifestData.pageCount,
                                    pendingPages: pendingPages,
                                },
                            });
                        }
                    });
                } else {
                    chrome.tabs.sendMessage(tabId, {
                        action: "updateBookInfo",
                        data: {
                            bookName: bookManifestData.bookName || "Unknown",
                            downloadComplete: bookManifestData.downloadComplete || false,
                            pageCount: bookManifestData.pageCount,
                            pendingPages: pendingPages,
                        },
                    });
                }
            });
        }
    });
}

chrome.webRequest.onBeforeSendHeaders.addListener(
    (details) => {
        try {
            const requestUrl = new URL(details.url).pathname;

            if (bookManifestData === null || !requestUrl.includes(bookManifestData.bookID)) {
                initializeOrUpdateManifest();
            }

            if (details.type.includes("image")) {
                const urlPath = new URL(details.url).pathname;
                let filePageID = urlPath.substring(urlPath.lastIndexOf("/") + 1) || "untitled";

                if(!requestLog.pageIds.includes(filePageID)){
                    requestLog.pageIds.push(filePageID);
                    requestLog.requestIds.push(details.requestId);

                    let combined = requestLog.requestIds.map((requestId, index) => ({
                        requestId: parseInt(requestId, 10),
                        pageId: requestLog.pageIds[index]
                    }));
                    combined.sort((a, b) => a.requestId - b.requestId);
                    requestLog.requestIds = combined.map(item => item.requestId.toString());
                    requestLog.pageIds = combined.map(item => item.pageId);
                }

                console.log(`Request logged: ${filePageID}`);
            }
        } catch (error) {
            console.error("Error recording request: ", error);
        }
    },
    { urls: ["https://drhq3xefn6rcs.cloudfront.net/*"] },
    ["requestHeaders"]
);

function initializeOrUpdateManifest() {
    console.log(`Resetting bookManifestData.`);
    bookManifestData = {
        bookID: null,
        bookName: null,
        downloadComplete: false,
        pageCount: null,
        pages: [],
    };
    requestLog.pageIds.length = 0;
    requestLog.requestIds.length = 0;
    sendBookInfoToCurrentTab();
}

chrome.webRequest.onCompleted.addListener(
    async (details) => {
        const contentTypeHeader = details.responseHeaders.find(
            (header) => header.name.toLowerCase() === "content-type"
        );

        if (contentTypeHeader) {
            const contentType = contentTypeHeader.value;

            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                if (tabs.length === 0) return;

                const activeTab = tabs[0];
                const tabTitle = activeTab.title || "default";
                const tabUrl = activeTab.url;

                if (!tabUrl) return;

                const sanitizedTitle = tabTitle.split('|')[0].trim();

                const safeTitle = sanitizedTitle.replace(/[/\\?%*:|"<>]/g, '');

                const matches = tabUrl.match(/read\/([a-zA-Z0-9]+)/);
                const bookID = matches && matches[1] ? matches[1] : "unknown";

                bookManifestData = {
                    ...bookManifestData,
                    bookID,
                };

                const directory = bookManifestData.bookName;

                if (!directory) {
                    bookManifestData.bookName = "Unknown"
                }
                else {
                    bookManifestData.bookName.replace(/[/\\?%*:|"<>]/g, '');
                }

                if (contentType.includes("image/jpeg")) {
                    let urlPath = new URL(details.url).pathname;
                    let filePageID = urlPath.substring(urlPath.lastIndexOf("/") + 1) || "untitled";

                    if (!filePageID.endsWith(".jpeg")) {
                        filePageID.replace(".jpeg", "")
                    }

                    if (bookManifestData.pages.every(page => !page.pageID)) {
                        bookManifestData.pages.forEach((page, index) => {
                            const requestLogIndex = page.pageOrder - 1;
                            if (requestLog.pageIds[requestLogIndex]) {
                                page.pageID = requestLog.pageIds[requestLogIndex];
                            }
                        });
                    }

                    if (!bookManifestData.pages.some(page => page.pageID === filePageID)){
                        const indexInRequestLog = requestLog.pageIds.indexOf(filePageID);

                        bookManifestData.pages.splice(indexInRequestLog, 0, {
                            pageOrder: indexInRequestLog + 1,
                            pageID: filePageID,
                            Downloaded: false,
                        });
                        bookManifestData.pages = bookManifestData.pages.filter(
                            page => !(page.pageOrder === indexInRequestLog + 1 && page.pageID === null)
                        );
                    }

                    const page = bookManifestData.pages.find(
                        (page) => page.pageID === filePageID
                    );

                    if (page) {
                        const filename = `${directory}/${page.pageOrder}.jpeg`;

                        await chrome.downloads.download({
                            url: details.url,
                            filename,
                            conflictAction: "overwrite",
                            saveAs: false,
                        });
                        console.log(`File downloaded: ${filename}`);

                        updateManifestForFile(`${page.pageOrder}.jpeg`);
                    } else {
                        console.warn(
                            `No matching page found in the manifest for filePageID: ${filePageID}`
                        );
                    }
                }
                else if (contentType.includes("application/octet-stream")) {
                    const titleHeader = details.responseHeaders.find(
                        (header) => header.name.toLowerCase() === "x-amz-meta-title"
                    );
                    if (titleHeader) {
                        let decodedTitle = decodeURIComponent(titleHeader.value).replace(/[/\\?%*:|"<>]/g, '');
                        if (!decodedTitle){
                            decodedTitle = "Unknown";
                        }
                        bookManifestData.bookName = decodedTitle;
                        console.log("Book name extracted:", decodedTitle);
                    } else {
                        console.warn("x-amz-meta-title header not found!");
                    }

                    chrome.tabs.executeScript(
                        activeTab.id,
                        {
                            code: `
                                (() => {
                                    return new Promise((resolve, reject) => {
                                        const selector = '.page-number.control-button';
                                        const timeout = 5000;
                                        const endTime = Date.now() + timeout;
                            
                                        const observer = new MutationObserver((mutations, obs) => {
                                            const element = document.querySelector(selector);
                                            if (element) {
                                                obs.disconnect();
                                                const pageText = element.textContent.trim();
                                                resolve(parseInt(pageText.split('/')[1]));
                                            } else if (Date.now() > endTime) {
                                                obs.disconnect();
                                                reject("Element not found within timeout");
                                            }
                                        });
                            
                                        observer.observe(document.body, { childList: true, subtree: true });
                            
                                        const element = document.querySelector(selector);
                                        if (element) {
                                            observer.disconnect();
                                            const pageText = element.textContent.trim();
                                            resolve(parseInt(pageText.split('/')[1]));
                                        }
                                    });
                                })();
                                `
                        },
                        (results) => {
                            if (chrome.runtime.lastError) {
                                console.error("Failed to execute script:", chrome.runtime.lastError.message);
                                return;
                            }
                            if (results && results[0] && bookManifestData.pageCount === null) {
                                bookManifestData.pageCount = results[0];
                                bookManifestData.downloadComplete = false;
                                bookManifestData.pages = Array.from(
                                    { length: bookManifestData.pageCount },
                                    (_, i) => ({
                                        pageOrder: i + 1,
                                        pageID: null,
                                        Downloaded: false
                                    }))

                                console.log("Total pages extracted:", bookManifestData.pageCount);
                            }
                            else {
                                console.warn("Could not extract total pages from DOM.");
                            }
                });

                    if (bookManifestData.pageCount === null){
                        const response = await fetch(details.url);
                        const jsContent = await response.text();

                        const bookManifest = parseBookManifest(jsContent);
                        bookManifestData.pageCount = bookManifest.page_count;
                        bookManifestData.pages = Array.from(
                            { length: bookManifestData.pageCount },
                            (_, i) => ({
                                pageOrder: i + 1,
                                pageID: null,
                                Downloaded: false
                            }))
                    }
                }
                else if (contentType.includes("text/javascript")) {
                    try {
                        const response = await fetch(details.url);
                        const jsContent = await response.text();

                        const bookManifest = parseBookManifest(jsContent);

                        if (bookManifest) {
                            bookManifestData = {
                                bookID,
                                bookName: safeTitle,
                                downloadComplete: false,
                                pageCount: bookManifest.page_count,
                                pages: bookManifest.pages.map((page) => ({
                                    pageOrder: page.sort_order,
                                    pageID: page.src_image,
                                    Downloaded: false,
                                })),
                            };

                            console.log("Book Manifest initialized in memory:", bookManifestData);
                        }
                    } catch (error) {
                        console.error("Failed to fetch and parse the JavaScript file:", error);
                    }
                }
            });
        }
    },
    {
        urls: ["https://drhq3xefn6rcs.cloudfront.net/*"],
        types: ["image", "script"],
    },
    ["responseHeaders"]
);

function parseBookManifest(jsContent) {
    try {
        const match = jsContent.match(/var book_manifest\s*=\s*(\{[\s\S]*?\});/);
        if (match && match[1]) {
            const bookManifest = JSON.parse(match[1]);

            if (typeof bookManifest === "object") {
                console.log("Parsed Book Manifest:", bookManifest);
                return bookManifest;
            } else {
                console.error("book_manifest is not defined as an object!");
            }
        } else {
            console.error("book_manifest not found in the JavaScript file!");
        }
    } catch (error) {
        console.error("Error during parsing book_manifest:", error);
    }
    return null;
}

function updateManifestForFile(filename) {
    try {
        if (!bookManifestData) {
            console.error("No book manifest loaded in memory. Skipping update.");
            return;
        }

        const filePageOrder = parseInt(filename.replace(".jpeg", ""), 10);

        const pageToUpdate = bookManifestData.pages.find(
            (page) => page.pageOrder === filePageOrder
        );

        if (pageToUpdate) {
            pageToUpdate.Downloaded = true;
            console.log(`Updated Downloaded property for page order: ${pageToUpdate.pageOrder}`);
            if (bookManifestData.pages.every((page) => page.Downloaded)) {
                bookManifestData.downloadComplete = true;
                console.log("Download complete!");
            }
        } else {
            console.warn(`No page found in the book manifest with pageOrder: ${filePageOrder}`);
        }
        sendBookInfoToCurrentTab();
    } catch (error) {
        console.error("Failed to update book manifest:", error);
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "getBookInfo") {
        if (bookManifestData) {
            const pendingPages = bookManifestData.pages.filter((page) => !page.Downloaded);
            sendResponse({
                bookName: bookManifestData.bookName,
                downloadComplete: bookManifestData.downloadComplete,
                pageCount: bookManifestData.pageCount,
                pendingPages: pendingPages,
            });
        } else {
            sendResponse({
                bookName: bookManifestData?.bookName || "N/A",
                downloadComplete: !!bookManifestData?.downloadComplete,
                pageCount: bookManifestData?.pageCount || 0,
                pendingPages: bookManifestData?.pages?.filter((page) => !page.Downloaded) || [],
            });
        }
    }
});
