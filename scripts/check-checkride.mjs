#!/usr/bin/env node
/* Every exam item passes with its reference tree and fails with its
   misconception tree, and the judge names the rule the misconception broke.
   Run with `npm run check`. */
import { EXAM, judge } from "../src/data/exam.js";
let failed = 0;
const reasons = [];
for (const item of EXAM) {
  const ok = judge(item, item.reference), bad = judge(item, item.wrong);
  const good = ok.passed && !bad.passed;
  if (!good) failed++;
  console.log(`  ${good ? "pass" : "FAIL"}  item ${item.n}: reference ${ok.passed ? "passes" : "FAILS (" + ok.reason + ")"}, misconception ${bad.passed ? "PASSES" : "fails (" + bad.reason + ")"}`);
  const namesTheRule = typeof bad.reason === "string" && bad.reason.length > 0 && bad.reason !== "the battery ran out";
  if (!namesTheRule) failed++;
  console.log(`        ${namesTheRule ? "pass" : "FAIL"}  reason names the rule: "${bad.reason}"`);
  reasons.push(bad.reason);
}
if (new Set(reasons).size !== reasons.length) { failed++; console.log("  FAIL  two or more items share the same reason"); }

/* Items 2 and 4 assert a mechanism (memory ate the branch; a fixed waypoint)
   that a canonical wrong tree happens to exhibit but a non-canonical wrong
   tree does not - a reactive tree with the wrong threshold has no branch to
   skip, and a tree that reads Goal but forgot Drop never targets a fixed
   waypoint. Probing with those trees is what catches an explain() that
   asserts more than the run actually proves. */
const probes = [
  { n: 2, label: "reactive root, threshold too low",
    tree: EXAM[1].reference.replace("BatteryBelow 30", "BatteryBelow 5"), banned: "never asked again" },
  { n: 4, label: "reads Goal, forgot Drop",
    tree: "-> deliver {memory}\n  FlyTo Goal\n  ReturnHome\n  Land", banned: "fixed waypoint" },
];
for (const p of probes) {
  const item = EXAM.find((x) => x.n === p.n);
  const r = judge(item, p.tree);
  const clean = typeof r.reason === "string" && !r.reason.includes(p.banned);
  if (!clean) failed++;
  console.log(`  ${clean ? "pass" : "FAIL"}  item ${item.n} probe (${p.label}): reason does not claim "${p.banned}": "${r.reason}"`);
}

console.log(failed ? `\n${failed} checkride item(s) FAILED` : "\ncheckride: every item is reachable, closed to its misconception, and names why");
process.exit(failed ? 1 : 0);
