/* Turn BehaviorTree.CPP XML into a drawable spec. Drawing only: the course's
   interpreter does not run Nav2's own control nodes, and this file never
   pretends otherwise. A tag we know maps to its textbook kind; a control tag
   we do not know is drawn as Custom, a double ruled box. Leaf tags are Actions
   unless Nav2's node reference lists them as conditions. */
const CONTROL = {
  Sequence: ["Sequence", "memory"], ReactiveSequence: ["Sequence", "reactive"], SequenceWithMemory: ["Sequence", "keep"],
  Fallback: ["Fallback", "memory"], ReactiveFallback: ["Fallback", "reactive"], Parallel: ["Parallel"],
};
const DECOR = new Set(["Inverter", "RetryUntilSuccessful", "Repeat", "Timeout", "Delay", "ForceSuccess", "ForceFailure",
  "RateController", "DistanceController", "SpeedController", "GoalUpdater", "SingleTrigger", "KeepRunningUntilFailure"]);
/* Conditions from the Nav2 node reference (docs.nav2.org, Nav2 Specific Nodes,
   "Condition Nodes"). Verify against that page before adding one. */
const CONDITIONS = new Set(["GoalReached", "GoalUpdated", "GlobalUpdatedGoal", "InitialPoseReceived", "IsStuck",
  "TransformAvailable", "DistanceTraveled", "TimeExpired", "IsBatteryLow", "IsPathValid", "IsBatteryCharging",
  "WouldAControllerRecoveryHelp", "WouldAPlannerRecoveryHelp", "WouldASmootherRecoveryHelp", "IsGoalNearby",
  "AreErrorCodesPresent", "IsStopped", "PathExpiringTimer", "GoalUpdatedController"]);

export function nav2ToSpec(xml, parse = (x) => new DOMParser().parseFromString(x, "application/xml")) {
  const doc = parse(xml.replace(/<!--[\s\S]*?-->/g, ""));
  const main = doc.querySelector("BehaviorTree");
  const conv = (el) => {
    const tag = el.tagName, kids = [...el.children].map(conv);
    const name = el.getAttribute("name") || undefined;
    if (CONTROL[tag]) return { kind: CONTROL[tag][0], mode: CONTROL[tag][1], name: name ?? tag, m: 1, children: kids };
    if (DECOR.has(tag)) return { kind: "Decorator", dec: { type: "Custom", n: 0 }, name: tag, leaf: tag, children: kids };
    if (kids.length) return { kind: "Custom", name: name ?? tag, leaf: tag, children: kids };
    return { kind: CONDITIONS.has(tag) ? "Condition" : "Action", leaf: name ?? tag, args: [], children: [] };
  };
  return conv(main.firstElementChild);
}

/* Enough XML for nav2.xml: nested elements with quoted attributes, no text
   nodes, no namespaces. Not a general parser and not used in the browser.
   Every element also gets firstElementChild, not just the document wrapper:
   nav2ToSpec calls it on the querySelector result, which is an element, not
   the wrapper. */
export function tinyXml(xml) {
  const stack = [{ children: [] }];
  for (const m of xml.matchAll(/<\/?([A-Za-z_][\w.]*)((?:\s+[\w.:-]+="[^"]*")*)\s*(\/?)>/g)) {
    if (m[0].startsWith("</")) { stack.pop(); continue; }
    const attrs = Object.fromEntries([...m[2].matchAll(/([\w.:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]));
    const el = { tagName: m[1], children: [], getAttribute: (k) => attrs[k] ?? null, get firstElementChild() { return el.children[0]; } };
    stack[stack.length - 1].children.push(el);
    if (!m[3]) stack.push(el);
  }
  const root = stack[0].children[0];
  const find = (el, tag) => el.tagName === tag ? el : el.children.map((c) => find(c, tag)).find(Boolean);
  return { querySelector: (tag) => find(root, tag), get firstElementChild() { return root; } };
}
