function checkifyoutube() {
    const currentUrl = window.location.href;
    if (currentUrl == "youtube.com") {
    
    }

    if (logo) {
        logo.style.display = 'none';
        const logo = document.querySelector('yt-icon.ytd-logo');
        console.log('YouTube logo hidden by extension!');
    }
}

checkifyoutube()
