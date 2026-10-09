// Aureus Capital Main Application Script

document.addEventListener('DOMContentLoaded', () => {
    // Tab Navigation Logic
    const navItems = document.querySelectorAll('.nav-item');
    const tabContents = document.querySelectorAll('.tab-content');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetId = item.getAttribute('data-target');
            
            navItems.forEach(nav => nav.classList.remove('active'));
            tabContents.forEach(tab => tab.classList.remove('active'));

            item.classList.add('active');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Settings Modal Logic
    const settingsBtn = document.getElementById('settingsBtn');
    const settingsModal = document.getElementById('settingsModal');
    const closeSettings = document.getElementById('closeSettings');

    settingsBtn.addEventListener('click', () => {
        settingsModal.style.display = 'block';
    });

    closeSettings.addEventListener('click', () => {
        settingsModal.style.display = 'none';
    });

    window.addEventListener('click', (e) => {
        if (e.target === settingsModal) {
            settingsModal.style.display = 'none';
        }
    });

    // Mock Data / State
    let investors = [
        { id: 1, name: 'Aureus Global Fund', category: 'Institutional', jurisdiction: 'Cayman Islands', contact: 'John Doe', status: 'ACTIVE', capital: 5000000 },
        { id: 2, name: 'Vertex Capital Partners', category: 'Family Office', jurisdiction: 'Singapore', contact: 'Jane Smith', status: 'ACTIVE', capital: 2500000 }
    ];

    // Render Home Dashboard & Populate Investors Select
    function updateHomeAndDropdowns() {
        let totalAUM = investors.filter(i => i.status === 'ACTIVE').reduce((sum, i) => sum + i.capital, 0);
        let activeCount = investors.filter(i => i.status === 'ACTIVE').length;

        document.getElementById('homeTotalAUM').innerText = `$${totalAUM.toLocaleString()}`;
        document.getElementById('homeTotalInvestors').innerText = investors.length;
        document.getElementById('homePendingUSD').innerText = `$${(totalAUM * 0.05).toLocaleString()}`;
        document.getElementById('homePendingINR').innerText = `₹${(totalAUM * 0.05 * 83.5).toLocaleString()}`;

        // Cycle Progress Bar (Mock calculation for 4-month cycle)
        document.getElementById('cycleProgressBar').style.width = '65%';
        document.getElementById('cycleDetails').innerText = 'Cycle: Sep - Dec | Elapsed: 78 days | Remaining: 44 days';

        // Populate Statements Investor Select
        const settleSelect = document.getElementById('settleInvestorSelect');
        settleSelect.innerHTML = '<option value="">-- Choose Investor --</option>';
        investors.forEach(inv => {
            let opt = document.createElement('option');
            opt.value = inv.id;
            opt.text = `${inv.name} ($${inv.capital.toLocaleString()})`;
            settleSelect.appendChild(opt);
        });

        renderInvestorsList();
    }

    // Render Investors CRM List
    function renderInvestorsList() {
        const container = document.getElementById('investorsListContainer');
        container.innerHTML = '';

        investors.forEach(inv => {
            let card = document.createElement('div');
            card.className = 'card-panel';
            card.innerHTML = `
                <h4>${inv.name} (${inv.category})</h4>
                <p>Jurisdiction: ${inv.jurisdiction} | Contact: ${inv.contact}</p>
                <p>Status: <strong>${inv.status}</strong> | Allocation: $${inv.capital.toLocaleString()}</p>
                <div class="action-row mt-2">
                    <button class="btn-secondary" onclick="alert('Report access for ${inv.name}')">Report</button>
                    <button class="btn-primary" onclick="alert('Copied Payout for ${inv.name}')">Copy Payout</button>
                </div>
            `;
            container.appendChild(card);
        });
    }

    // 13-Factor Settlement Calculation Logic
    const calculateBtn = document.getElementById('calculateSettlementBtn');
    const settlementOutputPanel = document.getElementById('settlementOutputPanel');

    calculateBtn.addEventListener('click', () => {
        const principal = parseFloat(document.getElementById('f_principal').value) || 0;
        const yieldRate = parseFloat(document.getElementById('f_yield').value) || 0;
        const fxRate = parseFloat(document.getElementById('f_fxRate').value) || 83.50;

        // Simplified 13-factor ledger calculation simulation
        let grossGenerated = principal * (yieldRate / 100);
        let mgmtFee = grossGenerated * (parseFloat(document.getElementById('f_mgmtFee').value) / 100);
        let perfFee = grossGenerated * (parseFloat(document.getElementById('f_perfFee').value) / 100);
        let custodyFee = grossGenerated * (parseFloat(document.getElementById('f_custodyFee').value) / 100);
        let brokerFee = parseFloat(document.getElementById('f_brokerFee').value) || 0;
        let regLevy = parseFloat(document.getElementById('f_regLevy').value) || 0;
        
        let totalDeductions = mgmtFee + perfFee + custodyFee + brokerFee + regLevy;
        let netUSD = grossGenerated - totalDeductions;
        let netINR = netUSD * fxRate;

        document.getElementById('outGross').innerText = `$${grossGenerated.toFixed(2)}`;
        document.getElementById('outDeductions').innerText = `$${totalDeductions.toFixed(2)}`;
        document.getElementById('outNetUSD').innerText = `$${netUSD.toFixed(2)}`;
        document.getElementById('outNetINR').innerText = `₹${netINR.toFixed(2)}`;

        settlementOutputPanel.style.display = 'block';
    });

    // Initial load
    updateHomeAndDropdowns();
});
