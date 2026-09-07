# Replay Scripts — editable copy

The three canned "View demo" scenarios. Edit below, hand this file back, and I'll write
the changes into `public/samples/*.json`.

## How to edit

- **Edit freely:** any `REP:` line, `CUSTOMER reply:`, the opening objection, and the feedback prose.
- **Emotions** must be one of: INTEREST · CONFUSION · SKEPTICISM · IMPATIENCE · FRUSTRATION · CONCERN · EXCITEMENT · NEUTRAL
  (The emotion picks which character pose is shown for that turn.)
- **Scores:** stay within each max. TOTAL is recalculated from the four sub-scores.
- **Turn count = demo length.** The conversation ends after the last turn, so Tesla runs 5,
  CRM 4, and Gym 3. Add or delete whole turn blocks to change it. (Max is 5.)
- **The final turn's reply is the wrap-up** — a natural close with no firm yes/no, and it
  must never end with a question.
- Don't change the `file:` or `id:` lines — those map to the JSON.

---


======================================================================
# SAMPLE 1 of 3 — file: tesla-too-expensive.json
======================================================================

## Metadata
- id: tesla-too-expensive   (do not change)
- Dropdown label: Tesla Model S — "Too expensive"
- Product: Tesla Model S
- Objection type: Too expensive
- Opening emotion: SKEPTICISM

## Opening — the customer's first line (before the learner types anything)

Forty grand more than a comparable sedan is a lot. I like the Model S, but I'm having a hard time seeing how it's worth that much more.


### Turn 1 of 5

REP (pre-filled for the learner):
I understand. Rather than just looking at the sticker price, it can help to compare what you'd actually spend over several years. With the Model S, you're saving on things like gas and routine maintenance.

CUSTOMER emotion: INTEREST
CUSTOMER reply:
That makes sense. I'm still wondering about repairs, though. It's an expensive car, so I assume anything that does go wrong could get pretty costly. How does that compare with other EVs?


### Turn 2 of 5

REP (pre-filled for the learner):
That's a fair concern. EVs have fewer moving parts than gas cars, so there's no oil to change, and regenerative braking reduces wear on the brakes. The battery and drivetrain are also covered for eight years.

CUSTOMER emotion: CONCERN
CUSTOMER reply:
The warranty helps, but I'm more worried about what happens once it runs out. If something major goes wrong after that, am I looking at a huge repair bill?


### Turn 3 of 5

REP (pre-filled for the learner):
A major out-of-warranty repair can be expensive. The other side of that is that there are fewer components that typically need regular repair or replacement, so it's worth looking at the total cost over the time you'd actually own the car.

CUSTOMER emotion: NEUTRAL
CUSTOMER reply:
That's fair. I'd really need to compare the full cost with some other cars before I could feel comfortable spending this much.


### Turn 4 of 5

REP (pre-filled for the learner):
Absolutely. I can put together a seven-year comparison that includes fuel, maintenance, and any available tax incentives, so you can see the numbers side by side.

CUSTOMER emotion: INTEREST
CUSTOMER reply:
That would help a lot. I am interested in the car — it's really just the upfront price that's hard for me to get past right now.


### Turn 5 of 5 ← FINAL TURN / wrap-up

REP (pre-filled for the learner):
I understand. I'll send you the comparison along with a couple of owner references, and you can take some time to look everything over.

CUSTOMER emotion: SKEPTICISM
CUSTOMER reply:
That sounds good. I want to go through the numbers and talk it over with my family before I decide what makes sense for us.


## Feedback screen (after turn 5)

Your Performance:
You did a good job taking the customer's price concern seriously instead of immediately trying to talk them out of it. You also shifted the conversation from sticker price to longer-term cost, which gave the customer a more useful way to evaluate the Model S. The conversation could have been stronger if you had made that value comparison more concrete earlier.

Key Strengths:
You acknowledged the customer's budget concern and gave specific reasons the Model S may cost less to own than the sticker price suggests. You also addressed the repair concern directly instead of avoiding it, which helped build credibility.

Areas To Improve:
Bring the total-cost comparison into the conversation earlier and make it more concrete. Fuel savings, maintenance costs, incentives, and expected ownership period can all help the customer judge whether the higher upfront price is actually worth it for them.

Scores:
- Product Knowledge (max 30): 22
- Customer Understanding (max 25): 20
- Objection Handling (max 25): 19
- Communication (max 20): 15
- TOTAL (auto-calculated): 76


======================================================================
# SAMPLE 2 of 3 — file: crm-already-have-one.json
======================================================================

## Metadata
- id: crm-already-have-one   (do not change)
- Dropdown label: B2B CRM — "We already have one"
- Product: Atlas CRM (B2B sales platform)
- Objection type: We already have a CRM
- Opening emotion: SKEPTICISM

## Opening — the customer's first line (before the learner types anything)

We've been on Salesforce for years, and the team finally knows how to use it. Switching to another CRM sounds like a lot of disruption for something I'm not sure we even need.


### Turn 1 of 4

REP (pre-filled for the learner):
I get that. Replacing a system your team already knows would be a big ask. Atlas doesn't have to replace Salesforce right away — most teams start by running the two together and syncing the data while they evaluate it.

CUSTOMER emotion: INTEREST
CUSTOMER reply:
Okay, that's better than I was picturing. But if we're still using Salesforce, what would Atlas actually give my reps that they don't already have?


### Turn 2 of 4

REP (pre-filled for the learner):
One of the biggest differences is automatic activity capture. Calls, emails, and meetings are logged without reps having to enter everything themselves, so your pipeline stays much more complete and up to date.

CUSTOMER emotion: CONCERN
CUSTOMER reply:
That would definitely help. My bigger concern is whether anyone would actually use it. We rolled out another tool last year, and half the team basically ignored it.


### Turn 3 of 4

REP (pre-filled for the learner):
That's a fair concern. Atlas works through the inbox and calendar your reps are already using, so they don't have to remember to open another system every day. A lot of the activity gets captured without them doing anything extra.

CUSTOMER emotion: INTEREST
CUSTOMER reply:
That makes sense. Before I took it any further, though, I'd want to see what adoption actually looks like for a sales team about our size.


### Turn 4 of 4 ← FINAL TURN / wrap-up

REP (pre-filled for the learner):
Absolutely. I can send you a couple of case studies from similar-sized teams, and we can also set up a two-week pilot using your own data so you can see how people actually use it.

CUSTOMER emotion: CONCERN
CUSTOMER reply:
That feels reasonable. I'll share the case studies with the team and see how everyone feels about trying the pilot.


## Feedback screen (after turn 4)

Your Performance:
You handled the customer's existing-CRM objection well by showing that Atlas didn't have to mean an immediate replacement. That lowered the perceived risk and opened the door to discussing what the product could add. The conversation would be stronger if you established the business value more clearly before moving into adoption concerns.

Key Strengths:
You recognized that switching systems was the customer's first concern and addressed it directly. You also picked up on the deeper issue — whether the sales team would actually use the product — and responded with a specific explanation rather than a generic promise. Offering a pilot was a good way to reduce the risk of moving forward.

Areas To Improve:
Give the customer a measurable reason to care about Atlas earlier in the conversation. For example, time saved on manual data entry or an improvement in pipeline completeness would make the value easier to weigh against the cost and effort of adding another tool.

Scores:
- Product Knowledge (max 30): 24
- Customer Understanding (max 25): 21
- Objection Handling (max 25): 20
- Communication (max 20): 16
- TOTAL (auto-calculated): 81


======================================================================
# SAMPLE 3 of 3 — file: gym-no-time.json
======================================================================

## Metadata
- id: gym-no-time   (do not change)
- Dropdown label: Gym membership — "No time"
- Product: Summit Fitness membership
- Objection type: I don't have time
- Opening emotion: FRUSTRATION

## Opening — the customer's first line (before the learner types anything)

Honestly, between work and the kids, I barely have any free time. I feel like I'd sign up for a gym membership and then never actually make it there.


### Turn 1 of 3

REP (pre-filled for the learner):
I hear that a lot from people with packed schedules. That's actually why we offer 30-minute guided circuits — you can get a full workout in without having to carve out an hour or two.

CUSTOMER emotion: CONFUSION
CUSTOMER reply:
Thirty minutes sounds a lot more doable, but is that really enough time to get a worthwhile workout? I don't want to squeeze it into my day if it isn't going to make much difference.


### Turn 2 of 3

REP (pre-filled for the learner):
It can be. The circuits are full-body and designed to keep you moving the whole time, so the goal is to make those 30 minutes count. Three focused sessions a week can be much more realistic than trying to fit in long workouts.

CUSTOMER emotion: INTEREST
CUSTOMER reply:
Okay, that sounds more manageable. The other problem is sticking with it. I usually start off motivated, and then work gets busy or something comes up with the kids.


### Turn 3 of 3 ← FINAL TURN / wrap-up

REP (pre-filled for the learner):
That's exactly where the coaching piece can help. When you join, a coach helps you schedule your first month of sessions like appointments and checks in if you start missing them.

CUSTOMER emotion: CONCERN
CUSTOMER reply:
Honestly, that would help with the part I usually struggle with. I'll look at my schedule this week and see whether I can realistically make it work.


## Feedback screen (after turn 3)

Your Performance:
You did a strong job turning a broad "I don't have time" objection into a conversation about what might actually fit the customer's schedule. You addressed both of the customer's underlying concerns — whether a shorter workout would be effective and whether they could stay consistent. The pitch could feel even more personal if you connected the solution to their actual weekly routine.

Key Strengths:
You didn't dismiss the customer's time constraint. Instead, you offered a shorter format that directly addressed it, then responded to the customer's concerns about effectiveness and consistency as they came up. The coaching support was especially relevant because it addressed the exact problem the customer said they had struggled with before.

Areas To Improve:
Ask about the customer's schedule earlier so you can make the recommendation more specific. Identifying a few realistic 30-minute windows would help the customer picture how the gym could actually fit into their life instead of leaving the solution at a general level.

Scores:
- Product Knowledge (max 30): 20
- Customer Understanding (max 25): 22
- Objection Handling (max 25): 19
- Communication (max 20): 17
- TOTAL (auto-calculated): 78
