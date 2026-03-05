// Initialize for members view
let selectedSprint = localStorage.getItem('tt_sprint') || 'All';

function initMembersApp() {
    setupHeader('member-view');
    selectedProjId = localStorage.getItem('tt_project');

    if (!selectedProjId) {
        window.location.href = "../index.html";
        return;
    }

    // Load generic project info first for title and colors
    database.ref(`projects/${selectedProjId}`).once('value', snap => {
        const project = snap.val();
        if (project) {
            applyProjectTheme(project);
            const titleEl = document.getElementById('selected-project-title');
            if (titleEl) titleEl.innerText = project.name;
        } else {
            window.location.href = "../index.html";
        }
    });

    database.ref(`projects/${selectedProjId}/members`).on('value', snap => {
        currentMembers = snap.val() || {};
        renderMembers();
        updateMemberDropdown();
        hideLoader();
    });

    // We also listen to Sprints and Tasks to populate data for the 'Add Sprint' modal logic
    database.ref(`projects/${selectedProjId}/sprints`).on('value', snap => {
        currentSprints = snap.val() || {};
    });

    database.ref(`projects/${selectedProjId}/tasks`).on('value', snap => {
        currentTasks = snap.val() || {};
    });
}

function renderMembers() {
    const grid = document.getElementById('member-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const keys = Object.keys(currentMembers);
    if (keys.length === 0) {
        grid.innerHTML = `
            <div class="col-span-full py-20 flex flex-col items-center text-center animate-fadeIn">
                <div class="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6 border border-white/10">
                    <i data-lucide="users" class="w-8 h-8 text-gray-600"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-400">Empty Team</h3>
                <p class="text-gray-600 text-sm mt-2">Invite members to this project to start assigning missions.</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    keys.forEach(id => {
        const m = currentMembers[id];
        if (!m) return;
        const card = document.createElement('div');
        card.className = "glass p-8 rounded-[32px] flex flex-col items-center h-full hover-card transition-all duration-500 cursor-pointer group";
        card.onclick = () => selectMember(id, m.name);
        card.innerHTML = `
            <div class="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mb-5 group-hover:bg-accent-purple/20 transition-all">
                <i data-lucide="user" class="w-8 h-8 text-gray-400 group-hover:text-accent-purple"></i>
            </div>
            <h3 class="text-xl font-bold">${m.name}</h3>
            <p class="text-[9px] uppercase font-black tracking-widest text-gray-500 mt-1">${m.role}</p>
        `;
        grid.appendChild(card);
    });
    refreshIcons();
}

function selectMember(id, name) {
    localStorage.setItem('tt_member', id);
    localStorage.setItem('tt_member_name', name || 'Global Overview');
    window.location.href = "workspace.html";
}


// openGenericModal moved to common.js

// handleMemberSubmit moved to common.js

// Functions moved to common.js:
// currentSubTasks, handleTaskSubmit, setupTagInput, renderTagsInModal, removeTag, toggleDropdown, updateMemberDropdown


// Sprint Analytics Navigation
function goToAnalytics() {
    window.location.href = "analytics.html";
}


window.onload = initMembersApp;
