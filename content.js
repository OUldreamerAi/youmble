const EXTENSION_NAME = chrome.runtime.getManifest().name;


const thumbnailPool = [];
const titlePool = [];
const iconPool = [];

let lastThumbnailIndex = -1;
let lastTitleIndex = -1;
let lastIconIndex = -1;

let currentPageUrl = '';

let shuffledVideoIds = new Set();

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function getRandomIndexExcluding(max, exclude) {
    if (max <= 1) return 0;
    let index;
    do {
        index = Math.floor(Math.random() * max);
    } while (index === exclude);
    return index;
}

function getVideoId(container) {
    const link = container.querySelector('a#video-title-link, a#video-title, #video-title');
    if (link && link.href) {
        return link.href;
    }
    const thumb = container.querySelector('img[src*="ytimg.com"]');
    return thumb ? thumb.src : Math.random().toString();
}

function injectDisableAutoplayCSS() {
    if (document.getElementById('disable-autoplay-style')) return;
    
    const style = document.createElement('style');
    style.id = 'disable-autoplay-style';
    style.textContent = `
        ytd-video-preview,
        #video-preview,
        .ytp-inline-preview-ui {
            display: none !important;
            opacity: 0 !important;
            pointer-events: none !important;
        }
        
        ytd-thumbnail:hover ytd-video-preview,
        ytd-thumbnail:hover #video-preview {
            display: none !important;
        }
    `;
    document.head.appendChild(style);
}

function disableAutoplay() {
    document.querySelectorAll('video').forEach(video => {
        video.pause();
        video.muted = true;
        video.removeAttribute('autoplay');
        video.style.display = 'none';
    });
    
    document.querySelectorAll('ytd-video-preview, #video-preview').forEach(el => {
        el.remove();
    });
}

function findVideoData() {
    try {
        const containers = document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer, ytd-grid-video-renderer, ytd-compact-video-renderer, ytd-playlist-video-renderer');
        
        const videoData = [];
        
        containers.forEach(container => {
            const thumbnail = container.querySelector('img#img.yt-core-image, img.yt-core-image, yt-image img, img[src*="ytimg.com"]');
            const titleElement = container.querySelector('#video-title, h3 a, a#video-title-link');
            const channelIcon = container.querySelector('yt-img-shadow img, #avatar img, img.yt-spec-avatar-shape__image');
            
            if (thumbnail && thumbnail.src && thumbnail.src.includes('ytimg.com')) {
                videoData.push({
                    container,
                    videoId: getVideoId(container),
                    thumbnail,
                    thumbnailSrc: thumbnail.src,
                    titleElement,
                    titleText: titleElement ? (titleElement.textContent || titleElement.innerText || '').trim() : '',
                    titleHref: titleElement ? titleElement.href : '',
                    channelIcon,
                    channelIconSrc: channelIcon ? channelIcon.src : ''
                });
            }
        });
        
        return videoData;
    } catch (error) {
        console.error('Error finding video data:', error);
        return [];
    }
}
function shuffleVideos() {
    try {
        const allVideos = findVideoData();
        
        if (allVideos.length === 0) {
            return;
        }
        
        const newVideos = allVideos.filter(video => !shuffledVideoIds.has(video.videoId));
        
        if (newVideos.length === 0) {
            return;
        }
        
        const newThumbnails = [];
        const newTitles = [];
        const newIcons = [];
        
        newVideos.forEach(video => {
            newThumbnails.push(video.thumbnailSrc);
            newTitles.push({ text: video.titleText, href: video.titleHref });
            if (video.channelIconSrc) {
                newIcons.push(video.channelIconSrc);
            }
        });
        thumbnailPool.push(...newThumbnails);
        titlePool.push(...newTitles);
        iconPool.push(...newIcons);
        
        console.log(`Found ${newVideos.length} new videos | Pool: ${thumbnailPool.length} thumbnails, ${titlePool.length} titles, ${iconPool.length} icons`);
        
        const shuffledThumbnails = shuffleArray(thumbnailPool);
        const shuffledTitles = shuffleArray(titlePool);
        const shuffledIcons = shuffleArray(iconPool);
        
        newVideos.forEach((video) => {
            const randomThumbIndex = getRandomIndexExcluding(shuffledThumbnails.length, lastThumbnailIndex);
            const randomTitleIndex = getRandomIndexExcluding(shuffledTitles.length, lastTitleIndex);
            const randomIconIndex = getRandomIndexExcluding(shuffledIcons.length, lastIconIndex);
            
            lastThumbnailIndex = randomThumbIndex;
            lastTitleIndex = randomTitleIndex;
            lastIconIndex = randomIconIndex;
            
            video.thumbnail.src = shuffledThumbnails[randomThumbIndex];
            video.thumbnail.srcset = '';
            
            if (video.titleElement && shuffledTitles[randomTitleIndex].text) {
                video.titleElement.textContent = shuffledTitles[randomTitleIndex].text;
                video.titleElement.setAttribute('title', shuffledTitles[randomTitleIndex].text);
                video.titleElement.setAttribute('aria-label', shuffledTitles[randomTitleIndex].text);
            }
            
            if (video.channelIcon && shuffledIcons.length > 0) {
                video.channelIcon.src = shuffledIcons[randomIconIndex];
                video.channelIcon.srcset = '';
            }
            
            shuffledVideoIds.add(video.videoId);
        });
        
        console.log(`✓ Shuffled ${newVideos.length} videos (total tracked: ${shuffledVideoIds.size})`);
    } catch (error) {
        console.error('Error shuffling:', error);
    }
}

function handlePageChange() {
    console.log('Page changed - clearing tracking for new URL');
    
    shuffledVideoIds.clear();
    
    lastThumbnailIndex = -1;
    lastTitleIndex = -1;
    lastIconIndex = -1;
    
    setTimeout(shuffleVideos, 800);
    setTimeout(shuffleVideos, 1500); 
}

function main() {
    console.info(`${EXTENSION_NAME} loaded`);
    
    injectDisableAutoplayCSS();
    

    currentPageUrl = location.href;
    
    setTimeout(shuffleVideos, 500);
    
    const observer = new MutationObserver(() => {
        clearTimeout(observer.timer);
        observer.timer = setTimeout(() => {
            shuffleVideos();
            disableAutoplay();
        }, 200);
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    setInterval(disableAutoplay, 300);
    
    setInterval(() => {
        if (location.href !== currentPageUrl) {
            console.log(`URL changed from "${currentPageUrl}" to "${location.href}"`);
            currentPageUrl = location.href;
            handlePageChange();
            injectDisableAutoplayCSS();
        }
    }, 500);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', main);
} else {
    main();
}