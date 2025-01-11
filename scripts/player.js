const DEBUG = true;  // 设置为 true 开启调试日志

function log(...args) {
    if (DEBUG) {
        console.log('[AdBlock]', ...args);
    }
}

// 广告拦截主函数
function blockVideoAds() {
    // 添加状态指示器
    const indicator = document.createElement('div');
    indicator.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        background: green;
        color: white;
        padding: 5px;
        z-index: 999999;
    `;
    indicator.textContent = '广告拦截已启动';
    document.body.appendChild(indicator);
    
    log('广告拦截已启动');  // 添加日志

    // 拦截网络请求
    const originalFetch = window.fetch;
    window.fetch = function(url, options) {
        if (typeof url === 'string' && 
            playerConfig.adDetection.urlPatterns.some(pattern => url.includes(pattern))) {
            log('拦截请求:', url);  // 添加日志
            return Promise.resolve(new Response(''));
        }
        return originalFetch.apply(this, arguments);
    };

    // 拦截 XHR 请求
    const originalXHROpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function(method, url) {
        if (typeof url === 'string' && 
            playerConfig.adDetection.urlPatterns.some(pattern => url.includes(pattern))) {
            return;
        }
        return originalXHROpen.apply(this, arguments);
    };

    // 拦截脚本加载
    const originalCreateElement = document.createElement;
    document.createElement = function(tagName) {
        const element = originalCreateElement.call(document, tagName);
        if (tagName.toLowerCase() === 'script') {
            const originalSetAttribute = element.setAttribute;
            element.setAttribute = function(name, value) {
                if (name === 'src' && 
                    playerConfig.adDetection.urlPatterns.some(pattern => value.includes(pattern))) {
                    return;
                }
                return originalSetAttribute.call(this, name, value);
            };
        }
        return element;
    };

    // 监听 DOM 变化
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // 元素节点
                    // 检查是否是广告元素
                    const isAd = playerConfig.adDetection.classPatterns.some(pattern => 
                        node.className?.includes(pattern) || 
                        node.id?.includes(pattern) ||
                        node.src?.includes(pattern)
                    );
                    if (isAd) {
                        node.remove();
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });

    // 定期清理
    setInterval(() => {
        // 清理定时器
        const maxTimer = window.setTimeout(() => {}, 0);
        for (let i = 0; i < maxTimer; i++) {
            window.clearTimeout(i);
            window.clearInterval(i);
        }

        // 移除广告元素
        document.querySelectorAll('[class*="ad"], [class*="game"]').forEach(el => {
            if (el.id !== 'videoPlayer') {
                el.remove();
            }
        });
    }, playerConfig.adDetection.checkInterval);
}

// 立即执行
blockVideoAds();

function interceptPauseAds() {
    const videoPlayer = document.querySelector('#videoPlayer');
    if (!videoPlayer) return;

    // 保存原始的暂停状态
    let userPaused = false;

    // 拦截原始的暂停函数
    const originalPause = videoPlayer.pause;
    videoPlayer.pause = function() {
        userPaused = true;
        originalPause.call(this);
        
        // 立即检查和移除广告
        removeAds();
        
        // 延迟检查，因为广告可能在暂停后异步加载
        setTimeout(removeAds, 10);
        setTimeout(removeAds, 50);
        setTimeout(removeAds, 100);
    };

    // 拦截播放器的广告加载函数
    if (typeof player !== 'undefined') {
        const adFunctions = [
            'onPause',
            'showPauseAd',
            'loadPauseAd',
            'displayAd',
            'showGameAd'
        ];

        adFunctions.forEach(funcName => {
            if (player[funcName]) {
                player[funcName] = () => {};
            }
        });
    }

    // 监听 DOM 变化，专门处理广告元素
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1) { // 元素节点
                    // 检查是否是广告元素
                    const isAd = 
                        node.className?.includes('ad') ||
                        node.className?.includes('game') ||
                        node.innerHTML?.includes('游戏') ||
                        node.innerHTML?.includes('广告') ||
                        node.src?.includes('.jpg') ||
                        node.src?.includes('.png');

                    if (isAd) {
                        node.remove();
                    }
                }
            });
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true
    });

    // 移除广告元素的函数
    function removeAds() {
        if (!userPaused) return;

        const adElements = document.querySelectorAll(`
            [class*="ad"],
            [class*="game"],
            [class*="广告"],
            [class*="游戏"],
            img[src*=".jpg"],
            img[src*=".png"],
            canvas,
            iframe:not(#videoPlayer)
        `);

        adElements.forEach(el => {
            if (el.id !== 'videoPlayer') {
                el.remove();
            }
        });

        // 清理定时器，止广告延迟加载
        const maxTimer = window.setTimeout(() => {}, 0);
        for (let i = 0; i < maxTimer; i++) {
            window.clearTimeout(i);
        }
    }
}

// 在 init 函数中调用
function init() {
    interceptPauseAds();
    // ... 其他初始化代码
} 
