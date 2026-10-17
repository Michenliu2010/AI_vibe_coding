const scoreEl = document.getElementById('score');
const timerEl = document.getElementById('timer');
const bestScoreEl = document.getElementById('best-score');
const statusEl = document.getElementById('status');
const startBtn = document.getElementById('start-btn');
const resetBtn = document.getElementById('reset-btn');
const gameArea = document.getElementById('game-area');
const targetBtn = document.getElementById('target-btn');

const GAME_TIME = 30;
const BASE_MOVE_INTERVAL = 620;
const MIN_MOVE_INTERVAL = 180;
const BEST_SCORE_KEY = 'hit-the-button-best-score';

let score = 0;
let timeLeft = GAME_TIME;
let timerId = null;
let moveId = null;
let isPlaying = false;
let moveSpeed = BASE_MOVE_INTERVAL;

function updateScore() {
  scoreEl.textContent = String(score);
}

function updateTimer() {
  timerEl.textContent = String(timeLeft);
}

function updateBestScore() {
  const bestScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  bestScoreEl.textContent = String(bestScore);
}

function setStatus(message, isGood = false) {
  statusEl.textContent = message;
  statusEl.style.color = isGood ? '#86efac' : '#94a3b8';
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function moveTarget() {
  if (!isPlaying) return;

  const areaRect = gameArea.getBoundingClientRect();
  const buttonRect = targetBtn.getBoundingClientRect();
  const padding = 14;
  const maxX = Math.max(padding, areaRect.width - buttonRect.width - padding);
  const maxY = Math.max(padding, areaRect.height - buttonRect.height - padding);

  const nextX = randomBetween(padding, maxX);
  const nextY = randomBetween(padding, maxY);

  targetBtn.style.left = `${nextX}px`;
  targetBtn.style.top = `${nextY}px`;
  targetBtn.style.transform = 'translate(0, 0)';
}

function updateDifficulty() {
  const nextSpeed = Math.max(
    MIN_MOVE_INTERVAL,
    BASE_MOVE_INTERVAL - score * 11 - (GAME_TIME - timeLeft) * 10
  );

  if (nextSpeed !== moveSpeed) {
    moveSpeed = nextSpeed;
    clearInterval(moveId);
    moveId = setInterval(moveTarget, moveSpeed);
  }
}

function finishGame() {
  isPlaying = false;
  clearInterval(timerId);
  clearInterval(moveId);
  startBtn.disabled = false;

  const bestScore = Number(localStorage.getItem(BEST_SCORE_KEY) || 0);
  if (score > bestScore) {
    localStorage.setItem(BEST_SCORE_KEY, String(score));
    updateBestScore();
    setStatus(`Time's up! New best score: ${score}!`, true);
  } else {
    setStatus(`Time's up! Final score: ${score}.`, false);
  }

  startBtn.textContent = 'Play Again';
  targetBtn.blur();
}

function startGame() {
  score = 0;
  timeLeft = GAME_TIME;
  moveSpeed = BASE_MOVE_INTERVAL;
  updateScore();
  updateTimer();
  setStatus('Catch the button as fast as you can!', true);

  isPlaying = true;
  startBtn.textContent = 'Playing...';
  startBtn.disabled = true;

  moveTarget();
  clearInterval(moveId);
  moveId = setInterval(moveTarget, moveSpeed);

  timerId = setInterval(() => {
    timeLeft -= 1;
    updateTimer();
    updateDifficulty();

    if (timeLeft <= 0) {
      finishGame();
    }
  }, 1000);
}

function resetBestScore() {
  localStorage.setItem(BEST_SCORE_KEY, '0');
  updateBestScore();
  setStatus('Best score reset.', false);
}

startBtn.addEventListener('click', () => {
  if (!isPlaying) {
    startGame();
  }
});

resetBtn.addEventListener('click', resetBestScore);

targetBtn.addEventListener('click', () => {
  if (!isPlaying) {
    setStatus('Press start to begin the round.');
    return;
  }

  score += 10;
  updateScore();
  updateDifficulty();
  moveTarget();
  setStatus('Nice hit!', true);
});

window.addEventListener('load', () => {
  updateBestScore();
  updateScore();
  updateTimer();
  moveTarget();
});

window.addEventListener('beforeunload', () => {
  clearInterval(timerId);
  clearInterval(moveId);
});
