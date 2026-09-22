# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Vite plus vanilla ES modules, the same shell the flight course already moved to.
No Three.js: this subject does not need 3D, the tree is an SVG drawing and the map is a top-down 2D scene.
No build change was needed to start it - `behavior-trees/` was built on the flight course's Vite setup from its first commit.
Existing content layers (`content/*.json`, the SVG primitive library) carry forward.

## Users

Unchanged from `flight-dynamics/PRODUCT.md`.
Four real audiences, confirmed by the user, in the same artifact:

1. **The author, upskilling.** Self-directed learning of a hard technical topic, in sessions
   of his own choosing. The original and primary use.
2. **Friends and colleagues**, sent a link to broaden their knowledge. They arrive cold,
   with no obligation to stay, and no one is grading them.
3. **New joiners at the author's company**, if the company adopts it as teaching material.
   Structured, sequential, expected to be completed.
4. **Portfolio viewers** evaluating the author's work. They judge the artifact itself as
   evidence of capability, often in under a minute.

Audience 2 sets the engagement bar (nothing compels them to stay) and audience 4 sets the
craft bar (the platform *is* the work sample). Audiences 1 and 3 are served by anything
that satisfies those two.

## Product Purpose

Teach one deep technical topic - currently flight dynamics - so visually and so
concretely that a complete beginner both understands it and *wants to keep going*. Success
is a learner voluntarily reaching the end of a lesson they had no obligation to start, and
being able to apply the idea rather than recite it.

The user's own diagnosis of the current build is the brief: it reads like a well-typeset
book, and "not much different from picking up a book and learning" is failure.

## Positioning

Three things a neighbouring product could not truthfully copy:

- **Misconception-first.** Every lesson names the wrong mental model out loud and kills it
  deliberately. Most material quietly presents the correct version and leaves the reader's
  existing error intact.
- **Every technical figure is authored, never generated.** Hand-built SVG on a semantic
  colour system, stepped through in stages. Generated imagery is confined to atmosphere and
  is forbidden from carrying facts.
- **Apply, don't recite.** Learners take a concept into an interactive sandbox and make it
  happen, rather than answering a question about it.

## Operating Context

Self-paced, no deadline, no instructor, no cohort. Sessions are voluntary and can be
abandoned at any moment with zero cost - which is the central design pressure. Desktop-first
in practice, but shared links get opened on phones. Read in one sitting per lesson, roughly
10-40 minutes. No login, no account, no server.

## Capabilities and Constraints

**Built and working:** 12 lessons in a deliberate order; 30 hand-authored SVG figures with
2-4 progressive states each; 12 generated hero images; 34 hand-curated videos (from 191 API
candidates, each with a written rationale); 12 comprehension checks; localStorage progress;
light/dark theming from a semantic token layer.

**Confirmed scope for this pass:** a second course, `behavior-trees/`, proving the shell
travels to a second subject with content changes only.
Twelve chapters, 2D only - the tree is an SVG drawing and the map is a top-down scene, not
a Three.js sandbox.
Text-only tree editing; drag-and-drop editing is out of scope.
The real Nav2 tree is drawn from its own XML as a plate, not executed.
The home robot world, driving the flight course's air-combat bandit with a tree, and
generated hero imagery all stay out of scope for this pass, named so none of them quietly
vanish.

**Constraints that must survive:** the semantic colour system (colour carries meaning, and
generated art uses a deliberately separate palette so decoration is never mistaken for
data); the authored-versus-generated boundary; no backend, no accounts, no user data.

**Topic is not fixed.** Flight dynamics is the first subject, not the product. Structure
should not hard-code aviation.

## Brand Commitments

None pre-existing. No logo, no company, no established voice to honour. The written voice
in the current lessons - direct, concrete, willing to say something is wrong - was well
received and is worth preserving.

## Evidence on Hand

- `src/bt/tree.js` - the interpreter, about 150 lines, asserted tick for tick against the
  textbook's algorithms by `scripts/check-bt.mjs`
- `src/data/diagrams.js` + `src/data/svg.js` - fifteen figure builders (fourteen chapter
  plates plus the index tree) on a semantic primitive layer
- `content/videos.json` - 128 candidates, 27 picked with a written note each, from 17
  channels, across all twelve chapters
- `content/visual-grammar.md` - the figure contract, proven against the real figures
- `content/concepts.json` - the curriculum spine
- `content/sources.json` - 44 sources; every myth and fact in the lessons names one, checked by `scripts/check-content.mjs`
- `RESEARCH.md` - the research this course's every claim traces back to

No testimonials, no usage data, no benchmarks, no customers. None may be fabricated.

## Product Principles

Unchanged from `flight-dynamics/PRODUCT.md`.

1. **Voluntary attention is the only currency.** Nothing obliges audience 2 to stay. Every
   screen either earns the next minute or loses it.
2. **The misconception is the lesson.** Naming the wrong model explicitly outperforms
   quietly presenting the right one.
3. **Facts are authored; atmosphere is generated.** A confidently wrong figure is worse
   than no figure, and this line is enforced structurally rather than by discipline.
4. **Applying beats answering.** Understanding is demonstrated by making something happen,
   not by selecting the right option.
5. **The artifact is the proof.** For audience 4 the craft *is* the argument, so quality of
   execution is a product requirement, not polish.

## Accessibility & Inclusion

No formal standard imposed by a stakeholder, but the incumbent build already ships
`prefers-reduced-motion` handling, `<title>`/`<desc>` on every figure, real selectable text
in SVG, and theme support. These are treated as a floor to maintain, not achievements to
trade away for visual ambition.
