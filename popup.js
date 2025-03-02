document.addEventListener("DOMContentLoaded", async () => {
    const bookNameElem = document.getElementById("bookName");
    const downloadCompleteElem = document.getElementById("downloadComplete");
    const pageCountElem = document.getElementById("pageCount");
    const pendingPagesElem = document.getElementById("pendingPages");

    chrome.runtime.sendMessage({ action: "getBookInfo" }, (response) => {
        if (response) {
            const { bookName, downloadComplete, pageCount, pendingPages } = response;

            bookNameElem.textContent = bookName || "Unknown";
            downloadCompleteElem.textContent = downloadComplete ? "Complete" : "Incomplete";
            downloadCompleteElem.className = downloadComplete ? "status-complete" : "status-incomplete";
            pageCountElem.textContent = pageCount || 0;
            pendingPagesElem.innerHTML = "";

            if (pendingPages.length > 0) {
                pendingPages.forEach((page) => {
                    const li = document.createElement("li");
                    li.textContent = `Page ${page.pageOrder}`;
                    pendingPagesElem.appendChild(li);
                });
            } else if (bookName !== "N/A") {
                const li = document.createElement("li");
                li.textContent = "All pages downloaded!";
                pendingPagesElem.appendChild(li);
            } else {
                const li = document.createElement("li");
                li.textContent = "No book data available.";
                pendingPagesElem.appendChild(li);
            }
        }
    });
});
