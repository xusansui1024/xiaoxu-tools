const API_PRIORITY_KEY = 'api_priority';
const HISTORY_KEY = 'video_history';
const MAX_HISTORY = 10;  // 最多保存10条历史记录
const FAVORITES_KEY = 'video_favorites';
const QUALITY_KEY = 'video_quality';
const SPEED_KEY = 'video_speed';
const SOURCE_KEY = 'video_source';
const SHORTCUTS_KEY = 'shortcuts_enabled';
const THEME_KEY = 'theme_name';
const DANMU_KEY = 'danmu_enabled';
const DANMU_SPEED = 5000; // 弹幕速度（毫秒）
const STATS_KEY = 'play_statistics';
const VIDEO_INFO_KEY = 'video_info';

document.addEventListener('DOMContentLoaded', function() {
    const videoUrlInput = document.getElementById('videoUrl');
    const parseButton = document.getElementById('parseButton');
    const videoPlayer = document.getElementById('videoPlayer');

    // 初始化主题选择器
    initThemeSelector();

    // 更新 API_LIST，将已知可用的API放在前面
    const API_LIST = [
        'https://jx.xmflv.com/?url=',         // 已确认可用的API放第一位
        'https://jx.quankan.app/?url=',
        'https://jx.m3u8.tv/jiexi/?url=',
        'https://okjx.cc/?url=',
        'https://www.pangujiexi.cc/jiexi.php?url=',
        'https://api.jiexi.la/?url=',
        'https://jx.jsonplayer.com/player/?url=',
        'https://jx.bozrc.com:4433/player/?url=',
        'https://jx.playerjy.com/?url=',
        'https://jx.blbo.cc:4433/?url='
    ];
    
    let currentApiIndex = 0;
    let lastUrl = '';

    // 加载上次成功的API索引
    const savedPriority = localStorage.getItem(API_PRIORITY_KEY);
    if (savedPriority !== null) {
        currentApiIndex = parseInt(savedPriority);
    }

    parseButton.addEventListener('click', handleParse);
    videoPlayer.addEventListener('error', handleVideoError);
    videoPlayer.addEventListener('load', function() {
        try {
            if (videoPlayer.contentWindow) {
                showMessage('加载成功', 'success');
                showLoading(false);
            }
        } catch (e) {
            // 跨域错误也认为是成功的
            showMessage('加载成功', 'success');
            showLoading(false);
        }
    });

    async function handleParse() {
        const videoUrl = videoUrlInput.value.trim();
        
        if (!videoUrl) {
            showMessage('请输入视频链接！');
            return;
        }

        if (!isValidUrl(videoUrl)) {
            showMessage('请输入有效的视频链接！');
            return;
        }

        // 提取视频信息
        const videoInfo = await extractVideoInfo(videoUrl);
        if (videoInfo) {
            updatePlayStats(videoInfo.platform);
        }

        lastUrl = videoUrl;
        addToHistory(videoUrl);
        await tryParseVideo(videoUrl);
    }

    async function tryParseVideo(videoUrl) {
        showLoading(true);
        showMessage('正在解析...', 'info');
        updateApiStatus();
        
        try {
            let parseUrl = API_LIST[currentApiIndex] + encodeURIComponent(videoUrl);
            console.log('尝试解析:', parseUrl);
            
            videoPlayer.src = parseUrl;
            
            await new Promise((resolve, reject) => {
                videoPlayer.onload = resolve;
                videoPlayer.onerror = reject;
                setTimeout(reject, 10000);
            });
            
            showMessage('解析成功', 'success');
            showLoading(false);
            localStorage.setItem(API_PRIORITY_KEY, currentApiIndex.toString());
            
        } catch (error) {
            console.error('解析失败:', error);
            handleVideoError();
        }
    }

    function handleVideoError() {
        console.log('当前API索引:', currentApiIndex);
        console.log('可用API数量:', API_LIST.length);
        
        if (currentApiIndex >= API_LIST.length - 1) {
            showMessage('所有线路均无法播放，请检查视频链接或稍后重试', 'error');
            showLoading(false);
            return;
        }
        
        currentApiIndex++;
        showMessage(`切换到线路 ${currentApiIndex + 1}/${API_LIST.length}`, 'info');
        
        setTimeout(() => {
            tryParseVideo(lastUrl);
        }, 1000);
    }

    // 其他辅助函数...
    function isValidUrl(url) {
        try {
            new URL(url);
            return url.includes('v.qq.com') || 
                   url.includes('iqiyi.com') || 
                   url.includes('mgtv.com') || 
                   url.includes('youku.com');
        } catch (e) {
            return false;
        }
    }

    function showLoading(show) {
        const loading = document.getElementById('loading');
        const parseButton = document.getElementById('parseButton');
        
        loading.style.display = show ? 'block' : 'none';
        parseButton.disabled = show;
        updateApiStatus();
    }

    function showMessage(text, type = 'error') {
        const messageEl = document.getElementById('message');
        messageEl.textContent = text;
        messageEl.className = `message ${type}`;
        messageEl.style.display = 'block';
        
        // 3秒后自动隐藏消息
        setTimeout(() => {
            messageEl.style.display = 'none';
        }, 3000);
    }

    function updateApiStatus() {
        const statusEl = document.getElementById('apiStatus');
        if (statusEl) {
            statusEl.textContent = `当前使用播放源: ${currentApiIndex + 1}/${API_LIST.length}`;
        }
    }

    // 添加缓检查功能
    function checkCache(videoUrl) {
        const cached = localStorage.getItem('lastParsedUrl');
        if (cached) {
            const { originalUrl, parseUrl, timestamp } = JSON.parse(cached);
            // 缓存时间小于1小时且URL相同
            if (Date.now() - timestamp < 3600000 && originalUrl === videoUrl) {
                return parseUrl;
            }
        }
        return null;
    }

    // 添加历史记录功能
    function addToHistory(videoUrl, title = '') {
        let history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        const newEntry = {
            url: videoUrl,
            title: title || videoUrl,
            timestamp: Date.now()
        };
        
        // 删除重复的记录
        history = history.filter(item => item.url !== videoUrl);
        
        // 添加新记录到开头
        history.unshift(newEntry);
        
        // 限制历史记录数量
        if (history.length > MAX_HISTORY) {
            history = history.slice(0, MAX_HISTORY);
        }
        
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
        updateHistoryUI();
    }
    
    function updateHistoryUI() {
        const historyList = document.getElementById('historyList');
        const history = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
        
        historyList.innerHTML = history.map(item => `
            <div class="history-item" data-url="${item.url}">
                <span class="history-title">${item.title}</span>
                <span class="history-time">${new Date(item.timestamp).toLocaleString()}</span>
            </div>
        `).join('');
    }

    // 添加收藏夹功能
    function addToFavorites(videoUrl, title = '') {
        let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        const newFavorite = {
            url: videoUrl,
            title: title || videoUrl,
            timestamp: Date.now()
        };
        
        // 检查是否已经收藏
        if (!favorites.some(item => item.url === videoUrl)) {
            favorites.push(newFavorite);
            localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
            updateFavoritesUI();
            showMessage('已添加到收藏', 'success');
        } else {
            showMessage('已经在收藏中了', 'error');
        }
    }
    
    function removeFromFavorites(videoUrl) {
        let favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        favorites = favorites.filter(item => item.url !== videoUrl);
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
        updateFavoritesUI();
        showMessage('已从收藏中移除', 'success');
    }
    
    function updateFavoritesUI() {
        const favoritesList = document.getElementById('favoritesList');
        const favorites = JSON.parse(localStorage.getItem(FAVORITES_KEY) || '[]');
        
        favoritesList.innerHTML = favorites.map(item => `
            <div class="favorite-item">
                <div class="favorite-content" data-url="${item.url}">
                    <span class="favorite-title">${item.title}</span>
                    <span class="favorite-time">${new Date(item.timestamp).toLocaleString()}</span>
                </div>
                <button class="remove-favorite" data-url="${item.url}">×</button>
            </div>
        `).join('');
        
        // 添加点击事件
        favoritesList.querySelectorAll('.favorite-content').forEach(item => {
            item.addEventListener('click', () => {
                const url = item.dataset.url;
                videoUrlInput.value = url;
                handleParse();
            });
        });
        
        favoritesList.querySelectorAll('.remove-favorite').forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromFavorites(button.dataset.url);
            });
        });
    }
    
    // 初始化收藏夹
    updateFavoritesUI();
    
    // 添加收藏按钮事件
    document.getElementById('addToFavorites').addEventListener('click', () => {
        const videoUrl = videoUrlInput.value.trim();
        if (videoUrl) {
            addToFavorites(videoUrl);
        } else {
            showMessage('请先输入视频链接', 'error');
        }
    });

    // 清晰度选项
    const QUALITY_OPTIONS = [
        { value: 'auto', label: '自动' },
        { value: '1080p', label: '1080P' },
        { value: '720p', label: '720P' },
        { value: '480p', label: '480P' }
    ];

    // 播放速度选项
    const SPEED_OPTIONS = [
        { value: '0.5', label: '0.5x' },
        { value: '0.75', label: '0.75x' },
        { value: '1.0', label: '1.0x' },
        { value: '1.25', label: '1.25x' },
        { value: '1.5', label: '1.5x' },
        { value: '2.0', label: '2.0x' }
    ];

    // 视频源选项
    const SOURCE_OPTIONS = [
        { value: 'auto', label: '自动选择' },
        { value: 'qq', label: '腾讯视频' },
        { value: 'iqiyi', label: '爱奇艺' },
        { value: 'youku', label: '优酷' },
        { value: 'mgtv', label: '芒果TV' }
    ];

    // 初始化清晰度选择器
    function initQualitySelector() {
        const qualitySelector = document.getElementById('qualitySelector');
        QUALITY_OPTIONS.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            qualitySelector.appendChild(optionEl);
        });

        // 加载上次选择的清晰度
        const savedQuality = localStorage.getItem(QUALITY_KEY) || 'auto';
        qualitySelector.value = savedQuality;

        qualitySelector.addEventListener('change', function() {
            const quality = this.value;
            localStorage.setItem(QUALITY_KEY, quality);
            if (videoPlayer.src) {
                // 重新加载当前视频
                tryParseVideo(lastUrl);
            }
        });
    }

    // 初始化播放速度选择器
    function initSpeedSelector() {
        const speedSelector = document.getElementById('speedSelector');
        SPEED_OPTIONS.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            speedSelector.appendChild(optionEl);
        });

        const savedSpeed = localStorage.getItem(SPEED_KEY) || '1.0';
        speedSelector.value = savedSpeed;

        speedSelector.addEventListener('change', function() {
            const speed = this.value;
            localStorage.setItem(SPEED_KEY, speed);
            setVideoSpeed(speed);
        });
    }

    // 初始化视频源选择器
    function initSourceSelector() {
        const sourceSelector = document.getElementById('sourceSelector');
        SOURCE_OPTIONS.forEach(option => {
            const optionEl = document.createElement('option');
            optionEl.value = option.value;
            optionEl.textContent = option.label;
            sourceSelector.appendChild(optionEl);
        });

        const savedSource = localStorage.getItem(SOURCE_KEY) || 'auto';
        sourceSelector.value = savedSource;

        sourceSelector.addEventListener('change', function() {
            const source = this.value;
            localStorage.setItem(SOURCE_KEY, source);
            if (videoPlayer.src) {
                tryParseVideo(lastUrl);
            }
        });
    }

    // 设置视频放速度
    function setVideoSpeed(speed) {
        try {
            const video = videoPlayer.contentWindow.document.querySelector('video');
            if (video) {
                video.playbackRate = parseFloat(speed);
                showMessage(`播放速度已设置为 ${speed}x`, 'success');
            }
        } catch (e) {
            console.error('设置播放速度失败:', e);
        }
    }

    // 添加高级控制功能
    document.getElementById('refreshPlayer').addEventListener('click', () => {
        if (videoPlayer.src) {
            tryParseVideo(lastUrl);
            showMessage('正在刷新播放器...', 'success');
        } else {
            showMessage('请先解析视频', 'error');
        }
    });

    document.getElementById('fullScreen').addEventListener('click', () => {
        if (videoPlayer.requestFullscreen) {
            videoPlayer.requestFullscreen();
        } else if (videoPlayer.webkitRequestFullscreen) {
            videoPlayer.webkitRequestFullscreen();
        } else if (videoPlayer.msRequestFullscreen) {
            videoPlayer.msRequestFullscreen();
        }
    });

    document.getElementById('clearCache').addEventListener('click', () => {
        if (confirm('确定要清除所有缓存吗？这将删除历史记录和收藏。')) {
            localStorage.clear();
            location.reload();
        }
    });

    // 添加快捷键支持
    function initShortcuts() {
        if (localStorage.getItem(SHORTCUTS_KEY) !== 'false') {
            document.addEventListener('keydown', (e) => {
                // 只在没有输入框焦点时启用快捷键
                if (document.activeElement.tagName !== 'INPUT') {
                    switch(e.key.toLowerCase()) {
                        case ' ':  // 空格键：播放/暂停
                            e.preventDefault();
                            togglePlay();
                            break;
                        case 'f':  // F键：全屏
                            e.preventDefault();
                            toggleFullscreen();
                            break;
                        case 's':  // S键：截图
                            e.preventDefault();
                            captureScreenshot();
                            break;
                        case 'arrowup':  // 上箭头：音量+
                            e.preventDefault();
                            adjustVolume(0.1);
                            break;
                        case 'arrowdown':  // 下箭头：音量-
                            e.preventDefault();
                            adjustVolume(-0.1);
                            break;
                        case 'arrowright':  // 右箭头：快进
                            e.preventDefault();
                            seekVideo(10);
                            break;
                        case 'arrowleft':  // 左箭头：快退
                            e.preventDefault();
                            seekVideo(-10);
                            break;
                    }
                }
            });
        }
    }

    // 视频控制函数
    function togglePlay() {
        try {
            const video = videoPlayer.contentWindow.document.querySelector('video');
            if (video) {
                if (video.paused) {
                    video.play();
                    showMessage('继续播放', 'success');
                } else {
                    video.pause();
                    showMessage('暂停播放', 'success');
                }
            }
        } catch (e) {
            console.error('控制播放失败:', e);
        }
    }

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            videoPlayer.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    function adjustVolume(delta) {
        try {
            const video = videoPlayer.contentWindow.document.querySelector('video');
            if (video) {
                video.volume = Math.max(0, Math.min(1, video.volume + delta));
                showMessage(`音量: ${Math.round(video.volume * 100)}%`, 'success');
            }
        } catch (e) {
            console.error('调整音量失败:', e);
        }
    }

    function seekVideo(seconds) {
        try {
            const video = videoPlayer.contentWindow.document.querySelector('video');
            if (video) {
                video.currentTime += seconds;
                showMessage(`${seconds > 0 ? '快进' : '快退'} ${Math.abs(seconds)} 秒`, 'success');
            }
        } catch (e) {
            console.error('调整进度失败:', e);
        }
    }

    // 视频截图功能
    function captureScreenshot() {
        try {
            const video = videoPlayer.contentWindow.document.querySelector('video');
            if (video) {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                canvas.getContext('2d').drawImage(video, 0, 0);
                
                // 创建下载链接
                const link = document.createElement('a');
                link.download = `screenshot_${new Date().getTime()}.png`;
                link.href = canvas.toDataURL('image/png');
                link.click();
                
                showMessage('截图已保存', 'success');
            }
        } catch (e) {
            console.error('截图失败:', e);
            showMessage('截图失败，可能是跨域限制', 'error');
        }
    }

    // 主题切换功能
    function initThemeSelector() {
        const buttons = document.querySelectorAll('.theme-button');
        const savedTheme = localStorage.getItem('preferred-theme') || 'light';
        
        // 检查是否是移动端
        const isMobile = window.innerWidth <= 768;
        
        // 如果是移动端，使用默认主题（light）
        if (isMobile) {
            document.body.classList.add('theme-light');
            return;
        }
        
        // 初始化主题
        document.body.classList.add(`theme-${savedTheme}`);
        document.querySelector(`[data-theme="${savedTheme}"]`)?.classList.add('active');

        buttons.forEach(button => {
            button.onclick = function(e) {
                e.preventDefault(); // 阻止默认行为
                const theme = this.getAttribute('data-theme');
                
                // 移除所有主题类
                document.body.classList.remove('theme-light', 'theme-dark', 'theme-green', 'theme-blue', 'theme-yellow');
                
                // 添加新主题类
                document.body.classList.add(`theme-${theme}`);
                
                // 更新按钮状态
                buttons.forEach(btn => btn.classList.remove('active'));
                this.classList.add('active');
                
                // 保存主题设置
                localStorage.setItem('preferred-theme', theme);
                
                // 添加反馈
                showMessage(`已切换到${getThemeName(theme)}主题`, 'success');
            };
        });
    }

    function getThemeName(theme) {
        const names = {
            light: '亮色',
            dark: '暗色',
            green: '绿色',
            blue: '蓝色',
            yellow: '黄色'
        };
        return names[theme] || theme;
    }

    // 弹幕功能
    let danmuEnabled = localStorage.getItem(DANMU_KEY) !== 'false';
    const danmuContainer = document.querySelector('.danmu-container');
    const danmuToggle = document.getElementById('toggleDanmu');

    function initDanmu() {
        updateDanmuUI();
        
        danmuToggle.addEventListener('click', () => {
            danmuEnabled = !danmuEnabled;
            localStorage.setItem(DANMU_KEY, danmuEnabled);
            updateDanmuUI();
            showMessage(`弹幕已${danmuEnabled ? '开启' : '关闭'}`, 'success');
        });

        document.getElementById('sendDanmu').addEventListener('click', sendDanmu);
        document.getElementById('danmuText').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendDanmu();
            }
        });
    }

    function updateDanmuUI() {
        danmuContainer.style.display = danmuEnabled ? 'flex' : 'none';
        danmuToggle.textContent = `弹幕${danmuEnabled ? '开启' : '关闭'}`;
    }

    function sendDanmu() {
        if (!danmuEnabled) return;

        const text = document.getElementById('danmuText').value.trim();
        if (!text) return;

        const danmu = document.createElement('div');
        danmu.className = 'danmu';
        danmu.textContent = text;

        // 随机垂直位置
        const top = Math.random() * (videoPlayer.clientHeight - 40);
        danmu.style.top = `${top}px`;

        // 设置初始位置和动画
        danmu.style.left = `${videoPlayer.clientWidth}px`;
        danmu.style.transform = 'translateX(0)';
        danmu.style.transition = `transform ${DANMU_SPEED}ms linear`;

        videoPlayer.appendChild(danmu);
        
        // 开始动画
        requestAnimationFrame(() => {
            danmu.style.transform = `translateX(-${videoPlayer.clientWidth + danmu.clientWidth}px)`;
        });

        // 清除弹幕
        setTimeout(() => {
            danmu.remove();
        }, DANMU_SPEED + 100);

        // 清空输入框
        document.getElementById('danmuText').value = '';
    }

    // 视频信息提取功能
    async function extractVideoInfo(url) {
        try {
            const videoInfo = {
                platform: getPlatform(url),
                url: url,
                timestamp: Date.now()
            };

            // 尝试从URL中提取更多信息
            if (url.includes('v.qq.com')) {
                const vid = url.match(/\/([a-zA-Z0-9]+)\.html/) || [];
                videoInfo.vid = vid[1];
            } else if (url.includes('iqiyi.com')) {
                const vid = url.match(/([a-zA-Z0-9]+)\.html/) || [];
                videoInfo.vid = vid[1];
            }

            // 保存视频信息
            let videoInfoList = JSON.parse(localStorage.getItem(VIDEO_INFO_KEY) || '[]');
            videoInfoList.unshift(videoInfo);
            videoInfoList = videoInfoList.slice(0, 50); // 只保留最近50条记录
            localStorage.setItem(VIDEO_INFO_KEY, JSON.stringify(videoInfoList));

            return videoInfo;
        } catch (e) {
            console.error('提取视频信息失败:', e);
            return null;
        }
    }

    // 获取视频平台
    function getPlatform(url) {
        if (url.includes('v.qq.com')) return '腾讯视频';
        if (url.includes('iqiyi.com')) return '爱奇艺';
        if (url.includes('mgtv.com')) return '芒果TV';
        if (url.includes('youku.com')) return '优酷';
        return '未知平台';
    }

    // 播放统计功能
    function updatePlayStats(platform) {
        let stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
        stats[platform] = (stats[platform] || 0) + 1;
        localStorage.setItem(STATS_KEY, JSON.stringify(stats));
        updateStatsUI();
    }

    function updateStatsUI() {
        const stats = JSON.parse(localStorage.getItem(STATS_KEY) || '{}');
        const statsHtml = Object.entries(stats)
            .map(([platform, count]) => `
                <div class="stat-item">
                    <span class="stat-platform">${platform}</span>
                    <span class="stat-count">${count}次</span>
                </div>
            `).join('');

        // 更新统计显示
        const statsContainer = document.getElementById('playStats');
        if (statsContainer) {
            statsContainer.innerHTML = statsHtml;
        }
    }

    // 初始化所有功能
    initQualitySelector();
    initSpeedSelector();
    initSourceSelector();
    initShortcuts();
    initTheme();
    initDanmu();
    updateStatsUI();
}); 