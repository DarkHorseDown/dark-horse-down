# Dark Horse Down
Seems like Dark Horse Digital is shutting down at the end of the month.
I thought this might be a good time to experiment with making a browser extension.

This extension will attempt to save the comic book pages you normally receive while reading a book.
The directory you have set as your default location for downloaded files is where the pages will be saved.
The pages will be saved in directories named after the book you are reading.

You will be required to navigate through your book (I'd recommend starting from page 1)
in order to trigger download requests from Dark Horse Digital.
Once they send the file to you, it will be saved.
I've added an interface to try to track what pages are remaining to download.

This extension was primarily made for Firefox, albeit using an old manifest version. I did give it a whirl in Chrome,
and it seemed to work with the oldest and newest titles in my bookshelf.

Hopefully you find this helpful in some way; happy reading.

### Keep In Mind
The program is not written all that well, but there's only a month left, and it suits the purpose.

Because of how this was created there may be things that happen out of order,
resulting in weird directory names or book names. Read through a few pages (perhaps 5 pages),
go back to page 1, then refresh the page and things ought to be fine again.

The requests need time to resolve, so do not just spam through the pages until the end of the book.
Doing so will cancel requests that have not yet completed,
and you'll have to go back through to acquire missing pages that never arrived in your browser.

Typically, they send 3 pages at a time. Your current page, and the next couple.

I have noticed some books have gaps in the page order. I am not certain why this is the case
(removed advertisement pages perhaps?),
so keep an eye on the interface and compare the actual page count in the book to the file count on your computer.

There are multiple ways in which Dark Horse has arranged book information,
so I cannot guarantee this will work with all titles in your bookshelf.

This has only been tested when using a single browser tab.

# Chrome Instructions

Download the "dark-horse-down.zip" file and extract it somewhere.

Place this address into your browser address bar:
```
chrome://extensions/
```
In the top right-hand corner of the page, toggle "Developer mode" to the ON position.

In the top left-hand corner of the page, click "Load unpacked".

Navigate to the directory where you extracted the "dark-horse-down.zip" file, and click "Select Folder".

You may now proceed to go to your bookshelf, and start reading through your books.

# Firefox Instructions
Download the "dark-horse-down.zip" file and extract it somewhere.

Place this address into your browser address bar:
```
about:debugging#/runtime/this-firefox
```

Click on "Load Temporary Add-on..."

Navigate to the directory where you extracted the "dark-horse-down.zip" file, select the "manifest.json" file,
and click "Open".

You may now proceed to go to your bookshelf, and start reading through your books.

*Loading as a temporary add-on means the add-on will be unloaded when you close your browser.
