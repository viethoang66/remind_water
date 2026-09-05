const STORAGE_KEY = 'giot-nuoc-data-v1';
const dateKey = date => {
  const local = new Date(date);
  const month = String(local.getMonth() + 1).padStart(2, '0');
  const day = String(local.getDate()).padStart(2, '0');
  return `${local.getFullYear()}-${month}-${day}`;
};
const todayKey = () => dateKey(new Date());
const formatMl = value => `${Number(value).toLocaleString('vi-VN')} ml`;
const dayName = date => ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'][date.getDay()];

const defaultData = { goal: 2000, name: 'Mai Anh', reminder: true, dark: false, entries: {}, history: {} };
let data;
try { data = { ...defaultData, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') }; } catch { data = defaultData; }
data.entries ||= {}; data.history ||= {};
if (data.name === 'An') data.name = 'Mai Anh';

const $ = selector => document.querySelector(selector);
const elements = {
  progressText: $('#progressText'), progressRing: $('#progressRing'), progressPercent: $('#progressPercent'),
  toGoal: $('#toGoal'), dailyCups: $('#dailyCups'), progressMessage: $('#progressMessage'),
  streak: $('#streakCount'), log: $('#drinkLog'), empty: $('#emptyLog'), weekChart: $('#weekChart'),
  weeklyAverage: $('#weeklyAverage'), chartNote: $('#chartNote'), reminder: $('#reminderToggle'), reminderStatus: $('#reminderStatus'),
  reminderCopy: $('#reminderCopy'), userName: $('#userName'), todayLabel: $('#todayLabel'), toast: $('#toast')
};

function save() { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); }
function todayEntries() { return data.entries[todayKey()] || []; }
function totalToday() { return todayEntries().reduce((sum, entry) => sum + entry.amount, 0); }
function dateOffset(days) { const d = new Date(); d.setDate(d.getDate() + days); return d; }
function keyFor(date) { return dateKey(date); }
function totalFor(key) { return (key === todayKey() ? (data.entries[key] || []) : (data.history[key] || [])).reduce((s, e) => s + e.amount, 0); }

function syncHistory() {
  Object.entries(data.entries).forEach(([key, entries]) => { if (key !== todayKey()) { data.history[key] = entries; delete data.entries[key]; } });
  data.entries[todayKey()] ||= [];
  save();
}

function streak() {
  let count = 0;
  for (let i = 0; i < 366; i++) { const key = keyFor(dateOffset(-i)); if (totalFor(key) >= data.goal) count++; else break; }
  return count;
}

function showToast(message) { elements.toast.textContent = message; elements.toast.classList.add('show'); clearTimeout(showToast.timer); showToast.timer = setTimeout(() => elements.toast.classList.remove('show'), 2600); }
function localDateLabel() { return new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()).toUpperCase(); }

function renderLog() {
  const entries = [...todayEntries()].reverse();
  elements.log.innerHTML = entries.map((entry, index) => `<li class="log-item"><span class="log-icon">💧</span><span class="log-main"><strong>${formatMl(entry.amount)}</strong><small>${entry.time}</small></span><button class="log-delete" aria-label="Xóa ${formatMl(entry.amount)}" data-index="${todayEntries().length - 1 - index}">×</button></li>`).join('');
  elements.empty.style.display = entries.length ? 'none' : 'block';
  elements.log.style.display = entries.length ? 'flex' : 'none';
  document.querySelectorAll('.log-delete').forEach(button => button.addEventListener('click', () => {
    data.entries[todayKey()].splice(Number(button.dataset.index), 1); save(); render(); showToast('Đã xóa lần ghi.');
  }));
}

function renderChart() {
  const days = Array.from({ length: 7 }, (_, index) => dateOffset(index - 6));
  const totals = days.map(d => totalFor(keyFor(d)));
  const ceiling = Math.max(data.goal, ...totals, 1);
  elements.weekChart.innerHTML = days.map((date, index) => {
    const today = index === 6; const height = Math.max(totals[index] ? 10 : 3, (totals[index] / ceiling) * 100);
    return `<div class="chart-day ${today ? 'today' : ''}" title="${dayName(date)}: ${formatMl(totals[index])}"><i class="chart-bar" style="height:${height}%"></i><b>${today ? 'Nay' : dayName(date)}</b></div>`;
  }).join('');
  const total = totals.reduce((sum, value) => sum + value, 0);
  elements.weeklyAverage.textContent = `${formatMl(Math.round(total / 7))}/ngày`;
  const completed = totals.filter(value => value >= data.goal).length;
  elements.chartNote.textContent = completed ? `Tuyệt vời — bạn đã đạt mục tiêu ${completed}/7 ngày.` : 'Hôm nay là ngày khởi đầu tuyệt vời.';
}

function render() {
  const total = totalToday(); const percent = Math.min(100, Math.round((total / data.goal) * 100)); const remaining = Math.max(0, data.goal - total);
  elements.progressText.textContent = `${formatMl(total)} / ${formatMl(data.goal)}`;
  elements.progressPercent.textContent = `${percent}%`;
  elements.progressRing.style.setProperty('--progress', `${percent}%`);
  elements.progressRing.setAttribute('aria-label', `${percent} phần trăm mục tiêu`);
  elements.toGoal.textContent = remaining ? formatMl(remaining) : 'Đã đủ!';
  elements.dailyCups.textContent = `${todayEntries().length} ly`;
  elements.progressMessage.textContent = percent >= 100 ? 'Bạn đã hoàn thành mục tiêu hôm nay. Cơ thể cảm ơn bạn! 🎉' : percent >= 65 ? 'Bạn đang đi đúng nhịp rồi, cố thêm một chút nữa nhé.' : percent >= 25 ? 'Một khởi đầu tốt! Cứ duy trì từng ly nước nhỏ.' : 'Bắt đầu thật nhẹ nhàng với một ly nước nhé.';
  elements.streak.textContent = streak(); elements.userName.textContent = data.name; elements.todayLabel.textContent = localDateLabel();
  elements.reminder.checked = data.reminder; elements.reminderStatus.textContent = data.reminder ? 'Bật' : 'Tắt';
  elements.reminderCopy.innerHTML = data.reminder ? 'Lần nhắc tiếp theo vào <strong>10:30</strong>' : 'Nhắc uống nước đang được tạm dừng.';
  document.body.classList.toggle('dark', data.dark); $('#themeToggle').textContent = data.dark ? '☀' : '☾';
  renderLog(); renderChart();
}

function addWater(amount) {
  const time = new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(new Date());
  data.entries[todayKey()].push({ amount: Number(amount), time }); save(); render(); showToast(`Đã thêm ${formatMl(amount)}. Cơ thể bạn sẽ thích điều này!`);
}

function openAmountDialog() { const dialog = $('#amountDialog'); $('#amountInput').value = ''; dialog.showModal(); setTimeout(() => $('#amountInput').focus(), 50); }
function openGoalDialog(reminder = false) { const dialog = $('#settingsDialog'); $('#settingsTitle').textContent = reminder ? 'Thiết lập lời nhắc' : 'Mục tiêu hằng ngày'; $('#settingsDescription').textContent = reminder ? 'Chọn mục tiêu nước để các lời nhắc phù hợp hơn.' : 'Chọn lượng nước phù hợp với nhịp sống của bạn.'; $('#goalInput').value = data.goal; dialog.showModal(); }

document.querySelectorAll('[data-amount]').forEach(button => button.addEventListener('click', () => addWater(button.dataset.amount)));
$('#customAmount').addEventListener('click', openAmountDialog); $('#navAdd').addEventListener('click', openAmountDialog);
$('#amountForm').addEventListener('submit', event => { event.preventDefault(); const amount = Number($('#amountInput').value); if (amount > 0 && amount <= 5000) { addWater(amount); $('#amountDialog').close(); } });
$('#cancelAmount').addEventListener('click', () => $('#amountDialog').close());
$('#editGoal').addEventListener('click', () => openGoalDialog()); $('#reminderSettings').addEventListener('click', () => openGoalDialog(true));
$('#settingsForm').addEventListener('submit', event => { event.preventDefault(); const goal = Number($('#goalInput').value); if (goal >= 500 && goal <= 10000) { data.goal = goal; save(); render(); $('#settingsDialog').close(); showToast('Đã cập nhật mục tiêu hằng ngày.'); } });
$('#cancelSettings').addEventListener('click', () => $('#settingsDialog').close());
elements.reminder.addEventListener('change', event => { data.reminder = event.target.checked; save(); render(); showToast(data.reminder ? 'Đã bật lời nhắc.' : 'Đã tắt lời nhắc.'); });
$('#themeToggle').addEventListener('click', () => { data.dark = !data.dark; save(); render(); });
$('#clearLog').addEventListener('click', () => { if (todayEntries().length && confirm('Xóa tất cả lần ghi hôm nay?')) { data.entries[todayKey()] = []; save(); render(); showToast('Nhật ký hôm nay đã được làm trống.'); } });
$('#profileButton').addEventListener('click', () => { const name = prompt('Bạn muốn được gọi là gì?', data.name); if (name?.trim()) { data.name = name.trim().slice(0, 18); save(); render(); } });
const tips = ['Gắn nước với một thói quen sẵn có', 'Để bình nước trong tầm mắt', 'Uống vài ngụm sau mỗi cuộc họp', 'Thêm lát chanh hoặc bạc hà cho dễ uống']; let tipIndex = 0;
$('#nextTip').addEventListener('click', () => { tipIndex = (tipIndex + 1) % tips.length; document.querySelector('.tip-card h2').textContent = tips[tipIndex]; });

const installCard = $('#installCard');
const installButton = $('#installButton');
let deferredInstallPrompt;
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
const isStandalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;

if (!isStandalone && !localStorage.getItem('giot-nuoc-install-dismissed')) {
  if (isIos) {
    $('#installHint').textContent = 'Trên Safari: chạm Chia sẻ rồi chọn “Thêm vào Màn hình chính”.';
    installButton.hidden = true;
    installCard.hidden = false;
  }
}

window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredInstallPrompt = event;
  if (!isStandalone && !localStorage.getItem('giot-nuoc-install-dismissed')) installCard.hidden = false;
});

installButton.addEventListener('click', async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  installCard.hidden = true;
});
$('#dismissInstall').addEventListener('click', () => { localStorage.setItem('giot-nuoc-install-dismissed', '1'); installCard.hidden = true; });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js'));
}

syncHistory(); render();
