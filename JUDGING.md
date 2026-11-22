# Judging gate

Read this before every change, feature or plan. All times are ET on Sunday 2026-11-22.

Labels: **[S13]** = intro deck slide 13, counted by position. **[S13 notes]** = its speaker notes. **[D]** = Devpost overview. **[R]** = Devpost rules. **[Ours]** = our interpretation, not an official rule.

## The gate [Ours]

Run `TZ=America/New_York date`, then answer in order:

| # | Question | Revise | Cut |
|---|---|---|---|
| 1 | Does it keep every hard rule below? | It breaks one and can be fixed | It breaks one by design |
| 2 | Which criterion does it raise, and how would a judge see that? | The gain is real but not visible | It raises none |
| 3 | Would it work as well with a model trained last year? | It could use live data but does not yet | Yes, and it is a product feature |
| 4 | Does it put the live demo at risk? | It needs a fallback or a test first | It can break the main flow with no fallback |
| 5 | Will it be built and tested on the demo path by 3:05, with everything submitted by 4:00? | A smaller version fits | No version fits |

- **PASS:** no Revise or Cut. Go ahead.
- **REVISE:** any Revise and no Cut. Stop, tell the user what must change, then run the gate again.
- **CUT:** any Cut. Stop and tell the user. Do not build it unless they explicitly override.

Fixes, setup, tests, design polish and submission work pass question 2 if they protect a criterion or eligibility, and question 3 is `n/a` for them. After 3:05, only fixes to the demo path and submission work pass question 5.

Output this before changing anything:

```text
GATE: PASS | REVISE | CUT  (<time> ET) <change>
Rules: ok | <rule at risk>
Raises: <criterion> because <what the judge sees>
Last year's model: worse because <live data> | same | n/a
Demo risk: none | <risk and fallback>
Fits: <ready by when>
Next: go | <what the user must decide>
```

## Hard rules

- You.com API is a core part of the product. No You.com means disqualified [R] and no prize [S13].
- Public GitHub repo with the project's code, linked in the submission. Missing means disqualified [R] and no prize [D, S13].
- Submitted on Devpost by **4:00 PM sharp**. Late submissions are not judged [R, S13 notes].
- Built during the sprint, no pre-built projects. Prior research is allowed [R].
- AI coding tools are allowed. The idea and creative direction must be the team's own [R].
- Live demo on real data. No mockups and no video-only demo [S13].
- In person, with at least one teammate present to demo. Solo or up to 4 people [R].
- Legal age of majority and US only [D, sidebar].
- A working tool, not a chatbot wrapper or a slide deck. "If your project would work just as well with a model trained last year, it's not the right project." [D]
- One track. Ours is **Idea to Post**: turn a voice note, messy idea or link into a post, script or thread that fits what is working in the creator's niche this week [D, S15]. Best Content is in addition to the track [D].
- [Ours] The repo is public: no secrets, personal data, Wi-Fi details, credit codes or invite links.

## Deadlines

| Time | What | Source |
|---|---|---|
| 10:30 | Hacking starts | R, S13 |
| 1:00 | Lunch | D, S13 |
| 3:05 | Demo path frozen and tested | Ours |
| 3:30 | LinkedIn post live, demo video done | Ours |
| 3:50 | Devpost submitted | Ours |
| **4:00** | **Submissions close** | R, S13 |
| 4:15 | Judging at your table, by pods of two judges | R, S18 notes |
| 5:30 | Top 5 teams demo to everyone | R, S18 notes |
| 6:00 | Winners announced | S13 |

## Criteria: 5 points each, 25 total

### Design
- **Official:** Would a real creator enjoy using it? Clear interface, fast to value, sources easy to see [D, S18].
- **Workshop:** Could a stranger get it without you narrating? [S21]
- **A 5 [Ours]:** A creator pastes posts, sees real people appear around their lessons, opens a quote with its date and link, and reaches a post without help.
- **Loses points [Ours]:** A graph that needs explaining, a long empty wait, hidden sources, walls of text.

### Uniqueness (Devpost: Uniqueness of Idea)
- **Official:** Is it only possible with a live-web AI tool? Specific, surprising ideas from talking to real creators, not generic AI with a new label [D, S18].
- **Workshop:** Why couldn't this exist last year? What does it do that a chatbot or spreadsheet couldn't? [S21 and notes]
- **A 5 [Ours]:** It starts from who needs this creator's lesson this week, backed by dated evidence and a real creator's story of the problem.
- **Loses points [Ours]:** A generic post writer, invented personas, stale matches, trends unrelated to the creator's experience.

### Execution (Devpost: Technical Execution)
- **Official:** Does it work live, on today's internet? Depth of the You.com integration, build quality, handling of bad or missing data [D, S18].
- **Workshop:** Does it work live, on stage, right now? [S21]
- **A 5 [Ours]:** Fresh input runs start to finish on the deployed app, quotes and dates are verified, and empty results, timeouts and failed integrations have honest fallbacks.
- **Loses points [Ours]:** Canned results shown as live, padded clusters, unverified dates, debugging on stage.

### Business (Devpost: Business Execution)
- **Official:** A company, not a project: a real customer, a market and a way to make money [D, S18].
- **Workshop:** Who pays, how much, and how you reach them. One customer, one price, one channel [S21 and notes].
- **A 5 [Ours]:** One named type of creator, one price, one way to reach them, a reason to return tomorrow, and a true result from a creator in the room.
- **Loses points [Ours]:** "All creators", several business models at once, untested margins, invented traction.

### You.com use (Devpost: Use of You.com)
- **Official:** Is it the engine, not an add-on? Which endpoints, and how much of the product depends on them [D, S18].
- **Workshop:** Show the call doing real work, not a logo on the last slide [S21 notes, S23].
- **A 5 [Ours]:** Search finds people, Contents verifies them, Research or Answer shapes the angle, comments trigger new searches, and the judge can see those calls working.
- **Loses points [Ours]:** Decorative calls, invisible calls, a flow that survives removing You.com.

## Best Content: a separate prize

- Best LinkedIn post about the build: $150 plus 3 months of Stanley per teammate [D, S17]. It may show the build or the hackathon experience [D].
- Stanley is suggested for help writing it [D, S9 notes].
- **Tag all seven.** Devpost and the slides list different sets, so use both:

| Tag | Required by | Page |
|---|---|---|
| You.com | D, S17 | https://www.linkedin.com/company/youdotcom/ |
| Stan | D, S17 | https://www.linkedin.com/company/stanwithme/ |
| GenZtea | D, S17 | https://www.linkedin.com/company/genztea |
| Somya Gupta | D | https://www.linkedin.com/in/somya-gupta-sg/ |
| Olivia Iarmak | D | https://www.linkedin.com/in/olivia-iarmak107/ |
| Celia Davis | D | https://www.linkedin.com/in/celia-davis-network/ |
| localhost:nyc | S17 | https://www.linkedin.com/company/localhost-nyc (from S2's QR code) |

## Submission checklist [D]

- [ ] Project name and one-line description
- [ ] What we built and why: the problem, which creators, what it does
- [ ] Track: Idea to Post
- [ ] Each You.com endpoint used and what it powers
- [ ] Public GitHub repo link, with the code pushed
- [ ] Tools and technologies, including You.com
- [ ] Demo video link, 1 to 3 minutes
- [ ] Best Content: LinkedIn post link, with all seven tags
- [ ] [Ours] Every link opens signed out, and Devpost says submitted, not draft

## Demo and pitch, from the slides

- "Show a creator using it on today's internet, then tell us who would pay for it." [S18]
- Start with a person and a problem, show one moment, end with why this team wins [S20].
- The suggested shape is built for a 3-minute slot. The real slot length is not stated [S23]:

| Start | Beat | Earns |
|---|---|---|
| 0:00 | One real person, one painful moment | Business |
| 0:20 | Why now | Uniqueness |
| 0:40 | One live flow, start to finish | Execution, Design |
| 2:00 | The API call doing the real work | You.com use |
| 2:30 | Who pays, what's next, one line to remember | Business |

- If time is longer, stretch the demo, not the intro [S23]. Name and team go in the close [S23 notes].
- Avoid a stack opener, feature tour, rambling, walls of text and a missing close [S22].
- Short sentences, numbers instead of adjectives, a repeatable last line [S24].
- If it breaks, don't fix it on stage. Say what they would see and switch to the backup [S22 and notes].

## Judges, prizes and sponsors

- Judges listed: Gabe Einhorn, Sharon Jacob, Akhil Pothan, David Li. No preferences are published [D].
- Overall: $500 for the best project across all tracks [D, S17].
- You.com is required. Treg is the optional tool, for social data, news and scraping [S16]. Stanley learns a creator's voice and powers Best Content [S9].
- Named in the slides but not scored: localhost:nyc, GenZtea (Natalie Neptune), Visionbrew, The Warehouse, Aventa, XDC Tech, gotavi [S2-7, S10].
- You.com's generic hackathon PDF, linked from Devpost Resources, favors combining multiple APIs, a real problem, and clear reasoning and creativity. It recommends Search, then Contents, then Research.

## Where the sources disagree

| Topic | Slides | Devpost | What we do [Ours] |
|---|---|---|---|
| Best Content tags | You.com, Stan, GenZtea, localhost:nyc [S17] | Six, without localhost:nyc [D] | Tag all seven |
| You.com products | Search, Contents, Research, MCP [S8, S16] | Also lists Answer [D] | Answer is allowed. Don't rely on it alone |
| Venue | XDC, Chelsea [S1, S7] | Body says Whop, Williamsburg. Sidebar says XDC [D] | XDC |
| Grand prize | $500 cash [S17] | One section adds $1K in You.com credits [D] | Confirm before counting on credits |
| You.com special prize | None [S17] | None in prizes. The linked generic PDF offers $200 in credits | Don't count on it |
| Missing You.com or repo | No prize [S13] | Disqualified [R], or no prize for a missing repo [D] | Treat as disqualified |
| Track wording | A post that fits this week [S15] | Post, script or thread that fits what's working in the niche this week [D] | Meet the stricter Devpost wording |
| Video | No video-only demo. S21 notes say no video, S22 notes allow a backup recording | Submission video required [D] | Demo live, submit the video, use a labeled recording only if live breaks |
| End of day | Winners at 6:00 [S13] | Awards from 5:30, close at 6:00 [D] | Stay until 6:00 |

Sources read 2026-11-22 around 11:50 AM: all 27 slides with images, QR codes and speaker notes, plus the [Devpost overview](https://creator-economy-you-hack.devpost.com/), [rules](https://creator-economy-you-hack.devpost.com/rules), resources and updates. [Intro deck](https://docs.google.com/presentation/d/1DRDBtyWBvK5U6EmQMLAViydu1QMH1BK6fUiRYQVm3m0/edit).
