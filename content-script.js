if (!document.getElementById('embeddedPopup')) {
    const popupContainer = document.createElement('div');
    popupContainer.id = 'embeddedPopup';
    popupContainer.style.position = 'fixed';
    popupContainer.style.top = '0';
    popupContainer.style.right = '0';
    popupContainer.style.width = '300px';
    popupContainer.style.height = '100%';
    popupContainer.style.backgroundColor = 'white';
    popupContainer.style.borderLeft = '1px solid #ccc';
    popupContainer.style.boxShadow = '-2px 0 5px rgba(0,0,0,0.1)';
    popupContainer.style.zIndex = '10000';
    popupContainer.style.overflowY = 'auto';
    popupContainer.style.padding = '10px';

    popupContainer.innerHTML = `
        <h1>Book Info</h1>
        <div id="info">
            <p><strong>Name:</strong> <span id="bookName">Loading...</span></p>
            <p><strong>Download Status:</strong> <span id="downloadComplete">Loading...</span></p>
            <p><strong>Total Pages:</strong> <span id="pageCount">Loading...</span></p>
            <h2>Pages Pending</h2>
            <ul id="pendingPages">
                <li>Loading...</li>
            </ul>
        </div>
    `;

    document.body.appendChild(popupContainer);

    const style = document.createElement('style');
    style.textContent = `
        #embeddedPopup {
            font-family: Arial, sans-serif;
        }
        .status-complete {
            color: green;
        }
        .status-incomplete {
            color: red;
        }
        ul {
            padding-left: 20px;
        }
    `;
    document.head.appendChild(style);
}

function updateSidebarContent(data) {
    const { bookName, downloadComplete, pageCount, pendingPages } = data;

    document.getElementById('bookName').textContent = bookName || 'Unknown';

    const downloadCompleteElem = document.getElementById('downloadComplete');
    downloadCompleteElem.textContent = downloadComplete ? 'Complete' : 'Incomplete';
    downloadCompleteElem.className = downloadComplete ? 'status-complete' : 'status-incomplete';

    document.getElementById('pageCount').textContent = pageCount || 0;

    const pendingPagesElem = document.getElementById('pendingPages');

    const pendingPageIds = pendingPages.map(page => `page-${page.pageOrder}`);

    Array.from(pendingPagesElem.children).forEach(li => {
        if (!pendingPageIds.includes(li.id)) {
            li.remove();
        }
    });

    pendingPages.forEach((page) => {
        const pageId = `page-${page.pageOrder}`;
        let li = document.getElementById(pageId);

        if (!li) {
            li = document.createElement('li');
            li.id = pageId;
            li.textContent = `Page ${page.pageOrder}`;
            pendingPagesElem.appendChild(li);
        }
    });

    if (pendingPages.length === 0) {
        pendingPagesElem.innerHTML = '';
        const li = document.createElement('li');
        li.textContent = bookName !== 'N/A' ? 'All pages downloaded!' : 'No book data available.';
        pendingPagesElem.appendChild(li);
    }
}

chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "updateBookInfo") {
        console.log("Received updateBookInfo message:", message.data);
        updateSidebarContent(message.data);
    }
});
