let selectedSprint = localStorage.getItem('tt_sprint') || 'All';

// Initialize for Dashboard view
function initDashboardApp() {
    setupHeader('dashboard-view');
    selectedProjId = localStorage.getItem('tt_project');
    selectedMember = localStorage.getItem('tt_member');

    if (!selectedProjId) {
        window.location.href = "../index.html";
        return;
    }
    if (!selectedMember) {
        window.location.href = "team.html";
        return;
    }

    // Load Project Theme & Metadata immediately
    database.ref(`projects/${selectedProjId}`).once('value', snap => {
        const project = snap.val();
        if (project) {
            applyProjectTheme(project);
            updateDashboardUI(project);
        } else {
            window.location.href = "../index.html";
        }
    });

    // Parallel Real-time Listeners
    // 1. Members Sync
    database.ref(`projects/${selectedProjId}/members`).on('value', snap => {
        currentMembers = snap.val() || {};
        updateMemberDropdown();
        debouncedRender();
    });

    // 2. Sprints Sync
    database.ref(`projects/${selectedProjId}/sprints`).on('value', snap => {
        currentSprints = snap.val() || {};
        updateSprintDropdown();
        if (typeof updateTaskModalSprintDropdown === 'function') {
            updateTaskModalSprintDropdown();
        }
    });

    // 3. Tasks Sync
    database.ref(`projects/${selectedProjId}/tasks`).on('value', snap => {
        currentTasks = snap.val() || {};
        updateSprintDropdown(); // Refresh sprint list if tasks change
        debouncedRender();
        updateProgressBar();
        hideLoader(); // Data has arrived
    });

    // Safety timeout to never leave user hanging
    setTimeout(hideLoader, 3000);
}

// Debounce rendering to prevent double-clutter during initial stream
let renderTimeout;
function debouncedRender() {
    clearTimeout(renderTimeout);
    renderTimeout = setTimeout(() => {
        try {
            renderTasks();
        } catch (e) {
            console.error("Critical Render Error:", e);
            hideLoader();
        }
    }, 50);
}

function updateDashboardUI(proj) {
    const members = proj.members || {};
    const memberName = selectedMember === 'Global' ? 'Global Overview' : (members[selectedMember]?.name || selectedMember);

    document.getElementById('dashboard-title').innerText = selectedMember === 'Global' ? 'Global Overview' : `${memberName}'s Feed`;
    document.getElementById('dashboard-subtitle').innerText = proj.name;
}

function renderTasks() {
    const grid = document.getElementById('task-grid');
    if (!grid) return;
    grid.innerHTML = '';

    let ids = Object.keys(currentTasks || {}).reverse();

    // 1. Filter by Member (Global vs Individual)
    let filtered = selectedMember === 'Global'
        ? ids.filter(id => currentTasks[id])
        : ids.filter(id => {
            const t = currentTasks[id];
            if (!t) return false;

            const taskAssignedTo = String(t.assignedTo || '').trim().toLowerCase();
            const currentMemId = String(selectedMember || '').trim().toLowerCase();
            const currentMemName = String(currentMembers[selectedMember]?.name || '').trim().toLowerCase();

            return taskAssignedTo === currentMemId || (currentMemName && taskAssignedTo === currentMemName);
        });

    // 2. Filter by Sprint
    if (selectedSprint !== 'All') {
        filtered = filtered.filter(id => currentTasks[id].sprintName === selectedSprint);
    }

    if (filtered.length === 0) {
        const mName = selectedMember === 'Global' ? 'Global' : (currentMembers[selectedMember]?.name || selectedMember);
        const context = selectedSprint === 'All' ? `assigned to ${mName}` : `in ${selectedSprint}`;

        grid.innerHTML = `
            <div class="col-span-full py-24 flex flex-col items-center text-center animate-fadeIn">
                <div class="w-20 h-20 rounded-3xl bg-accent-purple/5 flex items-center justify-center mb-6 border border-accent-purple/10">
                    <i data-lucide="clipboard-list" class="w-8 h-8 text-accent-purple/30"></i>
                </div>
                <h3 class="text-lg font-bold text-gray-400">All Clear!</h3>
                <p class="text-gray-600 text-sm mt-2">No missions ${context} yet.</p>
            </div>
        `;
        refreshIcons();
        return;
    }

    filtered.forEach(id => {
        const t = currentTasks[id];
        if (!t) return;

        // Urgency / Completion Logic
        let urgencyHTML = '';
        if (t.status === 'Done') {
            urgencyHTML = `
                <div class="flex items-center space-x-3 text-xs sm:text-sm font-black uppercase tracking-widest px-4 py-2 rounded-xl transition-all duration-300 scale-105" style="color: #5F9301; background: rgba(95, 147, 1, 0.15);">
                    <img src="../images/Complete.png" class="w-6 h-6 object-contain">
                    <span>Completed</span>
                </div>
            `;
        } else if (t.endDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadline = new Date(t.endDate);
            deadline.setHours(0, 0, 0, 0);

            const diffTime = deadline.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            let urgencyClass = 'text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg';
            let urgencyLabel = `Due ${new Date(t.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

            let sprintDisplay = '';
            if (t.sprintName) {
                const s = parseInt(t.sprintName);
                if (!isNaN(s)) {
                    const j = s % 10, k = s % 100;
                    let suffix = "th";
                    if (j == 1 && k != 11) suffix = "st";
                    else if (j == 2 && k != 12) suffix = "nd";
                    else if (j == 3 && k != 13) suffix = "rd";
                    sprintDisplay = `${s}${suffix} Sprint • `;
                } else {
                    sprintDisplay = `${t.sprintName} • `;
                }
            }

            if (diffDays < 0) {
                urgencyClass = 'text-rose-500 bg-rose-500/10 px-3 py-1 rounded-lg animate-pulse';
                urgencyLabel = 'Overdue';
            } else if (diffDays === 0) {
                urgencyClass = 'text-rose-500 bg-rose-500/10 px-3 py-1 rounded-lg animate-pulse';
                urgencyLabel = 'Due Today';
            } else if (diffDays <= 3) {
                urgencyClass = 'text-amber-400 bg-amber-500/10 px-3 py-1 rounded-lg';
                urgencyLabel = `${diffDays}d left`;
            }

            urgencyHTML = `
                <div class="flex items-center space-x-2 text-[10px] sm:text-xs font-black uppercase tracking-widest ${urgencyClass} transition-all duration-300">
                    <i data-lucide="calendar" class="w-3.5 h-3.5"></i>
                    <span>${sprintDisplay}${urgencyLabel}</span>
                </div>
            `;
        }

        const status = statusMap[t.status] || statusMap['NotStarted'];
        const card = document.createElement('div');
        card.className = "glass p-8 rounded-[32px] flex flex-col h-full space-y-5 hover:bg-white/[0.03] transition-all duration-500 group animate-fadeIn";
        card.innerHTML = `
            <div class="flex items-center justify-between space-x-4 mb-4">
                <h4 class="text-xl font-black tracking-tight leading-tight line-clamp-2">${t.title}</h4>
                <div class="custom-dropdown flex-shrink-0" id="dropdown-${id}">
                    <div class="dropdown-trigger ${status.class}" onclick="toggleDropdown(event, '${id}')">
                        <span>${status.label}</span>
                        <i data-lucide="chevron-down" class="w-3.5 h-3.5 opacity-60 transition-transform duration-300"></i>
                    </div>
                    <div class="dropdown-menu">
                        ${Object.keys(statusMap).map(s => `
                            <div class="dropdown-item ${s === t.status ? 'selected' : ''}" onclick="selectStatus('${id}', '${s}')">
                                <div class="flex items-center">
                                    <span class="status-dot ${statusMap[s].class}"></span>
                                    <span>${statusMap[s].label}</span>
                                </div>
                                ${s === t.status ? '<i data-lucide="check" class="w-3.5 h-3.5"></i>' : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
            <div class="flex flex-wrap gap-2 content-start flex-grow">
                ${(t.subTasks || []).map(st => `
                    <div class="px-3 py-1.5 rounded-lg bg-white/5 border border-white/5 text-[10px] font-bold text-gray-400">
                        ${st}
                    </div>
                `).join('')}
            </div>
            <div class="flex items-center justify-between pt-6 border-t border-white/5 mt-auto flex-shrink-0 relative">
                <div class="flex items-center space-x-3">
                    <div class="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center border border-white/10">
                        <i data-lucide="user" class="w-4 h-4 text-slate-400"></i>
                    </div>
                    <span class="text-xs font-bold text-gray-400 tracking-tight">${currentMembers[t.assignedTo]?.name || t.assignedTo}</span>
                </div>
                
                <!-- Sprint / Deadline info (Hides on hover) -->
                <div class="flex items-center group-hover:opacity-0 transition-opacity duration-300">
                    ${urgencyHTML}
                </div>

                <!-- Action buttons (Shows on hover, positioned absolutely to overlap) -->
                <div class="absolute right-0 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none group-hover:pointer-events-auto">
                     <button onclick="openGenericModal('task', '${id}')" class="p-2 rounded-lg hover:bg-white/10 text-gray-500 hover:text-cyan-400 transition-all font-black"><i data-lucide="edit-3" class="w-4 h-4"></i></button>
                     <button onclick="deleteTask('${id}')" class="p-2 rounded-lg hover:bg-red-500/10 text-gray-500 hover:text-red-500 transition-all font-black"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
    refreshIcons();
}

function updateProgressBar() {
    const tasks = Object.values(currentTasks).filter(t => t !== null && t !== undefined);

    // Apply combined filters to progress bar
    let filtered = tasks;
    if (selectedMember !== 'Global') {
        filtered = filtered.filter(t => t.assignedTo === selectedMember);
    }
    if (selectedSprint !== 'All') {
        filtered = filtered.filter(t => t.sprintName === selectedSprint);
    }

    const total = filtered.length;
    const done = filtered.filter(t => t.status === 'Done').length;
    const pc = total === 0 ? 0 : Math.round((done / total) * 100);

    const globalFill = document.getElementById('global-progress-fill');
    const innerFill = document.getElementById('inner-progress-fill');

    if (globalFill) globalFill.style.width = `${pc}%`;
    if (innerFill) innerFill.style.width = `${pc}%`;

    const percentText = document.getElementById('progress-percent-text');
    if (percentText) percentText.innerText = `${pc}%`;

    const doneCount = document.getElementById('done-count');
    if (doneCount) doneCount.innerText = done;
}

// --- Status logic ---
function updateTaskStatus(id, next) {
    const task = currentTasks[id];
    if (!task) return;
    if (selectedMember !== 'Global' && task.assignedTo !== selectedMember) {
        showNotification(`Denied: Only ${currentMembers[task.assignedTo]?.name || task.assignedTo} can update`, true);
        renderTasks(); // Force refresh to reset dropdown state
        return;
    }
    database.ref(`projects/${selectedProjId}/tasks/${id}`).update({
        status: next,
        updatedAt: firebase.database.ServerValue.TIMESTAMP
    })
        .then(() => showNotification(`Status updated to ${statusMap[next].label}`))
        .catch(err => showNotification("Error updating task status: " + err.message, true));
}

// Functions moved to common.js:
// currentSubTasks, handleTaskSubmit, setupTagInput, renderTagsInModal, removeTag, toggleDropdown, updateMemberDropdown, selectStatus

function deleteTask(id) {
    requestSecurityAuth(() => {
        database.ref(`projects/${selectedProjId}/tasks/${id}`).remove()
            .then(() => showNotification("Mission aborted", true));
    });
}

function selectStatus(id, next) {
    updateTaskStatus(id, next);
    const el = document.getElementById(`dropdown-${id}`);
    if (el) el.classList.remove('active');
}

// --- Sprint Selection Logic ---
function toggleSprintDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('sprint-selector-dropdown');
    dropdown.classList.toggle('active');
}

function updateSprintDropdown() {
    const menu = document.getElementById('sprint-menu');
    const text = document.getElementById('selected-sprint-text');
    if (!menu) return;

    // Get unique sprint names from BOTH Tasks and Defined Sprints
    const sprints = new Set();

    // Add explicitly defined sprints
    Object.keys(currentSprints || {}).forEach(k => sprints.add(k));

    // Add sprints mentioned in tasks
    Object.values(currentTasks || {}).forEach(t => {
        if (t.sprintName) sprints.add(t.sprintName);
    });

    const sprintList = Array.from(sprints).sort((a, b) => {
        const na = parseInt(a), nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
    });

    let html = `
        <div class="dropdown-item group/item ${selectedSprint === 'All' ? 'selected' : ''}" onclick="selectSprint('All')">
            <div class="flex items-center">
                <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-hover/item:bg-accent-purple/20 transition-colors">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-gray-500 group-hover/item:text-accent-purple"></i>
                </div>
                <span class="text-[11px] font-bold uppercase tracking-wider">All</span>
            </div>
            ${selectedSprint === 'All' ? '<i data-lucide="check" class="w-4 h-4 text-accent-purple"></i>' : ''}
        </div>
        <div class="h-[1px] bg-white/5 my-2 mx-2"></div>
    `;

    sprintList.forEach(s => {
        const isNumeric = !isNaN(parseInt(s));
        const displayLabel = isNumeric ? `Sprint ${s}` : s;

        html += `
            <div class="dropdown-item group/item ${selectedSprint === s ? 'selected' : ''}" onclick="selectSprint('${s}')">
                <div class="flex items-center">
                    <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-hover/item:bg-cyan-500/20 transition-colors">
                        <i data-lucide="zap" class="w-3.5 h-3.5 text-gray-500 group-hover/item:text-cyan-400"></i>
                    </div>
                    <span class="text-[11px] font-bold uppercase tracking-wider">${displayLabel}</span>
                </div>
                ${selectedSprint === s ? '<i data-lucide="check" class="w-4 h-4 text-cyan-400"></i>' : ''}
            </div>
        `;
    });

    menu.innerHTML = html;

    // Update trigger text with Sprint X format if numeric
    if (selectedSprint === 'All') {
        text.innerText = 'Select Sprint';
    } else {
        const isNumeric = !isNaN(parseInt(selectedSprint));
        text.innerText = isNumeric ? `Sprint ${selectedSprint}` : selectedSprint;
    }

    refreshIcons();
}

function selectSprint(sprint) {
    selectedSprint = sprint;
    localStorage.setItem('tt_sprint', sprint);
    const dropdown = document.getElementById('sprint-selector-dropdown');
    if (dropdown) dropdown.classList.remove('active');

    updateSprintDropdown();
    debouncedRender();
    updateProgressBar();
}

function updateTaskModalSprintDropdown() {
    const label = document.getElementById('t-sprint-label');
    const hiddenInput = document.getElementById('t-sprint');
    const optionsGrid = document.getElementById('t-sprint-options');
    if (!optionsGrid) return;

    optionsGrid.innerHTML = '';

    // Add "None" option
    const noneItem = document.createElement('div');
    noneItem.className = `dropdown-item ${hiddenInput.value === '' ? 'selected' : ''}`;
    noneItem.onclick = (e) => {
        e.stopPropagation();
        hiddenInput.value = '';
        label.innerText = 'Select Sprint';
        document.getElementById('dropdown-t-sprint').classList.remove('active');
    };
    noneItem.innerHTML = `<span>None</span>`;
    optionsGrid.appendChild(noneItem);

    // Add defined sprints
    Object.keys(currentSprints).sort((a, b) => {
        const na = parseInt(a), nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
    }).forEach(s => {
        const item = document.createElement('div');
        item.className = `dropdown-item ${hiddenInput.value === s ? 'selected' : ''}`;
        item.onclick = (e) => {
            e.stopPropagation();
            hiddenInput.value = s;
            label.innerText = isNaN(parseInt(s)) ? s : `Sprint ${s}`;
            document.getElementById('dropdown-t-sprint').classList.remove('active');

            // Auto-fill end date from sprint if empty
            const dateInput = document.getElementById('t-end-date');
            if (dateInput && !dateInput.value) {
                dateInput.value = currentSprints[s].endDate;
            }
        };
        const displayLabel = isNaN(parseInt(s)) ? s : `Sprint ${s}`;
        item.innerHTML = `
            <span>${displayLabel}</span>
            <span class="text-[9px] text-gray-500 ml-auto uppercase font-bold">${currentSprints[s].endDate}</span>
        `;
        optionsGrid.appendChild(item);
    });
    refreshIcons();
}

// Close dropdowns on outside click
document.addEventListener('click', () => {
    const sprintDropdown = document.getElementById('sprint-selector-dropdown');
    if (sprintDropdown) sprintDropdown.classList.remove('active');
});

window.onload = initDashboardApp;
