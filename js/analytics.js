// Use shared state from common.js where applicable
// Only declare unique local state here
let allTasks = {};
let selectedSprint = localStorage.getItem('tt_sprint') || 'All';

function getOrdinal(n) {
    const s = ["th", "st", "nd", "rd"], v = n % 100;
    return (s[(v - 20) % 10] || s[v] || s[0]);
}

function initAnalytics() {
    const loadingText = document.getElementById('loading-text');
    if (loadingText) loadingText.innerText = "Connecting to Trace...";

    setupHeader('analytics-view');
    selectedProjId = localStorage.getItem('tt_project');

    if (!selectedProjId) {
        window.location.href = "../index.html";
        return;
    }

    // Force reveal after 2 seconds no matter what
    setTimeout(hideLoader, 2000);

    // 1. Load project data
    if (loadingText) loadingText.innerText = "Fetching Project Data...";
    database.ref(`projects/${selectedProjId}`).once('value').then(snap => {
        const project = snap.val();
        if (project) {
            document.getElementById('project-title').innerText = `${project.name} Analytics`;
            applyProjectTheme(project);
            if (loadingText) loadingText.innerText = "Fetching Team...";
        } else {
            window.location.href = "../index.html";
        }
    }).catch(err => {
        console.error("Project Fetch Error:", err);
        hideLoader();
    });

    // 2. Real-time listener for members
    database.ref(`projects/${selectedProjId}/members`).on('value', snap => {
        currentMembers = snap.val() || {};
        checkAndRefresh();
        if (loadingText) loadingText.innerText = "Analyzing Missions...";
        hideLoader();
    });

    // 3. Real-time listener for tasks
    database.ref(`projects/${selectedProjId}/tasks`).on('value', snap => {
        allTasks = snap.val() || {};
        checkAndRefresh();
        hideLoader();
    });

    // 4. Real-time listener for sprints
    database.ref(`projects/${selectedProjId}/sprints`).on('value', snap => {
        currentSprints = snap.val() || {};
        checkAndRefresh();
        hideLoader();
    });
}

function checkAndRefresh() {
    // If we have members, we can at least show the chart (even if empty)
    if (Object.keys(currentMembers).length >= 0) {
        populateSprintSelector();
    }
}

function populateSprintSelector() {
    const menu = document.getElementById('sprint-menu');
    const text = document.getElementById('selected-sprint-text');
    if (!menu) return;

    const sprintSet = new Set();

    // Add explicitly defined sprints
    Object.keys(currentSprints || {}).forEach(k => sprintSet.add(k));

    // Add sprints mentioned in tasks
    Object.values(allTasks).forEach(t => {
        if (t.sprintName) sprintSet.add(t.sprintName);
    });

    const sprintList = Array.from(sprintSet).sort((a, b) => {
        const na = parseInt(a), nb = parseInt(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
        return String(a).localeCompare(String(b));
    });

    if (sprintList.length === 0) {
        menu.innerHTML = '<p class="text-[10px] font-black uppercase text-gray-500 text-center py-4">No Sprints</p>';
        text.innerText = 'No Sprints';
        renderEmptyState();
        return;
    }

    let menuHTML = `
        <div class="dropdown-item group/item ${selectedSprint === 'All' ? 'selected' : ''}" onclick="selectSprint('All')">
            <div class="flex items-center">
                <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-hover/item:bg-accent-purple/20 transition-colors">
                    <i data-lucide="layers" class="w-3.5 h-3.5 text-gray-500 group-hover/item:text-accent-purple"></i>
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider">All Missions</span>
            </div>
            ${selectedSprint === 'All' ? '<i data-lucide="check" class="w-3.5 h-3.5 text-accent-purple"></i>' : ''}
        </div>
        <div class="h-[1px] bg-white/5 my-2 mx-2"></div>
    `;

    menuHTML += sprintList.map(s => {
        const num = parseInt(s);
        const label = !isNaN(num) ? `${num}${getOrdinal(num)} Sprint` : s;
        return `
            <div class="dropdown-item group/item ${s === selectedSprint ? 'selected' : ''}" onclick="selectSprint('${s}')">
                <div class="flex items-center">
                    <div class="w-6 h-6 rounded-lg bg-white/5 flex items-center justify-center mr-3 group-hover/item:bg-cyan-500/20 transition-colors">
                        <i data-lucide="zap" class="w-3.5 h-3.5 text-gray-500 group-hover/item:text-cyan-400"></i>
                    </div>
                    <span class="text-[10px] font-bold uppercase tracking-wider">${label}</span>
                </div>
                ${s === selectedSprint ? '<i data-lucide="check" class="w-3.5 h-3.5 text-cyan-400"></i>' : ''}
            </div>
        `;
    }).join('');

    menu.innerHTML = menuHTML;

    if (selectedSprint === 'All') {
        text.innerText = 'All Missions';
    } else {
        const activeNum = parseInt(selectedSprint);
        text.innerText = !isNaN(activeNum) ? `${activeNum}${getOrdinal(activeNum)} Sprint` : selectedSprint;
    }

    refreshIcons();
    updateAnalytics();
}

function toggleSprintDropdown(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('sprint-selector-dropdown');
    if (dropdown) dropdown.classList.toggle('active');
}

function selectSprint(sprint) {
    selectedSprint = sprint;
    localStorage.setItem('tt_sprint', sprint);
    const dropdown = document.getElementById('sprint-selector-dropdown');
    if (dropdown) dropdown.classList.remove('active');

    populateSprintSelector();
}

function updateAnalytics() {
    if (!selectedSprint) return;

    // Filter tasks based on selected sprint
    const sprintTasks = selectedSprint === 'All'
        ? Object.values(allTasks)
        : Object.values(allTasks).filter(t => t.sprintName === selectedSprint);
    const total = sprintTasks.length;
    const done = sprintTasks.filter(t => t.status === 'Done').length;
    const velocity = total > 0 ? Math.round((done / total) * 100) : 0;

    // High Level Stats
    animateValue('stat-total', parseInt(document.getElementById('stat-total').innerText) || 0, total, 1000);
    animateValue('stat-done', parseInt(document.getElementById('stat-done').innerText) || 0, done, 1000);
    document.getElementById('stat-velocity').innerText = `${velocity}%`;

    renderPerformanceChart(sprintTasks);
    renderStatusDistribution(sprintTasks);
    updateSprintInsight(velocity, sprintTasks);
}

let performanceChart = null;

function renderPerformanceChart(tasks) {
    const ctx = document.getElementById('performanceChart').getContext('2d');

    if (tasks.length === 0) {
        if (performanceChart) performanceChart.destroy();
        return;
    }

    // --- DATA PROCESSING FOR BURNDOWN ---
    // 1. Determine Date Range
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dates = tasks.filter(t => t.endDate).map(t => new Date(t.endDate));
    if (dates.length === 0) return; // Need end dates for burndown

    const sprintEnd = new Date(Math.max(...dates));
    sprintEnd.setHours(0, 0, 0, 0);

    // Sprint Start: Usually we'd have this, but let's assume 14 days before end or earliest created date
    const creationDates = tasks.map(t => new Date(t.createdAt || Date.now()));
    const sprintStart = new Date(Math.min(...creationDates));
    sprintStart.setHours(0, 0, 0, 0);


    const dailyLabels = [];
    const chartData_Velocity = [];

    let curr = new Date(sprintStart);
    // Start 1-2 days before today to show context history
    if (curr.getTime() >= today.getTime()) {
        curr.setDate(curr.getDate() - 2);
    } else {
        curr.setDate(curr.getDate() - 1);
    }

    while (curr <= today || curr <= sprintEnd) {
        const dateStr = curr.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        dailyLabels.push(dateStr);

        // Count missions completed ON THIS SPECIFIC DAY
        const completionsOnThisDay = tasks.filter(t => {
            if (t.status !== 'Done') return false;
            const doneDate = new Date(t.updatedAt || t.createdAt);
            return doneDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) === dateStr;
        }).length;

        chartData_Velocity.push(completionsOnThisDay);

        curr.setDate(curr.getDate() + 1);
        if (dailyLabels.length > 31) break;
    }

    // --- CHART RENDERING ---
    if (performanceChart) performanceChart.destroy();

    const velocityGradient = ctx.createLinearGradient(0, 0, 0, 400);
    velocityGradient.addColorStop(0, 'rgba(34, 211, 238, 0.5)'); // Cyan-400
    velocityGradient.addColorStop(1, 'rgba(34, 211, 238, 0)');

    performanceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: dailyLabels,
            datasets: [
                {
                    label: 'Missions Completed',
                    data: chartData_Velocity,
                    borderColor: '#22d3ee',
                    backgroundColor: velocityGradient,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 6,
                    pointBackgroundColor: '#22d3ee',
                    pointBorderColor: 'rgba(255,255,255,0.2)',
                    pointBorderWidth: 2,
                    borderWidth: 3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(17, 24, 39, 0.95)',
                    padding: 12,
                    cornerRadius: 12,
                    titleFont: { size: 12, family: 'Inter', weight: '900' },
                    bodyFont: { size: 12, family: 'Inter' },
                    callbacks: {
                        label: (context) => ` ${context.raw} Missions Completed`
                    }
                }
            },
            scales: {
                x: {
                    grid: { display: false },
                    ticks: { color: 'rgba(156, 163, 175, 0.5)', font: { size: 10, weight: 'bold', family: 'Inter' } }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255, 255, 255, 0.03)', drawBorder: false },
                    ticks: {
                        color: 'rgba(156, 163, 175, 0.5)',
                        font: { size: 10, weight: 'black', family: 'Inter' },
                        stepSize: 1,
                        precision: 0
                    }
                }
            },
            animation: {
                duration: 2000,
                easing: 'easeOutQuart'
            }
        }
    });
}

function renderStatusDistribution(tasks) {
    const distribution = document.getElementById('status-distribution');

    // Group by member
    const memberStats = {};
    Object.keys(currentMembers).forEach(mId => {
        memberStats[mId] = { total: 0, done: 0, name: currentMembers[mId].name };
    });

    tasks.forEach(t => {
        if (memberStats[t.assignedTo]) {
            memberStats[t.assignedTo].total++;
            if (t.status === 'Done') memberStats[t.assignedTo].done++;
        }
    });

    // Render bars for each member who has tasks
    const activeMembers = Object.values(memberStats).filter(s => s.total > 0);

    if (activeMembers.length === 0) {
        distribution.innerHTML = '<p class="text-[10px] font-black uppercase text-gray-700 tracking-widest text-center py-10">No missions assigned yet</p>';
        return;
    }

    distribution.innerHTML = activeMembers.map(stats => {
        const pct = Math.round((stats.done / stats.total) * 100);

        let barGradient = 'from-accent-purple to-purple-400';
        let barShadow = 'shadow-[0_0_15px_rgba(168,85,247,0.2)]';
        let textColor = 'text-accent-purple';

        if (pct === 100) {
            barGradient = 'from-emerald-500 to-teal-400';
            barShadow = 'shadow-[0_0_15px_rgba(16,185,129,0.3)]';
            textColor = 'text-emerald-500';
        } else if (pct > 0) {
            barGradient = 'from-blue-600 to-cyan-400';
            barShadow = 'shadow-[0_0_15px_rgba(37,99,235,0.2)]';
            textColor = 'text-blue-500';
        }

        return `
            <div class="space-y-3 pb-2 group/member">
                <div class="flex justify-between items-end text-[10px] font-black uppercase tracking-widest">
                    <span class="text-white opacity-80 group-hover/member:opacity-100 transition-opacity">${stats.name}</span>
                    <span class="${textColor} font-bold tracking-tighter text-xs">${stats.done}/${stats.total} DONE</span>
                </div>
                <div class="h-2.5 w-full bg-white/5 rounded-full overflow-hidden border border-white/5 p-[1px] relative">
                    <div class="h-full bg-gradient-to-r ${barGradient} ${barShadow} transition-all duration-1000 ease-out rounded-full relative" 
                         style="width: ${pct}%">
                        <div class="absolute inset-0 bg-white/20 mix-blend-overlay"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function updateSprintInsight(velocity, tasks) {
    const insightEl = document.getElementById('sprint-health-insight');
    if (tasks.length === 0) {
        insightEl.innerText = "Add some missions to this sprint to start generating health insights!";
        return;
    }

    if (velocity >= 80) {
        insightEl.innerText = "Sprint performance is exceptional! The team is burning through missions at high velocity with low friction.";
    } else if (velocity >= 50) {
        insightEl.innerText = "Sprint is moving steadily. Significant progress made, focused effort required to close remaining backlog.";
    } else {
        insightEl.innerText = "Velocity is currently lower than expected. Monitor mission barriers and ensure resources are properly allocated.";
    }
}

function renderEmptyState() {
    document.getElementById('chart-container').innerHTML = '<div class="w-full text-center py-20 text-gray-700 font-black uppercase tracking-widest text-sm">Waiting for mission data...</div>';
    document.getElementById('status-distribution').innerHTML = '';
}

function backToTeam() {
    window.location.href = "team.html";
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    if (!obj) return;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start);
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

// Handle click outside to close dropdown
document.addEventListener('click', () => {
    const dropdown = document.getElementById('sprint-selector-dropdown');
    if (dropdown) dropdown.classList.remove('active');
});

window.onload = initAnalytics;
