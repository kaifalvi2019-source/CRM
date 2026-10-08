(() => {
"use strict";

const STORAGE = {
  investors:"aureus_investors_v14",
  settings:"aureus_settings_v14",
  market:"aureus_market_v14"
};

const DEFAULTS = {
  manager:"Kaif Alvi",
  promoter:50000,
  fx:87,
  accent:"gold",
  currency:"USD",
  settlementThreshold:50000,
  auditMode:false
};

const state = {
  investors:[],
  settings:{...DEFAULTS},
  market:{goldEndpoint:"",fxEndpoint:"",gold:null,fx:null,goldUpdated:null,fxUpdated:null},
  currentView:"home",
  investorFilter:"all",
  investorSearch:"",
  sort:"capital",
  selectedInvestorId:null,
  selectedSettlementAmount:500,
  latestSettlement:null
};

const $ = id => document.getElementById(id);

const money = n => new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:2}).format(Number(n)||0);
const usd = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(n)||0);

const esc = s => String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

const uid = () => crypto.randomUUID ? crypto.randomUUID() : "inv_"+Date.now()+"_"+Math.random().toString(36).slice(2);
const clamp = (n,min,max) => Math.min(max,Math.max(min,n));

const formatDate = value => value
  ? new Date(value).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"})
  : "—";

const displayMoney = n => usd(Number(n)||0);

function animateValue(elementId, startUSD, endUSD, duration, formatter) {
  const el = $(elementId);
  if(!el) return;
  let startTimestamp = null;
  const step = (timestamp) => {
    if (!startTimestamp) startTimestamp = timestamp;
    const progress = Math.min((timestamp - startTimestamp) / duration, 1);
    const current = progress * (endUSD - startUSD) + startUSD;
    el.textContent = formatter(current);
    if (progress < 1) {
      window.requestAnimationFrame(step);
    }
  };
  window.requestAnimationFrame(step);
}

function applyTheme(){
  const theme = ["gold","emerald","cobalt"].includes(state.settings.accent) ? state.settings.accent : "gold";
  document.documentElement.dataset.theme = theme;
}

function save(){
  try{
    localStorage.setItem(STORAGE.investors,JSON.stringify(state.investors));
    localStorage.setItem(STORAGE.settings,JSON.stringify(state.settings));
    localStorage.setItem(STORAGE.market,JSON.stringify({
      goldEndpoint:state.market.goldEndpoint,
      fxEndpoint:state.market.fxEndpoint,
      gold:state.market.gold,
      fx:state.market.fx,
      goldUpdated:state.market.goldUpdated,
      fxUpdated:state.market.fxUpdated
    }));
  }catch(e){}
}

function load(){
  try{
    const inv = JSON.parse(localStorage.getItem(STORAGE.investors)||"[]");
    const settings = JSON.parse(localStorage.getItem(STORAGE.settings)||"null");
    const market = JSON.parse(localStorage.getItem(STORAGE.market)||"null");

    state.investors = Array.isArray(inv)
      ? inv.map(i=>({...i,status:i.status||(i.active===false?"settled":"active")}))
      : [];
    state.settings = {...DEFAULTS,...(settings||{})};
    state.market = {...state.market,...(market||{})};
  }catch(error){
    state.investors=[];
    state.settings={...DEFAULTS};
  }
}

function cycleInfo(){
  const now = new Date();
  const day = now.getDate();
  const days = new Date(now.getFullYear(),now.getMonth()+1,0).getDate();
  const seed = now.getFullYear()*100+now.getMonth()+1;
  const target = clamp(8+(((seed*9301+49297)%200)/50),8,12);
  const progress = clamp(day/days,0,1);
  const rate = Math.max(.5,target*progress);
  return {day,days,target,progress,rate,remaining:Math.max(days-day,0)};
}

function totals(){
  const active = state.investors.filter(i=>i.status==="active");
  const investorCapital = active.reduce((sum,i)=>sum+(Number(i.capital)||0),0);
  const promoter = Number(state.settings.promoter)||0;
  const pool = investorCapital+promoter;
  const cycle = cycleInfo();
  const profit = pool*cycle.rate/100;
  return {active,investorCapital,promoter,pool,profit,rate:cycle.rate};
}

function investorProfit(inv){
  const rate = Number(inv.rate)>0 ? Number(inv.rate) : cycleInfo().rate;
  if(inv.status!=="active") return 0;
  return (Number(inv.capital)||0)*rate/100;
}

function render(){
  try{
    applyTheme();
    const t = totals();
    const c = cycleInfo();

    if($("managerName")) $("managerName").textContent = state.settings.manager;
    if($("promoterCapital")) $("promoterCapital").textContent = displayMoney(state.settings.promoter);
    if($("totalPool")) $("totalPool").textContent = displayMoney(t.pool);
    if($("investorCapitalTotal")) $("investorCapitalTotal").textContent = displayMoney(t.investorCapital);
    if($("activeCapital")) $("activeCapital").textContent = displayMoney(t.investorCapital);
    if($("currentPortfolioValue")) $("currentPortfolioValue").textContent = displayMoney(t.pool+t.profit);
    if($("homeProfit")) $("homeProfit").textContent = displayMoney(t.profit);
    if($("activeCountBadge")) $("activeCountBadge").textContent = `${t.active.length} active`;
    if($("homeActiveInvestors")) $("homeActiveInvestors").textContent = t.active.length;
    if($("homeRate")) $("homeRate").textContent = c.rate.toFixed(2)+"%";
    if($("homeRateLarge")) $("homeRateLarge").textContent = c.rate.toFixed(2)+"%";
    if($("cycleDay")) $("cycleDay").textContent = `Day ${c.day} of ${c.days}`;
    if($("cycleProgress")) $("cycleProgress").style.width = (c.progress*100).toFixed(1)+"%";
    if($("daysRemaining")) $("daysRemaining").textContent = `${c.remaining} day${c.remaining===1?"":"s"} remaining`;

    if($("portPool")) $("portPool").textContent = displayMoney(t.pool);
    if($("portCurrentValue")) $("portCurrentValue").textContent = displayMoney(t.pool+t.profit);
    if($("portProfit")) $("portProfit").textContent = displayMoney(t.profit);
    if($("portRate")) $("portRate").textContent = c.rate.toFixed(2)+"%";
    if($("portRateLarge")) $("portRateLarge").textContent = c.rate.toFixed(2)+"%";
    if($("portCycleDay")) $("portCycleDay").textContent = `Day ${c.day} of ${c.days}`;
    if($("portProgress")) $("portProgress").style.width = (c.progress*100).toFixed(1)+"%";
    if($("portRemaining")) $("portRemaining").textContent = `${c.remaining} day${c.remaining===1?"":"s"} remaining`;
    if($("yieldDay")) $("yieldDay").textContent = `${c.day} / ${c.days}`;

    renderInvestors();
    renderSettlementInvestorList();
    renderMarket();
  }catch(e){}
}

function renderInvestors(){
  const query = state.investorSearch.trim().toLowerCase();
  let arr = state.investors.filter(inv=>{
    const status = inv.status||(inv.active===false?"settled":"active");
    const filterMatch = state.investorFilter==="all"||status===state.investorFilter;
    const searchMatch = !query||String(inv.name||"").toLowerCase().includes(query);
    return filterMatch&&searchMatch;
  });

  const cycle = cycleInfo();
  arr.sort((a,b)=>{
    if(state.sort==="name") return String(a.name).localeCompare(String(b.name));
    if(state.sort==="profit") return investorProfit(b)-investorProfit(a);
    return (Number(b.capital)||0)-(Number(a.capital)||0);
  });

  if($("investorCountLabel")) $("investorCountLabel").textContent = `${arr.length} investor${arr.length===1?"":"s"}`;
  if(!$("investorList")) return;

  if(!arr.length){
    $("investorList").innerHTML = `<div class="card empty"><strong>No investors found</strong><span>Add an investor or adjust your search/filter.</span></div>`;
    return;
  }

  $("investorList").innerHTML = arr.map(inv=>{
    const status = inv.status||(inv.active===false?"settled":"active");
    const rate = Number(inv.rate)>0 ? Number(inv.rate) : cycle.rate;
    const profit = investorProfit(inv);
    const initials = String(inv.name||"IN").split(/\s+/).slice(0,2).map(x=>x[0]).join("").toUpperCase();
    const label = status.charAt(0).toUpperCase()+status.slice(1);
    return `
      <button class="card investor" data-investor="${esc(inv.id)}">
        <div class="inv-avatar">${esc(initials)}</div>
        <div class="inv-main">
          <div class="inv-name">${esc(inv.name)}</div>
          <div class="inv-meta">
            <span><i class="status-dot status-${esc(status)}"></i>${label}</span>
            <span>${status==="active"?rate.toFixed(2)+"%":"Ledger record"}</span>
            <span>${formatDate(inv.date||inv.createdAt)}</span>
          </div>
        </div>
        <div class="inv-right">
          <div class="inv-profit">${displayMoney(profit)}</div>
          <div class="inv-cap">${displayMoney(inv.capital)}</div>
        </div>
      </button>`;
  }).join("");

  document.querySelectorAll("[data-investor]").forEach(btn=>{
    btn.addEventListener("click",()=>openInvestorDetail(btn.dataset.investor));
  });
}

function renderSettlementInvestorList(){
  const select = $("settlementInvestor");
  if(!select) return;
  const current = select.value;
  select.innerHTML = `<option value="">General / Portfolio Settlement</option>`+
    state.investors.map(inv=>`<option value="${esc(inv.id)}">${esc(inv.name)} — ${displayMoney(inv.capital)}</option>`).join("");
  if(current&&state.investors.some(i=>i.id===current)) select.value=current;
}

function renderMarket(){
  const market = state.market;
  if(Number.isFinite(Number(market.gold))&&market.gold!==null){
    if($("goldPrice")) $("goldPrice").textContent = usd(market.gold);
    if($("goldStatus")) $("goldStatus").textContent = "Updated";
    if($("goldDot")) $("goldDot").className = "status-dot status-active";
  }
  if(Number.isFinite(Number(market.fx))&&market.fx!==null){
    if($("fxRate")) $("fxRate").textContent = money(market.fx);
    if($("fxStatus")) $("fxStatus").textContent = "Updated";
    if($("fxDot")) $("fxDot").className = "status-dot status-active";
  }
}

function toast(message,type="success"){
  const element = $("toast");
  if(!element) return;
  element.textContent = message;
  element.className = `toast show ${type}`;
  clearTimeout(toast.timer);
  toast.timer = setTimeout(()=>element.className="toast",2600);
}

function navigate(view){
  const valid = ["home","portfolio","investors","settlement","more"];
  if(!valid.includes(view)) view="home";
  state.currentView=view;

  document.querySelectorAll(".view").forEach(section=>{
    section.classList.toggle("active",section.id==="view-"+view);
  });
  document.querySelectorAll(".nav button").forEach(button=>{
    button.classList.toggle("active",button.dataset.nav===view);
  });

  const titles = {home:"AUREUS CAPITAL",portfolio:"Portfolio",investors:"Investors",settlement:"Settlement",more:"More"};
  if($("headerTitle")) $("headerTitle").textContent = titles[view];
  window.scrollTo({top:0,behavior:"smooth"});
}

function openModal(id){
  $(id)?.classList.add("open");
  document.body.style.overflow="hidden";
}

function closeModal(id){
  $(id)?.classList.remove("open");
  if(!document.querySelector(".modal.open")) document.body.style.overflow="";
}

function openInvestorForm(id=null){
  const investor = id ? state.investors.find(x=>x.id===id) : null;
  if($("investorModalTitle")) $("investorModalTitle").textContent = investor ? "Edit Investor" : "Add Investor";
  if($("editInvestorId")) $("editInvestorId").value = investor?.id||"";
  if($("investorName")) $("investorName").value = investor?.name||"";
  if($("investorCapital")) $("investorCapital").value = investor?.capital ?? "";
  if($("investorRate")) $("investorRate").value = investor?.rate ?? "";
  if($("investorDate")) $("investorDate").value = investor?.date ? String(investor.date).slice(0,10) : "";
  if($("investorStatus")) $("investorStatus").value = investor?.status||"active";
  openModal("investorModal");
}

function openInvestorDetail(id){
  const investor = state.investors.find(x=>x.id===id);
  if(!investor) return;
  state.selectedInvestorId=id;
  const rate = Number(investor.rate)>0 ? Number(investor.rate) : cycleInfo().rate;
  const profit = investorProfit(investor);
  const value = (Number(investor.capital)||0)+profit;
  if($("detailName")) $("detailName").textContent = investor.name;
  if($("detailGrid")) {
    $("detailGrid").innerHTML = `
      <div class="detail"><span>Status</span><strong class="positive">${esc(investor.status)}</strong></div>
      <div class="detail"><span>Capital</span><strong>${usd(investor.capital)}</strong></div>
      <div class="detail"><span>Rate</span><strong class="positive">${rate.toFixed(2)}%</strong></div>
      <div class="detail"><span>Profit</span><strong class="positive">${usd(profit)}</strong></div>
      <div class="detail"><span>Value</span><strong>${usd(value)}</strong></div>
      <div class="detail"><span>Date</span><strong>${formatDate(investor.date||investor.createdAt)}</strong></div>`;
  }
  openModal("detailModal");
}

function payoutMessage(investor){
  const profit = investorProfit(investor);
  const net = (Number(investor.capital)||0)+profit;
  const fx = Number(state.settings.fx)||87;
  return [
    "╔══════════════════════╗",
    "    ✨ 𝐏𝐀𝐘𝐎𝐔𝐓 𝐂𝐎𝐍𝐅𝐈𝐑𝐌𝐀𝐓𝐈𝐎𝐍 ✨",
    "╚══════════════════════╝",
    "",
    `👤 Investor`,
    `   └─ ${investor.name}`,
    "",
    `🔥 Status`,
    `   └─ 🟢 ${investor.status.charAt(0).toUpperCase() + investor.status.slice(1)}`,
    "",
    `💵 Payout (USD)`,
    `   └─ 💰 ${usd(net)}`,
    "",
    `🇮🇳 Return (INR)`,
    `   └─ 💎 ${money(net * fx)}`,
    "",
    "━━━━━━━━━━━━━━━━━━━━",
    "   💎 AUREUS CAPITAL 💎",
    "━━━━━━━━━━━━━━━━━━━━"
  ].join("\n");
}

function calculateSettlement(){
  let amountUSD = Number($("customAmount")?.value);
  if(!$("customAmount")?.value \vert{}\vert{} $("customAmount").value.trim()===""){
    amountUSD = state.selectedSettlementAmount;
  }
  if(!Number.isFinite(amountUSD)||amountUSD<=0) return;

  const investorId = $("settlementInvestor")?.value;
  const investor = state.investors.find(x=>x.id===investorId);
  if(investor){
    amountUSD = Number(investor.capital)||amountUSD;
  }

  const fx = Number($("settlementFx")?.value)||Number(state.settings.fx)||87;
  const grossUSD = amountUSD;
  const grossINR = grossUSD * fx;

  const cdcEntryFeeINR = grossINR * 0.005;
  const cdcEntryGstINR = cdcEntryFeeINR * 0.18;
  const crossChainINR = 3.00 * fx;
  const trc20GasINR = 200.00;
  const clearingINR = 5.00 * fx;
  const returnRouteGasINR = 200.00;
  const cdcExitFeeINR = grossINR * 0.005;
  const cdcExitGstINR = cdcExitFeeINR * 0.18;
  const tdstds194sINR = grossINR * 0.01;
  const forexReserveINR = grossINR * 0.05;
  const vpsCloudINR = 1150.00;
  const upiMdrINR = grossINR > 2000 ? grossINR * 0.004 : 0;
  const bankingRoundINR = 77.27;

  const totalDeductionsINR = cdcEntryFeeINR + cdcEntryGstINR + crossChainINR + trc20GasINR + 
    clearingINR + returnRouteGasINR + cdcExitFeeINR + cdcExitGstINR + 
    tdstds194sINR + forexReserveINR + vpsCloudINR + upiMdrINR + bankingRoundINR;

  const netINR = Math.max(0, grossINR - totalDeductionsINR);
  const netUSD = netINR / fx;

  state.latestSettlement={
    investorId,
    investorName:investor?.name||"General / Portfolio Settlement",
    gross: grossUSD,
    net: netUSD,
    deductions: totalDeductionsINR / fx,
    fx,
    items: [
      { name: "CoinDCX Liquidity Entry Fee (0.5%)", inr: cdcEntryFeeINR },
      { name: "Statutory GST on Entry Brokerage (18%)", inr: cdcEntryGstINR },
      { name: "Cross-Chain Protocol Transfer Charge ($3.00)", inr: crossChainINR },
      { name: "Primary Network Gas Reserve (TRC-20)", inr: trc20GasINR },
      { name: "Institutional Settlement Clearing ($5.00)", inr: clearingINR },
      { name: "Return Route Protocol Gas Reserve", inr: returnRouteGasINR },
      { name: "CoinDCX Liquidity Exit Fee (0.5%)", inr: cdcExitFeeINR },
      { name: "Statutory GST on Exit Brokerage (18%)", inr: cdcExitGstINR },
      { name: "Statutory Tax Withholding u/s 194S (1% TDS)", inr: tdstds194sINR },
      { name: "Regulatory Compliance & Forex Reserve (5.0%)", inr: forexReserveINR },
      { name: "Algo Trading Power, VPS & Cloud-Infra Cost", inr: vpsCloudINR },
      { name: "New UPI/Payment Gateway MDR Charge (0.4%)", inr: upiMdrINR },
      { name: "Banking Alignment & Round-Off Adjustment", inr: bankingRoundINR }
    ],
    timestamp:new Date().toISOString()
  };

  animateValue("netSettlement", 0, netUSD, 600, v => usd(v));

  let breakdownHTML = `<div class="break-row"><span>Gross Amount</span><span>${usd(grossUSD)}</span></div>`;
  state.latestSettlement.items.forEach(item => {
    const valUSD = item.inr / fx;
    breakdownHTML += `<div class="break-row"><span>${esc(item.name)}</span><span class="red">-${usd(valUSD)}</span></div>`;
  });
  breakdownHTML += `
    <div class="break-row"><span>Total Verified Deductions</span><span class="red">-${usd(totalDeductionsINR / fx)}</span></div>
    <div class="break-row"><span>Net Settlement</span><span class="positive">${usd(netUSD)}</span></div>
    <div class="break-row"><span>FX Reference</span><span>₹${fx.toFixed(2)}</span></div>`;

  if($("settlementBreakdown")) $("settlementBreakdown").innerHTML = breakdownHTML;
  if($("settlementResult")) $("settlementResult").classList.add("gold-border");
  toast("Settlement calculated successfully.","success");
}

function buildPortfolioPdf(){
  const btn = $("generateStatement");
  if(!btn) return;
  const originalText = btn.textContent;
  btn.textContent = "Generating...";
  btn.disabled = true;

  setTimeout(()=>{
    try{
      const pdfLib = window.jspdf?.jsPDF;
      if(!pdfLib){ toast("PDF library unavailable.","error"); btn.textContent=originalText; btn.disabled=false; return; }

      const doc = new pdfLib({unit:"mm",format:"a4"});
      const t = totals();
      const c = cycleInfo();
      const fx = Number(state.settings.fx)||87;
      const dual = (valUSD) => `${usd(valUSD)} (${money(valUSD * fx)})`;

      doc.setFillColor(255, 255, 255);
      doc.rect(0,0,210,297,"F");
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(22);
      doc.text("Aureus Capital",18,22);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(8);
      doc.text("INSTITUTIONAL PORTFOLIO & SETTLEMENT STATEMENT (USD / INR)",18,29);
      doc.setDrawColor(230, 197, 107);
      doc.line(18,35,192,35);

      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.text("Portfolio Statement",18,48);

      const rows = [
        ["Manager",state.settings.manager],
        ["Role","Lead Portfolio Manager"],
        ["Promoter Capital",dual(t.promoter)],
        ["Investor Capital",dual(t.investorCapital)],
        ["Total Capital",dual(t.pool)],
        ["Current Portfolio Value",dual(t.pool+t.profit)],
        ["Current Profit",dual(t.profit)],
        ["MTD Yield",c.rate.toFixed(2)+"%"],
        ["Progressive Day",`${c.day} / ${c.days}`],
        ["Calculation Status","Calculated / Indicative / Internal"]
      ];

      let y=60;
      rows.forEach(([label,value])=>{
        doc.setTextColor(100, 116, 139);
        doc.setFontSize(8.5);
        doc.text(label,18,y);
        doc.setTextColor(15, 23, 42);
        doc.text(String(value),192,y,{align:"right"});
        y+=9;
      });

      doc.setDrawColor(230, 197, 107);
      doc.line(18,245,78,245);
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(9);
      doc.text(state.settings.manager,18,253);
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text("Lead Portfolio Manager",18,259);
      doc.text("____________________________",18,269);
      doc.text("Manager Signature",18,275);
      doc.save(`Aureus_Capital_Portfolio_${new Date().toISOString().slice(0,10)}.pdf`);
    }catch(err){}
    btn.textContent = originalText;
    btn.disabled = false;
    toast("Statement ready","success");
  }, 400);
}

function buildSettlementPdf(){
  if(!state.latestSettlement){ toast("Generate a settlement first.","error"); return; }
  try{
    const s = state.latestSettlement;
    const fx = s.fx;
    const dual = (valUSD) => `${usd(valUSD)} (${money(valUSD * fx)})`;
    const pdfLib = window.jspdf?.jsPDF;
    if(!pdfLib) return;

    const doc = new pdfLib({unit:"mm",format:"a4"});
    doc.setFillColor(255, 255, 255);
    doc.rect(0,0,210,297,"F");
    doc.setTextColor(30, 41, 59);
    doc.setFontSize(21);
    doc.text("Aureus Capital",18,22);
    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8);
    doc.text("SETTLEMENT STATEMENT & VERIFIED FEE BREAKDOWN (USD / INR)",18,29);
    doc.setDrawColor(230, 197, 107);
    doc.line(18,35,192,35);

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.text("Investor",18,46);
    doc.setTextColor(15, 23, 42);
    doc.text(s.investorName,192,46,{align:"right"});
    doc.setTextColor(100, 116, 139);
    doc.text("Gross Amount",18,54);
    doc.setTextColor(15, 23, 42);
    doc.text(dual(s.gross),192,54,{align:"right"});

    let y=64;
    s.items.forEach(item => {
      const valUSD = item.inr / fx;
      doc.setTextColor(100, 116, 139);
      doc.setFontSize(7.5);
      doc.text(item.name,18,y);
      doc.setTextColor(220, 38, 38);
      doc.text("-" + dual(valUSD),192,y,{align:"right"});
      y+=6;
    });

    doc.setTextColor(100, 116, 139);
    doc.setFontSize(8.5);
    doc.text("Total Verified Deductions",18,y+4);
    doc.setTextColor(220, 38, 38);
    doc.text("-" + dual(s.deductions),192,y+4,{align:"right"});

    doc.setTextColor(16, 185, 129);
    doc.setFontSize(13);
    doc.text(`Net Settlement: ${dual(s.net)}`,18,y+16);
    doc.save(`Aureus_Capital_Settlement_${new Date().toISOString().slice(0,10)}.pdf`);
    toast("Statement ready","success");
  }catch(e){}
}

function setupNavigation(){
  document.querySelectorAll("[data-nav]").forEach(button=>{
    button.addEventListener("click",()=>navigate(button.dataset.nav));
  });
  $("menuBtn")?.addEventListener("click",()=>navigate("more"));
}

function setupInvestorEvents(){
  $("addInvestorBtn")?.addEventListener("click",()=>openInvestorForm());
  $("investorSearch")?.addEventListener("input",event=>{
    state.investorSearch=event.target.value;
    renderInvestors();
  });
  $("investorFilters")?.addEventListener("click",event=>{
    const button = event.target.closest("[data-filter]");
    if(!button) return;
    state.investorFilter=button.dataset.filter;
    document.querySelectorAll("#investorFilters .filter").forEach(item=>{
      item.classList.toggle("active",item===button);
    });
    renderInvestors();
  });
  $("sortBtn")?.addEventListener("click",()=>{
    state.sort = state.sort==="capital" ? "profit" : state.sort==="profit" ? "name" : "capital";
    $("sortBtn").textContent = "Sort: "+(state.sort==="capital"?"Capital":state.sort==="profit"?"Profit":"Name");
    renderInvestors();
  });

  $("investorForm")?.addEventListener("submit",event=>{
    event.preventDefault();
    const id = $("editInvestorId")?.value;
    const name = $("investorName")?.value.trim();
    const capital = Number($("investorCapital")?.value);
    const rate = Number($("investorRate")?.value)||0;
    const date = $("investorDate")?.value;
    const status = $("investorStatus")?.value;

    if(!name || !Number.isFinite(capital) || capital<=0) return;

    if(id){
      const investor = state.investors.find(x=>x.id===id);
      if(investor) Object.assign(investor,{name,capital,rate,date,status});
      toast("Investor updated.","success");
    }else{
      state.investors.push({id:uid(),name,capital,rate,date,status,createdAt:new Date().toISOString()});
      toast("Investor added.","success");
    }

    save();
    render();
    closeModal("investorModal");
  });

  $("editDetail")?.addEventListener("click",()=>{
    closeModal("detailModal");
    openInvestorForm(state.selectedInvestorId);
  });

  $("deleteDetail")?.addEventListener("click",()=>{
    const investor = state.investors.find(x=>x.id===state.selectedInvestorId);
    if(!investor) return;
    if(confirm(`Delete ${investor.name}?`)){
      state.investors = state.investors.filter(x=>x.id!==investor.id);
      save();
      render();
      closeModal("detailModal");
      toast("Investor deleted.","success");
    }
  });

  $("payoutDetail")?.addEventListener("click",async()=>{
    const investor = state.investors.find(x=>x.id===state.selectedInvestorId);
    if(!investor) return;
    const message = payoutMessage(investor);
    try{
      await navigator.clipboard.writeText(message);
      toast("Payout summary copied.","success");
    }catch(error){
      prompt("Copy this payout summary:",message);
    }
  });
}

function setupSettlementEvents(){
  document.querySelectorAll("#presets .preset").forEach(button=>{
    button.addEventListener("click",()=>{
      state.selectedSettlementAmount=Number(button.dataset.amount);
      if($("customAmount")) $("customAmount").value="";
      document.querySelectorAll("#presets .preset").forEach(item=>{
        item.classList.toggle("active",item===button);
      });
      calculateSettlement();
    });
  });

  $("calculateSettlement")?.addEventListener("click",calculateSettlement);
  $("settlementFx")?.addEventListener("change",()=>{
    const fx = Number($("settlementFx").value);
    if(Number.isFinite(fx)&&fx>0){
      state.settings.fx=fx;
      save();
    }
  });
  $("settlementInvestor")?.addEventListener("change",()=>{
    const investor = state.investors.find(x=>x.id===$("settlementInvestor").value);
    if(investor && $("customAmount")){
      $("customAmount").value=investor.capital;
      calculateSettlement();
    }
  });
  $("downloadSettlementPdf")?.addEventListener("click",buildSettlementPdf);
  $("shareSettlementPdf")?.addEventListener("click",buildSettlementPdf);
}

function setupSettings(){
  document.querySelectorAll("[data-modal]").forEach(button=>{
    button.addEventListener("click",()=>{
      const map = {settings:"settingsModal",market:"marketModal",yield:"yieldModal"};
      const modalId = map[button.dataset.modal];
      if(button.dataset.modal==="settings"){
        if($("setManager")) $("setManager").value = state.settings.manager;
        if($("setPromoter")) $("setPromoter").value = state.settings.promoter;
        if($("setFx")) $("setFx").value = state.settings.fx;
        if($("setThreshold")) $("setThreshold").value = state.settings.settlementThreshold ?? DEFAULTS.settlementThreshold;
        if($("setAudit")) $("setAudit").checked = !!state.settings.auditMode;
      }
      openModal(modalId);
    });
  });

  document.querySelectorAll("[data-close]").forEach(button=>{
    button.addEventListener("click",()=>closeModal(button.dataset.close));
  });

  document.querySelectorAll(".modal").forEach(modal=>{
    modal.addEventListener("click",event=>{
      if(event.target===modal) closeModal(modal.id);
    });
  });

  $("settingsForm")?.addEventListener("submit",event=>{
    event.preventDefault();
    const manager = $("setManager")?.value.trim()||DEFAULTS.manager;
    const promoter = Number($("setPromoter")?.value)||DEFAULTS.promoter;
    const fx = Number($("setFx")?.value)||DEFAULTS.fx;
    const threshold = Number($("setThreshold")?.value)||DEFAULTS.settlementThreshold;
    const auditMode = !!$("setAudit")?.checked;

    state.settings = {manager,promoter,fx,accent:"gold",currency:"USD",settlementThreshold:threshold,auditMode};
    save();
    render();
    if($("settlementFx")) $("settlementFx").value = state.settings.fx;
    closeModal("settingsModal");
    toast("Settings saved.","success");
  });

  $("resetSettings")?.addEventListener("click",()=>{
    if(confirm("Restore defaults?")){
      state.settings={...DEFAULTS};
      save();
      render();
      closeModal("settingsModal");
      toast("Defaults restored.","success");
    }
  });

  $("saveMarket")?.addEventListener("click",()=>{
    state.market.goldEndpoint = $("goldEndpoint").value.trim();
    state.market.fxEndpoint = $("fxEndpoint").value.trim();
    save();
    closeModal("marketModal");
    refreshMarket();
  });
}

function setupAppControls(){
  $("refreshMarket")?.addEventListener("click",refreshMarket);
  $("generateStatement")?.addEventListener("click",buildPortfolioPdf);
  $("downloadPortfolioPdf")?.addEventListener("click",buildPortfolioPdf);

  $("exportCenterBtn")?.addEventListener("click",()=>{
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute("href", dataStr);
    dlAnchor.setAttribute("download", "aureus_capital_backup.json");
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    toast("JSON backup downloaded.","success");
  });

  $("appInfoBtn")?.addEventListener("click",()=>{
    alert("Aureus Capital v3.0\nInstitutional Private Workspace & Settlement Engine.");
  });

  $("resetApp")?.addEventListener("click",()=>{
    if(confirm("Reset all private application data?")){
      try{ localStorage.clear(); }catch(e){}
      location.reload();
    }
  });
}

function init(){
  load();
  applyTheme();

  setupNavigation();
  setupInvestorEvents();
  setupSettlementEvents();
  setupSettings();
  setupAppControls();

  if($("settlementFx")) $("settlementFx").value = state.settings.fx;

  render();
  calculateSettlement();

  try{
    const t = totals();
    const c = cycleInfo();
    animateValue("totalPool", 0, t.pool, 700, v => usd(v));
    animateValue("currentPortfolioValue", 0, t.pool + t.profit, 700, v => usd(v));
    animateValue("homeProfit", 0, t.profit, 700, v => usd(v));
    animateValue("homeRate", 0, c.rate, 600, v => v.toFixed(2) + "%");
  }catch(e){}

  setTimeout(()=>{
    const splash = $("splash");
    if(splash){
      splash.classList.add("hide");
    }
  }, 1500);

  setInterval(()=>{render()},60000);
}

if(document.readyState === "loading"){
  document.addEventListener("DOMContentLoaded", init);
}else{
  init();
}

})();
