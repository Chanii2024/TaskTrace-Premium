function initProjectsApp() {
    isProjectEdit = false;
    setupHeader('project-view');

    // Clear selections
    selectedProjId = null;
    selectedMember = null;
    localStorage.removeItem('tt_member');
    localStorage.removeItem('tt_project');

    // Reset default theme
    const root = document.documentElement;
    root.style.setProperty('--accent-from', '#a855f7');
    root.style.setProperty('--accent-to', '#7e22ce');

    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.innerText = "Connecting to Database...";

    database.ref('projects').on('value', snap => {
        if (loadingText) loadingText.innerText = "Loading Projects...";
        allProjects = snap.val() || {};
        renderProjects();
        hideLoader();
    });
}

function renderProjects() {
    const grid = document.getElementById('project-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const keys = Object.keys(allProjects);
    if (keys.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 flex flex-col items-center text-center animate-fadeIn">
                <div class="w-24 h-24 rounded-[32px] bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                    <i data-lucide="folder-plus" class="w-10 h-10 text-gray-600"></i>
                </div>
                <h3 class="text-xl font-bold text-gray-400">No Projects Found</h3>
                <p class="text-gray-600 text-sm mt-2 max-w-xs">Start by creating your first collaboration workspace.</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    keys.forEach(id => {
        const p = allProjects[id];
        if (!p) return;
        const card = document.createElement('div');
        card.innerHTML = `
            <div class="absolute top-2 md:top-6 right-2 md:right-6 flex items-center space-x-1 md:space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                 <button onclick="event.stopPropagation(); openGenericModal('project', '${id}')" class="p-1 md:p-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-cyan-400 transition-all">
                    <i data-lucide="edit-3" class="w-3 md:w-4 h-3 md:h-4"></i>
                 </button>
                 <button onclick="event.stopPropagation(); deleteProject('${id}')" class="p-1 md:p-2 rounded-lg bg-white/5 hover:bg-red-500/10 text-gray-400 hover:text-red-500 transition-all">
                    <i data-lucide="trash-2" class="w-3 md:w-4 h-3 md:h-4"></i>
                 </button>
            </div>
            <div class="w-12 h-12 md:w-20 md:h-20 rounded-xl md:rounded-2xl flex items-center justify-center mb-4 md:mb-6 shadow-xl group-hover:scale-110 transition-transform" 
                 style="background: linear-gradient(135deg, ${p.colorFrom || '#a855f7'}, ${p.colorTo || '#7e22ce'})">
                <i data-lucide="${p.icon || 'layers'}" class="w-6 md:w-10 h-6 md:h-10 text-white"></i>
            </div>
            <h3 class="text-xs md:text-2xl font-black tracking-tight text-center truncate w-full">${p.name}</h3>
            <p class="text-[8px] md:text-[10px] uppercase font-bold tracking-[0.1em] md:tracking-[0.2em] text-gray-600 mt-1 md:mt-2 text-center">
                ${Object.keys(p.tasks || {}).length}<span class="hidden md:inline"> ${Object.keys(p.tasks || {}).length === 1 ? 'TASK' : 'TASKS'}</span> • 
                ${Object.keys(p.members || {}).length}<span class="hidden md:inline"> ${Object.keys(p.members || {}).length === 1 ? 'MEMBER' : 'MEMBERS'}</span>
            </p>
        `;
        card.className = "glass p-4 md:p-10 rounded-2xl md:rounded-[32px] flex flex-col items-center h-full hover-card transition-all duration-500 cursor-pointer group relative overflow-hidden";
        card.onclick = () => selectProject(id, p.name);
        grid.appendChild(card);
    });
    refreshIcons();
}

function selectProject(id, name) {
    localStorage.setItem('tt_project', id);
    localStorage.setItem('tt_project_name', name);
    window.location.href = "pages/team.html";
}

function deleteProject(id) {
    requestSecurityAuth(() => {
        database.ref(`projects/${id}`).remove()
            .then(() => showNotification("Project removed", true))
            .catch(err => showNotification("Error removing project: " + err.message, true));
    });
}

// Form logic
function filterIcons(query) {
    const grid = document.getElementById('icon-grid');
    if (!grid) return;
    grid.innerHTML = '';
    const filtered = iconList.filter(icon => icon.includes(query.toLowerCase()));

    filtered.forEach(iconName => {
        const btn = document.createElement('div');
        btn.className = "flex items-center justify-center p-3 rounded-xl hover:bg-white/10 cursor-pointer transition-all border border-transparent hover:border-white/10";
        btn.onclick = () => selectIcon(iconName);
        btn.innerHTML = `<i data-lucide="${iconName}" class="w-5 h-5 text-gray-400"></i>`;
        grid.appendChild(btn);
    });
    refreshIcons();
}

function selectIcon(iconName) {
    const iconInput = document.getElementById('p-icon');
    if (!iconInput) return;
    iconInput.value = iconName;
    const preview = document.getElementById('p-icon-preview');
    if (preview) preview.innerHTML = `<i data-lucide="${iconName}" class="w-7 h-7 text-accent-purple"></i>`;

    const allBtns = document.querySelectorAll('#icon-grid > div');
    allBtns.forEach(btn => btn.classList.remove('bg-accent-purple/10', 'border-accent-purple/30'));
    refreshIcons();
}

function selectColor(from, to) {
    const fromInput = document.getElementById('p-color-from');
    const toInput = document.getElementById('p-color-to');
    if (!fromInput || !toInput) return;

    fromInput.value = from;
    toInput.value = to;

    const preview = document.getElementById('p-icon-preview');
    if (preview) {
        preview.style.background = `rgba(${parseInt(from.slice(1, 3), 16)}, ${parseInt(from.slice(3, 5), 16)}, ${parseInt(from.slice(5, 7), 16)}, 0.2)`;
        preview.style.borderColor = `rgba(${parseInt(from.slice(1, 3), 16)}, ${parseInt(from.slice(3, 5), 16)}, ${parseInt(from.slice(5, 7), 16)}, 0.3)`;
        const icon = preview.querySelector('i');
        if (icon) icon.style.color = from;
    }

    const allOptions = document.querySelectorAll('.color-option');
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

window.onload = initProjectsApp;
