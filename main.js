[].forEach.call(document.querySelectorAll('div'), function(el){
    calculateBg(el);
});

function calculateBg(el) {
    var bg = getBackgroundRectSize(el);
    var bgImg = getBackgroundImageSize(el);
    var imgWidth = el.getAttribute('data-bg-image-width');
    var imgHeight = el.getAttribute('data-bg-image-height');
    var heightRatio, widthRatio;
    var resize = '0x0';

    if(bgImg.width === 'auto' && bgImg.height !== 'auto') {
        widthRatio = heightRatio = (bgImg.height / imgHeight);
        resize = 'x' + bgImg.height;
    } else if(bgImg.height === 'auto' && bgImg.width !== 'auto') {
        heightRatio = widthRatio = (bgImg.width / imgWidth);
        resize = bgImg.width + 'x';
    } else {
        widthRatio = 1;
        heightRatio = 1;
    }
// console.log(widthRatio, heightRatio);

    // el.style.backgroundImage = `url(http://localhost:8090/cw${bg.width + bg.offsetLeft - 3},ch${bg.height + bg.offsetTop - 3}/https://dummyimage.com/${imgWidth}x${imgHeight}/000/fff)`;
    el.style.backgroundImage = `url(http://localhost:8090/${resize},cw${bg.width / widthRatio},ch${bg.height / heightRatio}/https://dummyimage.com/${imgWidth}x${imgHeight}/000/fff)`;
}


// na jakiej powieżchni renderowany jest background
function getBackgroundRectSize(el) {
    // background-clip: border-box
    var bg = {
        width: null,
        height: null,
        offsetLeft: 0,
        offsetTop: 0
    }
    var backgroundOrigin = window.getComputedStyle(el).backgroundOrigin;
    var backgroundAttachment = window.getComputedStyle(el).backgroundAttachment;
    var borderLeftWidth = parseFloat(window.getComputedStyle(el).borderLeftWidth, 10);
    var borderTopWidth = parseFloat(window.getComputedStyle(el).borderTopWidth, 10);
    var borderRightWidth = parseFloat(window.getComputedStyle(el).borderRightWidth, 10);
    var borderBottomWidth = parseFloat(window.getComputedStyle(el).borderBottomWidth, 10);
    var paddingLeft = parseFloat(window.getComputedStyle(el).paddingLeft, 10);
    var paddingTop = parseFloat(window.getComputedStyle(el).paddingTop, 10);

    if(window.getComputedStyle(el).backgroundAttachment === "scroll"
        || (window.getComputedStyle(el).backgroundAttachment === "local" && window.getComputedStyle(el).overflow === "visible")) {
        if(backgroundOrigin === "border-box") {
            bg.width = el.offsetWidth;
            bg.height = el.offsetHeight;
        } else if(backgroundOrigin === "padding-box") {
            bg.width = el.offsetWidth - parseFloat(window.getComputedStyle(el).borderLeftWidth, 10);
            bg.height = el.offsetHeight - parseFloat(window.getComputedStyle(el).borderTopWidth, 10);
        } else if(backgroundOrigin === "content-box") {
            bg.width = el.offsetWidth - parseFloat(window.getComputedStyle(el).borderLeftWidth, 10) - parseFloat(window.getComputedStyle(el).paddingLeft, 10);
            bg.height = el.offsetHeight - parseFloat(window.getComputedStyle(el).borderTopWidth, 10) - parseFloat(window.getComputedStyle(el).paddingTop, 10);
        }
    } else if(window.getComputedStyle(el).backgroundAttachment === "local"){
        if(backgroundOrigin === "border-box") {
            bg.offsetLeft = borderLeftWidth;
            bg.offsetTop = borderTopWidth;
            bg.width = el.scrollWidth + bg.offsetLeft;
            bg.height = el.scrollHeight + bg.offsetTop;
        } else if(backgroundOrigin === "padding-box") {
            bg.width = el.scrollWidth;
            bg.height = el.scrollHeight;
        } else if(backgroundOrigin === "content-box") {
            bg.width = el.scrollWidth - paddingLeft;
            bg.height = el.scrollHeight - paddingTop;
        }
    }
    el.bgSize = {width: bg.width, height: bg.height};
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
        width = parseFloat(sizes[0], 10);
        height = 'auto';
    } else {
        width = parseFloat(sizes[0], 10);
        height = parseFloat(sizes[1], 10);
    }
    el.bgImgSize = {width: width, height: height};
    return {width, height};
}