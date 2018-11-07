[].forEach.call(document.querySelectorAll('div'), function(el){
    calculateBg(el);
});

function calculateBg(el) {
    var bg = getBackgroundRectSize(el);
    var bgImg = getBackgroundImageSize(el);
    var bgPositionX = parseFloat(getComputedStyle(el).backgroundPositionX, 10);
    var bgPositionY = parseFloat(getComputedStyle(el).backgroundPositionY, 10);

    var imgWidth = el.getAttribute('data-bg-image-width');
    var imgHeight = el.getAttribute('data-bg-image-height');
    var heightRatio, widthRatio;
    var resize = bg.width + 'x' + bg.height;
    var img = {
        width: imgWidth,
        height: imgHeight
    }

    img.width = Math.round(img.width);
    img.height = Math.round(img.height);

    // el.style.backgroundImage = `url(http://localhost:8090/cw${bg.width + bg.offsetLeft - 3},ch${bg.height + bg.offsetTop - 3}/https://dummyimage.com/${imgWidth}x${imgHeight}/000/fff)`;
    el.style.backgroundImage = `url(http://localhost:8090/${resize},fit,cw${img.width},ch${img.height},q100/${getComputedStyle(el).backgroundImage.split('"')[1]}`;
}


// na jakiej powieżchni renderowany jest background
function getBackgroundRectSize(el) {
    // background-clip: border-box
    var bg = {
        width: null,
        height: null,
        containWidth: null,
        containHeight: null,
        offsetLeft: 0,
        offsetTop: 0
    }
    var elementProperties = {
        backgroundOrigin: window.getComputedStyle(el).backgroundOrigin,
        backgroundAttachment: window.getComputedStyle(el).backgroundAttachment,
        borderLeftWidth: parseFloat(window.getComputedStyle(el).borderLeftWidth, 10),
        borderTopWidth: parseFloat(window.getComputedStyle(el).borderTopWidth, 10),
        borderRightWidth: parseFloat(window.getComputedStyle(el).borderRightWidth, 10),
        borderBottomWidth: parseFloat(window.getComputedStyle(el).borderBottomWidth, 10),
        paddingLeft: parseFloat(window.getComputedStyle(el).paddingLeft, 10),
        paddingTop: parseFloat(window.getComputedStyle(el).paddingTop, 10),
        paddingBottom: parseFloat(window.getComputedStyle(el).paddingBottom, 10),
        paddingRight: parseFloat(window.getComputedStyle(el).paddingRight, 10),
    }

    if(elementProperties.backgroundAttachment === "scroll"
        || (elementProperties.backgroundAttachment === "local" && window.getComputedStyle(el).overflow === "visible")) {
        if(elementProperties.backgroundOrigin === "border-box") {
            bg.width = el.offsetWidth;
            bg.height = el.offsetHeight;
        } else if(elementProperties.backgroundOrigin === "padding-box") {
            bg.width = el.offsetWidth - elementProperties.borderRightWidth - elementProperties.borderLeftWidth;
            bg.height = el.offsetHeight - elementProperties.borderBottomWidth - elementProperties.borderTopWidth;
        } else if(elementProperties.backgroundOrigin === "content-box") {
            bg.width = el.offsetWidth - elementProperties.borderRightWidth - elementProperties.borderLeftWidth - elementProperties.paddingRight - elementProperties.paddingLeft;
            bg.height = el.offsetHeight - elementProperties.borderBottomWidth - elementProperties.borderTopWidth - elementProperties.paddingBottom - elementProperties.paddingTop;
        }
    } else if(elementProperties.backgroundAttachment === "local"){
        if(elementProperties.backgroundOrigin === "border-box") {
            bg.width = el.scrollWidth + elementProperties.borderLeftWidth + elementProperties.borderRightWidth;
            bg.height = el.scrollHeight + elementProperties.borderTopWidth + elementProperties.borderBottomWidth;
        } else if(elementProperties.backgroundOrigin === "padding-box") {
            bg.width = el.scrollWidth;
            bg.height = el.scrollHeight;
        } else if(elementProperties.backgroundOrigin === "content-box") {
            bg.width = el.scrollWidth - elementProperties.paddingLeft - elementProperties.paddingRight;
            bg.height = el.scrollHeight - elementProperties.paddingTop - elementProperties.paddingBottom;
        }
    }
    el.bgSize = bg;
    return bg;
}

function getBackgroundImageSize(el) {
    var imgWidth = el.getAttribute('data-bg-image-width');
    var imgHeight = el.getAttribute('data-bg-image-height');
    var backgroundSize = window.getComputedStyle(el).backgroundSize;
    var sizes = backgroundSize.split(' ');
    var backgroundRectSize = getBackgroundRectSize(el);
    var width, height;

    if(backgroundSize === 'auto') {
        width = 'auto';
        height = 'auto';
    } else if(backgroundSize === 'cover'){
        if(imgWidth/imgHeight > backgroundRectSize.width/backgroundRectSize.height) {
            width = 'auto';
            height = backgroundRectSize.height;
        } else {
            width = backgroundRectSize.width;
            height = 'auto';
        }
    } else if(backgroundSize === 'contain'){
        if(imgWidth/imgHeight > backgroundRectSize.width/backgroundRectSize.height) {
            width = backgroundRectSize.width;
            height = 'auto';
        } else {
            width = 'auto';
            height = backgroundRectSize.height;
        }
    } else if(sizes.length === 1){
        if(sizes[0].indexOf('%') === -1) {
            width = parseFloat(sizes[0], 10);
        } else {
            width = (parseFloat(sizes[0], 10) * backgroundRectSize.width) / 100;
        }
        height = 'auto';
    } else {
        if(sizes[0].indexOf('%') === -1) {
            width = parseFloat(sizes[0], 10);
        } else {
            width = (parseFloat(sizes[0], 10) * backgroundRectSize.width) / 100;
        }

        if(sizes[0].indexOf('%') === -1) {
            height = parseFloat(sizes[0], 10);
        } else {
            height = (parseFloat(sizes[1], 10) * backgroundRectSize.height) / 100;
        }
    }
    el.bgImgSize = {width: width, height: height};
    return {width, height};
}