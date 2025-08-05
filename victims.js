import { fadeColor } from './app.js';

const FOLDER = './data/';
const LETTERS = ['A', 'B', 'C', 'D', 'E'];
const LETTER_DESC = {
  A: 'Information and Referral',
  B: 'Personal Advocacy / Accompaniment',
  C: 'Emotional Support or Safety Services',
  D: 'Shelter / Housing Services',
  E: 'Criminal / Civil Justice System Assistance'
};
const LETTER_DETAIL = {
  A: 'Info about victim rights, justice process, and referrals.',
  B: 'Advocacy during interviews, help with public benefits, interpreter services, immigration help.',
  C: 'Crisis counseling, community response, emergency financial help, support groups.',
  D: 'Emergency shelter, relocation help, transitional housing.',
  E: 'Updates on legal events, court support, restitution help, legal guidance.'
};
const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0'];

let latestYear = null;

async function discoverVictimYear() {
  const thisYear = new Date().getFullYear();
  for (let y = thisYear; y >= 2015; y--) {
    const res = await fetch(`${FOLDER}victims_${y}.xlsx`, { method: 'HEAD' });
    if (res.ok) {
      latestYear = y;
      return y;
    }
  }
  throw new Error('No victim data files found');
}

async function loadVictimData(year) {
  const buf = await fetch(`${FOLDER}victims_${year}.xlsx`).then(r => r.arrayBuffer());
  const wb = XLSX.read(buf, { type: 'array' });
  const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '' });

  return raw.map(row => {
    const id = parseInt(String(row['Case ID']).trim(), 10);
    if (!Number.isInteger(id)) return null;
    const count = +row['service records'] || 0;
    return {
      count,
      letters: LETTERS.filter(L => String(row[L]).trim().toLowerCase() === 'yes')
    };
  }).filter(Boolean);
}

function renderVictimDashboard(data) {
  const total = data.reduce((sum, r) => sum + r.count, 0);
  const letterCounts = Object.fromEntries(LETTERS.map(L => [L, 0]));
  data.forEach(r => r.letters.forEach(L => letterCounts[L]++));

  document.getElementById('victimSub').innerHTML = `
    <strong>${total.toLocaleString()}</strong> service records across
    <strong>${data.length}</strong> cases (${latestYear})
  `;

  const statsWrap = document.getElementById('victimStatsWrap');
  statsWrap.innerHTML = '';

  LETTERS.forEach((L, i) => {
    const count = letterCounts[L];
    const percent = ((count / data.length) * 100).toFixed(1);
    const color = COLORS[i % COLORS.length];

    const div = document.createElement('div');
    div.className = 'victim-card';
    div.style.borderLeftColor = color;
    div.innerHTML = `
      <div class="victim-title">${LETTER_DESC[L]}</div>
      <div class="victim-value" style="color:${color}">${count} cases</div>
      <div class="percent">(${percent}% of total)</div>
    `;

    div.onmouseenter = () => updateDescription(L, color);
    div.onmouseleave = () => resetDescription();

    statsWrap.appendChild(div);
  });
}

function updateDescription(letter, color) {
  const box = document.getElementById('victimDescBox');
  box.style.opacity = 0;
  setTimeout(() => {
    box.innerHTML = `
      <h3 style="color:${color}">${LETTER_DESC[letter]}</h3>
      <p>${LETTER_DETAIL[letter]}</p>
    `;
    box.style.opacity = 1;
  }, 150);
}

function resetDescription() {
  const box = document.getElementById('victimDescBox');
  box.style.opacity = 0;
  setTimeout(() => {
    box.innerHTML = `<h3>Hover a service type to see description</h3>`;
    box.style.opacity = 1;
  }, 150);
}

(async () => {
  try {
    const year = await discoverVictimYear();
    const data = await loadVictimData(year);
    renderVictimDashboard(data);
  } catch (err) {
    document.getElementById('victimSub').textContent = 'No data available.';
    console.error(err);
  }
})();