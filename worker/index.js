// Worgent Worker entry point.
//
// Serves the static site from the bound ASSETS (configured in
// wrangler.jsonc as the ./public directory) and intercepts /api/* paths
// to run the daily-puzzle validation logic that used to live client-side.
//
// API surface (intentionally minimal):
//   POST /api/guess  body: { dayIdx, roundIndex, guess }
//                    returns: { ok, marks, correct, answer? }
//                    `answer` is only included when correct=true.
//
//   POST /api/reveal body: { dayIdx, roundIndex }
//                    returns: { ok, answer }
//                    Used after the player times out / gives up. The
//                    client decides when this is allowed (current UI
//                    only calls this on timeout).
//
//   POST /api/freeplay/words
//                    body: (none)
//                    returns: { ok, words: [w3, w4, w5, w6, w7] }
//                    Server picks 5 random answers (one per length)
//                    for a freeplay session. The client receives the
//                    answers and validates guesses locally — no
//                    anti-cheat for freeplay since there's no shared
//                    leaderboard to protect.
//
// The client computes its own dayIdx (days since the 2025-01-01 local
// epoch) and sends it to us. We don't validate the dayIdx range -- there's
// no leaderboard yet that depends on date integrity. If/when one ships,
// add a +/- 1 day window check here.

import { dailyAnswer, randomAnswer } from "./puzzle.js";
import { evaluateGuess } from "./eval.js";

const ROUND_LENGTHS = [3, 4, 5, 6, 7];

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      // No-cache: API responses must always reflect fresh server logic.
      "cache-control": "no-store",
    },
  });
}

function errorResponse(message, status = 400) {
  return jsonResponse({ ok: false, error: message }, status);
}

// Resolve (dayIdx, roundIndex) -> server-known answer string.
// Returns null if the inputs are out of range.
function answerFor(dayIdx, roundIndex) {
  if (!Number.isInteger(dayIdx)) return null;
  if (!Number.isInteger(roundIndex) || roundIndex < 0 || roundIndex >= ROUND_LENGTHS.length) {
    return null;
  }
  const length = ROUND_LENGTHS[roundIndex];
  return dailyAnswer(length, dayIdx);
}

async function readJson(request) {
  try {
    return await request.json();
  } catch (e) {
    return null;
  }
}

async function handleGuess(request) {
  if (request.method !== "POST") return errorResponse("method not allowed", 405);
  const body = await readJson(request);
  if (!body) return errorResponse("invalid json");

  const { dayIdx, roundIndex, guess } = body;
  if (typeof guess !== "string") return errorResponse("guess required");

  const answer = answerFor(dayIdx, roundIndex);
  if (!answer) return errorResponse("invalid round");

  if (guess.length !== answer.length) return errorResponse("wrong guess length");

  const marks = evaluateGuess(guess, answer);
  const correct = marks.every((m) => m === "green");
  return jsonResponse({
    ok: true,
    marks,
    correct,
    // Only reveal the answer when the player has solved it. Until then,
    // the answer never leaves the server.
    ...(correct ? { answer } : {}),
  });
}

async function handleReveal(request) {
  if (request.method !== "POST") return errorResponse("method not allowed", 405);
  const body = await readJson(request);
  if (!body) return errorResponse("invalid json");

  const { dayIdx, roundIndex } = body;
  const answer = answerFor(dayIdx, roundIndex);
  if (!answer) return errorResponse("invalid round");
  return jsonResponse({ ok: true, answer });
}

function handleFreeplayWords(request) {
  if (request.method !== "POST") return errorResponse("method not allowed", 405);
  const words = ROUND_LENGTHS.map((L) => randomAnswer(L));
  return jsonResponse({ ok: true, words });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === "/api/guess") return handleGuess(request);
    if (path === "/api/reveal") return handleReveal(request);
    if (path === "/api/freeplay/words") return handleFreeplayWords(request);

    if (path.startsWith("/api/")) {
      return errorResponse("not found", 404);
    }

    // Everything else -> static asset (index.html, JS, fonts, etc.).
    return env.ASSETS.fetch(request);
  },
};
