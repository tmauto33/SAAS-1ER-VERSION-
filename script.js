// --- 1. CONFIGURATION ET ÉTAT ---
let configExpertise = JSON.parse(localStorage.getItem('ox_config')) || {};
let savedDeals = JSON.parse(localStorage.getItem('ox_history')) || [];
let checks = {};

const inspectionConfig = [
    { name: "Carte Grise", defVal: 0, defType: "price", cat: "Admin" },
    { name: "Contrôle Technique", defVal: 120, defType: "price", cat: "Admin" },
    { name: "Histovec", defVal: 15, defType: "points", cat: "Admin" },
    { name: "Non-gage", defVal: 10, defType: "points", cat: "Admin" },
    { name: "Factures d'entretien", defVal: 20, defType: "points", cat: "Admin" },
    { name: "Alignement carrosserie", defVal: 400, defType: "price", cat: "Ext" },
    { name: "État peinture", defVal: 300, defType: "price", cat: "Ext" },
    { name: "Pneus & Freins", defVal: 250, defType: "price", cat: "Ext" },
    { name: "Optiques/Phares", defVal: 150, defType: "price", cat: "Ext" },
    { name: "Jantes/Rayures", defVal: 200, defType: "price", cat: "Ext" },
    { name: "Niveau Huile", defVal: 100, defType: "price", cat: "Meca" },
    { name: "Bruit Turbo", defVal: 1200, defType: "price", cat: "Meca" },
    { name: "Embrayage", defVal: 800, defType: "price", cat: "Meca" },
    { name: "Courroie (date)", defVal: 600, defType: "price", cat: "Meca" },
    { name: "Joint de culasse", defVal: 1500, defType: "price", cat: "Meca" },
    { name: "Fuites moteur", defVal: 400, defType: "price", cat: "Meca" },
    { name: "Climatisation", defVal: 500, defType: "price", cat: "Int" },
    { name: "État sièges/volant", defVal: 250, defType: "price", cat: "Int" },
    { name: "Voyants tableau bord", defVal: 40, defType: "points", cat: "Int" },
    { name: "Électronique/GPS", defVal: 400, defType: "price", cat: "Int" },
    { name: "Démarrage à froid", defVal: 200, defType: "price", cat: "Essai" },
    { name: "Passage des vitesses", defVal: 1000, defType: "price", cat: "Essai" },
    { name: "Fumées échappement", defVal: 30, defType: "points", cat: "Essai" },
    { name: "Bruit roulement", defVal: 150, defType: "price", cat: "Essai" },
    { name: "Précision direction", defVal: 350, defType: "price", cat: "Essai" },
    { name: "Freinage urgence", defVal: 20, defType: "points", cat: "Essai" },
    { name: "Ralenti stable", defVal: 15, defType: "points", cat: "Essai" }
];

inspectionConfig.forEach(pt => {
    if (!configExpertise[pt.name]) {
        configExpertise[pt.name] = { val: pt.defVal, type: pt.defType };
    }
});

// --- 2. FONCTIONS DE RENDU ---
function renderExpertise() {
    const container = document.getElementById('checklist-render');
    if (!container) return;
    container.innerHTML = inspectionConfig.map(pt => `
        <div class="card check-item">
            <div style="display:flex; justify-content:space-between; align-items:center; width:100%;">
                <span>
                    <small style="color:var(--accent); font-weight:700; text-transform:uppercase; font-size:0.6rem;">${pt.cat}</small><br>
                    <strong>${pt.name}</strong>
                    <br><small style="opacity:0.6">${configExpertise[pt.name].val}${configExpertise[pt.name].type === 'price' ? '€' : ' pts'}</small>
                </span>
                <div class="pill-group">
                    <button class="pill-btn btn-ok ${checks[pt.name] === 1 ? 'active' : ''}" onclick="handleCheck('${pt.name}', 1, this)">OK</button>
                    <button class="pill-btn btn-ko ${checks[pt.name] === 0 ? 'active' : ''}" onclick="handleCheck('${pt.name}', 0, this)">KO</button>
                </div>
            </div>
        </div>
    `).join('');
}

function renderSettings() {
    const container = document.getElementById('price-settings-list');
    if (!container) return;
    container.innerHTML = inspectionConfig.map(pt => {
        const conf = configExpertise[pt.name];
        return `
            <div class="card" style="padding: 15px; display: flex; flex-direction: column; gap: 10px;">
                <label style="font-size:0.7rem; font-weight:800; color:var(--text-muted);">${pt.name.toUpperCase()}</label>
                <div style="display: flex; gap: 5px;">
                    <input type="number" value="${conf.val}" onchange="updateConfig('${pt.name}', 'val', this.value)" style="margin:0; flex:1;">
                    <select onchange="updateConfig('${pt.name}', 'type', this.value)" style="margin:0; width:80px; font-size:0.8rem;">
                        <option value="price" ${conf.type === 'price' ? 'selected' : ''}>€</option>
                        <option value="points" ${conf.type === 'points' ? 'selected' : ''}>Pts</option>
                    </select>
                </div>
            </div>`;
    }).join('');
}

function updateConfig(name, key, value) {
    configExpertise[name][key] = (key === 'val') ? parseFloat(value) : value;
    localStorage.setItem('ox_config', JSON.stringify(configExpertise));
    renderExpertise();
    runCalculations();
}

// --- 3. CALCULS ET UI ---
function handleCheck(name, val, btn) {
    checks[name] = val;
    btn.parentElement.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    runCalculations();
}

function runCalculations() {
    const market = parseFloat(document.getElementById('market-val')?.value) || 0;
    const purchase = parseFloat(document.getElementById('target-price')?.value) || 0;
    const fees = parseFloat(document.getElementById('fees-admin')?.value) || 0;
    const notes = document.getElementById('v-notes')?.value || "";
    const targetProfit = parseFloat(document.getElementById('target-profit')?.value) || 1000;

    let totalCashRepairs = 0;
    let totalPointsPenalty = 0;
    let koList = [];

    inspectionConfig.forEach(pt => {
        if (checks[pt.name] === 0) {
            const config = configExpertise[pt.name];
            if (config.type === 'price') totalCashRepairs += config.val;
            else totalPointsPenalty += config.val;
            koList.push(pt.name);
        }
    });

    const margeNet = market - (purchase + totalCashRepairs + fees);
    const score = Math.max(0, 100 - totalPointsPenalty);
    const totalInvest = purchase + totalCashRepairs + fees;
    const roi = totalInvest > 0 ? (margeNet / totalInvest) * 100 : 0;

    updateUI(margeNet, score, totalCashRepairs, roi, koList, market, fees, notes, targetProfit);
}

function updateUI(margeNet, score, repairs, roi, koList, market, fees, notes, targetProfit) {
    if(document.getElementById('marge-val')) document.getElementById('marge-val').innerText = Math.round(margeNet).toLocaleString();
    if(document.getElementById('flash-marge')) document.getElementById('flash-marge').innerText = Math.round(margeNet) + " €";
    if(document.getElementById('flash-repairs')) document.getElementById('flash-repairs').innerText = repairs + " €";
    if(document.getElementById('flash-score')) document.getElementById('flash-score').innerText = Math.round(score) + "/100";
    if(document.getElementById('roi-val')) document.getElementById('roi-val').innerText = Math.round(roi);

    const verdict = document.getElementById('ia-verdict');
    if (verdict) {
        if (margeNet < targetProfit) { 
            verdict.innerText = `❌ SOUS L'OBJECTIF (${Math.round(targetProfit)}€)`; 
            verdict.style.color = "#ef4444"; 
        } else if (score < 65) { 
            verdict.innerText = "⚠️ ÉTAT RISQUÉ"; 
            verdict.style.color = "#f59e0b"; 
        } else {
            verdict.innerText = "✅ DEAL RENTABLE";
            verdict.style.color = "#10b981";
        }
    }

    const ackContainer = document.getElementById('ackermann-timeline');
    const targetPrice = parseFloat(document.getElementById('target-price')?.value) || 0;
    if(ackContainer && targetPrice > 0) {
        const steps = [
            {label: "1ère Offre (65%)", factor: 0.65},
            {label: "2ème Offre (85%)", factor: 0.85},
            {label: "3ème Offre (95%)", factor: 0.95},
            {label: "Prix Cible (100%)", factor: 1.00}
        ];
        ackContainer.innerHTML = steps.map(s => `
            <div class="card" style="text-align:center; padding:15px; border-top: 4px solid var(--accent); background: white; color: black; flex: 1; min-width: 120px;">
                <small style="font-weight:800; opacity:0.6; color: #666; text-transform: uppercase; font-size: 0.6rem;">${s.label}</small>
                <div style="font-size:1.3rem; font-weight:900; color: var(--accent); margin-top: 5px;">${Math.round(targetPrice * s.factor).toLocaleString()} €</div>
            </div>`).join('');
    }

    const advice = document.getElementById('ia-advice');
    if(advice) {
        let purchaseMax = Math.round(market - repairs - fees - targetProfit);
        advice.innerText = purchaseMax > 0 ? purchaseMax.toLocaleString() : "0";
    }

    const riposteNego = document.getElementById('recap-riposte-nego');
    if(riposteNego) {
        riposteNego.innerHTML = koList.length > 0 ? `
            <div style="background:rgba(0,0,0,0.05); padding:15px; border-radius:10px; border-left:4px solid var(--accent); color:#333;">
                <p><strong>🧠 Profil :</strong> ${notes || "Non renseigné"}</p>
                <p style="margin-top:10px;"><strong>🗣️ Argument :</strong> "J'ai budgétisé ${repairs}€ de frais sur ${koList.slice(0,3).join(', ')}."</p>
            </div>` : "<p>Véhicule propre.</p>";
    }
}

// --- 4. NAVIGATION ET HISTORIQUE ---
function switchTab(id, btn) {
    document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    if(btn) btn.classList.add('active');
}

function saveCurrentDeal() {
    const model = document.getElementById('model-name').value;
    if (!model) return alert("Modèle requis !");
    const deal = {
        model,
        market: document.getElementById('market-val').value,
        purchase: document.getElementById('target-price').value,
        fees: document.getElementById('fees-admin')?.value || 0,
        notes: document.getElementById('v-notes')?.value || "",
        checks: {...checks},
        marge: document.getElementById('marge-val').innerText,
        roi: document.getElementById('roi-val').innerText,
        date: new Date().toLocaleDateString('fr-FR')
    };
    savedDeals.unshift(deal);
    localStorage.setItem('ox_history', JSON.stringify(savedDeals));
    renderDashboard();
    alert("Dossier sauvegardé !");
}

function loadDeal(index) {
    const d = savedDeals[index];
    if (!d) return;
    document.getElementById('model-name').value = d.model || "";
    document.getElementById('market-val').value = d.market || 0;
    document.getElementById('target-price').value = d.purchase || 0;
    if(document.getElementById('v-notes')) document.getElementById('v-notes').value = d.notes || "";
    checks = d.checks || {};
    renderExpertise();
    runCalculations();
}

function renderDashboard() {
    const list = document.getElementById('history-list');
    if (!list) return;
    list.innerHTML = savedDeals.length === 0 ? "<p>Aucun historique.</p>" : 
        savedDeals.map((d, i) => `
        <div class="card" onclick="loadDeal(${i})" style="cursor:pointer; border-left:5px solid var(--accent); margin-bottom:10px; padding:15px;">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <strong>${d.model}</strong>
                <span style="color:#10b981; font-weight:800;">+${d.marge}€</span>
            </div>
        </div>`).join('');
}

function initApp() {
    renderExpertise();
    renderSettings();
    renderDashboard();
    runCalculations();
}

window.onload = initApp;
