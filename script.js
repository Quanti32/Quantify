// --- START OF FILE script.js ---
document.addEventListener('DOMContentLoaded', () => {
    // === AWAL: PENGECEKAN LOGIN ===
    const isLoggedIn = localStorage.getItem('isLoggedIn');
    const storedUser = localStorage.getItem('novaUser');
    let currentUser = null;

    if (isLoggedIn === 'true' && storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            if (!currentUser || !currentUser.name) {
                throw new Error("Invalid user data in storage.");
            }
            document.body.classList.remove('app-hidden');
            document.body.classList.add('app-loaded');

            // === AWAL: DISPLAY PROFIL PENGGUNA DI SIDEBAR ===
            const profilePicture = document.getElementById('profilePicture');
            const profileName = document.getElementById('profileName');
            const profileEmail = document.getElementById('profileEmail');
            const sidebarUserProfile = document.getElementById('sidebarUserProfile');
            // Element sidebarLoginSignup tidak relevan lagi dengan HTML baru
            // const sidebarLoginSignup = document.getElementById('sidebarLoginSignup'); 

            if (currentUser) {
                if (profilePicture) profilePicture.src = currentUser.picture || 'placeholder-user.png';
                if (profileName) profileName.textContent = currentUser.name || 'User';
                if (profileEmail) profileEmail.textContent = currentUser.email || 'user@example.com';
                if (sidebarUserProfile) sidebarUserProfile.style.display = 'flex';
                // if (sidebarLoginSignup) sidebarLoginSignup.style.display = 'none';
            } else {
                if (sidebarUserProfile) sidebarUserProfile.style.display = 'none';
                // if (sidebarLoginSignup) sidebarLoginSignup.style.display = 'flex';
            }
            // === AKHIR: DISPLAY PROFIL PENGGUNA DI SIDEBAR ===

        } catch (e) {
            console.error("Error parsing user data or invalid data:", e);
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('novaUser');
            window.location.href = 'login.html';
            return;
        }
    } else {
        window.location.href = 'login.html';
        return;
    }
    // === AKHIR: PENGECEKAN LOGIN ===

    // === ELEMEN UI BARU / YANG DIUBAH ===
    const appContainer = document.querySelector('.app-container');
    const sidebarToggleBtn = document.getElementById('sidebarToggleBtn');
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarNewChatBtn = document.getElementById('sidebarNewChatBtn');
    const headerNewChatBtn = document.getElementById('headerNewChatBtn');
    const logoutButtonSidebar = document.getElementById('logoutButtonSidebar');

    const novariaTitleDropdown = document.getElementById('novariaTitleDropdown');
    const novariaDropdownMenu = document.getElementById('novariaDropdownMenu');
    const exportChatBtn = document.getElementById('exportChatBtn');
    const shareChatBtn = document.getElementById('shareChatBtn');
    const clearCurrentChatBtn = document.getElementById('clearCurrentChatBtn');
    const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');

    const currentChatFavoriteBtn = document.getElementById('currentChatFavoriteBtn');
    const chatHistoryList = document.getElementById('chat-history-list'); // Untuk sidebar history

    const messageInput = document.getElementById('messageInput');
    const sendButton = document.getElementById('sendButtonBottom');
    const chatDisplay = document.getElementById('chatHistory'); // Ini adalah div chat-display sekarang
    const initialGreeting = document.querySelector('.initial-greeting');
    const thinkingIndicator = document.getElementById('thinkingIndicator');
    const mainContent = document.querySelector('.main-content');

    const plusButton = document.getElementById('plusButtonTop');
    const fileInput = document.getElementById('fileInput');
    const bottomChatArea = document.getElementById('bottomChatArea');
    // const newInputWrapperContainer = document.querySelector('.new-input-wrapper-container'); // Tidak perlu lagi sebagai const di sini, diambil oleh observer

    const MAX_FILE_SIZE_KB_NEW = 450;
    const MAX_FILE_SIZE_BYTES_NEW = MAX_FILE_SIZE_KB_NEW * 1024;
    const MAX_FILES_ALLOWED = 5;
    const fileChipContainer = document.getElementById('fileChipContainer');
    const fileChipsArea = document.getElementById('fileChipsArea');
    let attachedFiles = [];

    let currentConversationId = null; // ID percakapan aktif
    let conversationHistory = []; // Riwayat pesan untuk percakapan aktif saat ini
    let allConversations = {}; // Menyimpan semua percakapan: { id: { messages: [], isFavorite: false, title: "" } }

    const MAX_HISTORY_DISPLAY_LENGTH = 10; // Jumlah pesan yang disimpan per percakapan (untuk tujuan tampilan/regen)

    const customModelSelectorTrigger = document.getElementById('customModelSelectorTrigger');
    const selectedModelName = document.getElementById('selectedModelName');
    const modelSelectModal = document.getElementById('modelSelectModal');
    const modelOptionsContainer = document.getElementById('modelOptions');
    const closeModelModalButton = document.getElementById('closeModelModal');

    const fastButton = document.getElementById('fastButton');
    const smartButton = document.getElementById('smartButton');

    const themeToggleMain = document.getElementById('themeToggleMain');

    const availableModels = [
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', type: 'fast' },
        { value: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash', type: 'smart' },
        { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash', type: 'other' }
    ];

    let currentSelectedModelValue = '';
    let currentTypingAnimationInterval = null; // Gunakan ini untuk menyimpan ID interval typing
    let currentTypingAnimationTimeout = null; // Gunakan ini untuk menyimpan ID timeout antar segmen

    // --- FUNGSI UTILITY ---
    function generateUniqueId() {
        return 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    function saveConversations() {
        localStorage.setItem('novariaConversations', JSON.stringify(allConversations));
        if (currentConversationId) {
            localStorage.setItem('lastActiveChatId', currentConversationId);
        }
    }

    function loadConversations() {
        const stored = localStorage.getItem('novariaConversations');
        if (stored) {
            allConversations = JSON.parse(stored);
        } else {
            allConversations = {};
        }
        renderChatHistoryList();
    }

    function renderChatHistoryList() {
        chatHistoryList.innerHTML = '';
        const sortedConversations = Object.values(allConversations).sort((a, b) => {
            // Favorit di atas
            if (a.isFavorite && !b.isFavorite) return -1;
            if (!a.isFavorite && b.isFavorite) return 1;
            // Kemudian yang paling baru
            return b.timestamp - a.timestamp;
        });

        sortedConversations.forEach(conv => {
            const listItem = document.createElement('li');
            listItem.classList.add('chat-item');
            if (conv.id === currentConversationId) {
                listItem.classList.add('active-chat');
            }
            listItem.dataset.chatId = conv.id;

            const titleSpan = document.createElement('span');
            titleSpan.textContent = conv.title || "New Chat";
            listItem.appendChild(titleSpan);

            const favoriteIcon = document.createElement('i');
            favoriteIcon.classList.add('fas', 'fa-star', 'favorite-icon');
            if (conv.isFavorite) {
                favoriteIcon.classList.add('active');
            }
            favoriteIcon.addEventListener('click', (e) => {
                e.stopPropagation(); // Mencegah klik item chat
                toggleChatFavorite(conv.id);
            });
            listItem.appendChild(favoriteIcon);

            listItem.addEventListener('click', () => loadChat(conv.id));
            chatHistoryList.appendChild(listItem);
        });
    }

    function createNewChat() {
        // Simpan percakapan saat ini sebelum membuat yang baru
        if (currentConversationId && conversationHistory.length > 0) {
            allConversations[currentConversationId] = {
                id: currentConversationId,
                messages: conversationHistory,
                isFavorite: allConversations[currentConversationId]?.isFavorite || false,
                title: allConversations[currentConversationId]?.title || generateChatTitle(conversationHistory),
                timestamp: Date.now()
            };
            saveConversations();
        }

        currentConversationId = generateUniqueId();
        conversationHistory = [];
        clearAttachedFiles();
        messageInput.value = '';
        autoResizeTextarea();
        updateInputAreaAppearance();
        initialGreeting.classList.remove('hidden'); // Tampilkan pesan awal
        chatDisplay.innerHTML = ''; // Kosongkan chat display
        chatDisplay.appendChild(initialGreeting);
        chatDisplay.appendChild(thinkingIndicator); // Pastikan thinking indicator ada

        // Reset favorite button for new chat
        currentChatFavoriteBtn.querySelector('i').classList.remove('fas');
        currentChatFavoriteBtn.querySelector('i').classList.add('far');

        renderChatHistoryList(); // Perbarui daftar history
        closeSidebar();
    }

    function loadChat(chatId) {
        stopCurrentTypingAnimation(); // Stop any ongoing typing animation

        if (currentConversationId && currentConversationId !== chatId && conversationHistory.length > 0) {
            // Simpan percakapan lama sebelum memuat yang baru
            allConversations[currentConversationId] = {
                id: currentConversationId,
                messages: conversationHistory,
                isFavorite: allConversations[currentConversationId]?.isFavorite || false,
                title: allConversations[currentConversationId]?.title || generateChatTitle(conversationHistory),
                timestamp: Date.now() // Update timestamp to bring it to top
            };
            saveConversations();
        }

        currentConversationId = chatId;
        localStorage.setItem('lastActiveChatId', currentConversationId); // Simpan ID chat yang sedang aktif
        conversationHistory = allConversations[chatId].messages || [];
        clearAttachedFiles();
        messageInput.value = '';
        autoResizeTextarea();
        updateInputAreaAppearance();

        // Kosongkan chat display dan tampilkan pesan dari history
        chatDisplay.innerHTML = '';
        initialGreeting.classList.add('hidden'); // Sembunyikan pesan awal
        conversationHistory.forEach(msg => {
            const msgEl = document.createElement('div');
            msgEl.classList.add('chat-message', msg.role === 'user' ? 'user-message' : 'ai-message');
            // Untuk AI messages, kita perlu mem-parsing ulang content dan menambahkan actions
            if (msg.role === 'assistant') {
                const aiHeader = document.createElement('div');
                aiHeader.classList.add('ai-message-header');
                aiHeader.innerHTML = `<img src="logo.png" alt="Novaria Logo" class="ai-logo">
                                      <span class="ai-name">Novaria</span>
                                      <span class="ai-model-tag">${availableModels.find(m => m.value === (msg.modelUsed || 'default'))?.label || (msg.modelUsed || 'Novaria')}</span>`;
                msgEl.appendChild(aiHeader);

                const aiContentContainer = document.createElement('div');
                aiContentContainer.classList.add('ai-message-content');
                // Use innerHTML as content might contain HTML from highlight.js
                aiContentContainer.innerHTML = parseMarkdownToHtml(msg.content);
                msgEl.appendChild(aiContentContainer);
                addAiMessageActions(msgEl); // Add action buttons
                // Re-highlight code blocks
                aiContentContainer.querySelectorAll('pre code').forEach((block) => {
                    hljs.highlightElement(block);
                });
            } else {
                msgEl.textContent = msg.content;
            }
            chatDisplay.appendChild(msgEl);
            setTimeout(() => { // Trigger animation
                msgEl.style.opacity = '1';
                msgEl.style.transform = 'translateY(0)';
            }, 10);
        });
        chatDisplay.appendChild(thinkingIndicator); // Pastikan thinking indicator ada di akhir

        // Set favorite button based on loaded chat
        if (allConversations[chatId]?.isFavorite) {
            currentChatFavoriteBtn.querySelector('i').classList.remove('far');
            currentChatFavoriteBtn.querySelector('i').classList.add('fas');
        } else {
            currentChatFavoriteBtn.querySelector('i').classList.remove('fas');
            currentChatFavoriteBtn.querySelector('i').classList.add('far');
        }

        setTimeout(() => chatDisplay.scrollTop = chatDisplay.scrollHeight, 100);
        renderChatHistoryList(); // Perbarui status active
        closeSidebar();
    }

    function toggleChatFavorite(chatId) {
        if (allConversations[chatId]) {
            allConversations[chatId].isFavorite = !allConversations[chatId].isFavorite;
            saveConversations();
            renderChatHistoryList(); // Re-render to update icon and sorting
            // Also update the main header favorite button if it's the current chat
            if (chatId === currentConversationId) {
                if (allConversations[chatId].isFavorite) {
                    currentChatFavoriteBtn.querySelector('i').classList.remove('far');
                    currentChatFavoriteBtn.querySelector('i').classList.add('fas');
                } else {
                    currentChatFavoriteBtn.querySelector('i').classList.remove('fas');
                    currentChatFavoriteBtn.querySelector('i').classList.add('far');
                }
            }
        }
    }

    function generateChatTitle(history) {
        if (history.length > 0) {
            const firstUserMessage = history.find(msg => msg.role === 'user');
            if (firstUserMessage) {
                const title = firstUserMessage.content.substring(0, 50);
                return title.length === 50 ? title + '...' : title;
            }
        }
        return "New Chat";
    }

    function clearCurrentChat() {
        if (!currentConversationId || conversationHistory.length === 0) {
            alert('There is no active chat to clear.');
            return;
        }

        if (confirm('Are you sure you want to clear the current chat? This cannot be undone.')) {
            delete allConversations[currentConversationId];
            saveConversations();
            createNewChat(); // Start a fresh chat
        }
    }

    function clearAllHistory() {
        if (confirm('Are you sure you want to delete ALL chat history? This action cannot be undone.')) {
            allConversations = {};
            localStorage.removeItem('novariaConversations');
            localStorage.removeItem('lastActiveChatId');
            createNewChat(); // Start a fresh chat
        }
    }

    function openSidebar() {
        appContainer.classList.add('sidebar-open');
        sidebarOverlay.classList.add('active');
    }

    function closeSidebar() {
        appContainer.classList.remove('sidebar-open');
        sidebarOverlay.classList.remove('active');
    }

    // --- FUNGSI MODEL SELECTION ---
    function setSelectedModel(modelValue, updateFastSmartToggle = true) {
        currentSelectedModelValue = modelValue;
        localStorage.setItem('selectedAiModel', currentSelectedModelValue);
        const selectedModel = availableModels.find(m => m.value === currentSelectedModelValue);
        if (selectedModel) {
            selectedModelName.textContent = selectedModel.label;
            if (updateFastSmartToggle) {
                fastButton.classList.remove('active');
                smartButton.classList.remove('active');
                if (selectedModel.type === 'fast') {
                    fastButton.classList.add('active');
                } else if (selectedModel.type === 'smart') {
                    smartButton.classList.add('active');
                }
            }
        } else {
            setSelectedModel(availableModels[0].value, updateFastSmartToggle);
        }
    }

    function openModelSelectModal() {
        modelSelectModal.classList.add('active');
        document.body.style.overflow = 'hidden';
        populateModelOptions();
    }

    function closeModelSelectModal() {
        modelSelectModal.classList.remove('active');
        document.body.style.overflow = '';
    }

    function populateModelOptions() {
        modelOptionsContainer.innerHTML = '';
        availableModels.forEach(model => {
            const optionItem = document.createElement('div');
            optionItem.classList.add('model-option-item');
            optionItem.dataset.modelValue = model.value;
            optionItem.innerHTML = `
                <span>${model.label}</span>
                <i class="fas fa-check"></i>
            `;

            if (model.value === currentSelectedModelValue) {
                optionItem.classList.add('selected');
            }

            optionItem.addEventListener('click', () => {
                setSelectedModel(model.value, true);
                setTimeout(closeModelSelectModal, 200);
            });
            modelOptionsContainer.appendChild(optionItem);
        });
    }

    const savedModelValue = localStorage.getItem('selectedAiModel');
    const defaultModel = availableModels.find(m => m.value === savedModelValue) || availableModels[0];
    setSelectedModel(defaultModel.value, true);

    // --- Event Listeners untuk UI baru ---
    sidebarToggleBtn.addEventListener('click', openSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar);
    sidebarNewChatBtn.addEventListener('click', createNewChat);
    headerNewChatBtn.addEventListener('click', createNewChat);
    logoutButtonSidebar.addEventListener('click', (event) => {
        event.preventDefault();
        if (confirm('Are you sure you want to log out?')) {
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('novaUser');
            localStorage.removeItem('novariaConversations'); // Clear all chat data on logout
            localStorage.removeItem('lastActiveChatId'); // Clear last active chat ID
            window.location.href = 'login.html';
        }
    });

    novariaTitleDropdown.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent document click from closing immediately
        novariaDropdownMenu.classList.toggle('show');
        novariaTitleDropdown.classList.toggle('active'); // Untuk rotasi panah
    });

    document.addEventListener('click', (e) => {
        if (!novariaTitleDropdown.contains(e.target) && !novariaDropdownMenu.contains(e.target)) {
            novariaDropdownMenu.classList.remove('show');
            novariaTitleDropdown.classList.remove('active');
        }
        if (!modelSelectModal.contains(e.target) && modelSelectModal.classList.contains('active')) {
             closeModelSelectModal();
        }
    });

    exportChatBtn.addEventListener('click', () => {
        const currentChat = allConversations[currentConversationId];
        if (!currentChat) {
            alert('No active chat to export.');
            return;
        }
        const chatText = currentChat.messages.map(msg => {
            let content = msg.content;
            // Decode HTML entities if present (from highlight.js)
            const doc = new DOMParser().parseFromString(content, 'text/html');
            content = doc.documentElement.textContent; // Get plain text

            return `${msg.role === 'user' ? 'You' : 'Novaria'}: ${content}`;
        }).join('\n\n');

        const blob = new Blob([chatText], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Novaria_Chat_${currentChat.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        novariaDropdownMenu.classList.remove('show');
    });

    shareChatBtn.addEventListener('click', () => {
        const currentChat = allConversations[currentConversationId];
        if (!currentChat) {
            alert('No active chat to share.');
            return;
        }
        const chatText = currentChat.messages.map(msg => {
            let content = msg.content;
            // Decode HTML entities if present (from highlight.js)
            const doc = new DOMParser().parseFromString(content, 'text/html');
            content = doc.documentElement.textContent; // Get plain text
            return `${msg.role === 'user' ? 'You' : 'Novaria'}: ${content}`;
        }).join('\n\n');

        if (navigator.share) {
            navigator.share({
                title: currentChat.title || 'Novaria Chat',
                text: chatText,
                url: window.location.href, // Or a permalink to the chat if available
            }).catch((error) => console.log('Error sharing', error));
        } else {
            navigator.clipboard.writeText(chatText).then(() => {
                alert('Chat content copied to clipboard!');
            }).catch(err => {
                console.error('Failed to copy chat: ', err);
            });
        }
        novariaDropdownMenu.classList.remove('show');
    });

    clearCurrentChatBtn.addEventListener('click', () => {
        clearCurrentChat();
        novariaDropdownMenu.classList.remove('show');
    });

    clearAllHistoryBtn.addEventListener('click', () => {
        clearAllHistory();
        novariaDropdownMenu.classList.remove('show');
    });

    currentChatFavoriteBtn.addEventListener('click', () => {
        if (currentConversationId) {
            toggleChatFavorite(currentConversationId);
        } else {
            alert('Start a chat first to mark it as favorite!');
        }
    });

    if (customModelSelectorTrigger) {
        customModelSelectorTrigger.addEventListener('click', openModelSelectModal);
    }
    if (closeModelModalButton) {
        closeModelModalButton.addEventListener('click', closeModelSelectModal);
    }
    if (modelSelectModal) {
        modelSelectModal.addEventListener('click', (event) => {
            if (event.target === modelSelectModal) {
                closeModelSelectModal();
            }
        });
    }

    if (fastButton) {
        fastButton.addEventListener('click', () => {
            setSelectedModel('gemini-2.5-flash', false);
            fastButton.classList.add('active');
            smartButton.classList.remove('active');
        });
    }
    if (smartButton) {
        smartButton.addEventListener('click', () => {
            setSelectedModel('gemini-2.0-flash', false);
            smartButton.classList.add('active');
            fastButton.classList.remove('active');
        });
    }

    // --- INITIAL LOAD ---
    loadConversations();
    // If no active chat, create one
    if (Object.keys(allConversations).length === 0) {
        createNewChat();
    } else {
        // Load the most recent chat if no specific one is set or the last one exists
        const lastChatId = localStorage.getItem('lastActiveChatId');
        if (lastChatId && allConversations[lastChatId]) {
            loadChat(lastChatId);
        } else {
            // Find the most recent non-favorite chat, or any if none
            const sortedByTime = Object.values(allConversations).sort((a,b) => b.timestamp - a.timestamp);
            if (sortedByTime.length > 0) {
                loadChat(sortedByTime[0].id);
            } else {
                createNewChat();
            }
        }
    }


    // --- CHAT DISPLAY & SCROLLING ---
    function checkScrollable() {
        setTimeout(() => {
            if (!chatDisplay) return;
            const isScrollable = chatDisplay.scrollHeight > chatDisplay.clientHeight;
            const isAtBottom = chatDisplay.scrollHeight - chatDisplay.scrollTop <= chatDisplay.clientHeight + 5;
            if (isScrollable && !isAtBottom) {
                chatDisplay.classList.add('has-scroll-fade');
            } else {
                chatDisplay.classList.remove('has-scroll-fade');
            }
        }, 100);
    }
    if (chatDisplay) {
      chatDisplay.addEventListener('scroll', checkScrollable);
    }

    // --- INPUT AREA FUNCTIONALITY ---
    messageInput.addEventListener('input', () => {
        autoResizeTextarea();
        // Sembunyikan pesan awal jika user mulai mengetik
        if (messageInput.value.trim() !== '' || attachedFiles.length > 0) {
            initialGreeting.classList.add('hidden');
        } else {
            // Tampilkan kembali initial greeting jika input kosong dan tidak ada file
            if (conversationHistory.length === 0) {
                initialGreeting.classList.remove('hidden');
            }
        }
    });

    function autoResizeTextarea() {
        messageInput.style.height = 'auto';
        let scrollHeight = messageInput.scrollHeight;
        const maxHeight = 120;
        messageInput.style.height = Math.min(scrollHeight, maxHeight) + 'px';
        updateInputAreaAppearance();
    }
    messageInput.addEventListener('input', autoResizeTextarea);
    autoResizeTextarea();

    // Function to stop any ongoing typing animation
    function stopCurrentTypingAnimation() {
        if (currentTypingAnimationInterval) {
            clearInterval(currentTypingAnimationInterval);
            currentTypingAnimationInterval = null;
        }
        if (currentTypingAnimationTimeout) {
            clearTimeout(currentTypingAnimationTimeout);
            currentTypingAnimationTimeout = null;
        }
    }

    function parseMarkdownToHtml(text) {
        // Handle code blocks first
        const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
        let html = text.replace(codeBlockRegex, (match, language, code) => {
            const lang = language || 'text';
            // Escape HTML in code content to prevent XSS and ensure proper display
            const escapedCode = code.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `<div class="code-block">
                        <div class="code-header">
                            <span class="language-tag">${lang}</span>
                            <button class="copy-code-btn" title="Copy code" onclick="copyCode(this)">
                                <i class="fas fa-copy"></i>
                                <span>Copy</span>
                            </button>
                        </div>
                        <pre><code class="language-${lang}">${escapedCode}</code></pre>
                    </div>`;
        });

        // Handle other Markdown (bold, italic, strikethrough, links)
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>'); // Bold
        html = html.replace(/__(.*?)__/g, '<strong>$1</strong>'); // Bold
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>'); // Italic
        html = html.replace(/_(.*?)_/g, '<em>$1</em>'); // Italic
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>'); // Strikethrough
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>'); // Inline code
        html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>'); // Links

        // Handle basic lists (unordered and ordered)
        // This is a simple approach and might not handle complex nested lists perfectly
        html = html.replace(/^\s*[\*\-]\s*(.*)$/gm, '<li>$1</li>'); // Unordered list items
        html = html.replace(/^\s*\d+\.\s*(.*)$/gm, '<li>$1</li>'); // Ordered list items

        // Wrap list items in ul/ol tags
        // This needs to be done carefully to avoid wrapping non-list items
        html = html.replace(/(<li>.*?<\/li>(\n<li>.*?<\/li>)*)/g, (match) => {
            if (match.startsWith('<li>')) { // Simple check to ensure it's a list group
                const firstChar = match.trim().charAt(0);
                if (match.includes('&#x2022;') || match.includes('*') || match.includes('-')) { // Check for bullet points indicators
                    return `<ul>${match}</ul>`;
                } else if (match.match(/^\d+\./)) { // Check for ordered list indicators
                    return `<ol>${match}</ol>`;
                }
            }
            return match;
        });

        // Handle headings (basic)
        html = html.replace(/^###\s*(.*)$/gm, '<h3>$1</h3>');
        html = html.replace(/^##\s*(.*)$/gm, '<h2>$1</h2>');
        html = html.replace(/^#\s*(.*)$/gm, '<h1>$1</h1>');

        // Convert double newlines to <p> tags, single newlines to <br> for plain text
        // This is a simplistic approach; a full markdown parser would be more robust.
        // It should run after block-level elements are handled.
        const lines = html.split('\n');
        let finalHtml = '';
        let inBlock = false; // To track if we are inside a code block or other specific block element

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // Detect start/end of block elements (simplified)
            if (line.includes('<pre>') || line.includes('<div class="code-block"')) {
                inBlock = true;
            } else if (line.includes('</pre>') || line.includes('</div>')) {
                inBlock = false;
            }

            if (inBlock || line.match(/<\/?(h[1-6]|ul|ol|li|p|div|img|a|strong|em|del|button|code)/i)) {
                // If inside a block element or the line itself is a block, just append it
                finalHtml += line + '\n';
            } else if (line.trim() === '' && lines[i+1]?.trim() === '') {
                // Double newline for paragraph break
                finalHtml += '<p></p>';
                i++; // Skip next empty line
            } else if (line.trim() !== '') {
                // Single newline for line break in regular text
                finalHtml += line + '<br>';
            }
            // If empty line but next is not empty, just append it (for proper paragraph spacing by CSS)
            else {
                 finalHtml += '\n';
            }
        }

        // Clean up any remaining extra <br> at the end of elements where they don't belong
        finalHtml = finalHtml.replace(/<br>\s*<\/(h[1-6]|ul|ol|li|p|div)>/g, '</$1>');
        finalHtml = finalHtml.replace(/<br>\s*<pre>/g, '<pre>');


        return finalHtml;
    }


    // New: Function to type out message content
    function typeMessage(element, textContent, delay = 5) {
        let i = 0;
        element.innerHTML = ''; // Clear content (use innerHTML for HTML-like content, not just text)

        stopCurrentTypingAnimation(); // Pastikan tidak ada typing lain yang berjalan

        currentTypingAnimationInterval = setInterval(() => {
            if (i < textContent.length) {
                // If it's a newline, add <br>
                if (textContent.charAt(i) === '\n') {
                    element.innerHTML += '<br>';
                } else {
                    element.innerHTML += textContent.charAt(i);
                }
                i++;
            } else {
                stopCurrentTypingAnimation(); // Stop animation when done
                if (chatDisplay) chatDisplay.scrollTop = chatDisplay.scrollHeight;
                checkScrollable(); // Final scroll and fade check
            }
            if (chatDisplay) chatDisplay.scrollTop = chatDisplay.scrollHeight; // Keep scrolling during typing
        }, delay);
    }

    // === Fungsi addChatMessage yang diperbarui untuk Multi-modal Output dan Typing Effect ===
    function addChatMessage(content, sender = 'user', imageUrl = null, modelTag = "Novaria", aiResponseRawText = null) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('chat-message', sender === 'user' ? 'user-message' : 'ai-message');
        messageElement.style.opacity = '0';
        messageElement.style.transform = 'translateY(15px)';

        if (sender === 'user') {
            messageElement.textContent = content;
            conversationHistory.push({ role: 'user', content: content });
        } else {
            stopCurrentTypingAnimation(); // Stop any previous typing when a new AI response starts

            const aiHeader = document.createElement('div');
            aiHeader.classList.add('ai-message-header');

            const aiLogoImg = document.createElement('img');
            aiLogoImg.src = 'logo.png';
            aiLogoImg.alt = 'Novaria Logo';
            aiLogoImg.classList.add('ai-logo');
            aiHeader.appendChild(aiLogoImg);

            const aiNameSpan = document.createElement('span');
            aiNameSpan.classList.add('ai-name');
            aiNameSpan.textContent = 'Novaria';
            aiHeader.appendChild(aiNameSpan);

            const aiModelTagSpan = document.createElement('span');
            aiModelTagSpan.classList.add('ai-model-tag');
            const actualModelLabel = availableModels.find(m => m.value === modelTag)?.label || modelTag;
            aiModelTagSpan.textContent = actualModelLabel;
            aiHeader.appendChild(aiModelTagSpan);

            messageElement.appendChild(aiHeader);

            const aiContentContainer = document.createElement('div');
            aiContentContainer.classList.add('ai-message-content');
            messageElement.appendChild(aiContentContainer);

            // Add image if available
            if (imageUrl) {
                const imgElement = document.createElement('img');
                imgElement.src = imageUrl;
                imgElement.alt = "Generated image";
                imgElement.classList.add('ai-generated-image');
                aiContentContainer.appendChild(imgElement);
                if (content.trim()) { // Add spacer only if there's text content after the image
                    const spacer = document.createElement('div');
                    spacer.style.height = '10px';
                    aiContentContainer.appendChild(spacer);
                }
            }

            // If it's an error message or not a raw AI response, just set text content directly.
            // This prevents typing animation on error messages.
            if (content.startsWith('<span') || !aiResponseRawText) { // Check for span indicating formatted error
                aiContentContainer.innerHTML = content;
                addAiMessageActions(messageElement);
                clearAttachedFiles();
                checkScrollable();
            } else {
                // Process markdown for code blocks and other formatting BEFORE typing
                const segments = [];
                const codeBlockRegex = /(```(\w+)?\n([\s\S]*?)```)/g; // Capture full code block
                let lastIndex = 0;

                aiResponseRawText.replace(codeBlockRegex, (match, fullBlock, language, code, offset) => {
                    // Add preceding plain text segment
                    if (offset > lastIndex) {
                        segments.push({ type: 'text', content: aiResponseRawText.substring(lastIndex, offset) });
                    }
                    // Add code block segment
                    segments.push({ type: 'code', language: language || 'text', content: code.trim(), raw: fullBlock });
                    lastIndex = offset + match.length;
                });

                // Add any remaining plain text
                if (lastIndex < aiResponseRawText.length) {
                    segments.push({ type: 'text', content: aiResponseRawText.substring(lastIndex) });
                }

                let segmentIndex = 0;
                const typingSpeed = 5;

                const processNextSegment = () => {
                    if (segmentIndex < segments.length) {
                        const segment = segments[segmentIndex];
                        if (segment.type === 'text') {
                            const tempSpan = document.createElement('span'); // Use a temporary span for typing
                            aiContentContainer.appendChild(tempSpan);
                            typeMessage(tempSpan, segment.content, typingSpeed);
                            currentTypingAnimationTimeout = setTimeout(() => { // Schedule next segment after current text is typed
                                segmentIndex++;
                                processNextSegment(); // Move to next segment
                            }, segment.content.length * typingSpeed);
                        } else if (segment.type === 'code') {
                            // Directly append code block HTML
                            const codeHtml = parseMarkdownToHtml(segment.raw); // Use parser for code blocks
                            aiContentContainer.insertAdjacentHTML('beforeend', codeHtml);
                            const newCodeBlock = aiContentContainer.lastElementChild;
                            if (newCodeBlock && newCodeBlock.querySelector('code')) {
                                hljs.highlightElement(newCodeBlock.querySelector('code'));
                            }
                            segmentIndex++;
                            processNextSegment(); // Immediately process next segment after code block
                        }
                    } else {
                        // All segments processed, add actions
                        addAiMessageActions(messageElement);
                        clearAttachedFiles();
                        checkScrollable();
                    }
                    if (chatDisplay) chatDisplay.scrollTop = chatDisplay.scrollHeight;
                };
                processNextSegment(); // Start processing segments
                conversationHistory.push({ role: 'assistant', content: aiResponseRawText, modelUsed: modelTag, imageUrl: imageUrl }); // Store the full raw text in history
            }
        }

        // Limit history length (for active conversation only)
        if (conversationHistory.length > MAX_HISTORY_DISPLAY_LENGTH * 2) {
            conversationHistory = conversationHistory.slice(conversationHistory.length - (MAX_HISTORY_DISPLAY_LENGTH * 2));
        }

        // Append to chat display
        if (chatDisplay && thinkingIndicator) {
            chatDisplay.insertBefore(messageElement, thinkingIndicator);
        } else if (chatDisplay) {
            chatDisplay.appendChild(messageElement);
        }

        setTimeout(() => {
            messageElement.style.opacity = '1';
            messageElement.style.transform = 'translateY(0)';
        }, 10);

        setTimeout(() => {
            if (chatDisplay) chatDisplay.scrollTop = chatDisplay.scrollHeight;
            checkScrollable();
        }, 50);

        // Update conversation in allConversations object
        if (currentConversationId) {
             allConversations[currentConversationId] = {
                id: currentConversationId,
                messages: conversationHistory,
                isFavorite: allConversations[currentConversationId]?.isFavorite || false,
                title: allConversations[currentConversationId]?.title || generateChatTitle(conversationHistory),
                timestamp: Date.now()
            };
            saveConversations();
            renderChatHistoryList(); // Update sidebar list (e.g., title change)
        }
    }


    // Function to get the full raw text from an AI message element
    function getFullRawContent(messageEl) {
        let fullContent = '';
        const contentContainer = messageEl.querySelector('.ai-message-content');
        if (!contentContainer) return '';

        contentContainer.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                fullContent += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.tagName === 'SPAN') { // For typed out text
                    fullContent += node.textContent;
                }
                else if (node.tagName === 'IMG') {
                    fullContent += `\n[Image: ${node.alt} - URL: ${node.src}]\n`;
                } else if (node.classList.contains('code-block')) {
                    const langTag = node.querySelector('.language-tag');
                    const lang = langTag ? langTag.textContent.toLowerCase() : 'text';
                    const code = node.querySelector('code').textContent;
                    fullContent += `\n\n\`\`\`${lang}\n${code}\n\`\`\``;
                } else { // For other HTML elements (strong, em, a, etc.)
                    fullContent += node.textContent;
                }
            }
        });
        return fullContent.trim();
    }

    function addAiMessageActions(aiMessageElement) {
        const actionsContainer = document.createElement('div');
        actionsContainer.classList.add('ai-message-actions');

        const buttons = [
            { name: 'copy', icon: '<i class="fas fa-copy"></i>', title: 'Copy Response', action: (buttonEl, _messageEl) => { const fullContent = getFullRawContent(aiMessageElement); navigator.clipboard.writeText(fullContent).then(() => { buttonEl.innerHTML = '<i class="fas fa-check" style="color: #66bb6a;"></i>'; buttonEl.title = 'Copied!'; setTimeout(() => { buttonEl.innerHTML = buttons[0].icon; buttonEl.title = buttons[0].title; }, 2000); }).catch(err => { console.error('Failed to copy: ', err); }); } },
            { name: 'speak', icon: '<i class="fas fa-volume-up"></i>', title: 'Read Aloud', action: (buttonEl, _messageEl) => { const textToSpeak = getFullRawContent(aiMessageElement); const speechApi = window.speechSynthesis; if (speechApi.speaking) { speechApi.cancel(); return; } if (textToSpeak) { const utterance = new SpeechSynthesisUtterance(textToSpeak); utterance.lang = 'en-US'; // Or 'id-ID' for Indonesian
            utterance.onend = () => { buttonEl.classList.remove('pulsing'); buttonEl.innerHTML = buttons[1].icon; };
            buttonEl.classList.add('pulsing'); buttonEl.innerHTML = '<i class="fas fa-volume-up"></i>';
            speechApi.speak(utterance); } } },
            { name: 'like', icon: '<i class="fas fa-thumbs-up"></i>', title: 'Like', action: (buttonEl) => { buttonEl.classList.toggle('liked'); } },
            { name: 'regenerate', icon: '<i class="fas fa-redo-alt"></i>', title: 'Regenerate', action: (buttonEl, msgEl) => {
                stopCurrentTypingAnimation();
                buttonEl.classList.add('rotating');
                buttonEl.disabled = true;
                buttonEl.style.cursor = 'wait';

                // Find the last user message in the current conversation history
                const lastUserMessageObj = conversationHistory.slice().reverse().find(msg => msg.role === 'user');
                if (lastUserMessageObj) {
                    msgEl.remove(); // Remove the AI message being regenerated
                    // Remove the last AI response from history (it's the one being regenerated)
                    if (conversationHistory.length > 0 && conversationHistory[conversationHistory.length - 1].role === 'assistant') {
                        conversationHistory.pop();
                    }
                    generateRealAIResponse(lastUserMessageObj.content, attachedFiles, true); // Pass true for regenerate
                } else {
                    buttonEl.classList.remove('rotating');
                    buttonEl.disabled = false;
                    buttonEl.style.cursor = 'pointer';
                    alert('Tidak ada pesan pengguna sebelumnya untuk meregenerasi respons.');
                }
            } },
            { name: 'share-msg', icon: '<i class="fas fa-share-alt"></i>', title: 'Share Message', action: (buttonEl, _messageEl) => { const fullContent = getFullRawContent(aiMessageElement); if (navigator.share) { navigator.share({ title: 'Novaria Message', text: fullContent, }).catch((error) => console.log('Error sharing', error)); } else { navigator.clipboard.writeText(fullContent).then(() => { buttonEl.title = "Not supported, copied instead!"; setTimeout(() => { buttonEl.title = buttons[4].title; }, 2000); }); } } }
        ];
        buttons.forEach((btnInfo) => {
            const button = document.createElement('button');
            button.classList.add('ai-action-btn');
            button.title = btnInfo.title;
            button.innerHTML = btnInfo.icon;
            button.addEventListener('click', () => btnInfo.action(button, aiMessageElement));
            actionsContainer.appendChild(button);
        });
        aiMessageElement.appendChild(actionsContainer);
        setTimeout(() => { if (chatDisplay) chatDisplay.scrollTop = chatDisplay.scrollHeight; }, 0);
    }

    async function getBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result.split(',')[1]);
            reader.onerror = error => reject(error);
        });
    }

    async function generateRealAIResponse(userMessage, files = [], isRegenerate = false) {
        if (thinkingIndicator) {
            thinkingIndicator.classList.remove('hidden');
            thinkingIndicator.style.opacity = '1';
        }
        setTimeout(() => {
            if (chatDisplay) chatDisplay.scrollTop = chatDisplay.scrollHeight;
            checkScrollable();
        }, 0);

        try {
            const filesAsBase64 = await Promise.all(files.map(async file => {
                const base64Data = await getBase64(file);
                return {
                    data: base64Data,
                    mimeType: file.type
                };
            }));

            const payload = {
                userMessage: userMessage,
                // Only send recent history to keep payload size down and focus conversation
                conversationHistory: conversationHistory.slice(Math.max(0, conversationHistory.length - MAX_HISTORY_DISPLAY_LENGTH * 2)),
                attachedFiles: filesAsBase64,
                selectedModel: currentSelectedModelValue,
                isRegenerate: isRegenerate
            };

            const response = await fetch('/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                let errorMessageToDisplay = `Terjadi kesalahan server: ${response.status}.`;
                try {
                    const errorData = await response.json();
                    errorMessageToDisplay = errorData.message || errorMessageToDisplay;
                } catch (jsonError) {
                    const plainTextError = await response.text();
                    errorMessageToDisplay = `Terjadi kesalahan server: ${response.status}. Detail: ${plainTextError.substring(0, 100)}... (bukan JSON)`;
                    console.error("Server returned non-JSON error:", plainTextError);
                }

                if (thinkingIndicator) {
                    thinkingIndicator.style.opacity = '0';
                    setTimeout(() => thinkingIndicator.classList.add('hidden'), 300);
                }
                addChatMessage(`<span>${errorMessageToDisplay}</span>`, 'ai');
                return;
            }

            const data = await response.json();
            const rawAiResponseText = data.text || '';
            const generatedImageUrl = data.imageUrl || null;
            const modelUsed = data.modelUsed || "Novaria";

            if (thinkingIndicator) thinkingIndicator.style.opacity = '0';
            setTimeout(() => {
                if (thinkingIndicator) thinkingIndicator.classList.add('hidden');

                let personalizedResponseText = rawAiResponseText;
                if (currentUser && currentUser.name) {
                    if (!rawAiResponseText.startsWith('<span')) { // Check if it's not an error message
                        const greeting = `Hii ${currentUser.givenName || currentUser.name.split(' ')[0]},\n\n`;
                        personalizedResponseText = greeting + rawAiResponseText;
                    }
                }
                addChatMessage(personalizedResponseText, 'ai', generatedImageUrl, modelUsed, rawAiResponseText);

                // Re-enable regenerate button if it was disabled
                const regenerateBtn = document.querySelector('.ai-action-btn.rotating');
                if (regenerateBtn) {
                    regenerateBtn.classList.remove('rotating');
                    regenerateBtn.disabled = false;
                    regenerateBtn.style.cursor = 'pointer';
                }

            }, 300);

        } catch (error) {
            console.error('Error fetching from /api/generate (network or unexpected):', error);
            if (thinkingIndicator) thinkingIndicator.style.opacity = '0';
            setTimeout(() => {
                if (thinkingIndicator) thinkingIndicator.classList.add('hidden');
                const genericErrorMessage = `Maaf, terjadi masalah koneksi atau server: ${error.message || 'Silakan coba lagi.'}`;
                addChatMessage(`<span>${genericErrorMessage}</span>`, 'ai');

                // Re-enable regenerate button if it was disabled
                const regenerateBtn = document.querySelector('.ai-action-btn.rotating');
                if (regenerateBtn) {
                    regenerateBtn.classList.remove('rotating');
                    regenerateBtn.disabled = false;
                    regenerateBtn.style.cursor = 'pointer';
                }
            }, 300);
        }
    }

    sendButton.addEventListener('click', () => {
        const message = messageInput.value.trim();
        if (message !== '' || attachedFiles.length > 0) {
            stopCurrentTypingAnimation();

            let finalPrompt = message;
            // Jika ada file dan pesan kosong, buat prompt default
            if (attachedFiles.length > 0 && message === '') {
                const fileNames = attachedFiles.map(f => f.name).join(', ');
                finalPrompt = `Harap menganalisis file-file ini: ${fileNames}`;
            } else if (attachedFiles.length > 0) {
                // Jika ada file dan pesan, tambahkan info file ke prompt
                const fileNames = attachedFiles.map(f => f.name).join(', ');
                finalPrompt = `${message} (Dilampirkan: ${fileNames})`;
            }

            initialGreeting.classList.add('hidden'); // Sembunyikan pesan awal setelah interaksi
            addChatMessage(messageInput.value.trim() || finalPrompt, 'user'); // Tampilkan pesan user asli atau prompt olahan jika hanya file
            generateRealAIResponse(finalPrompt, attachedFiles);

            messageInput.value = '';
            autoResizeTextarea();
        }
    });
    messageInput.addEventListener('keypress', (event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); sendButton.click(); } });

    // --- THEME TOGGLE ---
    const savedTheme = localStorage.getItem('novaria_theme');
    const hljsLink = document.querySelector('link[href*="highlight.js"]'); // Get the highlight.js stylesheet

    function applyTheme(isLightMode) {
        if (isLightMode) {
            document.body.classList.add('light-mode');
            localStorage.setItem('novaria_theme', 'light-mode');
            if (hljsLink) hljsLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-light.min.css";
        } else {
            document.body.classList.remove('light-mode');
            localStorage.setItem('novaria_theme', 'dark-mode');
            if (hljsLink) hljsLink.href = "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/atom-one-dark.min.css";
        }
        themeToggleMain.checked = isLightMode;
        // Re-highlight all code blocks on theme change
        document.querySelectorAll('pre code').forEach((block) => {
            hljs.highlightElement(block);
        });
    }

    if (savedTheme === 'light-mode') {
        applyTheme(true);
    } else {
        applyTheme(false);
    }
    themeToggleMain.addEventListener('change', () => applyTheme(themeToggleMain.checked));


    // --- RIPPLE EFFECTS ---
    function setupRippleEffects() {
        const clickableElements = document.querySelectorAll('.btn-circle, .sidebar .new-chat-btn, .sidebar-item, .chat-item, .ai-action-btn, .copy-code-btn, .remove-chip-btn, .custom-selector-trigger, .model-option-item, .toggle-button, .dropdown-item, .favorite-toggle-btn, .new-chat-btn-header, .sidebar-toggle-btn, .logout-btn');
        clickableElements.forEach(element => {
            const oldHandler = element._rippleHandler;
            if (oldHandler) {
                element.removeEventListener('click', oldHandler);
            }
            const newHandler = function (e) {
                if (e.target.tagName === 'A' || e.target.closest('a') || e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                    return; // Don't add ripple to links or inputs directly
                }
                const ripple = document.createElement('span');
                ripple.classList.add('ripple');
                this.appendChild(ripple);
                const rect = this.getBoundingClientRect();
                const size = Math.max(rect.width, rect.height);
                const x = e.clientX - rect.left - (size / 2);
                const y = e.clientY - rect.top - (size / 2);
                ripple.style.width = ripple.style.height = `${size}px`;
                ripple.style.left = `${x}px`;
                ripple.style.top = `${y}px`;
                ripple.addEventListener('animationend', () => {
                    ripple.remove();
                });
            };
            element.addEventListener('click', newHandler);
            element._rippleHandler = newHandler;
        });
    }
    setupRippleEffects();
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                let needsRippleSetup = false;
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === 1) { // Element node
                        // Check if the added node itself is a clickable element
                        if (node.matches && (node.matches('.ai-action-btn') || node.matches('.copy-code-btn') || node.matches('.remove-chip-btn') || node.matches('.sidebar-item') || node.matches('.model-option-item') || node.matches('.toggle-button') || node.matches('.chat-item') || node.matches('.dropdown-item') || node.matches('.sidebar .new-chat-btn') || node.matches('.logout-btn'))) {
                            needsRippleSetup = true;
                        }
                        // Check if the added node contains clickable elements
                        if (node.querySelector && (node.querySelector('.ai-action-btn') || node.querySelector('.copy-code-btn') || node.querySelector('.remove-chip-btn') || node.querySelector('.sidebar-item') || node.querySelector('.model-option-item') || node.querySelector('.toggle-button') || node.querySelector('.chat-item') || node.querySelector('.dropdown-item') || node.querySelector('.sidebar .new-chat-btn') || node.querySelector('.logout-btn'))) {
                            needsRippleSetup = true;
                        }
                    }
                });
                if (needsRippleSetup) {
                    setupRippleEffects();
                }
            }
        });
    });
    if (chatDisplay) observer.observe(chatDisplay, { childList: true, subtree: true });
    if (fileChipContainer) observer.observe(fileChipContainer, { childList: true, subtree: true });
    if (chatHistoryList) observer.observe(chatHistoryList, { childList: true, subtree: true }); // Observe sidebar history list
    if (modelOptionsContainer) observer.observe(modelOptionsContainer, { childList: true, subtree: true });
    const newInputWrapperContainer = document.querySelector('.new-input-wrapper-container'); // Ambil di sini
    if (newInputWrapperContainer) observer.observe(newInputWrapperContainer, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });


    // --- INPUT AREA APPEARANCE MANAGEMENT ---
    function updateInputAreaAppearance() {
        if (!bottomChatArea) return;

        const totalBottomSpace = bottomChatArea.offsetHeight + 15 + 30; // 15 for gap + 30 for disclaimer
        mainContent.style.paddingBottom = `${totalBottomSpace}px`;

        if (chatDisplay) {
            const isAtBottom = chatDisplay.scrollHeight - chatDisplay.scrollTop <= chatDisplay.clientHeight + 50;
            if (isAtBottom) {
                chatDisplay.scrollTop = chatDisplay.scrollHeight;
            }
        }
    }

    const resizeObserverForBottomArea = new ResizeObserver(() => {
        updateInputAreaAppearance();
    });
    if (bottomChatArea) {
        resizeObserverForBottomArea.observe(bottomChatArea);
    }
    messageInput.addEventListener('input', updateInputAreaAppearance);
    messageInput.addEventListener('blur', updateInputAreaAppearance);
    messageInput.addEventListener('focus', updateInputAreaAppearance);


    // --- FILE ATTACHMENT ---
    plusButton.addEventListener('click', () => { fileInput.click(); });

    function displayFileChipItem(file) {
        const chipItem = document.createElement('div');
        chipItem.classList.add('file-chip-item');
        chipItem.dataset.fileName = file.name;
        chipItem.dataset.fileSize = file.size; // Use size for better uniqueness

        const fileIcon = document.createElement('i');
        fileIcon.classList.add('file-icon');
        if (file.type.startsWith('image/')) {
            fileIcon.classList.add('fas', 'fa-image');
        } else if (file.type.startsWith('video/')) {
            fileIcon.classList.add('fas', 'fa-video');
        } else if (file.type.startsWith('audio/')) {
            fileIcon.classList.add('fas', 'fa-volume-up');
        } else if (file.type === 'application/pdf') {
            fileIcon.classList.add('fas', 'fa-file-pdf');
        } else if (file.type.includes('word')) {
            fileIcon.classList.add('fas', 'fa-file-word');
        } else if (file.type.includes('excel') || file.type.includes('spreadsheet')) {
            fileIcon.classList.add('fas', 'fa-file-excel');
        } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
            fileIcon.classList.add('fas', 'fa-file-powerpoint');
        } else if (file.type.includes('text')) {
            fileIcon.classList.add('fas', 'fa-file-alt');
        } else {
            fileIcon.classList.add('fas', 'fa-file');
        }
        chipItem.appendChild(fileIcon);

        const fileDetails = document.createElement('div');
        fileDetails.classList.add('file-details');

        const fileNamePreview = document.createElement('span');
        fileNamePreview.classList.add('file-name-preview');
        const maxNameDisplayLength = 10;
        const fileNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
        const fileExt = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
        fileNamePreview.textContent = fileNameWithoutExt.length > maxNameDisplayLength ?
                                    fileNameWithoutExt.substring(0, maxNameDisplayLength) + "..." + fileExt :
                                    file.name;
        fileNamePreview.title = file.name;
        fileDetails.appendChild(fileNamePreview);

        const fileSizePreview = document.createElement('span');
        fileSizePreview.classList.add('file-size-preview');
        fileSizePreview.textContent = formatFileSize(file.size);
        fileDetails.appendChild(fileSizePreview);
        chipItem.appendChild(fileDetails);

        const removeButton = document.createElement('button');
        removeButton.classList.add('remove-chip-btn');
        removeButton.innerHTML = '&times;';
        removeButton.title = `Remove ${file.name}`;
        removeButton.addEventListener('click', (event) => {
            event.stopPropagation();
            removeAttachedFile(file.name, file.size);
        });
        chipItem.appendChild(removeButton);

        fileChipContainer.appendChild(chipItem);
        setTimeout(() => chipItem.classList.add('visible'), 10);

        if (fileChipContainer.children.length > 0) {
            fileChipsArea.classList.remove('hidden'); // Show the area
            fileChipContainer.scrollLeft = fileChipContainer.scrollWidth;
        }
        updateInputAreaAppearance();
    }

    function removeAttachedFile(fileName, fileSize) {
        attachedFiles = attachedFiles.filter(file => !(file.name === fileName && file.size === fileSize));
        const fileItemToRemove = fileChipContainer.querySelector(
            `.file-chip-item[data-file-name="${CSS.escape(fileName)}"][data-file-size="${fileSize}"]`
        );
        if (fileItemToRemove) {
            fileItemToRemove.classList.remove('visible');
            setTimeout(() => {
                fileItemToRemove.remove();
                if (fileChipContainer.children.length === 0) {
                    fileChipsArea.classList.add('hidden'); // Hide the area
                }
                updateInputAreaAppearance();
            }, 300);
        }
    }

    function clearAttachedFiles() {
        attachedFiles = [];
        fileChipContainer.innerHTML = '';
        fileChipsArea.classList.add('hidden'); // Hide the area by default
        updateInputAreaAppearance();
    }

    fileInput.addEventListener('change', (event) => {
        const filesToProcess = Array.from(event.target.files);
        if (filesToProcess.length === 0) return;

        let canAddCount = MAX_FILES_ALLOWED - attachedFiles.length;

        if (canAddCount <= 0) {
            alert(`You have reached the maximum of ${MAX_FILES_ALLOWED} files.`);
            fileInput.value = '';
            return;
        }

        const newValidFiles = [];

        for (const file of filesToProcess) {
            if (newValidFiles.length >= canAddCount) {
                alert(`You can only add ${canAddCount} more file(s). Some files were not added.`);
                break;
            }
            if (file.size > MAX_FILE_SIZE_BYTES_NEW) {
                alert(`File "${file.name}" (${formatFileSize(file.size)}) exceeds the maximum size of ${formatFileSize(MAX_FILE_SIZE_BYTES_NEW, 0)}.`);
                continue;
            }
            const isDuplicate = attachedFiles.some(f => f.name === file.name && f.size === file.size);
            if (isDuplicate) {
                alert(`File "${file.name}" is already attached.`);
                continue;
            }
            newValidFiles.push(file);
        }

        newValidFiles.forEach(file => {
            attachedFiles.push(file);
            displayFileChipItem(file);
        });

        fileInput.value = '';
    });

    // --- SPEECH RECOGNITION (Voice Input) ---
    const voiceInputButton = document.getElementById('voiceInputButtonBottom');
    let recognition;

    if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.lang = 'en-US'; // Adjust to 'id-ID' for Indonesian
        recognition.continuous = false;
        recognition.interimResults = true;
        let finalTranscript = '';
        recognition.onstart = () => { voiceInputButton.style.backgroundColor = 'red'; messageInput.placeholder = 'Listening...'; };
        recognition.onresult = (event) => { let interimTranscript = ''; for (let i = event.resultIndex; i < event.results.length; ++i) { if (event.results[i].isFinal) { finalTranscript += event.results[i][0].transcript; } else { interimTranscript += event.results[i][0].transcript; } } messageInput.value = finalTranscript + interimTranscript; autoResizeTextarea(); };
        recognition.onend = () => { voiceInputButton.style.backgroundColor = ''; if (finalTranscript.trim() !== '') { messageInput.value = finalTranscript.trim(); sendButton.click(); } if (messageInput.value.trim() === '') { messageInput.placeholder = "Ask me anything..."; } finalTranscript = ''; };
        recognition.onerror = (event) => { voiceInputButton.style.backgroundColor = ''; messageInput.placeholder = "Ask me anything..."; finalTranscript = ''; console.error('Speech recognition error: ', event.error); alert('Speech recognition error: ' + event.error); };
        voiceInputButton.addEventListener('click', () => { try { if (recognition && typeof recognition.stop === 'function' && recognition.recording) { recognition.stop(); } else { recognition.start(); } } catch (e) { if (recognition && typeof recognition.stop === 'function') recognition.stop(); } });
    } else {
        voiceInputButton.style.display = 'none'; // Hide if not supported
    }

    // --- GLOBAL UTILITY FUNCTIONS ---
    // Function global untuk copy code tetap ada
    window.copyCode = function(buttonElement) {
        const pre = buttonElement.closest('.code-block').querySelector('code');
        if (!pre) return;
        navigator.clipboard.writeText(pre.textContent).then(() => {
            const icon = buttonElement.querySelector('i');
            const originalClass = icon.className;
            const originalTitle = buttonElement.title;
            icon.className = 'fas fa-check';
            icon.style.color = '#66bb6a';
            buttonElement.title = 'Copied!';
            setTimeout(() => {
                icon.className = originalClass;
                icon.style.color = ''; // Reset to default
                buttonElement.title = originalTitle;
            }, 2000);
        }).catch(err => {
            console.error('Failed to copy code: ', err);
            const icon = buttonElement.querySelector('i');
            const originalClass = icon.className;
            const originalTitle = buttonElement.title;
            icon.className = 'fas fa-times';
            icon.style.color = '#ff4444';
            buttonElement.title = 'Error!';
            setTimeout(() => {
                icon.className = originalClass;
                icon.style.color = '';
                buttonElement.title = originalTitle;
            }, 2000);
        });
    };

    function formatFileSize(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
});
// --- END OF FILE script.js ---