/**
 * Interaktív Önellenőrző és Kvíz Modul
 */
function answerQuiz(qNum, optIdx, isCorrect) {
  const card = document.getElementById(`q${qNum}`);
  const opts = card.querySelectorAll('.q-opt-m');
  const exp = document.getElementById(`exp-${qNum}`);
  opts.forEach((o, i) => {
    o.disabled = true;
    if (i === optIdx) o.classList.add(isCorrect ? 'correct' : 'wrong');
  });
  exp.style.display = 'block';
}