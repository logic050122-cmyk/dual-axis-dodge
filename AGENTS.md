# AGENTS.md

This repository is continuously maintained by humans and AI agents. Before changing anything, read `PROJECT_LOG.md` first.

## Non-negotiable project rules

1. Preserve the core game: one player uses two hands simultaneously; the horizontal-role player dodges top-to-bottom obstacles, the vertical-role player dodges horizontally travelling obstacles, and either collision ends the run.
2. Mobile landscape and independent two-finger touch are first priority. Desktop keyboard support must not degrade mobile input.
3. The left/right swap is a full physical mirror of the gameplay. Do not remove it or reduce it to a cosmetic UI swap.
4. Prefer small, reversible, testable changes over broad rewrites.
5. Read latest `main`, recent commits, existing tests and GitHub Pages status before deciding what to change.
6. Do not leave temporary patch scripts or one-shot workflows in the final repository unless they have ongoing value.

## Mandatory project log rule

Every substantive update that changes game behavior, input, difficulty/fairness, audio/visual feedback, PWA/offline behavior, performance/compatibility, persistent data, tests, or deployment behavior MUST update `PROJECT_LOG.md` during the same development round.

Add the newest entry at the top of the `更新记录` section. A useful entry must record:

- goal / problem being solved;
- root-cause or product judgment;
- actual files/functions/behavior changed;
- behavior intentionally kept unchanged;
- tests and validation actually performed;
- related commit SHA/message when known;
- CI / GitHub Pages result, or `pending` if it is not finished yet;
- unresolved risks and the most valuable next step.

Do not write vague entries such as “optimized experience” or “fixed bugs.” Include the important rule, parameter, boundary condition or failure mode so a new maintainer can reconstruct the reasoning.

Temporary workflow/helper creation and cleanup that only supports one functional change may be documented inside that functional entry rather than as separate noisy entries.

## Verification expectations

Run or preserve the relevant existing regression tests. If a real bug is fixed and it can reasonably be reproduced in automation, add a permanent regression guard.

Pay special attention to:

- state transitions: idle / countdown / running / paused / over;
- two-finger independent control and pointer ownership;
- keyboard held-state, keyup, blur, visibilitychange and pagehide cleanup;
- swapped layout symmetry;
- high-speed segmented collision detection;
- spawn fairness and minimum reaction windows;
- portrait/background interruptions;
- WebAudio/localStorage/Wake Lock capability degradation;
- PWA cache behavior when deploy-relevant files change.

A change is not complete merely because it was committed. Check the resulting CI and GitHub Pages deployment when the change affects the deployed project.
