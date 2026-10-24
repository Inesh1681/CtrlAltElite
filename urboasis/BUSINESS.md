# UrbOasis: business plan (draft)

## The bet
Residents won't pay to report a pothole. **Housing societies and RWAs will pay** to stop chasing the
same civic problems every month, because a committee member already spends hours on it, and the
committee has a budget and a meeting where the problem comes up.

**Customer:** the secretary or civic-affairs member of an apartment association or layout RWA in Bengaluru.
**Job to be done:** "Get the department to fix the problems around our society, and show residents
the committee is on it."
**Product:** the UrbOasis tracker, plus a shared society board, a monthly ward report, and letters
signed on behalf of the association.

## What exists today (in `index.html`)
| Feature | Status |
|---|---|
| Route a problem to GBA / BWSSB / BESCOM / Traffic Police, write the complaint | Live |
| Follow-up → escalation → RTI timeline with ready-made letters | Live |
| Letters signed "On behalf of <society>" | Live |
| Monthly report for the ward office (print / PDF) | Live, from one device's data |
| "For societies" page with pricing and pilot sign-up | Live. **Set `LEAD` in the script to your WhatsApp number or email first** |
| Shared board for all residents of a society | Not built. Needs a backend |
| Department scorecard per ward | Not built. Needs pooled data |

## Pricing hypothesis
| Plan | Price | For |
|---|---|---|
| Pilot | Free for 3 months, first 20 societies | Learning and testimonials |
| Society | ₹999 / month (up to 300 homes) | Most apartment associations |
| Federation | Custom | Ward federations and groups of societies |

Rough size of the prize: 100 paying societies × ₹999 = about ₹1 lakh a month (₹12 lakh a year), with
hosting costs close to zero. That's a viable small business. Getting beyond it needs federations,
corporate sponsors or government contracts.

## Validate before building more (next 4 weeks)

**Week 1: 10 conversations.** Find secretaries through apartment WhatsApp groups, LinkedIn, and
RWA federations (for example the Bengaluru Apartments' Federation). Ask:
1. "What civic problems around your society came up in the last 3 months?"
2. "Who chases them now, and how? How long does it take?"
3. "What happened the last time a complaint went nowhere?"
4. Show the monthly report: "Would this help at your next meeting?"
5. "If this saved your committee that work, what would it be worth per month?"

Don't pitch until question 4. Write down exact quotes.

**Weeks 2–4: run 3 to 5 pilot societies by hand.** Set up their open complaints yourself, send their
reminders by WhatsApp if needed, and hand them a monthly report.

**Go / no-go signals**
- At least 3 of 10 secretaries ask to start the pilot *without being pushed*.
- Pilot societies log 5 or more complaints in a month.
- At least 1 society says yes to ₹999/month after the pilot (a verbal yes counts at this stage).
- Measurable: complaints tracked in UrbOasis get fixed faster than the society's own past experience.

If these fail, keep UrbOasis as a free civic tool or portfolio project and don't build the backend.

## What to build if validation passes
1. **Accounts and a shared society board** (Firebase or Supabase). Residents report into one list;
   the committee manages it. This is the paid feature.
2. **WhatsApp reminders** to the committee when a complaint is due for follow-up.
3. **Ward scorecard:** pooled, anonymised fix times per department and ward. This is the moat and
   gets media attention.
4. Kannada interface.

## Competition and how we differ
- **BBMP/GBA Sahaaya app**: the official channel. We don't replace it; we send people to it and chase it.
- **Janaagraha's I Change My City**: similar public reporting; weak on follow-through. Our edge is the
  escalation/RTI workflow and the society-level product.
- **Posting on X**: free and public but unstructured. We generate the post and track the outcome.

## Risks
- **Fixes depend on the departments.** If they don't respond, our value is the paper trail and
  escalation, so measure and sell that.
- **Helplines and structures change** (the GBA restructuring). Keep the directory current; it's
  cheap trust.
- **Volunteer committees churn.** Make the product survive a handover: shared accounts, history,
  exports.
