#!/usr/bin/env node
/* Every exam item passes with its reference tree and fails with its
   misconception tree. Run with `npm run check`. */
import { EXAM, judge } from "../src/data/exam.js";
let failed = 0;
for (const item of EXAM) {
  const ok = judge(item, item.reference), bad = judge(item, item.wrong);
  const good = ok.passed && !bad.passed;
  if (!good) failed++;
  console.log(`  ${good ? "pass" : "FAIL"}  item ${item.n}: reference ${ok.passed ? "passes" : "FAILS (" + ok.reason + ")"}, misconception ${bad.passed ? "PASSES" : "fails (" + bad.reason + ")"}`);
}
console.log(failed ? `\n${failed} checkride item(s) FAILED` : "\ncheckride: every item is reachable, and closed to its misconception");
process.exit(failed ? 1 : 0);
