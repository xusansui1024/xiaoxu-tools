const playerConfig = {
    // 基础配置
    pauseAd: false,
    showAdvertisement: false,
    allowPauseAd: false,
    gameAds: false,
    popupAds: false,
    bannerAds: false,
    floatingAds: false,
    adBlock: true,
    blockExternalAds: true,
    
    // 广告检测配置
    adDetection: {
        checkInterval: 50,
        urlPatterns: [
            'hmjs/',
            'bmlVVBzNDc1M',
            'Fil2OWlwn',
            'm_video.js',
            '.gif'
        ],
        classPatterns: [
            'ad',
            'game',
            'guanggao',
            'video-tfjs',
            'random-btn',
            'player-list-off'
        ]
    }
};

// 广告拦截配置
window.adBlockConfig = {
    enabled: true,
    blockAll: true,
    allowedDomains: [],
    refreshRate: 50,
    debug: false
}; 
