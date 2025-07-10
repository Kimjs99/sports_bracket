// =================================================================
// 1. FIREBASE & APP INITIALIZATION
// =================================================================
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : { apiKey: "DEMO_KEY", authDomain: "DEMO.firebaseapp.com", projectId: "DEMO" };
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-sports-bracket-app';

// Initialize Firebase using the compat libraries
const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// =================================================================
// 2. GLOBAL VARIABLES & STATE MANAGEMENT
// =================================================================
let currentUserId = null;
let dbCollectionRef;
let currentTournamentId = null;
let currentTournamentUnsubscribe = null;
let currentData = null;

// =================================================================
// 3. UI ELEMENT SELECTORS
// =================================================================
const userIdSpan = document.getElementById('userId');
const tournamentSelectionSection = document.getElementById('tournament-selection-section');
const tournamentList = document.getElementById('tournament-list');
const showCreateSectionButton = document.getElementById('show-create-section-button');
const setupSection = document.getElementById('setup-section');
const backToListButton = document.getElementById('back-to-list-button');
const backToListButton2 = document.getElementById('back-to-list-button-2');
const generateButton = document.getElementById('generate-button');
const outputSection = document.getElementById('output-section');
const loadedTournamentName = document.getElementById('loaded-tournament-name');
const dateFilter = document.getElementById('date-filter');
const clearFilterButton = document.getElementById('clear-filter-button');
const saveImageButton = document.getElementById('save-image-button');
const deleteTournamentButton = document.getElementById('delete-tournament-button');
const bracketContainer = document.getElementById('bracket-container');
const standingsContainer = document.getElementById('standings-container');
const championSection = document.getElementById('champion-section');
const championName = document.getElementById('champion-name');
const confettiContainer = document.getElementById('confetti-container');
const modal = document.getElementById('message-modal');
const modalTitle = document.getElementById('modal-title');
const modalMessage = document.getElementById('modal-message');
const modalClose = document.getElementById('modal-close');
const confirmModal = document.getElementById('confirm-modal');
const confirmTitle = document.getElementById('confirm-title');
const confirmMessage = document.getElementById('confirm-message');
const confirmOk = document.getElementById('confirm-ok');
const confirmCancel = document.getElementById('confirm-cancel');
let confirmCallback = null;

// =================================================================
// 4. UI & MODAL UTILITY FUNCTIONS
// =================================================================
function showMessage(title, message) {
    modalTitle.textContent = title;
    modalMessage.textContent = message;
    modal.classList.remove('hidden');
}
modalClose.addEventListener('click', () => modal.classList.add('hidden'));

function showConfirm(title, message, callback) {
    confirmTitle.textContent = title;
    confirmMessage.textContent = message;
    confirmCallback = callback;
    confirmModal.classList.remove('hidden');
}
confirmOk.addEventListener('click', () => { if (confirmCallback) confirmCallback(); confirmModal.classList.add('hidden'); });
confirmCancel.addEventListener('click', () => confirmModal.classList.add('hidden'));
        
const showTournamentListScreen = () => {
    tournamentSelectionSection.classList.remove('hidden');
    setupSection.classList.add('hidden');
    outputSection.classList.add('hidden');
    if(currentTournamentUnsubscribe) currentTournamentUnsubscribe();
    currentTournamentId = null;
};
const showSetupSection = () => {
    document.getElementById('tournament-name').value = ''; document.getElementById('teams').value = '';
    tournamentSelectionSection.classList.add('hidden');
    setupSection.classList.remove('hidden');
    outputSection.classList.add('hidden');
};
const showOutputSection = () => {
    tournamentSelectionSection.classList.add('hidden');
    setupSection.classList.add('hidden');
    outputSection.classList.remove('hidden');
};

// =================================================================
// 5. AUTHENTICATION & DATA INITIALIZATION
// =================================================================
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUserId = user.uid;
        userIdSpan.textContent = currentUserId;
        dbCollectionRef = db.collection("artifacts").doc(appId).collection("users").doc(currentUserId).collection("tournaments");
        await loadTournamentList();
        showTournamentListScreen();
    }
});

async function initializeAuth() {
    try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) { await auth.signInWithCustomToken(__initial_auth_token); } 
        else { await auth.signInAnonymously(); }
    } catch (error) {
        console.error("Auth failed, falling back to anonymous:", error);
        try { await auth.signInAnonymously(); } 
        catch (anonError) { console.error("Anonymous sign-in also failed:", anonError); showMessage("인증 오류", "사용자 인증에 실패했습니다."); }
    }
}
        
initializeAuth();

// =================================================================
// 6. TOURNAMENT MANAGEMENT LOGIC
// =================================================================
async function loadTournamentList() {
    if (!dbCollectionRef) return;
    const querySnapshot = await dbCollectionRef.get();
    tournamentList.innerHTML = '';
    if (querySnapshot.empty) {
        tournamentList.innerHTML = '<p class="text-gray-500">생성된 대회가 없습니다.</p>';
        return;
    }
    querySnapshot.forEach((doc) => {
        const tournament = doc.data();
        const button = document.createElement('button');
        button.className = 'w-full text-left p-3 bg-gray-100 hover:bg-indigo-100 rounded-md transition-colors';
        button.innerHTML = `<span class="font-bold">${tournament.name}</span> <span class="text-sm text-gray-600">(${tournament.format}, ${new Date(tournament.createdAt).toLocaleDateString()})</span>`;
        button.onclick = () => loadTournament(doc.id);
        tournamentList.appendChild(button);
    });
}

function loadTournament(tournamentId) {
    currentTournamentId = tournamentId;
    const dbRef = dbCollectionRef.doc(tournamentId);
    if (currentTournamentUnsubscribe) currentTournamentUnsubscribe();
    currentTournamentUnsubscribe = dbRef.onSnapshot((docSnap) => {
        if (docSnap.exists) {
            currentData = docSnap.data();
            loadedTournamentName.textContent = currentData.name;
            render(currentData);
            showOutputSection();
        } else {
            showMessage("오류", "대회를 불러올 수 없습니다.");
            showTournamentListScreen();
        }
    });
}

async function createTournament() {
    const name = document.getElementById('tournament-name').value.trim();
    const teams = document.getElementById('teams').value.split('\n').map(t => t.trim()).filter(t => t);
    const format = document.querySelector('input[name="format"]:checked').value;
    const startDate = document.getElementById('start-date').value;
    const endDate = document.getElementById('end-date').value;

    if (!name) { showMessage("입력 오류", "대회명을 입력해주세요."); return; }
    if (teams.length < 2) { showMessage("입력 오류", "최소 2개 팀을 입력해야 합니다."); return; }
    if (!startDate || !endDate || new Date(startDate) > new Date(endDate)) { showMessage("입력 오류", "올바른 경기 기간을 입력해주세요."); return; }

    let schedule = (format === 'tournament') ? generateTournament(teams) : generateRoundRobin(teams);
    assignDates(schedule, new Date(startDate), new Date(endDate));

    const newTournamentData = { name, teams, format, schedule, startDate, endDate, results: {}, createdAt: new Date().toISOString() };

    try {
        const docRef = await dbCollectionRef.add(newTournamentData);
        await loadTournamentList();
        loadTournament(docRef.id);
    } catch (error) { showMessage("저장 오류", "대회 생성 중 오류 발생: " + error.message); }
}

// =================================================================
// 7. EVENT LISTENERS
// =================================================================
showCreateSectionButton.addEventListener('click', showSetupSection);
backToListButton.addEventListener('click', showTournamentListScreen);
backToListButton2.addEventListener('click', showTournamentListScreen);
generateButton.addEventListener('click', createTournament);
dateFilter.addEventListener('change', () => render(currentData));
clearFilterButton.addEventListener('click', () => { dateFilter.value = ''; render(currentData); });
saveImageButton.addEventListener('click', () => {
    const captureElement = document.getElementById('capture-area');
    html2canvas(captureElement, { backgroundColor: '#f9fafb', useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `${currentData.name || 'tournament'}-result.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});
deleteTournamentButton.addEventListener('click', async () => {
    if (!currentTournamentId) return;
    showConfirm("대회 삭제", "정말로 이 대회를 삭제하시겠습니까?", async () => {
        await dbCollectionRef.doc(currentTournamentId).delete();
        await loadTournamentList();
        showTournamentListScreen();
        showMessage("삭제 완료", "대회가 삭제되었습니다.");
    });
});

// =================================================================
// 8. BRACKET & SCHEDULE GENERATION LOGIC
// =================================================================
function generateTournament(teams) {
    let shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
    const teamCount = shuffledTeams.length; if (teamCount < 2) return [];
    const nextPowerOfTwo = Math.pow(2, Math.ceil(Math.log2(teamCount)));
    const numByes = nextPowerOfTwo - teamCount;
    const numPlayInTeams = teamCount - numByes;
    let allMatches = [], teamsForNextRound = [];
    const byeTeams = shuffledTeams.slice(0, numByes);
    teamsForNextRound.push(...byeTeams);
    const playInTeams = shuffledTeams.slice(numByes);
    if (numPlayInTeams > 0) {
        const round1MatchesCount = numPlayInTeams / 2;
        for (let i = 0; i < round1MatchesCount; i++) {
            const match = { matchId: `R1M${i + 1}`, round: 1, team1: playInTeams[i * 2], team2: playInTeams[i * 2 + 1], score1: null, score2: null, winner: null };
            allMatches.push(match);
            teamsForNextRound.push({ winnerOf: match.matchId }); 
        }
    }
    let roundNum = (numPlayInTeams > 0) ? 2 : 1;
    let currentRoundTeams = teamsForNextRound;
    currentRoundTeams.sort(() => Math.random() - 0.5);
    while (currentRoundTeams.length > 1) {
        let nextRoundTeams = [];
        const roundMatchesCount = currentRoundTeams.length / 2;
        for (let i = 0; i < roundMatchesCount; i++) {
            const team1_obj = currentRoundTeams[i * 2], team2_obj = currentRoundTeams[i * 2 + 1];
            const match = {
                matchId: `R${roundNum}M${i + 1}`, round: roundNum,
                team1: typeof team1_obj === 'string' ? team1_obj : null,
                team2: typeof team2_obj === 'string' ? team2_obj : null,
                team1_placeholder: typeof team1_obj !== 'string' ? team1_obj : null,
                team2_placeholder: typeof team2_obj !== 'string' ? team2_obj : null,
                score1: null, score2: null, winner: null
            };
            allMatches.push(match);
            nextRoundTeams.push({ winnerOf: match.matchId });
        }
        currentRoundTeams = nextRoundTeams;
        roundNum++;
    }
    return allMatches;
}

function generateRoundRobin(teams) {
    let schedule = [], teamList = [...teams];
    if (teamList.length % 2 !== 0) teamList.push("BYE");
    const rounds = teamList.length - 1;
    const matchesPerRound = teamList.length / 2;
    let matchIdCounter = 1;
    for (let r = 0; r < rounds; r++) {
        for (let i = 0; i < matchesPerRound; i++) {
            const team1 = teamList[i], team2 = teamList[teamList.length - 1 - i];
            if (team1 !== "BYE" && team2 !== "BYE") schedule.push({ matchId: `M${matchIdCounter++}`, round: r + 1, team1, team2, score1: null, score2: null });
        }
        const lastTeam = teamList.pop();
        teamList.splice(1, 0, lastTeam);
    }
    return schedule;
}

function assignDates(schedule, startDate, endDate) {
    const totalDays = (endDate - startDate) / (1000 * 60 * 60 * 24) + 1;
    const rounds = [...new Set(schedule.map(m => m.round))].sort((a,b) => a - b);
    const totalRounds = rounds.length; if (totalRounds === 0) return;
    const daysPerRound = Math.max(1, Math.floor(totalDays / totalRounds));
    let currentDate = new Date(startDate);
    for (let i = 0; i < totalRounds; i++) {
        const roundNum = rounds[i];
        const roundDate = new Date(currentDate);
        schedule.forEach(match => { if (match.round === roundNum) match.date = roundDate.toISOString().split('T')[0]; });
        currentDate.setDate(currentDate.getDate() + daysPerRound);
        if (currentDate > endDate) currentDate = new Date(endDate);
    }
}

// =================================================================
// 9. EVENT HANDLERS
// =================================================================
function addScoreInputListeners() {
    document.querySelectorAll('input[type="number"][data-matchid]').forEach(input => {
        input.removeEventListener('change', handleScoreChange);
        input.addEventListener('change', handleScoreChange);
    });
}

async function handleScoreChange(event) {
    if (!currentData || !currentTournamentId) return;
    
    const newData = JSON.parse(JSON.stringify(currentData));
    const input = event.target;
    const matchId = input.dataset.matchid, teamNum = input.dataset.team, score = input.value;
    const matchIndex = newData.schedule.findIndex(m => m.matchId === matchId);
    if (matchIndex === -1) return;
    newData.results[matchId] = newData.results[matchId] || { matchId, team1: newData.schedule[matchIndex].team1, team2: newData.schedule[matchIndex].team2 };
    newData.results[matchId][`score${teamNum}`] = score !== '' ? parseInt(score) : null;
    const matchResult = newData.results[matchId];
    if (newData.format === 'tournament' && matchResult.score1 !== null && matchResult.score2 !== null) {
        const winner = matchResult.score1 > matchResult.score2 ? matchResult.team1 : matchResult.team2;
        newData.schedule[matchIndex].winner = winner;
        const nextMatchIndex = newData.schedule.findIndex(m => (m.team1_placeholder?.winnerOf === matchId) || (m.team2_placeholder?.winnerOf === matchId));
        if (nextMatchIndex !== -1) {
            if (newData.schedule[nextMatchIndex].team1_placeholder?.winnerOf === matchId) newData.schedule[nextMatchIndex].team1 = winner;
            if (newData.schedule[nextMatchIndex].team2_placeholder?.winnerOf === matchId) newData.schedule[nextMatchIndex].team2 = winner;
        }
    }
    try {
        const dbRef = dbCollectionRef.doc(currentTournamentId);
        await dbRef.update({ schedule: newData.schedule, results: newData.results });
    } catch(e) { showMessage("업데이트 오류", "점수 업데이트 중 오류가 발생했습니다."); }
}

// =================================================================
// 10. RENDERING LOGIC
// =================================================================
function render(data) {
    if (!data) return;
    currentData = data; 
    
    championSection.classList.add('hidden');
    bracketContainer.innerHTML = ''; 
    standingsContainer.innerHTML = '';

    const filterValue = dateFilter.value;
    let scheduleToRender = data.schedule;
    if (filterValue) scheduleToRender = data.schedule.filter(match => match.date === filterValue);
    
    if (data.format === 'tournament') renderTournament(scheduleToRender, data.results, data.schedule);
    else if (data.format === 'round-robin') renderRoundRobin(scheduleToRender, data.results, data.teams);
}

function renderTournament(schedule, results, originalSchedule) {
    const rounds = [];
    if (!Array.isArray(originalSchedule)) return;
    originalSchedule.forEach(match => {
        const roundIndex = match.round - 1;
        if (!rounds[roundIndex]) rounds[roundIndex] = [];
         if (schedule.find(s => s.matchId === match.matchId)) rounds[roundIndex].push(match);
         else rounds[roundIndex].push({ round: match.round, hidden: true });
    });

    const getTeamDisplayName = (team, placeholder) => {
        if (team) return team; if (placeholder && placeholder.winnerOf) return `(${placeholder.winnerOf} 승자)`;
        return '미정';
    };
    const container = document.createElement('div');
    container.className = 'flex overflow-x-auto space-x-8 p-4 rounded-xl';
    if(schedule.length === 0 && dateFilter.value) container.innerHTML = `<p class="text-gray-600 text-center w-full">선택한 날짜에 예정된 경기가 없습니다.</p>`

    rounds.forEach((round) => {
         if (!round) return;
        const roundEl = document.createElement('div');
        roundEl.className = 'round flex flex-col justify-around space-y-8 min-w-[220px]';
        if(round.some(m => !m.hidden)) roundEl.innerHTML = `<h3 class="text-xl font-bold text-center mb-4">${round.find(m => !m.hidden).round} 라운드</h3>`;
        const matchesWrapper = document.createElement('div');
        matchesWrapper.className = 'flex flex-col justify-around flex-grow space-y-8';
        round.forEach((match) => {
            if (match.hidden) {
                const hiddenEl = document.createElement('div'); hiddenEl.className = 'match-wrapper';
                hiddenEl.style.visibility = 'hidden'; const p = document.createElement('div'); p.className = 'match-item bg-transparent p-3';
                hiddenEl.appendChild(p); matchesWrapper.appendChild(hiddenEl);
                return;
            }
            const matchWrapper = document.createElement('div'), matchEl = document.createElement('div');
            matchWrapper.className = 'match-wrapper'; matchEl.className = 'match-item bg-gray-100 p-3 rounded-lg shadow-sm';
            const team1Display = getTeamDisplayName(match.team1, match.team1_placeholder);
            const team2Display = getTeamDisplayName(match.team2, match.team2_placeholder);
            matchEl.innerHTML = `
                <div class="flex justify-between items-center mb-1"><span class="font-medium text-sm">${team1Display}</span><input type="number" data-matchid="${match.matchId}" data-team="1" class="team-input border rounded px-1 text-center" ${!match.team1 || !match.team2 ? 'disabled' : ''} value="${results[match.matchId]?.score1 ?? ''}"></div>
                <div class="flex justify-between items-center"><span class="font-medium text-sm">${team2Display}</span><input type="number" data-matchid="${match.matchId}" data-team="2" class="team-input border rounded px-1 text-center" ${!match.team1 || !match.team2 ? 'disabled' : ''} value="${results[match.matchId]?.score2 ?? ''}"></div>
                ${match.date ? `<div class="text-xs text-gray-500 text-center mt-2">${match.date}</div>` : ''}
            `;
            const connector = document.createElement('div'); connector.className = 'match-connector';
            matchWrapper.appendChild(matchEl);
            const hasNextMatch = originalSchedule.some(m => m.team1_placeholder?.winnerOf === match.matchId || m.team2_placeholder?.winnerOf === match.matchId);
            if (hasNextMatch) matchWrapper.appendChild(connector);
            matchesWrapper.appendChild(matchWrapper);
        });
        if(round.some(m => !m.hidden)) { roundEl.appendChild(matchesWrapper); container.appendChild(roundEl); }
    });
    bracketContainer.innerHTML = ''; bracketContainer.appendChild(container);
    addScoreInputListeners();
    const maxRound = Math.max(...originalSchedule.map(m => m.round));
    const finalMatch = originalSchedule.find(m => m.round === maxRound);
    if (finalMatch && finalMatch.winner) {
        championName.textContent = finalMatch.winner;
        championSection.classList.remove('hidden');
        createConfetti();
    } else championSection.classList.add('hidden');
}

function renderRoundRobin(schedule, results, teams) {
    bracketContainer.innerHTML = '';
    if(schedule.length === 0) bracketContainer.innerHTML = `<p class="text-gray-600 text-center w-full">선택한 날짜에 예정된 경기가 없습니다.</p>`
    schedule.forEach(match => {
        const el = document.createElement('div');
        el.className = 'bg-white p-4 rounded-lg shadow-md mb-4 flex items-center justify-between flex-wrap';
        el.innerHTML = `
            <div class="mb-2 md:mb-0"><p class="text-sm text-gray-500">${match.date} / 라운드 ${match.round}</p><p class="text-lg font-semibold">${match.team1} vs ${match.team2}</p></div>
            <div class="flex items-center space-x-2"><input type="number" data-matchid="${match.matchId}" data-team="1" class="w-16 border rounded px-2 py-1 text-center" value="${results[match.matchId]?.score1 ?? ''}"><span>-</span><input type="number" data-matchid="${match.matchId}" data-team="2" class="w-16 border rounded px-2 py-1 text-center" value="${results[match.matchId]?.score2 ?? ''}"></div>
        `;
        bracketContainer.appendChild(el);
    });
    renderStandings(teams, results);
    addScoreInputListeners();
}

function renderStandings(teams, results) {
    const standings = {};
    teams.forEach(team => { standings[team] = { played: 0, win: 0, draw: 0, loss: 0, gf: 0, ga: 0, gd: 0, points: 0 }; });
    Object.values(results).forEach(res => {
        if(!res.team1 || !res.team2 || !standings[res.team1] || !standings[res.team2]) return;
        const s1 = parseInt(res.score1), s2 = parseInt(res.score2);
        if (!isNaN(s1) && !isNaN(s2)) {
            standings[res.team1].played++; standings[res.team2].played++;
            standings[res.team1].gf += s1; standings[res.team2].gf += s2;
            standings[res.team1].ga += s2; standings[res.team2].ga += s1;
            standings[res.team1].gd = standings[res.team1].gf - standings[res.team1].ga;
            standings[res.team2].gd = standings[res.team2].gf - standings[res.team2].ga;
            if (s1 > s2) { standings[res.team1].win++; standings[res.team2].loss++; standings[res.team1].points += 3; } 
            else if (s1 < s2) { standings[res.team2].win++; standings[res.team1].loss++; standings[res.team2].points += 3; }
            else { standings[res.team1].draw++; standings[res.team2].draw++; standings[res.team1].points++; standings[res.team2].points++; }
        }
    });
    const sortedTeams = Object.entries(standings).sort(([,a], [,b]) => b.points - a.points || b.gd - a.gd || b.gf - a.gf);
    let tableHtml = `<h3 class="text-2xl font-bold mb-4 text-center">경기 순위표</h3><div class="overflow-x-auto"><table class="min-w-full divide-y divide-gray-200"><thead class="bg-gray-50"><tr><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">순위</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">팀</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">경기</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">승</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">무</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">패</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">득/실</th><th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">승점</th></tr></thead><tbody class="bg-white divide-y divide-gray-200">`;
    sortedTeams.forEach(([team, stats], index) => { tableHtml += `<tr><td class="px-6 py-4 whitespace-nowrap">${index + 1}</td><td class="px-6 py-4 whitespace-nowrap font-medium">${team}</td><td class="px-6 py-4 whitespace-nowrap">${stats.played}</td><td class="px-6 py-4 whitespace-nowrap">${stats.win}</td><td class="px-6 py-4 whitespace-nowrap">${stats.draw}</td><td class="px-6 py-4 whitespace-nowrap">${stats.loss}</td><td class="px-6 py-4 whitespace-nowrap">${stats.gf}/${stats.ga} (${stats.gd > 0 ? '+' : ''}${stats.gd})</td><td class="px-6 py-4 whitespace-nowrap font-bold">${stats.points}</td></tr>`; });
    tableHtml += `</tbody></table></div>`;
    standingsContainer.innerHTML = tableHtml;
}

function createConfetti() {
    confettiContainer.innerHTML = '';
    const confettiCount = 100;
    const colors = ['#fde19a', '#ffbe0b', '#fb5607', '#ff006e', '#8338ec', '#3a86ff'];
    for (let i = 0; i < confettiCount; i++) {
        const el = document.createElement('div');
        el.classList.add('confetti');
        el.style.left = `${Math.random() * 100}vw`;
        el.style.top = `${Math.random() * -50}vh`;
        el.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
        el.style.animationDelay = `${Math.random() * 2}s`;
        const size = `${Math.random() * 8 + 5}px`;
        el.style.width = size;
        el.style.height = size;
        el.style.opacity = Math.random();
        confettiContainer.appendChild(el);
    }
}
