// Application State
let scenes = JSON.parse(localStorage.getItem('continuity_scenes') || '[]');
let stagedQueue = []; // Temporary queue before permanent save

// DOM Elements
const elements = {
    tabAdd: document.getElementById('tab-add'),
    tabMaster: document.getElementById('tab-master'),
    tabCharacter: document.getElementById('tab-character'),
    viewAdd: document.getElementById('view-add'),
    viewMaster: document.getElementById('view-master'),
    viewCharacter: document.getElementById('view-character'),
    sceneForm: document.getElementById('scene-form'),
    sceneNoInput: document.getElementById('scene-no'),
    characterInput: document.getElementById('character-name'),
    costumeInput: document.getElementById('costume'),
    propsInput: document.getElementById('props'),
    descriptionInput: document.getElementById('description'),
    stagedTableBody: document.getElementById('staged-table-body'),
    queueCountSpan: document.getElementById('queue-count'),
    saveAllScenesBtn: document.getElementById('save-all-scenes-btn'),
    masterTableBody: document.getElementById('master-table-body'),
    charBreakdownContainer: document.getElementById('character-breakdown-container'),
    downloadMasterBtn: document.getElementById('download-master-btn'),
    downloadAllCharsBtn: document.getElementById('download-all-chars-btn')
};

// Tab Switching Logic
elements.tabAdd.addEventListener('click', () => switchTab('add'));
elements.tabMaster.addEventListener('click', () => switchTab('master'));
elements.tabCharacter.addEventListener('click', () => switchTab('character'));

function switchTab(tabName) {
    [elements.tabAdd, elements.tabMaster, elements.tabCharacter].forEach(b => b.classList.remove('active'));
    [elements.viewAdd, elements.viewMaster, elements.viewCharacter].forEach(v => v.classList.add('hidden'));

    if (tabName === 'add') {
        elements.tabAdd.classList.add('active');
        elements.viewAdd.classList.remove('hidden');
    } else if (tabName === 'master') {
        elements.tabMaster.classList.add('active');
        elements.viewMaster.classList.remove('hidden');
        renderMasterTable();
    } else if (tabName === 'character') {
        elements.tabCharacter.classList.add('active');
        elements.viewCharacter.classList.remove('hidden');
        renderCharacterBreakdown();
    }
}

// Alphanumeric Scene Sorter (Handles 1, 1A, 1B, 2 properly)
function compareSceneNumbers(a, b) {
    const parseSceneNo = (val) => {
        const str = String(val).trim();
        const match = str.match(/^(\d+)(.*)$/);
        if (!match) return [0, str];
        return [parseInt(match[1], 10), match[2].toUpperCase()];
    };
    const [numA, alphaA] = parseSceneNo(a);
    const [numB, alphaB] = parseSceneNo(b);
    if (numA !== numB) return numA - numB;
    return alphaA.localeCompare(alphaB);
}

// 1. Handle adding scene to temporary queue
elements.sceneForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const stagedScene = {
        id: 'staged_' + Date.now() + '_' + Math.random().toString(36.substring(2, 5)),
        sceneNo: elements.sceneNoInput.value.trim(),
        characters: elements.characterInput.value.split(',').map(c => c.trim()).filter(Boolean),
        costume: elements.costumeInput.value.trim(),
        props: elements.propsInput.value.trim(),
        description: elements.descriptionInput.value.trim()
    };

    stagedQueue.push(stagedScene);
    renderStagedQueue();

    // Reset input fields and refocus on scene number for rapid entry
    elements.sceneForm.reset();
    elements.sceneNoInput.focus();
});

// Remove item from staging queue
window.removeStagedScene = function(id) {
    stagedQueue = stagedQueue.filter(s => s.id !== id);
    renderStagedQueue();
};

function renderStagedQueue() {
    elements.stagedTableBody.innerHTML = '';
    elements.queueCountSpan.textContent = stagedQueue.length;
    
    if (stagedQueue.length === 0) {
        elements.stagedTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No scenes added to queue yet. Fill out the form above.</td></tr>`;
        elements.saveAllScenesBtn.disabled = true;
        return;
    }

    elements.saveAllScenesBtn.disabled = false;

    stagedQueue.forEach(scene => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${scene.sceneNo}</strong></td>
            <td>${scene.characters.join(', ')}</td>
            <td>${scene.costume || '-'}</td>
            <td>${scene.props || '-'}</td>
            <td>${scene.description || '-'}</td>
            <td><button class="btn btn-danger" onclick="window.removeStagedScene('${scene.id}')"><i class="ph ph-trash"></i></button></td>
        `;
        elements.stagedTableBody.appendChild(tr);
    });
}

// 2. Commit all staged scenes to persistent database storage
elements.saveAllScenesBtn.addEventListener('click', () => {
    if (stagedQueue.length === 0) return;

    // Remove temporary ID properties and push to main scenes list
    const finalizedScenes = stagedQueue.map(({ id, ...rest }) => ({
        id: 'scene_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
        ...rest
    }));

    scenes.push(...finalizedScenes);
    scenes.sort((a, b) => compareSceneNumbers(a.sceneNo, b.sceneNo));
    localStorage.setItem('continuity_scenes', JSON.stringify(scenes));

    // Clear queue
    stagedQueue = [];
    renderStagedQueue();

    alert('All scenes successfully saved to database!');
    switchTab('master');
});

// Delete Scene from Master Record
window.deleteScene = function(id) {
    if (confirm('Are you sure you want to delete this scene?')) {
        scenes = scenes.filter(s => s.id !== id);
        localStorage.setItem('continuity_scenes', JSON.stringify(scenes));
        renderMasterTable();
        renderCharacterBreakdown();
    }
};

// Render Master Table
function renderMasterTable() {
    elements.masterTableBody.innerHTML = '';
    if (scenes.length === 0) {
        elements.masterTableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; color: var(--text-muted);">No scenes saved yet.</td></tr>`;
        return;
    }

    scenes.forEach(scene => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${scene.sceneNo}</strong></td>
            <td>${scene.characters.join(', ')}</td>
            <td>${scene.costume || '-'}</td>
            <td>${scene.props || '-'}</td>
            <td>${scene.description || '-'}</td>
            <td class="no-print"><button class="btn btn-danger" onclick="window.deleteScene('${scene.id}')"><i class="ph ph-trash"></i></button></td>
        `;
        elements.masterTableBody.appendChild(tr);
    });
}

// Render Separate Tables Headed by Character Names
function renderCharacterBreakdown() {
    elements.charBreakdownContainer.innerHTML = '';
    
    if (scenes.length === 0) {
        elements.charBreakdownContainer.innerHTML = `<p style="color: var(--text-muted);">No script data available to build character sheets.</p>`;
        return;
    }

    const uniqueCharacters = new Set();
    scenes.forEach(scene => {
        scene.characters.forEach(char => uniqueCharacters.add(char));
    });

    const sortedCharacters = Array.from(uniqueCharacters).sort();

    sortedCharacters.forEach(characterName => {
        const charScenes = scenes.filter(s => s.characters.includes(characterName));
        const wrapper = document.createElement('div');
        wrapper.className = 'character-sheet-block';
        wrapper.style.marginBottom = '2rem';

        wrapper.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
                <h3 class="char-section-title"><i class="ph ph-user"></i> ${characterName}</h3>
                <button class="btn btn-primary" style="padding: 0.3rem 0.8rem; font-size: 0.8rem;" onclick="downloadSingleCharacterPDF('${characterName}')">Download Sheet</button>
            </div>
            <div class="table-responsive">
                <table id="char-table-${characterName.replace(/\s+/g, '_')}">
                    <thead>
                        <tr>
                            <th>Scene #</th>
                            <th>Costume</th>
                            <th>Props</th>
                            <th>Description</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${charScenes.map(scene => `
                            <tr>
                                <td><strong>${scene.sceneNo}</strong></td>
                                <td>${scene.costume || '-'}</td>
                                <td>${scene.props || '-'}</td>
                                <td>${scene.description || '-'}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        elements.charBreakdownContainer.appendChild(wrapper);
    });
}

// ==========================================
// PDF Export Handlers
// ==========================================

elements.downloadMasterBtn.addEventListener('click', async (e) => {
    const element = document.getElementById('master-print-area');
    const btn = e.target.closest('button');
    const originalHTML = btn.innerHTML;
    
    btn.innerHTML = '<i class="ph ph-spinner"></i> Generating...';
    btn.disabled = true;

    try {
        const canvas = await html2canvas(element, { scale: 2, backgroundColor: "#1e293b", useCORS: true });
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const pdf = new jspdf.jsPDF({ orientation: imgWidth > imgHeight ? 'l' : 'p', unit: 'px', format: [imgWidth, imgHeight] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Master_Script_Schedule_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error(error);
        alert('Failed to generate PDF.');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
});

window.downloadSingleCharacterPDF = async function(characterName) {
    const tableId = `char-table-${characterName.replace(/\s+/g, '_')}`;
    const tableElement = document.getElementById(tableId).closest('.character-sheet-block') || document.getElementById(tableId);

    try {
        const canvas = await html2canvas(tableElement, { scale: 2, backgroundColor: "#1e293b", useCORS: true });
        const imgWidth = canvas.width;
        const imgHeight = canvas.height;
        const pdf = new jspdf.jsPDF({ orientation: imgWidth > imgHeight ? 'l' : 'p', unit: 'px', format: [imgWidth, imgHeight] });
        pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, imgWidth, imgHeight);
        pdf.save(`Continuity_${characterName}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error(error);
        alert('Failed to generate character sheet PDF.');
    }
};

elements.downloadAllCharsBtn.addEventListener('click', async (e) => {
    const container = document.getElementById('character-breakdown-container');
    const btn = e.target.closest('button');
    const originalHTML = btn.innerHTML;

    if (!container.children.length) {
        alert('No character sheets to download.');
        return;
    }

    btn.innerHTML = '<i class="ph ph-spinner"></i> Generating All...';
    btn.disabled = true;

    try {
        const pdf = new jspdf.jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
        const pageWidth = pdf.internal.pageSize.getWidth();
        const blocks = container.querySelectorAll('.character-sheet-block');

        for (let i = 0; i < blocks.length; i++) {
            const canvas = await html2canvas(blocks[i], { scale: 2, backgroundColor: "#1e293b", useCORS: true });
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfHeight = (imgProps.height * pageWidth) / imgProps.width;

            if (i > 0) pdf.addPage();
            pdf.addImage(imgData, 'PNG', 0, 10, pageWidth, pdfHeight);
        }

        pdf.save(`All_Character_Breakdowns_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
        console.error(error);
        alert('Failed to generate batch PDF.');
    } finally {
        btn.innerHTML = originalHTML;
        btn.disabled = false;
    }
});
