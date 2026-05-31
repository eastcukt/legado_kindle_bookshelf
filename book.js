var setStatus = false;
var chapterList = [];
var isChapterLoading = false;
var chapterContentCache = {};
var chapterContentRequests = {};

var config = {
    contentHeight: 0,
    boundaryDirection: ''
};

var readerSettings = {
    fontSizeBase: 0,
    lineHeightBase: 0,
    fontSizeStep: 2,
    lineHeightStep: 4,
    fontSizeLevel: 0,
    lineHeightLevel: 0,
    minFontSizeLevel: -4,
    maxFontSizeLevel: 8,
    minLineHeightLevel: -4,
    maxLineHeightLevel: 10
};

if (!getBaseUrl()) {
    setStatus = false;
    openSet();
}

function $$(key) {
    var firstChar = key.charAt(0);
    if (firstChar === '#') {
        return document.getElementById(key.slice(1));
    }
    if (firstChar === '.') {
        return document.getElementsByClassName(key.slice(1));
    }
    return document.getElementsByTagName(key);
}

function setCookie(name, value) {
    var date = new Date();
    date.setTime(date.getTime() + 999 * 24 * 60 * 60 * 1000);
    document.cookie = name + '=' + encodeURIComponent(value || '') + '; expires=' + date.toUTCString() + '; path=/';
}

function getCookie(name) {
    var nameEQ = name + '=';
    var cookies = document.cookie.split(';');
    for (var i = 0; i < cookies.length; i++) {
        var cookie = cookies[i];
        while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
        }
        if (cookie.indexOf(nameEQ) === 0) {
            return decodeURIComponent(cookie.substring(nameEQ.length, cookie.length));
        }
    }
    return null;
}

function getBaseUrl() {
    var url = getCookie('url');
    if (!url || url === 'null' || url === 'undefined') {
        return '';
    }
    return url.replace(/\/+$/, '');
}

function openSet() {
    var url = getBaseUrl();
    if (!url) {
        url = 'http://172.19.0.1:1122';
    }
    $$('#url').value = url;
    $$('.set-url')[0].style.display = setStatus ? 'none' : 'block';
    setStatus = !setStatus;
}

function setUrl() {
    var url = $$('#url').value.replace(/^\s+|\s+$/g, '');
    if (!url) {
        alert('URL is required');
        return;
    }
    setCookie('url', url);
    window.location.reload();
}

function ajax(method, url, data, callback) {
    var baseUrl = getBaseUrl();
    if (!baseUrl) {
        callback('missing_base_url', null);
        return;
    }

    var xhr;
    if (window.XMLHttpRequest) {
        xhr = new XMLHttpRequest();
    } else {
        xhr = new ActiveXObject('Microsoft.XMLHTTP');
    }

    xhr.open(method, baseUrl + url, true);

    if (method === 'POST') {
        xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    }

    xhr.onreadystatechange = function () {
        if (xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (xhr.status === 200) {
            callback(null, JSON.parse(xhr.responseText));
        } else {
            callback(xhr.status, null);
        }
    };

    xhr.send(method === 'POST' ? JSON.stringify(data) : null);
}

function getList() {
    ajax('GET', '/getBookshelf', {}, function (err, res) {
        if (err === 'missing_base_url') {
            alert('Service URL is missing. Please save the URL and reload.');
            return;
        }
        if (err || !res || !res.data) {
            alert('Failed to load bookshelf. Please check the service URL.');
            return;
        }

        var data = res.data;
        var baseUrl = getBaseUrl();
        var bookList = '';
        for (var i = 0; i < data.length; i++) {
            var book = data[i];
            var encodedBook = window.encodeURIComponent(JSON.stringify(book)).replace(/'/g, '%27');
            bookList += '<div class="book" onclick="jumpDetail(\'' + encodedBook + '\')">' +
                '<div class="cover-img">' +
                '<img class="cover" src="' + baseUrl + '/cover?path=' + book.coverUrl + '" alt="' + escapeHtml(book.name) + '">' +
                '</div>' +
                '<div class="info">' +
                '<div class="name">' + escapeHtml(book.name) + '</div>' +
                '<div class="sub">' +
                '<div class="author">' + escapeHtml(book.author) + '</div>' +
                '<div class="dot">*</div>' +
                '<div class="size">Chapters: ' + book.totalChapterNum + '</div>' +
                '<div class="dot">*</div>' +
                '<div class="date">' + dateFormat(book.durChapterTime) + '</div>' +
                '</div>' +
                '<div class="dur-chapter">Reading: ' + escapeHtml(book.durChapterTitle || '') + '</div>' +
                '<div class="last-chapter">Latest: ' + escapeHtml(book.latestChapterTitle || '') + '</div>' +
                '</div>' +
                '</div>';
        }
        $$('#book_list').innerHTML = bookList;
    });
}

function getChapterContentCacheKey(bookUrl, index) {
    return encodeURIComponent(bookUrl) + '::' + index;
}

function fetchChapterContent(bookUrl, index, callback) {
    var cacheKey = getChapterContentCacheKey(bookUrl, index);
    if (chapterContentCache.hasOwnProperty(cacheKey)) {
        callback(null, chapterContentCache[cacheKey]);
        return;
    }

    if (chapterContentRequests[cacheKey]) {
        chapterContentRequests[cacheKey].push(callback);
        return;
    }

    chapterContentRequests[cacheKey] = [callback];
    ajax('GET', '/getBookContent?url=' + encodeURIComponent(bookUrl) + '&index=' + index, {}, function (err, res) {
        var callbacks = chapterContentRequests[cacheKey] || [];
        var content = null;
        delete chapterContentRequests[cacheKey];

        if (!err && res && typeof res.data === 'string') {
            content = res.data;
            chapterContentCache[cacheKey] = content;
        }

        for (var i = 0; i < callbacks.length; i++) {
            callbacks[i](err, content);
        }
    });
}

function prefetchNextChapter(bookUrl, index) {
    var nextIndex = index + 1;
    if (!hasNextChapter(index)) {
        return;
    }

    fetchChapterContent(bookUrl, nextIndex, function () {});
}

function hasNextChapter(index) {
    if (!chapterList.length) {
        return true;
    }
    return index < chapterList[chapterList.length - 1].index;
}

function hasPrevChapter(index) {
    if (!chapterList.length) {
        return index > 0;
    }
    return index > chapterList[0].index;
}

function resetBoundaryState() {
    config.boundaryDirection = '';
}

function getChapterTitle(index) {
    for (var i = 0; i < chapterList.length; i++) {
        if (chapterList[i] && chapterList[i].index === index) {
            return chapterList[i].title || '';
        }
    }
    return getBookField('durChapterTitle') || '';
}

function getBookContent(type) {
    if (isChapterLoading) {
        return;
    }

    isChapterLoading = true;
    hideSettings();

    var menus = $$('.menu');
    if (menus.length) {
        menus[0].style.display = 'none';
    }

    var url = getBookField('bookUrl');
    var index = getBookField('durChapterIndex');
    fetchChapterContent(url, index, function (err, contentText) {
        isChapterLoading = false;

        if (err === 'missing_base_url') {
            alert('Service URL is missing. Please save the URL and reload.');
            return;
        }
        if (err || typeof contentText !== 'string') {
            alert('Failed to load chapter content.');
            return;
        }

        var contentNode = $$('#content1');
        var content = contentText.split(/\n+/);
        var chapterTitle = getChapterTitle(index);
        var html = '';
        if (chapterTitle) {
            html += '<div class="chapter-title">' + escapeHtml(chapterTitle) + '</div>';
        }
        for (var i = 0; i < content.length; i++) {
            if (content[i]) {
                html += '<p>' + escapeHtml(content[i]) + '</p>';
            }
        }
        $('#content1').html(html);

        applyReaderSettings();

        if (type === 'prev') {
            contentNode.scrollTop = contentNode.scrollHeight;
            config.contentHeight = contentNode.scrollTop;
        } else {
            contentNode.scrollTop = 0;
            config.contentHeight = 0;
        }

        resetBoundaryState();
        saveBookProgress(index);
        prefetchNextChapter(url, index);
    });
}

function saveBookProgress(index) {
    var chapterTitle = getChapterTitle(index);
    if (!chapterTitle) {
        return;
    }

    updateBookField('durChapterTitle', chapterTitle);

    ajax('POST', '/saveBookProgress', {
        name: getBookField('name'),
        author: getBookField('author'),
        durChapterIndex: index,
        durChapterPos: 1,
        durChapterTime: new Date().getTime(),
        durChapterTitle: chapterTitle
    }, function () {});
}

function getChapterList() {
    var url = getBookField('bookUrl');
    ajax('GET', '/getChapterList?url=' + encodeURIComponent(url), {}, function (err, res) {
        if (err === 'missing_base_url') {
            alert('Service URL is missing. Please save the URL and reload.');
            return;
        }
        if (err || !res || !res.data) {
            return;
        }

        chapterList = res.data;
        var html = '';
        for (var i = 0; i < chapterList.length; i++) {
            var chapter = chapterList[i];
            html += '<p onclick="jumpChapterList(' + chapter.index + ', event)">' + escapeHtml(chapter.title) + '</p>';
        }
        $$('.chapter-list')[0].innerHTML = html;
    });
}

function openChapterList(event) {
    stopEvent(event);
    hideSettings();
    $$('.chapter-list')[0].style.display = 'block';
}

function jumpChapterList(index, event) {
    stopEvent(event);
    if (isChapterLoading) {
        return;
    }
    updateBookField('durChapterIndex', index);
    getBookContent('next');
    $$('.chapter-list')[0].style.display = 'none';
}

function jumpDetail(book) {
    book = JSON.parse(window.decodeURIComponent(book));
    setCookie('book', JSON.stringify({
        name: book.name || '',
        author: book.author || '',
        bookUrl: book.bookUrl || '',
        durChapterIndex: typeof book.durChapterIndex === 'number' ? book.durChapterIndex : 0,
        durChapterTitle: book.durChapterTitle || ''
    }));
    location.href = 'detail.html';
}

function getBookField(name) {
    var book = getCookie('book');
    if (!book) {
        return null;
    }
    book = JSON.parse(book);
    return book[name];
}

function updateBookField(name, val) {
    var book = getCookie('book');
    book = JSON.parse(book);
    book[name] = val;
    setCookie('book', JSON.stringify(book));
}

function jump(url) {
    var currentPath = window.location.pathname;
    var baseDir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1);
    location.href = baseDir + url;
}

function prev(event) {
    stopEvent(event);
    if (isChapterLoading) {
        return;
    }

    var index = getBookField('durChapterIndex') - 1;
    if (!hasPrevChapter(getBookField('durChapterIndex'))) {
        alert('Already at the first chapter.');
        return;
    }

    updateBookField('durChapterIndex', index);
    getBookContent('prev');
}

function next(event) {
    stopEvent(event);
    if (isChapterLoading) {
        return;
    }

    var index = getBookField('durChapterIndex') + 1;
    if (!hasNextChapter(getBookField('durChapterIndex'))) {
        alert('Already at the last chapter.');
        return;
    }

    updateBookField('durChapterIndex', index);
    getBookContent('next');
}

function initReaderSettings() {
    if (!$$('#content1') || !$$('#mainText')) {
        return;
    }

    var contentStyle = window.getComputedStyle($$('#content1'));
    var textStyle = window.getComputedStyle($$('#mainText'));
    var sampleParagraph = document.createElement('p');
    sampleParagraph.innerHTML = 'sample';
    $$('#content1').appendChild(sampleParagraph);
    var paragraphStyle = window.getComputedStyle(sampleParagraph);

    readerSettings.fontSizeBase = parseFloat(textStyle.fontSize);
    readerSettings.lineHeightBase = parseFloat(paragraphStyle.lineHeight);
    $$('#content1').removeChild(sampleParagraph);

    var cached = getCookie('reader_settings');
    if (cached) {
        try {
            var saved = JSON.parse(cached);
            readerSettings.fontSizeLevel = toNumber(saved.fontSizeLevel, 0);
            readerSettings.lineHeightLevel = toNumber(saved.lineHeightLevel, 0);
        } catch (e) {}
    }

    applyReaderSettings();
}

function toggleSettings(event) {
    stopEvent(event);
    var panel = $$('#settingsPanel');
    if (!panel) {
        return;
    }

    if (panel.style.display === 'block') {
        panel.style.display = 'none';
    } else {
        panel.style.display = 'block';
        $$('.chapter-list')[0].style.display = 'none';
        updateReaderSettingsText();
    }
}

function hideSettings() {
    var panel = $$('#settingsPanel');
    if (panel) {
        panel.style.display = 'none';
    }
}

function changeFontSize(step, event) {
    stopEvent(event);
    var nextLevel = readerSettings.fontSizeLevel + step;
    readerSettings.fontSizeLevel = clamp(nextLevel, readerSettings.minFontSizeLevel, readerSettings.maxFontSizeLevel);
    persistReaderSettings();
    applyReaderSettings();
}

function changeLineHeight(step, event) {
    stopEvent(event);
    var nextLevel = readerSettings.lineHeightLevel + step;
    readerSettings.lineHeightLevel = clamp(nextLevel, readerSettings.minLineHeightLevel, readerSettings.maxLineHeightLevel);
    persistReaderSettings();
    applyReaderSettings();
}

function applyReaderSettings() {
    if (!$$('#mainText') || !$$('#content1')) {
        return;
    }

    var fontSize = readerSettings.fontSizeBase + readerSettings.fontSizeLevel * readerSettings.fontSizeStep;
    var lineHeight = readerSettings.lineHeightBase + readerSettings.lineHeightLevel * readerSettings.lineHeightStep;
    var paragraphs = $$('#content1').getElementsByTagName('p');

    $$('#mainText').style.fontSize = fontSize + 'px';
    for (var i = 0; i < paragraphs.length; i++) {
        paragraphs[i].style.lineHeight = lineHeight + 'px';
    }

    updateReaderSettingsText();
}

function updateReaderSettingsText() {
    var fontValue = $$('#fontSizeValue');
    var lineHeightValue = $$('#lineHeightValue');
    if (!fontValue || !lineHeightValue) {
        return;
    }

    fontValue.innerHTML = (readerSettings.fontSizeBase +
        readerSettings.fontSizeLevel * readerSettings.fontSizeStep) + 'px';
    lineHeightValue.innerHTML = (readerSettings.lineHeightBase +
        readerSettings.lineHeightLevel * readerSettings.lineHeightStep) + 'px';
}

function persistReaderSettings() {
    setCookie('reader_settings', JSON.stringify({
        fontSizeLevel: readerSettings.fontSizeLevel,
        lineHeightLevel: readerSettings.lineHeightLevel
    }));
}

function isBottomReached(node) {
    return node.scrollTop + node.clientHeight >= node.scrollHeight - 2;
}

function isTopReached(node) {
    return node.scrollTop <= 0;
}

function stopEvent(event) {
    if (event && event.stopPropagation) {
        event.stopPropagation();
    }
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function toNumber(value, fallback) {
    var number = parseInt(value, 10);
    return isNaN(number) ? fallback : number;
}

function escapeHtml(value) {
    return String(value || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function dateFormat(t) {
    if (!t) {
        return '';
    }

    var now = new Date().getTime();
    var seconds = parseInt((now - t) / 1000, 10);

    Date.prototype.format = function (fmt) {
        var map = {
            'M+': this.getMonth() + 1,
            'd+': this.getDate(),
            'h+': this.getHours(),
            'm+': this.getMinutes(),
            's+': this.getSeconds(),
            'q+': Math.floor((this.getMonth() + 3) / 3),
            S: this.getMilliseconds()
        };

        if (/(y+)/.test(fmt)) {
            fmt = fmt.replace(RegExp.$1, (this.getFullYear() + '').substr(4 - RegExp.$1.length));
        }

        for (var key in map) {
            if (new RegExp('(' + key + ')').test(fmt)) {
                fmt = fmt.replace(RegExp.$1, RegExp.$1.length === 1
                    ? map[key]
                    : ('00' + map[key]).substr(('' + map[key]).length));
            }
        }
        return fmt;
    };

    if (seconds <= 30) {
        return 'just now';
    }
    if (seconds < 60) {
        return seconds + 's ago';
    }
    if (seconds < 3600) {
        return parseInt(seconds / 60, 10) + 'm ago';
    }
    if (seconds < 86400) {
        return parseInt(seconds / 3600, 10) + 'h ago';
    }
    if (seconds < 2592000) {
        return parseInt(seconds / 86400, 10) + 'd ago';
    }
    return new Date(t).format('yyyy-MM-dd');
}
