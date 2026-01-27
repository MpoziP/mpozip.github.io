// =====================
// App State
// =====================
let allQuestions = [];
let testQuestions = [];
let index = 0;
let correct = 0;
let wrong = 0;
let locked = false;
let wrongDetails = [];
let startValue = 1;
let endValue = 30;

// =====================
// Elements
// =====================
const startCard = document.getElementById("startCard");
const quizCard = document.getElementById("quizCard");
const resultsCard = document.getElementById("resultsCard");

const jsonPath = document.getElementById("jsonPath");
const startInput = document.getElementById("startInput");
const endInput = document.getElementById("endInput");
const startBtn = document.getElementById("startBtn");
const loadError = document.getElementById("loadError");

const qNum = document.getElementById("qNum");
const qTotal = document.getElementById("qTotal");
const qPage = document.getElementById("qPage");
const qText = document.getElementById("qText");

const choices = document.getElementById("choices");
const feedback = document.getElementById("feedback");
const nextBtn = document.getElementById("nextBtn");
const quitBtn = document.getElementById("quitBtn");

const scoreGood = document.getElementById("scoreGood");
const scoreBad = document.getElementById("scoreBad");

const rangeShow = document.getElementById("rangeShow");
const finalGood = document.getElementById("finalGood");
const finalBad = document.getElementById("finalBad");

const wrongList = document.getElementById("wrongList");
const noWrong = document.getElementById("noWrong");
const restartBtn = document.getElementById("restartBtn");

// =====================
// Helpers
// =====================
function show(el) { el.classList.remove("d-none"); }
function hide(el) { el.classList.add("d-none"); }

function normalize(q) {
  return {
    page: String(q.page ?? ""),
    question: String(q.question ?? ""),
    answer: q.answer ?? {},
    correct: String(q.correct_answer ?? "").trim()
  };
}

async function loadQuestions(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error(`Cannot load JSON (${res.status}). Check path or run a local server.`);
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("JSON root must be an array: [ {...}, {...} ]");
  const cleaned = data.map(normalize).filter(q => q.question && q.correct && Object.keys(q.answer).length > 0);
  if (cleaned.length === 0) throw new Error("No valid questions found in JSON.");
  return cleaned;
}

function buildTest() {
  // Use 1-based indexing: convert to 0-based for array slicing
  const start = Math.max(1, startValue) - 1; // convert to 0-based
  const end = Math.min(endValue, allQuestions.length); // end is already 1-based, use directly for slice
  testQuestions = allQuestions.slice(start, end);
}

// scroll question into view nicely on mobile
function scrollToTopOfQuiz() {
  quizCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

// =====================
// Render
// =====================
function renderQuestion() {
  locked = false;
  hide(feedback);
  hide(nextBtn);
  choices.innerHTML = "";

  const q = testQuestions[index];

  qNum.textContent = index + 1;
  qTotal.textContent = testQuestions.length;
  qPage.textContent = q.page || "-";
  qText.textContent = q.question;

  // preserve key order (α, β, γ...)
  const keys = Object.keys(q.answer);
  keys.forEach(key => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-outline-dark choice-btn";
    btn.textContent = `${key}. ${q.answer[key]}`;
    btn.addEventListener("click", () => selectAnswer(key));
    choices.appendChild(btn);
  });

  scoreGood.textContent = correct;
  scoreBad.textContent = wrong;

  scrollToTopOfQuiz();
}

function selectAnswer(key) {
  if (locked) return;
  locked = true;

  const q = testQuestions[index];
  const correctKey = q.correct;

  const buttons = [...choices.querySelectorAll("button")];
  buttons.forEach(b => {
    b.disabled = true;
    const k = b.textContent.split(".")[0].trim();
    if (k === correctKey) b.classList.add("btn-success");
    else b.classList.add("btn-outline-secondary");
  });

  const ok = key === correctKey;

  if (ok) {
    correct++;
    feedback.className = "alert alert-success mt-2 mb-3";
    feedback.textContent = "✅ Correct";
  } else {
    wrong++;
    feedback.className = "alert alert-danger mt-2 mb-3";
    feedback.textContent = `❌ Wrong — Correct: ${correctKey}. ${q.answer[correctKey] ?? ""}`;

    wrongDetails.push({
      question: q.question,
      page: q.page,
      choices: q.answer,
      chosen: key,
      correct: correctKey
    });

    // highlight chosen wrong button
    const chosenBtn = buttons.find(b => b.textContent.startsWith(key + "."));
    if (chosenBtn) chosenBtn.classList.remove("btn-outline-secondary"), chosenBtn.classList.add("btn-danger");
  }

  scoreGood.textContent = correct;
  scoreBad.textContent = wrong;

  show(feedback);
  show(nextBtn);
}

function nextQuestion() {
  index++;
  if (index >= testQuestions.length) showResults();
  else renderQuestion();
}

function showResults() {
  hide(quizCard);
  show(resultsCard);

  rangeShow.textContent = `${startValue}-${endValue}`;
  finalGood.textContent = correct;
  finalBad.textContent = wrong;

  wrongList.innerHTML = "";

  if (wrongDetails.length === 0) {
    show(noWrong);
    return;
  }
  hide(noWrong);

  wrongDetails.forEach(item => {
    const div = document.createElement("div");
    div.className = "p-3 border rounded bg-white";

    let html = `
      <div class="fw-semibold">${escapeHtml(item.question)}</div>
      <div class="small text-muted">Page: ${escapeHtml(item.page)}</div>
      <div class="mt-2 small">
    `;

    for (const k of Object.keys(item.choices)) {
      let badge = "";
      if (k === item.correct) badge = ' <span class="badge text-bg-success">correct</span>';
      else if (k === item.chosen) badge = ' <span class="badge text-bg-danger">your choice</span>';
      html += `<div>${escapeHtml(k)}. ${escapeHtml(item.choices[k])}${badge}</div>`;
    }

    html += `
      </div>
      <div class="mt-2 small">
        <div><strong class="text-danger">You chose:</strong> ${escapeHtml(item.chosen)}. ${escapeHtml(item.choices[item.chosen] ?? "")}</div>
        <div><strong class="text-success">Correct:</strong> ${escapeHtml(item.correct)}. ${escapeHtml(item.choices[item.correct] ?? "")}</div>
      </div>
    `;

    div.innerHTML = html;
    wrongList.appendChild(div);
  });

  resultsCard.scrollIntoView({ behavior: "smooth", block: "start" });
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

// =====================
// Reset
// =====================
function reset() {
  index = 0;
  correct = 0;
  wrong = 0;
  locked = false;
  wrongDetails = [];

  hide(resultsCard);
  hide(quizCard);
  show(startCard);
  hide(loadError);
}

// =====================
// Events
// =====================
startBtn.addEventListener("click", async () => {
  hide(loadError);

  startValue = parseInt(startInput.value) || 1;
  endValue = parseInt(endInput.value) || 30;
  const path = (jsonPath.value || "./questions.json").trim();

  // Validate range
  if (startValue < 1) {
    loadError.textContent = "Start must be at least 1";
    show(loadError);
    return;
  }
  if (endValue < startValue) {
    loadError.textContent = "End must be greater than or equal to Start";
    show(loadError);
    return;
  }

  try {
    allQuestions = await loadQuestions(path);
    
    if (startValue > allQuestions.length) {
      loadError.textContent = `Start (${startValue}) is beyond available questions (${allQuestions.length})`;
      show(loadError);
      return;
    }
    
    buildTest();

    if (testQuestions.length === 0) {
      loadError.textContent = "No questions in selected range";
      show(loadError);
      return;
    }

    hide(startCard);
    show(quizCard);

    renderQuestion();
  } catch (err) {
    loadError.textContent = err.message || String(err);
    show(loadError);
  }
});

nextBtn.addEventListener("click", nextQuestion);
quitBtn.addEventListener("click", reset);
restartBtn.addEventListener("click", reset);
