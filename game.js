// ---------- GAME DATA ----------
const INGREDIENTS = [
  { id: "pita",     emoji: "🫓", name: "Pita" },
  { id: "falafel",  emoji: "🧆", name: "Falafel" },
  { id: "tomato",   emoji: "🍅", name: "Tomato" },
  { id: "cucumber", emoji: "🥒", name: "Cucumber" },
  { id: "lettuce",  emoji: "🥬", name: "Lettuce" },
  { id: "onion",    emoji: "🧅", name: "Onion" },
  { id: "tahini",   emoji: "🥛", name: "Tahini" },
  { id: "pickle",   emoji: "🥗", name: "Pickles" },
  { id: "chili",    emoji: "🌶️", name: "Chili" },
  { id: "hummus",   emoji: "🥣", name: "Hummus" },
  { id: "fries",    emoji: "🍟", name: "Fries" },
  { id: "lemonade", emoji: "🍋", name: "Lemonade" }
];

// Meals (diversity of meals)
const MEALS = [
  { name: "Classic Falafel Wrap",  items: ["pita", "falafel", "tomato", "lettuce", "tahini"], price: 10 },
  { name: "Spicy Falafel Wrap",    items: ["pita", "falafel", "chili", "onion", "tahini"],    price: 12 },
  { name: "Veggie Pita Pocket",    items: ["pita", "cucumber", "tomato", "lettuce", "pickle"], price: 9 },
  { name: "Hummus Falafel Plate",  items: ["hummus", "falafel", "falafel", "pickle"],          price: 13 },
  { name: "Falafel & Fries Combo", items: ["falafel", "falafel", "fries", "lemonade"],         price: 14 },
  { name: "Double Falafel Wrap",   items: ["pita", "falafel", "falafel", "tahini", "onion"],   price: 13 },
  { name: "Fresh Lemonade Set",    items: ["lemonade", "falafel", "pickle"],                   price: 8 }
];

const CUSTOMERS = ["👨‍🦱", "👩‍🦰", "👴", "👵", "🧑‍🎓", "👨‍🍳", "👩‍💼", "🧔", "👧", "👦"];
const FRY_TIME = 3000;      // ms to cook
const BURN_TIME = 6000;     // ms until burnt
const GAME_TIME = 90;       // seconds
const PATIENCE_TIME = 25;   // seconds per customer

// ---------- STATE ----------
let score, coins, timeLeft, tray, currentOrder, patience;
let friedFalafel;            // number of ready falafels in the basket
let fryStart = null;         // when frying started
let gameTimer, patienceTimer, fryTimer;
let streak;

// ---------- ELEMENTS ----------
const $ = id => document.getElementById(id);
const screens = { start: $("start-screen"), game: $("game-screen"), end: $("end-screen") };

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add("hidden"));
  screens[name].classList.remove("hidden");
}

// ---------- BUILD INGREDIENT BUTTONS ----------
function buildIngredientButtons() {
  const box = $("ingredients");
  box.innerHTML = "";
  INGREDIENTS.forEach(ing => {
    const b = document.createElement("button");
    b.className = "ing-btn";
    b.innerHTML = `${ing.emoji}<span>${ing.name}</span>`;
    b.onclick = () => addToTray(ing.id);
    box.appendChild(b);
  });
}

// ---------- GAME FLOW ----------
function startGame() {
  score = 0; coins = 0; timeLeft = GAME_TIME; tray = [];
  friedFalafel = 0; fryStart = null; streak = 0;
  updateHUD(); renderTray(); resetFryer();
  showScreen("game");
  newCustomer();

  clearInterval(gameTimer);
  gameTimer = setInterval(() => {
    timeLeft--;
    $("time").textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }, 1000);

  clearInterval(fryTimer);
  fryTimer = setInterval(updateFryer, 100);
}

function endGame() {
  clearInterval(gameTimer); clearInterval(patienceTimer); clearInterval(fryTimer);
  $("final-score").textContent = `Score: ${score}  |  Coins: ${coins}`;
  let rank = "Kitchen Helper 🥄";
  if (score >= 300) rank = "Falafel Legend 👑";
  else if (score >= 180) rank = "Master Chef 👨‍🍳";
  else if (score >= 80)  rank = "Skilled Cook 🍳";
  $("rank-text").textContent = "Your rank: " + rank;
  showScreen("end");
}

function newCustomer() {
  currentOrder = MEALS[Math.floor(Math.random() * MEALS.length)];
  const face = CUSTOMERS[Math.floor(Math.random() * CUSTOMERS.length)];
  const area = $("customer-area");
  area.textContent = face;
  area.classList.remove("customer-in");
  void area.offsetWidth;
  area.classList.add("customer-in");

  const need = currentOrder.items.map(id => INGREDIENTS.find(i => i.id === id).emoji).join(" ");
  $("order-text").innerHTML = `"I want a <b>${currentOrder.name}</b>!"<br>${need}`;

  patience = PATIENCE_TIME;
  clearInterval(patienceTimer);
  patienceTimer = setInterval(() => {
    patience -= 0.2;
    const pct = Math.max(0, (patience / PATIENCE_TIME) * 100);
    const fill = $("patience-fill");
    fill.style.width = pct + "%";
    fill.style.background = pct > 50 ? "#4caf50" : pct > 25 ? "#ffb300" : "#e53935";
    if (patience <= 0) customerLeaves();
  }, 200);
}

function customerLeaves() {
  clearInterval(patienceTimer);
  score = Math.max(0, score - 10);
  streak = 0;
  say("😠 Customer left angry! -10 points", false);
  tray = []; renderTray(); updateHUD();
  $("customer-area").textContent = "💨";
  setTimeout(newCustomer, 800);
}

// ---------- TRAY ----------
function addToTray(id) {
  if (id === "falafel") {
    if (friedFalafel <= 0) { say("No fried falafel! Fry some first 🔥", false); shake(); return; }
    friedFalafel--;
    updateFryerText();
  }
  if (tray.length >= 8) { say("Tray is full!", false); return; }
  tray.push(id);
  renderTray();
}

function renderTray() {
  $("tray").innerHTML = tray.length
    ? tray.map(id => INGREDIENTS.find(i => i.id === id).emoji).join(" ")
    : "<span style='font-size:14px;color:#777'>Empty tray</span>";
}

$("clear-btn")?.addEventListener("click", () => {
  // return unused falafels
  friedFalafel += tray.filter(t => t === "falafel").length;
  tray = []; renderTray(); updateFryerText(); say("");
});

// ---------- SERVE & POINTS ----------
function serve() {
  if (!currentOrder || tray.length === 0) { say("Tray is empty!", false); return; }

  const need = [...currentOrder.items].sort().join(",");
  const have = [...tray].sort().join(",");

  if (need === have) {
    // Points: base 20 + speed bonus + streak bonus
    const speedBonus = Math.round(patience);               // faster = more
    streak++;
    const streakBonus = streak >= 3 ? 15 : 0;
    const gained = 20 + speedBonus + streakBonus;
    score += gained;
    coins += currentOrder.price;
    let txt = `✅ Perfect! +${gained} points (+${currentOrder.price} coins)`;
    if (streakBonus) txt += ` 🔥 Streak x${streak}!`;
    say(txt, true);
    tray = []; renderTray(); updateHUD();
    clearInterval(patienceTimer);
    $("customer-area").textContent = "😍";
    setTimeout(newCustomer, 900);
  } else {
    score = Math.max(0, score - 5);
    streak = 0;
    say("❌ Wrong order! -5 points", false);
    shake();
    // give falafels back
    friedFalafel += tray.filter(t => t === "falafel").length;
    tray = []; renderTray(); updateFryerText(); updateHUD();
  }
}
$("serve-btn")?.addEventListener("click", serve);

// ---------- FRYER ----------
function resetFryer() {
  fryStart = null;
  $("fry-fill").style.width = "0";
  updateFryerText();
}

function updateFryerText() {
  if (fryStart === null) {
    $("fry-text").textContent = friedFalafel > 0
      ? `🧆 Ready falafels: ${friedFalafel}`
      : "Fryer is empty";
  }
}

function startFry() {
  if (fryStart !== null) return;
  fryStart = Date.now();
  say("Frying... take them out at the golden moment!", true);
}

function updateFryer() {
  if (fryStart === null) return;
  const t = Date.now() - fryStart;
  const pct = Math.min(100, (t / BURN_TIME) * 100);
  $("fry-fill").style.width = pct + "%";

  if (t < FRY_TIME) {
    $("fry-text").textContent = "🔥 Frying... (raw)";
    $("fry-fill").style.background = "#fff59d";
  } else if (t < BURN_TIME - 1500) {
    $("fry-text").textContent = "✨ GOLDEN! Tap Fry to collect!";
    $("fry-fill").style.background = "#ffb300";
  } else if (t < BURN_TIME) {
    $("fry-text").textContent = "⚠️ Almost burnt!";
    $("fry-fill").style.background = "#e65100";
  } else {
    $("fry-text").textContent = "💀 BURNT! Tap to throw away";
    $("fry-fill").style.background = "#222";
  }
}

$("fry-btn")?.addEventListener("click", () => {
  if (fryStart === null) { startFry(); return; }
  const t = Date.now() - fryStart;
  if (t < FRY_TIME) {
    say("Still raw! Wait a bit more ⏳", false);
  } else if (t < BURN_TIME) {
    const perfect = t < BURN_TIME - 1500;
    friedFalafel += 3;
    if (perfect) { score += 5; say("🌟 Perfect golden falafel! +3 falafels, +5 points", true); }
    else { say("Okay, slightly dark. +3 falafels", true); }
    resetFryer(); updateHUD();
  } else {
    score = Math.max(0, score - 5);
    say("💀 Burnt! Thrown away. -5 points", false);
    resetFryer(); updateHUD();
  }
});

// ---------- HELPERS ----------
function updateHUD() {
  $("score").textContent = score;
  $("coins").textContent = coins;
  $("time").textContent = timeLeft;
}
function say(text, good) {
  const m = $("message");
  m.textContent = text;
  m.className = good ? "good" : "";
}
function shake() {
  const t = $("tray");
  t.classList.remove("shake"); void t.offsetWidth; t.classList.add("shake");
}

// ---------- INIT ----------
buildIngredientButtons();
$("start-btn").addEventListener("click", startGame);
$("restart-btn").addEventListener("click", startGame);
