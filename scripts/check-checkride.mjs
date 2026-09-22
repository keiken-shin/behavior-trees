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
console.log(failed ? `\n${failed} checkride item(s) FAILED` : "\ncheckride: every item is reachable, closed to its misconception, and names why");
process.exit(failed ? 1 : 0);
