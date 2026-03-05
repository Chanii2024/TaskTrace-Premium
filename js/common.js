// --- SHARED STATE ---
let selectedProjId = null;
let selectedMember = null;
let isTaskEdit = false;
let isProjectEdit = false;
let allProjects = {};
let currentTasks = {};
let currentMembers = {};
let currentSprints = {};

const statusOrder = ['NotStarted', 'InProgress', 'AlmostDone', 'InReview', 'Done'];
const statusMap = {
    'NotStarted': { label: 'Not Started', class: 'status-not-started' },
    'InProgress': { label: 'In Progress', class: 'status-in-progress' },
    'AlmostDone': { label: 'Almost Done', class: 'status-almost-done' },
    'InReview': { label: 'In Review', class: 'status-in-review' },
    'Done': { label: 'Done', class: 'status-done' }
};

let iconList = [
    'layers', 'briefcase', 'code', 'layout', 'database', 'user', 'users', 'settings', 'terminal', 'cpu',
    'globe', 'zap', 'activity', 'chart-bar', 'folder', 'calendar', 'clipboard-list', 'cloud', 'shield', 'rocket',
    'check-circle', 'star', 'heart', 'flag', 'map', 'camera', 'video', 'music', 'shopping-cart', 'package',
    'box', 'truck', 'wrench', 'anchor', 'award', 'book', 'bookmark', 'coffee', 'command', 'compass',
    'credit-card', 'feather', 'file-text', 'gift', 'hard-drive', 'image', 'key', 'link', 'mail', 'monitor'
];

function updateIconCount() {
    const badge = document.getElementById('icon-count-badge');
    if (badge) badge.innerText = `${iconList.length} Available`;
}

function refreshIcons() {
    if (window.lucide) {
        lucide.createIcons();
    }
}

// Initializer
function startCommon() {
    injectSharedUI();
    updateIconCount();
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startCommon);
} else {
    startCommon();
}

// --- NAVIGATION & LOGOUT ---
function logout() {
    localStorage.clear();
    const prefix = window.location.pathname.includes('/pages/') ? '../' : '';
    window.location.href = prefix + "index.html";
}

function backToProjects() {
    selectedProjId = null;
    selectedMember = null;
    localStorage.removeItem('tt_member');
    localStorage.removeItem('tt_project');
    const prefix = window.location.pathname.includes('/pages/') ? '../' : '';
    window.location.href = prefix + "index.html";
}

function backToMembers() {
    selectedMember = null;
    localStorage.removeItem('tt_member');
    if (selectedProjId) {
        const prefix = window.location.pathname.includes('/pages/') ? '' : 'pages/';
        window.location.href = prefix + "team.html";
    } else {
        backToProjects();
    }
}

function handleGlobalBack() {
    // Determine context based on URL or identifiable DOM elements
    if (document.getElementById('dashboard-view')) {
        backToMembers();
    } else if (document.getElementById('member-view')) {
        backToProjects();
    }
}

// --- UX HELPERS & MODALS ---
function hideLoader() {
    const loader = document.getElementById('loading-overlay');
    if (loader) {
        loader.style.opacity = '0';
        setTimeout(() => loader.classList.add('hidden'), 700);
    }
}

function showNotification(msg, isWarning = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    const toastMsg = document.getElementById('toast-msg');
    const iconBg = document.getElementById('toast-icon-bg');
    const icon = document.getElementById('toast-icon');

    toastMsg.innerText = msg;
    if (isWarning) {
        iconBg.classList.replace('bg-emerald-500/10', 'bg-red-500/10');
        icon.classList.replace('text-emerald-500', 'text-red-500');
        icon.setAttribute('data-lucide', 'alert-circle');
    } else {
        iconBg.classList.replace('bg-red-500/10', 'bg-emerald-500/10');
        icon.classList.replace('text-red-500', 'text-emerald-500');
        icon.setAttribute('data-lucide', 'check');
    }
    refreshIcons();
    toast.classList.remove('translate-y-32', 'opacity-0');
    setTimeout(() => toast.classList.add('translate-y-32', 'opacity-0'), 3500);
}

// Security Modal
let securityCallback = null;
function requestSecurityAuth(callback) {
    securityCallback = callback;
    const modal = document.getElementById('security-modal');
    if (!modal) return;

    modal.classList.remove('hidden');
    const tokenInput = document.getElementById('security-token');
    const title = modal.querySelector('h3');
    const sub = modal.querySelector('p');

    // Step 1: Password
    title.innerText = "Security Auth";
    sub.innerText = "Enter security password";
    tokenInput.placeholder = "PASSWORD";
    tokenInput.type = "password";
    tokenInput.value = '';
    tokenInput.focus();

    let isPasswordDone = false;

    const handleConfirm = () => {
        const val = tokenInput.value.trim().toLowerCase();

        if (!isPasswordDone) {
            if (val === 'delete-force') {
                isPasswordDone = true;
                tokenInput.value = '';
                tokenInput.type = "text";
                tokenInput.placeholder = "TOKEN";
                sub.innerText = "Type 'delete' to confirm";
                tokenInput.focus();
            } else {
                showNotification("Invalid Security Password", true);
            }
        } else {
            if (val === 'delete') {
                closeSecurityModal();
                if (securityCallback) securityCallback();
            } else {
                showNotification("Type 'delete' to confirm", true);
            }
        }
    };

    document.getElementById('security-confirm-btn').onclick = handleConfirm;
    tokenInput.onkeydown = (e) => {
        if (e.key === 'Enter') handleConfirm();
    };
}

function closeSecurityModal() {
    const modal = document.getElementById('security-modal');
    if (modal) {
        modal.classList.add('hidden');
        // Reset type for next open
        document.getElementById('security-token').type = "text";
    }
}

// Generic Modal (close function is shared)
function closeGenericModal() {
    const modal = document.getElementById('generic-modal');
    if (modal) modal.classList.add('hidden');
    document.body.style.overflow = 'auto';
}

// --- SHARED UI INJECTION (REDUNDANCY FIX) ---
function injectSharedUI() {
    // 0. Navigation Bar
    if (!document.querySelector('nav')) {
        const nav = document.createElement('nav');
        nav.className = 'fixed top-4 md:top-6 left-1/2 -translate-x-1/2 w-[calc(100%-24px)] md:w-[calc(100%-48px)] max-w-7xl glass z-50 px-4 md:px-8 py-3 md:py-4 flex md:grid md:grid-cols-3 items-center justify-between pointer-events-auto rounded-2xl md:rounded-[32px] border border-white/10 shadow-2xl backdrop-blur-xl transition-all duration-300';
        nav.innerHTML = `
            <div id="logo-container" class="flex items-center space-x-3 group cursor-pointer" onclick="backToProjects()">
                <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-purple-500/20">
                    <i data-lucide="activity" class="w-6 h-6 text-white"></i>
                </div>
                <div class="flex flex-col">
                    <span class="text-2xl font-black tracking-tighter">TaskTrace</span>
                </div>
            </div>
            <div id="breadcrumb-container" class="hidden md:flex justify-center items-center space-x-3 text-[12px] font-black uppercase tracking-[0.2em] pointer-events-auto">
                <!-- Breadcrumbs injected here -->
            </div>
            <div class="flex justify-end items-center space-x-4">
                <div id="nav-actions"></div>
                <div class="px-4 py-2 rounded-xl bg-white/5 border border-white/10 flex items-center space-x-2">
                    <span class="text-[9px] font-black uppercase tracking-widest text-cyan-400">v2.0</span>
                    <div class="w-1.5 h-1.5 rounded-full bg-cyan-500 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></div>
                </div>
            </div>
        `;
        document.body.appendChild(nav);
        // Apply custom header background image
        nav.style.backgroundImage = "url('images/header-bg.png')";
        nav.style.backgroundSize = 'cover';
        nav.style.backgroundPosition = 'center';
    }

    // 1. Loading Overlay
    if (!document.getElementById('loading-overlay')) {
        const overlay = document.createElement('div');
        overlay.id = 'loading-overlay';
        overlay.className = 'fixed inset-0 z-[200] bg-gray-950 flex items-center justify-center transition-opacity duration-700';
        overlay.innerHTML = `
            <div class="flex flex-col items-center">
                <div class="relative">
                    <div class="w-16 h-16 border-4 border-white/5 rounded-full"></div>
                    <div class="absolute top-0 left-0 w-16 h-16 border-4 border-accent-purple border-t-transparent rounded-full animate-spin"></div>
                </div>
                <p id="loading-text" class="text-gray-400 mt-6 font-medium tracking-widest uppercase text-xs animate-pulse">Initializing</p>
            </div>
        `;
        document.body.appendChild(overlay);
    }

    // 2. Notification Toast
    if (!document.getElementById('toast')) {
        const toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-8 left-1/2 -translate-x-1/2 md:left-auto md:right-8 md:translate-x-0 z-[200] transform translate-y-32 opacity-0 transition-all duration-500 pointer-events-none';
        toast.innerHTML = `
            <div class="glass px-8 py-5 rounded-3xl flex items-center space-x-4 border-emerald-500/20 shadow-2xl">
                <div id="toast-icon-bg" class="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <i data-lucide="check" id="toast-icon" class="w-6 h-6 text-emerald-500"></i>
                </div>
                <div>
                    <span id="toast-msg" class="font-black text-sm block">Action successful!</span>
                    <span id="toast-sub" class="text-[9px] text-gray-500 uppercase font-black tracking-widest">Database updated</span>
                </div>
            </div>
        `;
        document.body.appendChild(toast);
    }

    // 3. Security Modal
    if (!document.getElementById('security-modal')) {
        const securityModal = document.createElement('div');
        securityModal.id = 'security-modal';
        securityModal.className = 'fixed inset-0 z-[110] bg-gray-950/80 backdrop-blur-md hidden flex items-center justify-center p-6';
        securityModal.innerHTML = `
            <div class="bg-[#111] border border-white/5 w-full max-w-sm rounded-[32px] p-10 animate-fadeIn relative overflow-hidden">
                <div class="flex flex-col items-center text-center space-y-6">
                    <div class="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500">
                        <i data-lucide="shield-alert" class="w-8 h-8"></i>
                    </div>
                    <div>
                        <h3 class="text-2xl font-black">Security Auth</h3>
                        <p class="text-gray-500 text-sm mt-1 uppercase tracking-tighter font-bold">Type 'delete' to confirm</p>
                    </div>
                    <input type="text" id="security-token" class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-red-500 transition-all font-mono text-center tracking-widest" placeholder="TOKEN">
                    <div class="flex w-full space-x-3">
                        <button onclick="closeSecurityModal()" class="flex-1 py-4 rounded-2xl bg-white/5 text-gray-400 font-bold hover:bg-white/10 transition-all uppercase text-[10px] tracking-widest">Cancel</button>
                        <button id="security-confirm-btn" class="flex-1 py-4 rounded-2xl bg-red-500 hover:bg-red-600 text-white font-bold transition-all shadow-lg shadow-red-500/20 uppercase text-[10px] tracking-widest">Authorize</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(securityModal);
    }

    // 4. Footer
    if (!document.querySelector('footer')) {
        const footer = document.createElement('footer');
        footer.className = 'w-full bg-gray-950/5 border-t border-white/5 pt-16 pb-10 px-10 mt-10 relative overflow-hidden';
        footer.innerHTML = `
            <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12 mb-16 relative z-10 text-left">
                <div class="space-y-6">
                    <div class="flex items-center space-x-3 group cursor-pointer" onclick="backToProjects()">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-cyan-600 flex items-center justify-center group-hover:rotate-12 transition-all duration-500 shadow-xl shadow-purple-500/20">
                            <i data-lucide="activity" class="w-6 h-6 text-white"></i>
                        </div>
                        <span class="text-2xl font-black tracking-tighter">TaskTrace</span>
                    </div>
                    <p class="text-gray-500 text-xs leading-relaxed max-w-xs font-medium">Professional real-time project management. All data synchronized via Firebase Cloud.</p>
                    <div class="flex items-center space-x-4 text-gray-400">
                        <a href="https://github.com/Chanii2024" target="_blank" class="hover:text-white transition-all"><i data-lucide="github" class="w-4 h-4"></i></a>
                        <a href="https://linkedin.com/in/chaniru-weerasinghe-36aa2a326/" target="_blank" class="hover:text-white transition-all"><i data-lucide="linkedin" class="w-4 h-4"></i></a>
                        <a href="https://facebook.com/Chanii2003/" target="_blank" class="hover:text-white transition-all"><i data-lucide="facebook" class="w-4 h-4"></i></a>
                        <a href="https://www.instagram.com/chaniruweerasinghe" target="_blank" class="hover:text-white transition-all"><i data-lucide="instagram" class="w-4 h-4"></i></a>
                    </div>
                </div>
                <div class="space-y-6">
                    <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-white opacity-60">Build Stack</h4>
                    <ul class="space-y-3 text-gray-500 text-xs font-bold">
                        <li>HTML5</li>
                        <li>CSS3 (Tailwind)</li>
                        <li>JavaScript (ES6)</li>
                        <li>Firebase Realtime DB</li>
                        <li>Lucide Icons</li>
                        <li>Vite (build tool)</li>
                    </ul>
                </div>
                <div class="space-y-6">
                    <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-white opacity-60">System Status</h4>
                    <p class="text-gray-500 text-xs font-bold flex items-center space-x-2">
                        <span class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span>Firebase Realtime Cloud</span>
                    </p>
                    <p class="text-gray-500 text-[10px] font-medium leading-relaxed uppercase tracking-widest">v2.0.1 Stable Production</p>
                    <p class="text-gray-500 text-[10px] font-medium">All systems operational • Updated just now</p>
                </div>
                <div class="space-y-6">
                    <h4 class="text-[10px] font-black uppercase tracking-[0.2em] text-white opacity-60">Developed By</h4>
                    <div class="glass p-5 rounded-2xl border border-white/5 bg-white/[0.01]">
                        <p class="text-sm font-black text-white">Chaniru Weerasinghe</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(footer);
    }

    // 5. Generic Modal (Consolidated)
    if (!document.getElementById('generic-modal')) {
        const modal = document.createElement('div');
        modal.id = 'generic-modal';
        modal.className = 'hidden fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8';
        modal.innerHTML = `
            <div class="fixed inset-0 bg-gray-950/95 backdrop-blur-md" onclick="closeGenericModal()"></div>
            <div class="glass w-full max-w-lg rounded-3xl md:rounded-[40px] relative animate-fadeIn shadow-2xl overflow-hidden flex flex-col max-h-full">
                <div class="p-6 md:p-10 overflow-y-auto custom-scrollbar">
                    <div class="flex items-center justify-between mb-8">
                        <div>
                            <h3 id="modal-title" class="text-2xl font-black tracking-tight">New Mission</h3>
                            <p id="modal-sub" class="text-gray-500 text-[10px] mt-0.5 uppercase tracking-tighter font-bold">Details</p>
                        </div>
                        <button onclick="closeGenericModal()" class="w-10 h-10 flex items-center justify-center rounded-xl bg-white/5 text-gray-400 hover:text-white transition-all">
                            <i data-lucide="x" class="w-6 h-6"></i>
                        </button>
                    </div>

                    <!-- Project Form -->
                    <form id="project-form" class="hidden space-y-5" onsubmit="handleProjectSubmit(event)">
                        <input type="hidden" id="p-id">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Project Name</label>
                            <input type="text" id="p-name" class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-accent-purple transition-all font-medium" placeholder="E.g. TaskTrace Redesign">
                        </div>
                        <div>
                            <div class="flex items-center justify-between mb-2 ml-1">
                                <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest">Project Icon</label>
                            </div>
                            <div class="relative group/picker">
                                <div class="flex items-center space-x-4 mb-4">
                                    <div id="p-icon-preview" class="w-14 h-14 rounded-2xl bg-accent-purple/20 flex items-center justify-center border border-accent-purple/30">
                                        <i data-lucide="layers" class="w-7 h-7 text-accent-purple"></i>
                                    </div>
                                    <div class="flex-grow">
                                        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-widest italic">Choose a symbol that represents your workspace</p>
                                    </div>
                                </div>
                                <div id="icon-grid" class="grid grid-cols-5 gap-3 h-48 overflow-y-auto p-4 bg-gray-900/50 rounded-2xl border border-white/5 custom-scrollbar"></div>
                                <input type="hidden" id="p-icon" value="layers">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Theme Color</label>
                            <div class="flex flex-wrap gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div class="color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #a855f7, #7e22ce)" onclick="selectColor('#a855f7', '#7e22ce')" data-color="#a855f7"></div>
                                <div class="color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #06b6d4, #0e7490)" onclick="selectColor('#06b6d4', '#0e7490')" data-color="#06b6d4"></div>
                                <div class="color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #10b981, #047857)" onclick="selectColor('#10b981', '#047857')" data-color="#10b981"></div>
                                <div class="color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8)" onclick="selectColor('#3b82f6', '#1d4ed8')" data-color="#3b82f6"></div>
                                <button type="submit" id="project-submit-btn" class="w-full mt-4 py-4 bg-accent-purple hover:bg-purple-600 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-500/20">Action</button>
                                <input type="hidden" id="p-color-from" value="#a855f7"><input type="hidden" id="p-color-to" value="#7e22ce">
                            </div>
                        </div>
                    </form>

                    <form id="member-form" class="hidden space-y-6" onsubmit="handleMemberSubmit(event)">
                        <input type="hidden" id="m-id">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Member Name</label>
                            <input type="text" id="m-name" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-accent-purple transition-all font-medium" placeholder="E.g. Chaniru">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Member Role</label>
                            <input type="text" id="m-role" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-accent-purple transition-all font-medium" placeholder="E.g. Lead Designer">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Theme Color</label>
                            <div class="flex flex-wrap gap-3 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <div class="member-color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #a855f7, #7e22ce)" onclick="selectMemberColor('#a855f7', '#7e22ce')" data-color="#a855f7"></div>
                                <div class="member-color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #06b6d4, #0e7490)" onclick="selectMemberColor('#06b6d4', '#0e7490')" data-color="#06b6d4"></div>
                                <div class="member-color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #10b981, #047857)" onclick="selectMemberColor('#10b981', '#047857')" data-color="#10b981"></div>
                                <div class="member-color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #3b82f6, #1d4ed8)" onclick="selectMemberColor('#3b82f6', '#1d4ed8')" data-color="#3b82f6"></div>
                                <div class="member-color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #f59e0b, #d97706)" onclick="selectMemberColor('#f59e0b', '#d97706')" data-color="#f59e0b"></div>
                                <div class="member-color-option w-10 h-10 rounded-xl cursor-pointer transition-all border-2 border-transparent hover:scale-110" style="background: linear-gradient(135deg, #ef4444, #dc2626)" onclick="selectMemberColor('#ef4444', '#dc2626')" data-color="#ef4444"></div>
                                <input type="hidden" id="m-color-from" value="#a855f7">
                                <input type="hidden" id="m-color-to" value="#7e22ce">
                            </div>
                        </div>
                        <button type="submit" id="member-submit-btn" class="w-full py-5 bg-accent-purple hover:bg-purple-600 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-500/20 text-white">Action</button>
                    </form>

                    <!-- Sprint Form -->
                    <form id="sprint-form" class="hidden space-y-6" onsubmit="handleSprintSubmit(event)">
                        <div id="s-name-container">
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1 cursor-not-allowed" for="s-name">Sprint</label>
                            <input type="text" id="s-name" readonly class="w-full bg-gray-900/50 border border-white/5 rounded-2xl px-5 py-4 focus:outline-none transition-all font-medium relative z-10 text-gray-500 cursor-not-allowed" placeholder="Auto-generated" autocomplete="off">
                        </div>
                        <div id="s-edit-container" class="hidden">
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Select Sprint to Extend</label>
                            <div class="custom-dropdown w-full" id="dropdown-s-edit">
                                <div class="dropdown-trigger w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex justify-between items-center !text-base !font-medium !text-gray-300 !normal-case" onclick="toggleDropdown(event, 's-edit')">
                                    <span id="s-edit-label">Select Sprint</span>
                                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-500 transition-transform duration-300"></i>
                                </div>
                                <div class="dropdown-menu !w-full" id="s-edit-options"></div>
                                <input type="hidden" id="s-edit-name">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">End Date (Deadline)</label>
                            <input type="date" id="s-end-date" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-accent-purple transition-all font-medium text-gray-300 [color-scheme:dark]">
                        </div>
                        <button type="submit" class="w-full py-5 bg-cyan-500 hover:bg-cyan-600 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-cyan-500/20 text-white">Create Sprint</button>
                    </form>

                    <!-- Task Form -->
                    <form id="task-form" class="hidden space-y-6" onsubmit="handleTaskSubmit(event)">
                        <input type="hidden" id="task-id">
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Task Title</label>
                            <input type="text" id="t-title" required class="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 focus:outline-none focus:border-accent-purple transition-all font-medium" placeholder="Objective name">
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Sub-tasks / Details</label>
                            <div class="tag-container" id="tag-container">
                                <div id="tags-list" class="flex flex-wrap gap-2"></div>
                                <input type="text" id="tag-input" placeholder="Press Enter to add..." autocomplete="off">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Sprint</label>
                            <div class="custom-dropdown w-full" id="dropdown-t-sprint">
                                <div class="dropdown-trigger w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex justify-between items-center !text-base !font-medium !text-gray-300 !normal-case" onclick="toggleDropdown(event, 't-sprint')">
                                    <span id="t-sprint-label">Select Sprint</span>
                                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-500 transition-transform duration-300"></i>
                                </div>
                                <div class="dropdown-menu !w-full" id="t-sprint-options"></div>
                                <input type="hidden" id="t-sprint">
                            </div>
                        </div>
                        <div>
                            <label class="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2 ml-1">Assign To</label>
                            <div class="custom-dropdown w-full" id="dropdown-t-member">
                                <div class="dropdown-trigger w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 flex justify-between items-center !text-base !font-medium !text-gray-300 !normal-case" onclick="toggleDropdown(event, 't-member')">
                                    <span id="t-member-label">Select Member</span>
                                    <i data-lucide="chevron-down" class="w-5 h-5 text-gray-500 transition-transform duration-300"></i>
                                </div>
                                <div class="dropdown-menu !w-full" id="t-member-options"></div>
                                <input type="hidden" id="t-member" required>
                            </div>
                        </div>
                        <button type="submit" id="task-submit-btn" class="w-full py-5 bg-accent-purple hover:bg-purple-600 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-purple-500/20 text-white">Action</button>
                    </form>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    refreshIcons();
}

// Set Theme Colors based on Project Data
function applyProjectTheme(project) {
    if (!project) return;
    const root = document.documentElement;
    root.style.setProperty('--accent-from', project.colorFrom || '#a855f7');
    root.style.setProperty('--accent-to', project.colorTo || '#7e22ce');
}

// Navigation UI update (Header logic generic)
function setupHeader(viewId) {
    const nav = document.querySelector('nav');
    const logoContainer = document.getElementById('logo-container');

    // Improved check for landing page (works locally, in VS Code Live Server, or GitHub Pages)
    const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || viewId === 'project-view';

    if (nav && logoContainer) {
        if (isRoot) {
            // Keep Logo on the left side for landing page
            logoContainer.style.gridColumn = "1";
            logoContainer.classList.remove('justify-center');

            // Adjust nav width to match landing page content width (max-w-7xl)
            nav.classList.remove('max-w-5xl', 'w-[calc(100%-32px)]');
            nav.classList.add('max-w-7xl', 'w-[calc(100%-48px)]');
        } else {
            // Reset to Left on Internal Pages
            logoContainer.style.gridColumn = "1";
            logoContainer.classList.remove('justify-center');

            // Revert nav width to match internal pages
            nav.classList.remove('max-w-5xl', 'w-[calc(100%-32px)]');
            nav.classList.add('max-w-7xl', 'w-[calc(100%-48px)]');
        }
    }

    updateBreadcrumbs();
    refreshIcons();
}

function updateBreadcrumbs() {
    const container = document.getElementById('breadcrumb-container');
    if (!container) return;

    const path = [];
    const isRoot = window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('/pages/');

    // Home - Only show if not on Home page
    if (!isRoot) {
        path.push(`<a href="#" onclick="backToProjects()" class="text-white/40 hover:text-white transition-all">Home</a>`);
    }

    // Project
    const projId = localStorage.getItem('tt_project');
    if (projId) {
        const projName = localStorage.getItem('tt_project_name') || 'Project';
        if (path.length > 0) path.push(`<span class="text-white/10 mx-1">/</span>`);
        path.push(`<a href="#" onclick="backToMembers()" class="text-white/40 hover:text-white transition-all">${projName}</a>`);
    }

    // Member
    const membId = localStorage.getItem('tt_member');
    if (membId && window.location.pathname.includes('workspace.html')) {
        const membName = localStorage.getItem('tt_member_name') || 'Member';
        if (path.length > 0) path.push(`<span class="text-white/10 mx-1">/</span>`);
        path.push(`<span class="text-accent-purple">${membName}</span>`);
    }

    container.innerHTML = path.join('');
}

// --- TASK MANAGEMENT LOGIC (CONSOLIDATED) ---
let currentSubTasks = [];

function setupTagInput() {
    const input = document.getElementById('tag-input');
    if (!input) return;

    input.onkeydown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = input.value.trim();
            if (val) {
                currentSubTasks.push(val);
                input.value = '';
                renderTagsInModal();
            }
        }
    };
}

function renderTagsInModal() {
    const list = document.getElementById('tags-list');
    if (!list) return;
    list.innerHTML = '';
    currentSubTasks.forEach((st, idx) => {
        const tag = document.createElement('div');
        tag.className = 'px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg flex items-center space-x-2 group animate-fadeIn';
        tag.innerHTML = `
            <span class="text-[11px] font-medium text-gray-300">${st}</span>
            <button type="button" onclick="removeTag(${idx})" class="text-gray-600 hover:text-red-400 transition-colors">
                <i data-lucide="x" class="w-3 h-3"></i>
            </button>
        `;
        list.appendChild(tag);
    });
    refreshIcons();
}

function removeTag(idx) {
    currentSubTasks.splice(idx, 1);
    renderTagsInModal();
}

function toggleDropdown(e, type) {
    e.stopPropagation();
    const dropdown = document.getElementById(`dropdown-${type}`);
    dropdown.classList.toggle('active');
}

function updateMemberDropdown() {
    const label = document.getElementById('t-member-label');
    const hiddenInput = document.getElementById('t-member');
    const optionsGrid = document.getElementById('t-member-options');
    if (!optionsGrid) return;

    optionsGrid.innerHTML = '';


    Object.keys(currentMembers).forEach(id => {
        const m = currentMembers[id];
        const item = document.createElement('div');
        item.className = `dropdown-item ${hiddenInput.value === id ? 'selected' : ''}`;
        item.onclick = (e) => {
            e.stopPropagation();
            hiddenInput.value = id;
            label.innerText = m.name;
            document.getElementById('dropdown-t-member').classList.remove('active');
            updateMemberDropdown();
        };
        item.innerHTML = `
            <span>${m.name}</span>
            ${hiddenInput.value === id ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
        `;
        optionsGrid.appendChild(item);
    });
    refreshIcons();
}

function updateTaskModalSprintDropdown() {
    const label = document.getElementById('t-sprint-label');
    const hiddenInput = document.getElementById('t-sprint');
    const optionsGrid = document.getElementById('t-sprint-options');
    if (!optionsGrid) return;

    optionsGrid.innerHTML = '';
    // Add scrollable class for longer lists
    optionsGrid.classList.add('max-h-60', 'overflow-y-auto', 'custom-scrollbar');

    // Add "None" option
    const noneItem = document.createElement('div');
    noneItem.className = `dropdown-item ${hiddenInput.value === '' ? 'selected' : ''}`;
    noneItem.onclick = (e) => {
        e.stopPropagation();
        hiddenInput.value = '';
        label.innerText = 'Select Sprint';
        document.getElementById('dropdown-t-sprint').classList.remove('active');
        updateTaskModalSprintDropdown(); // Refresh selection state
    };
    noneItem.innerHTML = `<span>None</span>`;
    optionsGrid.appendChild(noneItem);

    // Get unique sprint names from BOTH Tasks and Defined Sprints (Unify with dashboard logic)
    const sprints = new Set();
    Object.keys(currentSprints || {}).forEach(k => sprints.add(k));
    Object.values(currentTasks || {}).forEach(t => {
        if (t.sprintName) sprints.add(t.sprintName);
    });

    const sprintList = Array.from(sprints).sort((a, b) => {
        const na = parseInt(a), nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
    });

    sprintList.forEach(s => {
        const item = document.createElement('div');
        item.className = `dropdown-item ${hiddenInput.value === s ? 'selected' : ''}`;

        // Find end date from currentSprints or fallback to searching tasks
        let deadline = currentSprints[s]?.endDate;
        if (!deadline) {
            const taskWithDate = Object.values(currentTasks).find(t => t.sprintName === s && t.endDate);
            if (taskWithDate) deadline = taskWithDate.endDate;
        }

        item.onclick = (e) => {
            e.stopPropagation();
            hiddenInput.value = s;
            label.innerText = isNaN(parseInt(s)) ? s : `Sprint ${s}`;
            document.getElementById('dropdown-t-sprint').classList.remove('active');

            // Auto-fill end date from sprint if available
            if (currentSprints[s] && currentSprints[s].endDate) {
                // The task form hidden endDate will be handled on submit via currentSprints
            }
            updateTaskModalSprintDropdown(); // Refresh selection state
        };
        const displayLabel = isNaN(parseInt(s)) ? s : `Sprint ${s}`;
        const dateSpan = deadline
            ? `<span class="text-[9px] text-gray-500 ml-auto uppercase font-bold">${deadline}</span>`
            : '';

        item.innerHTML = `
            <span>${displayLabel}</span>
            ${dateSpan}
        `;
        optionsGrid.appendChild(item);
    });
    refreshIcons();
}

function handleTaskSubmit(e) {
    e.preventDefault();
    const titleVal = document.getElementById('t-title').value.trim();
    const assignedToVal = document.getElementById('t-member').value;

    if (!titleVal || !assignedToVal) {
        showNotification("Please fill all mission criteria", true);
        return;
    }

    const sprName = document.getElementById('t-sprint').value.trim();
    const data = {
        title: titleVal,
        subTasks: currentSubTasks,
        assignedTo: assignedToVal,
        sprintName: sprName,
        endDate: (sprName && currentSprints[sprName]) ? currentSprints[sprName].endDate : '',
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (isTaskEdit) {
        const id = document.getElementById('task-id').value;
        database.ref(`projects/${selectedProjId}/tasks/${id}`).update(data)
            .then(() => {
                closeGenericModal();
                showNotification("Mission objectives updated");
            });
    } else {
        data.status = 'NotStarted';
        data.createdAt = firebase.database.ServerValue.TIMESTAMP;
        database.ref(`projects/${selectedProjId}/tasks`).push(data)
            .then(() => {
                closeGenericModal();
                showNotification("Mission launched successfully!");
            });
    }
}

function handleProjectSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('p-id') ? document.getElementById('p-id').value : null;
    const name = document.getElementById('p-name').value.trim();
    const icon = document.getElementById('p-icon').value;
    const colorFrom = document.getElementById('p-color-from').value;
    const colorTo = document.getElementById('p-color-to').value;

    if (!name) {
        showNotification("Project needs a name!", true);
        return;
    }

    closeGenericModal();

    const data = {
        name,
        icon,
        colorFrom,
        colorTo,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (isProjectEdit && id) {
        database.ref(`projects/${id}`).update(data)
            .then(() => showNotification("Project updated!"))
            .catch(err => showNotification("Error updating project: " + err.message, true));
    } else {
        data.createdAt = firebase.database.ServerValue.TIMESTAMP;
        database.ref('projects').push(data)
            .then(() => showNotification("Project created successfully!"))
            .catch(err => showNotification("Error creating project: " + err.message, true));
    }
}
function handleMemberSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('m-id').value;
    const name = document.getElementById('m-name').value.trim();
    const role = document.getElementById('m-role').value.trim();
    const colorFrom = document.getElementById('m-color-from').value;
    const colorTo = document.getElementById('m-color-to').value;

    if (!name || !role) {
        showNotification("Please provide both name and role", true);
        return;
    }

    const data = {
        name: name,
        role: role,
        colorFrom: colorFrom,
        colorTo: colorTo,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    };

    if (id) {
        database.ref(`projects/${selectedProjId}/members/${id}`).update(data)
            .then(() => {
                closeGenericModal();
                showNotification(`Updated details for ${name}`);
            })
            .catch(err => showNotification("Error updating member: " + err.message, true));
    } else {
        data.createdAt = firebase.database.ServerValue.TIMESTAMP;
        database.ref(`projects/${selectedProjId}/members`).push(data)
            .then(() => {
                closeGenericModal();
                showNotification(`Welcome to the team, ${name}!`);
            })
            .catch(err => showNotification("Error adding member: " + err.message, true));
    }
}

function handleSprintSubmit(e) {
    e.preventDefault();
    const isEdit = !document.getElementById('s-edit-container').classList.contains('hidden');
    const name = isEdit ? document.getElementById('s-edit-name').value : document.getElementById('s-name').value.trim();
    const endDate = document.getElementById('s-end-date').value;

    if (!name || !endDate) {
        showNotification("Please set both sprint name and deadline", true);
        return;
    }

    database.ref(`projects/${selectedProjId}/sprints/${name}`).update({
        endDate: endDate,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    })
        .then(() => {
            closeGenericModal();
            showNotification(isEdit ? `Sprint ${name} deadline extended!` : `Sprint ${name} established!`);
            // Also update tasks if backend doesn't handle it
            Object.keys(currentTasks).forEach(tid => {
                const t = currentTasks[tid];
                if (t.sprintName === name) {
                    database.ref(`projects/${selectedProjId}/tasks/${tid}`).update({ endDate: endDate });
                }
            });
        })
        .catch(err => showNotification("Error updating sprint: " + err.message, true));
}

function updateSprintEditDropdown() {
    const label = document.getElementById('s-edit-label');
    const hiddenInput = document.getElementById('s-edit-name');
    const optionsGrid = document.getElementById('s-edit-options');
    if (!optionsGrid) return;
    optionsGrid.innerHTML = '';
    optionsGrid.classList.add('max-h-60', 'overflow-y-auto', 'custom-scrollbar');

    // Get unique sprint names from BOTH Tasks and Defined Sprints
    const sprints = new Set();
    Object.keys(currentSprints || {}).forEach(k => sprints.add(k));
    Object.values(currentTasks || {}).forEach(t => {
        if (t.sprintName) sprints.add(t.sprintName);
    });

    const sprintList = Array.from(sprints).sort((a, b) => {
        const na = parseInt(a), nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
    });

    sprintList.forEach(s => {
        const item = document.createElement('div');
        item.className = `dropdown-item ${hiddenInput.value === s ? 'selected' : ''}`;

        // Find best possible deadline preview
        let deadline = currentSprints[s]?.endDate;
        if (!deadline) {
            const taskWithDate = Object.values(currentTasks).find(t => t.sprintName === s && t.endDate);
            if (taskWithDate) deadline = taskWithDate.endDate;
        }

        item.onclick = (e) => {
            e.stopPropagation();
            hiddenInput.value = s;
            label.innerText = isNaN(parseInt(s)) ? s : `Sprint ${s}`;
            document.getElementById('s-end-date').value = deadline || '';
            document.getElementById('dropdown-s-edit').classList.remove('active');
            updateSprintEditDropdown();
        };

        const displayLabel = isNaN(parseInt(s)) ? s : 'Sprint ' + s;
        const dateSpan = deadline ? `<span class="text-[9px] text-gray-500 ml-auto uppercase font-bold">${deadline}</span>` : '';

        item.innerHTML = `<span>${displayLabel}</span>${dateSpan}`;
        optionsGrid.appendChild(item);
    });
    refreshIcons();
}

function openGenericModal(type, extra = null) {
    document.getElementById('generic-modal').classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    // Reset all forms
    const projectForm = document.getElementById('project-form');
    const memberForm = document.getElementById('member-form');
    const taskForm = document.getElementById('task-form');
    const sprintForm = document.getElementById('sprint-form');
    if (projectForm) projectForm.classList.add('hidden');
    if (memberForm) memberForm.classList.add('hidden');
    if (taskForm) taskForm.classList.add('hidden');
    if (sprintForm) sprintForm.classList.add('hidden');

    const title = document.getElementById('modal-title');
    const sub = document.getElementById('modal-sub');

    if (type === 'project') {
        if (projectForm) projectForm.classList.remove('hidden');
        if (extra) {
            isProjectEdit = true;
            const p = allProjects[extra];
            title.innerText = "Edit Project";
            sub.innerText = "Update workspace details";
            document.getElementById('p-id').value = extra;
            document.getElementById('p-name').value = p.name;
            document.getElementById('project-submit-btn').innerText = "Update Project";
            if (typeof selectIcon === 'function') {
                selectIcon(p.icon || 'layers');
                selectColor(p.colorFrom || '#a855f7', p.colorTo || '#7e22ce');
            }
        } else {
            isProjectEdit = false;
            title.innerText = "New Project";
            sub.innerText = "Start a fresh collaboration space";
            projectForm.reset();
            document.getElementById('project-submit-btn').innerText = "Create Project";
            if (typeof selectIcon === 'function') {
                selectIcon('layers');
                selectColor('#a855f7', '#7e22ce');
            }
        }
    } else if (type === 'task') {
        if (taskForm) taskForm.classList.remove('hidden');
        setupTagInput();
        if (extra) {
            isTaskEdit = true;
            const t = currentTasks[extra];
            title.innerText = "Edit Mission";
            sub.innerText = "Refine the objectives";
            if (document.getElementById('task-id')) document.getElementById('task-id').value = extra;
            document.getElementById('t-title').value = t.title;
            currentSubTasks = [...(t.subTasks || [])];
            document.getElementById('t-member').value = t.assignedTo;
            document.getElementById('t-sprint').value = t.sprintName || '';
            const mName = currentMembers[t.assignedTo]?.name || t.assignedTo;
            document.getElementById('t-member-label').innerText = mName;

            const sName = t.sprintName || '';
            const sLabel = sName ? (isNaN(parseInt(sName)) ? sName : `Sprint ${sName}`) : 'Select Sprint';
            document.getElementById('t-sprint-label').innerText = sLabel;

            document.getElementById('task-submit-btn').innerText = "Update Mission";
        } else {
            isTaskEdit = false;
            title.innerText = "New Mission";
            sub.innerText = "Assign a new objective";
            taskForm.reset();
            currentSubTasks = [];

            // Auto-select if in a specific member's workspace
            if (window.location.pathname.includes('workspace.html') && selectedMember && selectedMember !== 'Global') {
                const cachedName = localStorage.getItem('tt_member_name');
                const memberName = (currentMembers[selectedMember]?.name) || cachedName || selectedMember;
                document.getElementById('t-member').value = selectedMember;
                document.getElementById('t-member-label').innerText = memberName;
            } else {
                document.getElementById('t-member').value = '';
                document.getElementById('t-member-label').innerText = 'Select Member';
            }

            document.getElementById('t-sprint').value = '';
            document.getElementById('t-sprint-label').innerText = 'Select Sprint';

            document.getElementById('task-submit-btn').innerText = "Launch Task";
        }
        renderTagsInModal();
        updateMemberDropdown();
        if (typeof updateTaskModalSprintDropdown === 'function') {
            updateTaskModalSprintDropdown();
        }
    } else if (type === 'member') {
        if (memberForm) memberForm.classList.remove('hidden');
        if (extra) {
            const m = currentMembers[extra];
            title.innerText = "Edit Member";
            sub.innerText = `Updating profile`;
            document.getElementById('m-id').value = extra;
            document.getElementById('m-name').value = m.name;
            document.getElementById('m-role').value = m.role;
            selectMemberColor(m.colorFrom || '#a855f7', m.colorTo || '#7e22ce');
            document.getElementById('member-submit-btn').innerText = "Update Member";
        } else {
            title.innerText = "Add Team Member";
            const projName = (allProjects[selectedProjId] && allProjects[selectedProjId].name) || 'Project';
            sub.innerText = `Adding to ${projName}`;
            memberForm.reset();
            document.getElementById('m-id').value = '';
            selectMemberColor('#a855f7', '#7e22ce');
            document.getElementById('member-submit-btn').innerText = "Add Member";
        }
    } else if (type === 'sprint') {
        if (sprintForm) sprintForm.classList.remove('hidden');
        const nameContainer = document.getElementById('s-name-container');
        const editContainer = document.getElementById('s-edit-container');
        const submitBtn = sprintForm.querySelector('button[type="submit"]');

        if (extra === 'edit') {
            title.innerText = "Extend Deadline";
            sub.innerText = "Reschedule an existing sprint";
            if (nameContainer) nameContainer.classList.add('hidden');
            if (editContainer) editContainer.classList.remove('hidden');
            if (submitBtn) {
                submitBtn.innerText = "Update Deadline";
                submitBtn.className = "w-full py-5 bg-emerald-500 hover:bg-emerald-600 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 text-white";
            }
            document.getElementById('s-edit-name').value = '';
            document.getElementById('s-edit-label').innerText = 'Select Sprint';
            updateSprintEditDropdown();
        } else {
            title.innerText = "Add Sprint";
            sub.innerText = "Set a project deadline";
            if (nameContainer) nameContainer.classList.remove('hidden');
            if (editContainer) editContainer.classList.add('hidden');
            if (submitBtn) {
                submitBtn.innerText = "Create Sprint";
                submitBtn.className = "w-full py-5 bg-cyan-500 hover:bg-cyan-600 rounded-2xl font-black uppercase tracking-widest transition-all shadow-xl shadow-cyan-500/20 text-white";
            }
            sprintForm.reset();

            // Auto-suggest logic
            const nameInput = document.getElementById('s-name');
            if (nameInput) {
                const sprintKeys = new Set(Object.keys(currentSprints || {}));
                Object.values(currentTasks || {}).forEach(t => { if (t.sprintName) sprintKeys.add(t.sprintName); });
                let nextNum = 1;
                if (sprintKeys.size > 0) {
                    const nums = Array.from(sprintKeys).map(k => parseInt(k)).filter(n => !isNaN(n));
                    if (nums.length > 0) nextNum = Math.max(...nums) + 1;
                }
                nameInput.value = nextNum;
            }
        }

        // Shared Date Logic
        const dateInput = document.getElementById('s-end-date');
        if (dateInput && extra !== 'edit') {
            let minDateObj = new Date();
            const existingDatesSet = new Set();
            Object.values(currentSprints || {}).forEach(s => { if (s.endDate) existingDatesSet.add(s.endDate); });
            Object.values(currentTasks || {}).forEach(t => { if (t.sprintName && t.endDate) existingDatesSet.add(t.endDate); });
            const existingDates = Array.from(existingDatesSet);
            if (existingDates.length > 0) {
                const latestDateString = existingDates.reduce((a, b) => new Date(a) > new Date(b) ? a : b);
                const latestDateObj = new Date(latestDateString);
                latestDateObj.setDate(latestDateObj.getDate() + 1);
                if (latestDateObj > minDateObj) minDateObj = latestDateObj;
            }
            const yyyy = minDateObj.getFullYear();
            const mm = String(minDateObj.getMonth() + 1).padStart(2, '0');
            const dd = String(minDateObj.getDate()).padStart(2, '0');
            dateInput.min = `${yyyy}-${mm}-${dd}`;
            dateInput.value = `${yyyy}-${mm}-${dd}`;
        } else if (dateInput) {
            dateInput.min = ""; // No min restriction for editing/extending
        }
    }

    refreshIcons();

    setTimeout(() => {
        const firstInput = document.querySelector(`#${type}-form input[type="text"]:not([readonly])`);
        if (firstInput) firstInput.focus();
    }, 200);
}

function selectMemberColor(from, to) {
    const fromInput = document.getElementById('m-color-from');
    const toInput = document.getElementById('m-color-to');
    if (!fromInput || !toInput) return;

    fromInput.value = from;
    toInput.value = to;

    const allOptions = document.querySelectorAll('.member-color-option');
    allOptions.forEach(opt => {
        const optColor = opt.getAttribute('data-color');
        if (optColor === from) {
            opt.classList.add('border-white', 'scale-110');
            opt.classList.remove('border-transparent');
        } else {
            opt.classList.remove('border-white', 'scale-110');
            opt.classList.add('border-transparent');
        }
    });
}
