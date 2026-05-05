// Wordle-style mark evaluation. Identical algorithm to the version that
// used to live client-side -- duplicated checks below if you ever migrate
// the client back to local validation, but treat THIS as the source of
// truth from now on.
//
// Marks are returned as an array the same length as `guess`:
//   "green"  - right letter, right position
//   "amber"  - right letter, wrong position (counted with multiplicity)
//   "red"    - letter not in answer (or already accounted for by greens/ambers)
//
// Letter counts handle duplicate-letter cases correctly: e.g. guess "EERIE"
// vs answer "EJECT" gives one green E (position 0) and the other E's red,
// not amber, because there's only one E in the answer.

export function evaluateGuess(guess, answer) {
  guess = String(guess).toUpperCase();
  answer = String(answer).toUpperCase();
  const len = answer.length;
  if (guess.length !== len) {
    throw new Error(`Guess length ${guess.length} != answer length ${len}`);
  }

  const marks = new Array(len).fill("red");
  const counts = {};
  for (let i = 0; i < len; i++) {
    if (guess[i] === answer[i]) {
      marks[i] = "green";
    } else {
      counts[answer[i]] = (counts[answer[i]] || 0) + 1;
    }
  }
  for (let i = 0; i < len; i++) {
    if (marks[i] === "green") continue;
    const c = guess[i];
    if (counts[c] > 0) {
      marks[i] = "amber";
      counts[c]--;
    }
  }
  return marks;
}
