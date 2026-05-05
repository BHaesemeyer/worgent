// Server-side puzzle generation. Determines today's answer for a given
// (length, dayIdx) pair using:
//   1. A holiday-override table (themed words for specific calendar dates).
//   2. Otherwise, a deterministic permutation of the answer pool seeded by
//      length so each word in the pool is visited exactly once before any
//      repeats.
//
// This logic used to live in the client. It's been moved here so the
// answer for any (length, dayIdx) can only be derived by code that has
// access to the ANSWERS lists -- which now only the Worker does.
//
// Date math note: the Worker runtime uses UTC for "local" time, so we
// explicitly use Date.UTC() / getUTCMonth() / getUTCDate() to make the
// dayIdx -> calendar-date mapping fully timezone-independent. This avoids
// edge cases at midnight in extreme timezones.

import { ANSWERS } from "./words.js";

// Themed-day overrides: each entry is 'MM-DD' -> [3, 4, 5, 6, 7] letter words.
// Kept in sync with the original list previously embedded in index.html.
const HOLIDAYS = {
  "01-01": ["end", "bash", "party", "cheers", "goodbye"],
  "02-02": ["den", "snow", "wakes", "rodent", "prophet"],
  "02-14": ["hug", "love", "heart", "cupids", "romance"],
  "03-14": ["pie", "math", "slice", "number", "dessert"],
  "03-17": ["ale", "gold", "irish", "clover", "emerald"],
  "04-01": ["hah", "fool", "joker", "clowns", "tricked"],
  "04-22": ["oak", "tree", "earth", "planet", "ecology"],
  "05-04": ["foe", "jedi", "force", "galaxy", "trooper"],
  "05-05": ["eat", "taco", "spicy", "fiesta", "burrito"],
  "06-21": ["sun", "heat", "beach", "summer", "sunburn"],
  "07-04": ["pie", "flag", "stars", "nation", "freedom"],
  "09-19": ["arr", "grog", "pearl", "parrot", "pirates"],
  "10-31": ["boo", "bats", "witch", "spider", "pumpkin"],
  "11-11": ["war", "flag", "honor", "heroes", "respect"],
  "12-21": ["eve", "dark", "winter", "solway", "solstice"],
  "12-24": ["eve", "tree", "jolly", "sleigh", "carolers"],
  "12-25": ["elf", "tree", "carol", "sleigh", "present"],
  "12-31": ["eve", "kiss", "toast", "cheers", "newyear"],
};

// Linear-congruential shuffle — reproducible across runtimes.
function seedShuffle(arr, seed) {
  const a = arr.slice();
  let s = (seed | 0) || 1;
  for (let i = a.length - 1; i > 0; i--) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const j = s % (i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

// Cache the shuffled permutation per length. Worker isolates may keep this
// cache across requests, which is fine — the seed is fixed per length.
const _permCache = {};
function dailyPermutation(length) {
  if (!_permCache[length]) {
    _permCache[length] = seedShuffle(ANSWERS[length], length * 7919 + 31);
  }
  return _permCache[length];
}

// Map a dayIdx (integer days since 2025-01-01) to a 'MM-DD' key, in UTC.
function holidayKeyFor(dayIdx) {
  const ms = Date.UTC(2025, 0, 1) + dayIdx * 86400000;
  const d = new Date(ms);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return mm + "-" + dd;
}

function holidayWord(length, dayIdx) {
  const key = holidayKeyFor(dayIdx);
  const set = HOLIDAYS[key];
  if (!set) return null;
  const w = set[length - 3];
  if (!w || w.length !== length) return null;
  return w.toUpperCase();
}

export function dailyAnswer(length, dayIdx) {
  const ho = holidayWord(length, dayIdx);
  if (ho) return ho;
  const p = dailyPermutation(length);
  const idx = ((dayIdx % p.length) + p.length) % p.length;
  return p[idx].toUpperCase();
}

// Used when freeplay needs server-supplied random words later. Not wired
// into any endpoint yet.
export function randomAnswer(length) {
  const list = ANSWERS[length];
  return list[Math.floor(Math.random() * list.length)].toUpperCase();
}
