# LeadNet: problem and landscape evidence

Prepared 17 Oct 2026 (IST) for the Google Cloud x Hack2skill AI Builder Cup 2026 pitch deck, theme "Sustainability & Social Impact". Read-only research: nothing was installed, signed up for or submitted anywhere.

## 0. Conventions and method

- **[V]** = I opened the page and read the sentence in its body. **[X]** = taken from a search or Exa excerpt; I did not open the full page (usually the publisher blocks automated fetches).
- Quotes are verbatim. Curly quotes are normalised to straight quotes. **Derived** = my arithmetic on quoted numbers.
- **UNVERIFIED** = I could not source it. "None found" means absent from the sources I read, which is not proof of absence.
- Keep quotes short in the deck and name the outlet. Several of these publishers are paywalled or syndicated.
- Privacy: only public civic and hackathon queries went to Exa, Jina and DuckDuckGo. No internal or client data was used. Exa's free tier rate-limited mid-run, so the rest used DuckDuckGo through r.jina.ai plus direct curl.
- Tools that blocked automated fetches: WebFetch refused thehindu.com, timesofindia, newindianexpress and bangaloremirror. TOI, Hindu, DH, NIE and Bangalore Mirror were read with a browser User-Agent or Jina. ThePrint was blocked by both, so those items are [X].

## 1. Flags that change the pitch (read first)

1. **GBA has announced the same ideas.** On 9 Sep 2026 the Greater Bengaluru Authority (GBA) announced "Sahaya 3.0": citizen confirmation before closure, easier reopening, voice notes, Indian-language support, a public performance dashboard. It is "being developed"; I found no launch report as of 17 Oct. Do not claim LeadNet's citizen confirmation or voice is novel on its own. Claim that it ships now, independent of any department, with published metric definitions (sections 5.1 and 6).
2. **The Minister warned against more apps.** TOI, 9 Sep 2026: "He cautioned against creating multiple apps for different civic services, saying the govt could instead incorporate useful ideas into existing systems." Position LeadNet as a verification and public-record layer that can feed Sahaaya (export or API), not a parallel complaint portal.
3. **Cleanest fact for the deck.** The official Sahaaya dashboard counts 94.98% of 12,78,073 complaints as "Resolved", and a note on a sibling dashboard page says a "2nd stage officer" verifies and closes, with no citizen step. That page's heading contains "Test", so verify the wording before quoting it (S1).
4. **Two wordings of the rubric.** The website and the T&C describe the four criteria differently, and the T&C says it prevails. Both are quoted in 2.1. Write to both.
5. **Rules that can disqualify** (section 2.3): fresh code only (treat 7 Sep 2026 as the safe start date), no solo submissions (2-4 members; roster frozen after 14 Oct), any student on the team disqualifies the whole team, the prototype must use Gemini/Gemma or Google agentic platforms and be deployed on Cloud Run or Firebase, video strictly under 3 minutes, all submission materials in English.
6. **Cut-off time is not published.** Every page says only "Oct 18, 2026". Your brief says 23:59 IST: UNVERIFIED. Check the Hack2skill dashboard submission form.
7. **Development-project tracking is not in the LeadNet description I was given**, but it is one of your six comparison dimensions. Confirm it is built before ticking it. The GBA is building its own Road Infrastructure Management System (RIMS) for road works.
8. **Do not cite the bare-IP site** `13.202.92.66:5443` that presents itself as a GBA grievance portal (section 8).

## 2. Hackathon rules

Sources, all [V], read 17 Oct 2026:
- H1 https://aibuildercup.com/index.html (same content at https://hack2skill.com/event/aibuildercup2026; that URL is JavaScript-rendered and one fetcher returned only its title)
- H2 https://aibuildercup.com/themes.html ("Challenges & Requirements")
- H3 https://aibuildercup.com/Faqs.html
- H4 https://aibuildercup.com/rewards.html
- H5 Terms & Conditions: https://docs.google.com/document/d/e/2PACX-1vRm7ChZ6Ij9fG7uFDkxzUMpwgVeBmnQ6cMDnAIEEX84AiLBOOQ9cYbl3S5OzFBbcVb8TF55s-eVpiXb/pub

Where things live: index.html says "Every submission is reviewed and scored against the judging criteria below" but lists none. The criteria and sub-criteria are on themes.html. The weights are repeated in the FAQ and the T&C.

### 2.1 Judging criteria (verbatim, H2)

**Technical Merit & Gen AI Implementation - 40%**
- Meaningful use of Gen AI: How effectively and meaningfully has Generative AI been incorporated into the solution? Does the use of Gen AI contribute directly to solving the problem or enhancing the overall solution?
- Technical implementation: Is the solution functional, technically sound, and appropriately implemented?
- Scalability & sustainability: Does the solution demonstrate potential for wider adoption, scalability, and future development beyond the prototype stage?

**Problem Alignment & Impact - 25%**
- Problem alignment: How effectively does the solution address the chosen problem statement, challenge objective, or theme?
- Potential impact: Does the solution demonstrate clear and meaningful value for its intended users, organization, industry, community, or other relevant stakeholders?

**Innovation & Creativity - 25%**
- Originality & differentiation: Does the solution demonstrate a fresh perspective, novel approach, or meaningful differentiation from existing solutions?
- Innovation in the use of Gen AI: Does the solution demonstrate a creative or innovative application of Generative AI beyond a basic or superficial implementation?

**User Experience & Solution Design - 10%**
- Usability & accessibility: Is the solution intuitive, user-friendly, and reasonably accessible to its intended users?
- Experience & integration: Do the various components, including the Gen AI capabilities, work together cohesively to deliver a smooth and meaningful user experience?

The T&C (H5, "Weighted Scoring Structure") words the same four criteria differently:

> a) Technical Merit & GenAI Implementation (40%): Robustness, Google Cloud architectural depth, and technical execution. b) Problem Alignment & Impact (25%): Clarity of problem-solution fit and measurable real-world viability. c) Innovation & Creativity (25%): Originality and inventiveness of the approach. d) User Experience & Solution Design (10%): Quality, intuitiveness, and clean design of the user interface.

- "Google Cloud architectural depth" and "measurable real-world viability" appear only in the T&C. The deck needs an architecture slide that shows more than one Gemini call, and at least one measurable metric.
- H5: "The Terms and Conditions herein shall prevail over any inconsistent terms, conditions, provisions or representations contained in any other promotional or advertising materials for the Hackathon." The organiser may also change the criteria "with or without prior notice".
- H3 (FAQ): "The same four weighted criteria ... apply across all six themes."
- H3: "Judging panel to be announced closer to the Grand Finale." H5: submissions "will undergo an initial scoring round by a panel of judges to select the top finalists invited to Singapore."

### 2.2 Problem statement (verbatim, H2; this is the full text on the page)

> **Sustainability & Social Impact**
> Build an AI-powered solution that addresses a meaningful environmental or societal challenge. Solutions may focus on improving resource efficiency, increasing accessibility, strengthening resilience, supporting communities, or enabling more informed and sustainable decision-making.

Overview line worth echoing (H1): "start with a problem you understand, build a solution on Google Cloud, and show that something built for a local need can scale to a global one."

### 2.3 Rules

| Topic | Rule | Src |
|---|---|---|
| Platform and AI | "all submissions must leverage Google AI models (like Gemini or Gemma) or be built using agentic platforms (such as Agent Platform, Antigravity, or AI Studio), and they must be deployed on Google Cloud via Cloud Run or Firebase." T&C: "built primarily using the Google Cloud tech stack (e.g., Cloud Run, GCP, Firebase). Solutions built primarily on competing cloud infrastructure will be deemed ineligible and disqualified." | H2, H5 |
| Prototype | "The goal is a functional solution that demonstrates a clear idea in action--not just a pitch deck or a mockup." FAQ: "It should demonstrate your idea functioning end-to-end and successfully deployed on Cloud Run/GCP/Firebase." | H2, H3 |
| Mandatory artifacts | T&C: "a) A working deployed live URL (on Cloud Run/GCP/Firebase). b) A video demonstration strictly under three (3) minutes in length. c) A public GitHub repository containing the source code. d) A comprehensive presentation deck explaining the solution architecture and business case." | H5 |
| Video | Website: "a public YouTube or Vimeo video or public Google drive link (3 minutes)". T&C says strictly under 3 minutes. Aim for 2:45 or less. | H2, H5 |
| Deck | "deck/PPT converted into a PDF". Must "Clearly articulate the problem your solution addresses and how it will benefit the community" and "Demonstrate the feasibility of your project and its potential for scalability." T&C adds architecture and business case. | H2, H5 |
| Category | "Clearly identify the problem statement you are submitting for (Healthcare, Education, Sustainability, Accessibility, Social Good)." That list is stale (the real themes are the six on the page). Write "Sustainability & Social Impact" exactly. | H2 |
| Language | "All submission materials, including code, documentation, and presentations, must be in English." Caption or subtitle any Kannada voice in the demo. | H2 |
| Fresh code | "Submissions must consist exclusively of fresh code and original assets created during the official hackathon timeline. Pre-existing products, ongoing projects, or code developed prior to the official launch will be disqualified." FAQ: "work started before the program launch, will not be considered." "Launch" is ambiguous (registration opened 1 Sep, build window 7 Sep). Treat 7 Sep 2026 as the safe start. | H5, H3 |
| Integration | "Consider factors like scalability, performance, and integration with existing systems." Supports positioning LeadNet as feeding Sahaaya. | H2 |
| Google Cloud credits | **None found.** The words credit, voucher and coupon appear on none of H1-H4. In the T&C the only "credit" is "compensation or credit for use of their Hackathon entry" (about the organiser's use of your entry, not cloud credits). Closest: "Google Cloud provides technical expertise access, and educational resources for this initiative." Treat credits as not offered. | H1-H5 |
| AI tools (dev) | No rule for or against AI coding assistants or third-party libraries was found. The only AI rule is the Google-AI requirement above. Reading the "primarily Google Cloud" wording, keep runtime inference on Gemini/Gemma. The "Prompt your jersey" activity (Gemini or Imagen) is optional and not part of the stated judging. One clause to be aware of (T&C, Copyright): the participant warrants being "the sole author and copyright owner of the Submission" and that it is "an original work of the Participant". Nothing says how that applies to AI-assisted code; if the build is largely AI-written, ask the organiser (support+aibuildercup@hack2skill.com) rather than assume. | H1, H2, H5 |
| Team | 2-4 members; cannot participate solo; one team per person; one solution under one theme; all members JAPAC-based. "Team additions or replacements are permitted only while the official registration window remains open (closing October 11). No team roster changes are allowed after October 14th." | H3, H5 |
| Finale travel | Only 2 members travel to Singapore. Flights, accommodation and event-day meals for 2; visas are the attendee's responsibility; about 4 weeks' notice. | H3, H5 |
| Eligibility | "Participation is strictly restricted to working professionals, entrepreneurs, and startups." 21+. "Full-time or part-time students are strictly ineligible. If any single member of a team is found to be a student, the entire team will be immediately disqualified, even if discovered after shortlisting, selection, or completion of the Grand Finale." Organiser may verify "government IDs, employment credentials, and age at any point." | H5 |
| Conduct | Shortlisted members "must actively respond to predefined Communication platforms like Slack, Discord, Telegram, or Whatsapp. Failure to do so may result in disqualification for the entire team." Participants may not leave the communication platform or dashboard. | H5 |
| IP | Right of first refusal to the organiser for 6 months on any exclusive licence of the submitted materials; plus a "worldwide, perpetual, irrevocable, non-exclusive" licence for marketing use. "Participants must not use any content protected under third party rights or subject to confidentiality obligations to third parties." Check your employer's outside-activity and IP policy. | H5 |
| Timeline | Registration 1 Sep-11 Oct. Team formation 1 Sep-14 Oct. Build and submit 7 Sep-18 Oct. Deadline Oct 18, 2026 (no time of day or timezone published). Evaluation Oct 19-Nov 6. Finalists Nov 7. Finale Singapore Dec 4. | H1 |
| Prizes | H1: "Total cash prize pool USD 30,000". H4 headline says "USD 27,945"; its line items sum to 30,000 (Winner 10,000; First runner up 7,000; Second runner up 5,000; Best use of Google Cloud AI tools 2,000; Most Impactful Solution 2,000; Social Choice Award 2,000; Best UI/UX 2,000). How the Social Choice Award is decided is not described. | H1, H4 |

### 2.4 Rubric to evidence map

| Criterion | What the text asks for | Where to find LeadNet's evidence |
|---|---|---|
| Problem Alignment & Impact (25%) | problem-solution fit; "measurable real-world viability" | S1, S2, S4 (self-reported closure vs recurrence and unverified repairs); S6 (drainage); a headline metric of citizen-confirmed vs officer-reported resolution |
| Innovation & Creativity (25%) | "meaningful differentiation from existing solutions" | Section 6 table; claims list |
| Technical Merit (40%) | "Google Cloud architectural depth"; meaningful Gen AI; scalability | Deck architecture slide; scale evidence: about 1,000 complaints/day through one control centre (S7), 369 wards, FixMyStreet/SeeClickFix/311 show the model travels (section 5) |
| UX & Solution Design (10%) | usability and accessibility | Section 7 (language), voice reporting |

Theme fit: the problem statement lists "increasing accessibility" (Kannada voice), "strengthening resilience" (drainage and flooding), "supporting communities" (public record) and "more informed ... decision-making" (ward metrics).

## 3. Problem statistics (8)

Strongest three for a slide: **S1, S2, S4**.

### S1. The official "Resolved" figure is an officer-set status: 94.98% of 12,78,073 complaints
- Source: GBA/BBMP Sahaaya 2.0 public Grievance Dashboard (live page; snapshot 17 Oct 2026, 05:13 UTC) https://sahaaya2.bbmp.gov.in/admin/dashboard/citizendashboard.aspx [V]
- As printed: "1,278,073 Received since 08/02/2020"; "1,213,855(94.98%)" Resolved; "1,130,471" Closed; "64,114 (5.02%)" Pending.
- Definition on a sibling page (https://sahaaya2.bbmp.gov.in/DashboardCountscreen.aspx) [V]: "Need To Close After Resolved : 2nd stage officer need to verify and close. Closed : Complaints which are verified and closed." (the page spells "Received" as "Recieved"). **Caveat: that page's heading reads "Dashboard Test SAHAAYA 2.0 Grievance Dashboard", so it may be a test or internal view. The public citizen dashboard itself prints no definition of Resolved or Closed. Confirm the meaning with the GBA, or word the deck as "an official dashboard note says ...", before leaning on "2nd stage officer".**
- By category (Received / Resolved; rows from an earlier fetch the same day, when the total was 12,78,032): Electrical 443,163 / 441,058 (99.53%); Solid Waste (Garbage) Related 378,482 / 373,031 (98.56%); Road Maintenance(Engg) 184,346 / 160,012 (86.80%); Road Infrastructure 20,335 / 14,296 (70.30%); Storm Water Drain 8,586 / 4,981 (58.01%).
- Use: "the only verifier on the official dashboard is another officer". Caveat: the page is live and numbers drift, so state the snapshot date. It shows no citizen-confirmed rate, reopen rate or time-to-fix. A ward-wise tab exists (not opened).

### S2. "A closed complaint is not the same as a clean street"
- Source: Bangalore Mirror, "No clean chit for Bengaluru", 9 Oct 2026 https://bangaloremirror.indiatimes.com/bangalore/cover-story/trust-ai-but-verify-facts/articleshow/134797142.cms [V]
- "Of the 295 garbage spots reported by citizens, 227 were forwarded to the Greater Bengaluru Authority (GBA) as official complaints, with 167 subsequently marked as cleared."
- "While the response has often been quick, with a typical complaint being marked closed within two to three days, GEODHA found that closure does not necessarily mean the problem has disappeared. Twenty-three locations where the city had said garbage was cleared were reported again by residents, with some spots recurring multiple times."
- "Forty-three complaints also did not receive an update within two weeks."
- Quote from GEODHA's founder (spelling as printed, Pratul Kenkatesh): "But a closed complaint is not the same as a clean street".
- Derived: 23 of 167 = 13.8% of "cleared" spots were reported again; 167 of 227 = 73.6% of forwarded complaints were marked cleared.
- Caveat: small citizen-run sample. A repeat report shows recurrence, not proof the original closure was false. Say "reported again", not "falsely closed".

### S3. Independent tracking sees slow, rare resolution (NammaKasa)
- Source: same Bangalore Mirror article, 9 Oct 2026 [V]
- "Its latest data shows 8,391 garbage reports across 352 wards, covering almost the entire city. Of these, only 289 have been resolved, leaving 8,102 unresolved, putting the resolution rate at just 3.4%."
- "As many as 158 reports, or 54.9%, took more than seven days to be resolved." (of 288 resolved reports with recorded response time: 35 or 12.2% within 24 hours; 64 or 22.2% in three to seven days)
- Caveat, important: this is one citizen-run platform. Its founder says "Resolution is something I am actively working to formalise" (The Hindu, 7 Jul 2026) and that closures happen where officials or volunteers "upload a verification photo marking it resolved". The 3.4% is the share with proof on that platform, not the city's resolution rate. Never present it as "3.4% of Bengaluru garbage complaints are resolved".

### S4. Potholes: a moving count, and the GBA says it cannot verify the repairs
- HT, 23 Aug 2025, DK Shivakumar in the Assembly https://www.hindustantimes.com/cities/bengaluru-news/bengaluru-has-10-000-potholes-half-repaired-permanent-fixes-underway-dk-shivakumar-in-assembly-101755924678736.html [V]: "So far, 10,000 potholes have been identified, of which 5,377 have been repaired. Work on the remaining 5,000 is being taken up," he said, describing these fixes as temporary.
- The Hindu, 7 Nov 2025 https://www.thehindu.com/news/national/karnataka/more-than-18000-potholes-filled-says-gba-chief/article70253117.ece [V]: "Greater Bengaluru Authority (GBA) Chief Commissioner M. Maheshwar Rao said that about 18,000 potholes, 95% of the total, have been filled across the city". Also: "He said the GBA did not have enough staff to inspect and verify pothole work each week." Also: the 31 October deadline set by the Chief Minister was missed; Rao "attributed the delay to capacity limitations and a shortage of staff."
- Deccan Herald, 25 Aug 2025, Sneha Ramesh https://www.deccanherald.com/india/karnataka/bengaluru/bbmp-spends-rs-12-cr-but-bengaluru-sees-63-rise-in-potholes-3696898 [V]: "According to BBMP data presented by the government in the Legislative Council, the civic body filled up 1.07 lakh square metres of potholes in 2023-24. But in 2024-25, the area went up to 1.78 lakh square metres, a 63% increase compared to last year".
- Use: the denominator moved from about 10,000 identified (Aug 2025) to "about 18,000 ... 95% of the total" (Nov 2025) with no published definition of "identified" or "filled", and the authority says it cannot verify. Caveat: DH reads the area figure as "the number of potholes were increasing", but area filled is a proxy for count.

### S5. Deaths: NCRB records civic-negligence deaths every year; pothole-attributed counts are small and falling
- The Hindu, 7 May 2026 (NCRB 2024 data) https://www.thehindu.com/news/national/karnataka/accident-numbers-down-17-linked-to-negligence-by-civic-bodies-city-tops-pedestrian-deaths/article70950985.ece [V]: "Bengaluru reported 17 cases in which accidents were caused due to the negligence of civic bodies. Only Bengaluru and Delhi have been registering such negligence cases, while other cities do not." "In Bengaluru, the number of such cases fell from 20 in 2023 to 17 in 2024. These incidents largely relate to road accidents caused by potholes, poor road stretches, and roads being dug up." Also: "Like last year, Bengaluru topped the list of pedestrian deaths among mega cities in India in 2024 as well. However, the number of pedestrian deaths came down from 292 in 2023 to 246 in 2024."
- ThePrint, Sharan Poovanna, 2 Oct 2025 https://theprint.in/india/civic-negligence-killed-20-in-bengaluru-in-2023-highest-4th-yr-in-row-indore-was-2nd-with-2-deaths/2755488/ [X]: "Civic negligence claimed at least 20 lives in India's IT capital in 2023, keeping Bengaluru in the dubious company of Indian cities with the most unsafe public infrastructure for the fourth consecutive year." "NCRB data shows that Bengaluru recorded 21 deaths attributed to civic negligence in 2022, 31 the previous year and 49 in 2019." Also: "The NCRB reports do not specify the circumstances around the 20 deaths recorded in 2023."
- Deccan Herald, Sneha Ramesh, 30 Sep 2025 https://www.deccanherald.com/india/karnataka/bengaluru/bengaluru-tops-ncrbs-chart-for-civic-negligence-deaths-for-4th-successive-year-3748656 [V, standfirst]: "Most deaths were attributed to poor roads and potholes, with others caused by electrocution, broken or encroached footpaths, and faulty public infrastructure."
- Bangalore Mirror, Sridhar Vivan, 5 Nov 2025 https://bangaloremirror.indiatimes.com/bangalore/civic/dodge-the-pits/articleshow/125093390.cms [V]: "Karnataka witnessed 93 pothole-related accidents in 2024, resulting in 24 deaths and 118 injuries. This marks a 60.7% reduction in accidents, a 64.7% fall in fatalities, and a 61.2% decline in injuries compared to 2023, when the state had reported 237 accidents, 68 deaths, and 304 injuries due to potholes."
- Use: the safe sentence is "NCRB has recorded civic-negligence deaths in Bengaluru every year (49 in 2019, 31 in 2021, 21 in 2022, 20 in 2023, 17 cases in 2024), mostly road and pothole related". Do not write "potholes killed N people in Bengaluru": the NCRB category is not pothole-specific, units differ (deaths for 2019-23; "cases" for 2024 in The Hindu, though ThePrint's 2024 headline excerpt says "17 such deaths"), and the state's own pothole-attributed counts fell in 2024. Not used as a statistic: Bangalore Mirror's "around 100 lives since 2018" (13 Jun 2025), which is worded "Reports suggest".

### S6. Flooding: 130 mm in about 12 hours against a 70 mm drain capacity
- Times of India, Nithya Mandyam, 20 May 2025 https://timesofindia.indiatimes.com/city/bengaluru/3-dead-500-homes-flooded-streets-submerged-marooned-bengaluru-braces-for-5-more-days-of-heavy-rain/articleshow/121281055.cms [V]: "Battered by 130mm rainfall in about 12 hours from Sunday evening till dawn on Monday, Bengaluru is scrambling to count its losses: Three dead, 500 homes flooded, 20-plus lakes ready to overflow, dozens of streets in tony areas reduced to waterways". And: "Rainfall was the heaviest in Kengeri (132mm), Vaderahalli (131mm), Chikkabanavara (127mm), Chowdeshwarinagar (104mm), and Kempegowda ward (103.5mm), far exceeding the 70mm capacity of Bengaluru's stormwater drains."
- Bangalore Mirror, 4 Apr 2025 https://bangaloremirror.indiatimes.com/bangalore/others/flood-crisis-209-areas-in-bengaluru-are-vulnerable/articleshow/119955219.cms [V]: "BBMP has identified 209 flood-prone areas across Bengaluru". "Of the 209 locations, flood mitigation projects have been completed at 163 sites. However, each monsoon season sees new areas being added to the list of vulnerable zones." "Out of 4,316 encroachments identified within BBMP limits, only 2,634 have been removed so far, covering a total area of 293.12 acres. However, 1,682 encroachments remain, with 196 cases currently tied up in legal proceedings."
- Derived: 61.0% of identified encroachments removed.
- Use: storm-water drains have the lowest official resolved rate of the big categories (58.01%, S1), which fits the flood record. Caveat: the count of flood-prone spots differs by outlet and date (198 in a May 2024 NoBroker post quoting BBMP [X]; 209 in Bangalore Mirror, Apr 2025 [V]; 210 in HT and Times Now, May 2025 [X]). That variance is itself an argument for published definitions. The 3 deaths were two electrocutions while pumping water and one wall collapse, so say "three dead in the storm".

### S7. Volume, backlog and duplicates
- Times of India, Nithya Mandyam, 8 Dec 2025 https://timesofindia.indiatimes.com/city/bengaluru/stress-at-authority-gbas-grievance-backlog-balloons-to-25k/articleshow/125842876.cms [V]: "Bengaluru's civic grievance load continues to swell, with an overwhelming 24,999 complaints registered on the Sahaaya 2.0 app and other reporting platforms, pending resolution across the city's five corporations since their inception on Sept 2." "while Bengalureans filed 5,693 complaints between Nov 27 and Dec 3, only 2,724 of them were resolved, leaving more than half of the grievances unaddressed and adding to an already ballooning backlog." (Derived: 47.8% resolved that week.)
- Times of India, Sanjay R Murty, 16 Feb 2026 https://timesofindia.indiatimes.com/city/bengaluru/broken-system-bengalureans-flag-poor-redressal-by-civic-bodys-1533-helpline/articleshow/128393100.cms [V]: "On average, ICCC receives around 1,000 complaints a day. This also includes complaints related to electricity, water supply, sewage, and fire emergencies." And, on duplicates: "ICCC personnel maintained that even though several complaints are received on the same issue, resulting in duplication, each complaint is registered and the case monitored." Also: "A group of residents waited for over two weeks after registering complaints on the helpline to get huge potholes in Ittamadu closed. However, they eventually ended up filling the craters themselves through a coordinated effort."
- The Hindu, 19 Jun 2026 https://www.thehindu.com/news/cities/bangalore/garbage-potholes-top-781-lakh-complaints-on-gbas-sahaaya-portal/article71118034.ece [V]: "more than 7.81 lakh grievances being registered between January 2023 and June 13, 2026." "issues related to garbage collection, road maintenance and fallen trees or branches continue to generate the highest number of pending and reopened complaints." Reopened by corporation (Central 687, East 1,654, North 549, South 712, West 1,390) = 4,992 of 7,81,345 (Derived: 0.64%).
- Use: duplicates are acknowledged by the official control centre and registered individually; no merge is described. A reopen option exists, but only 0.64% of complaints are reopened. A reopen button is not a confirmation. Counter-context: the same article says "a majority of complaints were attended to".

### S8. Black spots: counts that change by source, and clean-ups that may not hold
- Times of India, Nithya Mandyam, 17 Feb 2026 https://timesofindia.indiatimes.com/city/bengaluru/blackspots-down-by-a-quarter-across-bengaluru-in-6-months/articleshow/128433779.cms [V]: "There was a 28% reduction in garbage blackspots across the city in the past six months, with the number dropping from 1,144 in Sept 2025 to 823 in Feb 2026, according to data from Bengaluru Solid Waste Management Limited (BSWML)." "However, despite the progress in clearing illegal dumping points, 823 blackspots remain across the city."
- The Hindu, Anushree Aggrawal and Pooja Verma, 20 Aug 2026 https://www.thehindu.com/news/national/karnataka/gbasfreedom-from-waste-campaign-will-it-be-enough-to-keep-bengalurus-1616-blackspots-from-reappearing/article71369109.ece [V]: the GBA's month-long "Freedom from Waste" campaign targets "1,616 locations or blackspots holding approximately 22,732 tonnes of waste." Standfirst: "clearing these blackspots may remove the symptom, only for it to reappear within a short time."
- The Hindu via PressReader, 1 Mar 2026 https://www.pressreader.com/india/the-hindu-bangalore-9ww1/20260301/281672556426772 [X]: "Bengaluru Solid Waste Management Ltd. (BSWML) has identified 768 garbage black spots across the city."
- Use: official black-spot counts run 768, 823, 1,144 and 1,616 across Sep 2025-Aug 2026. The articles I read do not define how a black spot is counted, so the figures may not be like-for-like. That supports "each metric with a published definition".

## 4. Closure without a fix: the pattern, 2019-2026

Context older than 2024 is marked. The first two rows are official statements, not complaints.

| Date | Outlet | What it says (verbatim) | Tag |
|---|---|---|---|
| 21 Oct 2019 (older) | TOI | Senior BBMP official: "Tickets are closed at times because we are sure certain complaints cannot be resolved instantly and the rest are repetitive ones." | X |
| 31 Jan 2024 | Deccan Herald | New feature "is in response to numerous citizens pointing out instances where the BBMP closed tickets without addressing the underlying issues." Special Commissioner: "No complaint will be closed without obtaining feedback from citizens." A resident: "At present, engineers tend to close tickets arbitrarily." | V |
| 17 Nov 2024 | TOI | "many of the complaints they raise on BBMP's Sahaaya 2.0 app ... are promptly tagged as resolved within a few hours though nothing changes on the ground. According to them, a blank picture gets uploaded, and the issue gets marked as resolved." Chief Commissioner Tushar Giri Nath: "We initially used to not call people and cross-check, and if the work was done, we would close the complaint." | V |
| 8 Dec 2025 | TOI | "My complaint was marked 'resolved' on the app, but nobody came to fix the overflowing drain outside my house," (resident, Rajarajeshwari Nagar; anecdote) | V |
| 4 Feb 2026 | Bangalore Mirror | "several residents say their complaints remain unresolved on the ground even when portals mark them as 'resolved'." | V |
| 23 May 2026 | Deccan Herald | "residents allege that complaints are routinely closed without action, raising concerns about enforcement failures and accountability" | V |
| 19 Jun 2026 | The Hindu | "In multiple instances, citizens have complained that grievances raised on the Sahaya portal are not being addressed for long periods, and in some cases, complaints are being closed without any action being taken." Same article: "nearly 40% of vacancies in the engineering section are yet to be filled". | V |
| 16 Aug 2026 | Bangalore Mirror | "Residents also alleged that officials mark some complaints as 'attended' or 'resolved' without addressing the underlying civic problem." "Residents further proposed mandatory time-stamped and geo-tagged photographs or videos as proof before a complaint is closed." | X |
| 9 Sep 2026 | The Hindu | "Citizens pointed out that in Sahaya 2.0 portal, the complaint gets closed though the response remains unsatisfactory." | V |
| 9 Oct 2026 | Bangalore Mirror | S2 above | V |

The other side, for Q&A:
- Reopen and escalation exist: the Jan 2024 "double escalation" feature, and call-centre staff "trained ... to reopen closed tickets by gathering feedback from the complainant" (DH, 31 Jan 2024).
- Giri Nath (TOI, Nov 2024): "after the complaint is closed, and if the complainant is not satisfied, we will escalate the complaint to the higher authority", and "we will take strict actions against such officers".
- The Hindu (Jun 2026): "a majority of complaints were attended to."
- Bengaluru North says its backlog fell from about 9,100 (end May 2026) to 1,151 (Aug 2026). NammaWard, summarising a corporation press release dated 14 Aug 2026 [V body, X note]: "Closure counts do not by themselves establish whether every complainant was satisfied".
- The promise "no complaint closed without citizen feedback" was made in Jan 2024 and reappeared as a proposed feature in Sep 2026. The reports above sit between them. Say so factually; do not call it a broken promise.

## 5. Existing solutions and their gaps

"Documented" means a cited source says it. "Analysis" is my inference and is labelled.

### 5.1 BBMP/GBA Sahaaya 2.0, Namma Bengaluru app, 1533 helpline, WhatsApp chatbot
What it does:
- "Sahaaya was launched in 2016 and upgraded as Sahaaya 2.0 in 2020. The system currently brings together 31 departments and urban service agencies through 34 channels, including the Namma Bengaluru app, helpline and WhatsApp." (TOI, 9 Sep 2026 [V])
- Sahaaya 2.0 provides "mobile-based complaint registration, assignment of complaints to designated officials, SLA-based resolution and a three-level appeal mechanism." (DH, 9 Sep 2026 [V]). It has "integrated grievance modules of multiple agencies, including BESCOM, BWSSB, BMTC, BMRCL, and BDA." (The Hindu, 9 Sep 2026 [V])
- Channels per BSWML's official page [V]: "1533 Toll Free Number", the GBA web portal, "Sahaya2.0(Namma Bengaluru) Mobile App", "WhatsApp Chatbot 9448197197". Input types: "Text, Photos and Videos" (Karnataka Government App Store [X]).
- 1533 complaints "are registered by the Integrated Command and Control Centre (ICCC), a part of the Bengaluru Smart City initiative"; the call centre "employs 20 people" (TOI, 16 Feb 2026 [V]).
- Public dashboard: see S1.

Documented weaknesses:
- Closure without a fix, repeated across 2024-2026 outlets (section 4).
- Duplicates: "each complaint is registered and the case monitored" (S7). None of the Sep 2026 Sahaya 3.0 reports I read mention duplicate merging.
- Stale routing: "Many complaints are assigned to officials who have been transferred to another department or have retired months or even years ago." (Bangalore Mirror, 16 Aug 2026 [X]); jurisdiction confusion after the GBA restructuring (TOI, 16 Feb 2026 [V]).
- Capacity: "nearly 40% of vacancies in the engineering section are yet to be filled" (The Hindu, 19 Jun 2026 [V]); the GBA "did not have enough staff to inspect and verify pothole work each week" (S4).
- App sprawl: "there are so many apps, and which one to use?" (resident, TOI, 17 Nov 2024 [V]).
- Language and voice: "voice-based complaint registration, support for Indian languages and low-bandwidth access" are listed as features to add in Sahaya 3.0 (The Hindu, 9 Sep 2026 [V]), which implies they are not in 2.0 today. Analysis: that is a roadmap inference, not a documented citizen complaint about language.
- Public metrics: an aggregate dashboard exists (S1), but residents still ask for "live Sahaya dashboards" showing "average resolution times and reopened complaints" (Bangalore Mirror, 16 Aug 2026 [X]).

Announced, not launched (as far as I found):
- **Sahaya 3.0** (9 Sep 2026): per DH, "Civic complaints in Bengaluru may soon not be closed by officials without confirmation from the complainant that the issue has actually been resolved, if proposed changes ... are implemented." Also reopening, voice notes, Indian languages, anonymous complaints "in select cases", SLA alerts and a public dashboard (thebengalurulive, DH, NIE, Indian Express [V]). The Hindu: "standardised procedures for field inspections to verify whether an issue has actually been resolved." Outlets say "being developed" or "proposed". A Kannada Prabha headline says the portal is "ready" and the body says it will launch soon (my reading of the Kannada, from a search excerpt [X]). I found no launch report.
- **Sahaaya Plus** (DH, 10 Jul 2026 [V]): "a unified grievance redressal system that will bring together civic complaints lodged across multiple platforms, including social media, into a single dashboard." Whether this is the same programme as 3.0 is unclear.
- **RIMS** (Road Infrastructure Management System): "contains information on five years of road works from 2022-23 to 2026-27 ... more than 2,000 km of road works and details of Rs 9,151 crore in funding" (NIE, 10 Sep 2026 [V]). Citizens are "proposed to get access to an interactive map" (thebengalurulive [V]). The Minister said "work payments should be generated based on progress reflected on the portal" (TOI, 9 Sep 2026 [V]). Analysis: that progress would be officer-reported, the same self-report gap as S1.

### 5.2 Other 2024-2026 apps and platforms
- **BBMP FixPothole / "Rasthe Gundi Gamana"** (Bangalore Mirror, 28 Jul 2024 [V]): "With the previous mobile app 'Fix My Street' being of little or no use in reporting potholes, the Bruhat Bengaluru Mahanagara Palike (BBMP) has now launched a new mobile app, 'Fix Pothole.'" "available for download on Android phones in both Kannada and English"; "Each pothole will generate a separate work order". In Sep-Oct 2025 the Deputy CM promoted a public pothole app again (BusinessLine/PTI, 1 Oct 2025 [V]); whether that is the same app or a new release is unclear from what I read.
- **NammaKasa** (independent, launched 8 Apr 2026): garbage only today. "Report a garbage black spot in Bengaluru in under 30 seconds. Photos are GPS stamped, attributed to the responsible ward officials, and tracked publicly until cleared." (nammakasa.in [X]). Built with AI assistance on React, Supabase and MapLibre; moderation uses "Google Vision SafeSearch", "Claude AI verifies it is a genuine civic issue", plus manual review; "The data is CC-BY licensed" and "The analytics page is public so anyone can monitor ward-level performance." (The Hindu, 7 Jul 2026 [V]). "currently focuses on garbage but will work to expand to other civic issues" (NIE, 13 Apr 2026 [V]). Resolution is "something I am actively working to formalise". Not documented in what I read: duplicate handling, Kannada or voice. This is the closest peer; know it before the Q&A.
- **GEODHA** (citizen-led garbage platform) and **iKnowAGuy** (tells residents which official to contact; its co-founder: "Letting the citizen who raised a complaint confirm it's resolved builds trust on both sides") appear in Bangalore Mirror, 9 Oct 2026 [V]. That quote is useful as demand-side support for citizen confirmation.

### 5.3 Janaagraha I Change My City (ICMyC)
- What it does (Janaagraha page [V], figures dated June 2017): launched 22 July 2012; each complaint "is mapped to the Ward and thus sent to the Civic Agency for it to be taken up by an Engineer who is in-charge of the area"; "ICMyC also ensures that the email address and mobile number of the Complainant is verified". "As of June 2017, the website, IChangeMyCity.com (ICMyC) has 6, 07,931 users and has more than 2,44,928 complaints on the site. Around 1,74,057 of these complaints have been resolved by connecting the complaints to various government agencies." (Derived: 71.1%.) The homepage shows "93.5 % resolution rate" (search excerpt only [X], undated). It also provides ward budget allocation and utilisation information and a "Constituency connect" module. Complaint logs are open data on OpenCity (2019-2022, and aggregated to 2023; CC BY-SA) [X].
- Documented weaknesses: none found from independent sources. I could not render the live site, so its current activity in Bengaluru is UNVERIFIED; the public datasets I saw end in 2022-2023. Analysis from the product description only: resolution is reported through the agency link and the page does not describe duplicate merging.

### 5.4 Swachhata (MoHUA app, built and managed by Janaagraha)
- What it does (Janaagraha [V]): cities "mandated to resolve within stipulated timeframes ranging from 12 hours to 1 week (depending on the nature of the complaint and to the satisfaction of the citizen)". Citizens "can see nearby complaints, vote on them, comment and share them, and re-open them if they are unhappy with the resolution." Engineers "can upload images of resolved complaints as proof of work completion." "available for download in English and nine regional languages." Public Swachh Manch "dashboard which displays the resolution efficiency of citizen complaints". "2.7 crore+ complaints with an average resolution rate of 93%". Scope is "health and sanitation issues".
- Documented weaknesses: Deccan Herald, 23 May 2026: "Despite repeated complaints through the Swachhata App, the Sahaaya portal, and to BSWML, residents allege that complaints are routinely closed without action" (Bengaluru [V]). Older and from another city: TOI Trichy, 2 Apr 2018: "residents in the city allege that complaints were tagged as resolved even though it remains unattended" [V]. Scope is sanitation only. Whether Kannada is among the "nine regional languages": UNVERIFIED. Voice reporting: not documented. Analysis: the platform has reopen, voting and proof photos, so do not say it lacks them.

### 5.5 FixMyStreet (UK, mySociety; open-source platform)
- What it does: "FixMyStreet makes it easy for anyone to report a problem without worrying about the correct authority to send it to ... sends a report, by email or using a web service such as Open311, to the department or body responsible for fixing it." (fixmystreet.org [X]). Report states: Unconfirmed, Open, Fixed, Closed, Hidden (admin manual [V]). Public map, and "We currently have a policy of retaining all FixMyStreet reports: we believe they contribute a useful historic picture of communities" (FAQ [X]).
- Citizen confirmation exists but is optional: "By default, four weeks after a user reports a problem, FixMyStreet sends an email inviting that user to complete a survey ... The questionnaire is an opportunity for the user who reported the problem to confirm or change this." (fixmystreet.org/running/surveys [V]). mySociety's research report: "Some people answer the survey, some people don't." [V]
- Duplicates: the FixMyStreet Pro duplicate suggestion "encourages the user to subscribe to the existing report instead of re-reporting it"; the default radius was "fixed at 250 metres" (SocietyWorks, 25 May 2023 [V]). It is a suggestion to the reporter, not a merge into a canonical issue.
- Documented weakness (mySociety research report, undated [V]): "there is a risk that relying on citizens to report problems in their neighbourhood could lead to more affluent neighbourhoods getting a higher level of service from their local council." Also: "A staff user associated with the report's body (or an administrator) can mark a report as closed without declaring it to be fixed." (admin manual [X]).

### 5.6 SeeClickFix (US; now CivicPlus "SeeClickFix 311 CRM")
- What it does: routes requests "based on location and category, while identifying and merging duplicate submissions" (CivicPlus [X]). Staff can "merge Requests together into one"; the merged request "will automatically go into the Archived state (this can't be reopened)" (CivicPlus help [V]). "If a request is a 'public' request, anyone using the SeeClickFix system will see the problem pinned to the map and can follow its progress ... Public requests help reduce duplicate reports" (a city FAQ, Middletown CT [X]). "By default, commenting and reopening of Requests are allowed for all Request Categories." (CivicPlus help [X]). API: "Any authenticated user can change the status of an issue from Open to Closed and Closed to Open. Only government employees can change the status from Open to Acknowledged and Acknowledged to Closed." (dev.seeclickfix.com [X])
- Documented weakness: Albany, NY switched its SeeClickFix program off in December 2024: "The city of Albany has temporarily deactivated its SeeClickFix program after a New York Court of Appeals ruling determined that reports submitted through the app qualify as 'written notice' of road defects." (Spectrum News, 18 Dec 2024 [V]). Analysis: public, timestamped reports can create liability for authorities, so an open record may meet resistance. LeadNet should be able to run without a department opting in.

### 5.7 Generic 311 systems (international evidence)
- Closed without a fix: Atlanta City Auditor, Performance Audit of work-order management, Jan 2016 (older, but the most rigorous audit I found) [X]: "more than 20% of service requests appear to have been closed without actual resolution." "Our telephone survey confirmed residents' perceptions that service requests had been closed without resolution of the problem". On duplicates: they "affected fewer records, but were a bigger problem in some business units than others."
- Vague closure: NYC Council Data Team (undated; 2018 data) [X]: "For a surprising number of requests, issues are not addressed and resolutions stated by 311 are vague or inadequate." "Vague, misleading, or inaccurate resolution descriptions mean it can be nearly impossible to track whether an issue has been resolved."
- Who reports: Cook, Zuhlke and Saywitz, Policy Studies Journal, 7 Jun 2024 (Houston) [X]: "despite greater need (more potholes), fewer services are demanded (less 311 reports) in areas with lower socioeconomic status and a higher percentage of minority residents." Boxer et al., Annals of Applied Statistics, 28 May 2025 [X]: "resident-generated data suffer from reporting bias, with some subpopulations reporting at lower rates than others." Analysis: voice reporting in the local language is one way to widen who reports; the papers do not test that.

## 6. Differentiation

Codes: **YES** = documented capability. **PART** = partial, optional, or announced but not launched (stated in the cell). **NONE** = no evidence found in the sources read (not proof of absence). **?** = not established.

| Dimension | Sahaaya 2.0 / 1533 | I Change My City | Swachhata | NammaKasa (2026) | FixMyStreet (UK) | SeeClickFix | Generic 311 | LeadNet (per brief, not checked against the build) |
|---|---|---|---|---|---|---|---|---|
| Canonical-issue dedupe | NONE (each duplicate registered, S7) | ? | PART (vote and comment on nearby) | ? | PART (suggest and subscribe, Pro) | YES (staff merge) | PART (varies; "Duplicate" is a closure code) | YES |
| Evidence-verified closure by citizen confirmation | PART (reopen and escalate after closure; confirm-before-close proposed in 3.0) | PART (success stories cite citizen confirmation; mechanism undocumented) | PART (reopen; engineer proof photo; officer closes) | PART (verification photo by official or volunteer; citizen confirmation not documented) | PART (opt-in survey at 4 weeks) | PART (reopen allowed; confirm-before-close not documented) | NONE (agency sets closure; audits show closure without fix) | YES (only citizen confirmation verifies) |
| Published outcome metrics | PART (public counts; "Resolved" is officer-set; no reopen rate or time-to-fix on the page read) | PART (resolution rate on homepage; definition unknown) | YES, definition unknown (public cross-city dashboard) | YES, definition not documented (public ward analytics) | ? | ? | PART (open data; resolution text often vague) | YES (each metric with a published definition) |
| Kannada / multilingual voice | NONE today (voice and Indian languages planned for 3.0) | ? | PART (English plus nine regional languages; voice not documented) | ? | NONE found | ? | ? | YES (Kannada voice) |
| Development-project tracking | PART (RIMS road works; in development, citizen view planned) | PART (ward budget and utilisation info, 2017 description) | NONE | NONE | NONE | NONE | NONE | CONFIRM it is built |
| Open public record | PART (aggregate dashboard; grievance data republished on OpenCity, per a search excerpt) | PART (public site; open datasets, CC BY-SA) | PART (public portals) | YES (public map; CC-BY data) | YES (public map; keeps all reports; open source) | PART (public by default in many cities; cities can disable, e.g. Albany) | YES (e.g. NYC 311 open data) | YES |

Not one of the six dimensions, but decisive: in every GBA system the department sets the status. LeadNet's status is set by the citizen, and the record is independent of the department.

**What survives scrutiny**
- Each capability exists somewhere or is planned by the GBA: dedupe (SeeClickFix), reopen (Sahaaya, Swachhata, FixMyStreet, SeeClickFix), public metrics (Swachh Manch, Sahaaya, NammaKasa), voice (Sahaya 3.0, planned), project tracking (RIMS, planned). The defensible difference is the combination, plus independence from the department.
- I found no system that today enforces citizen confirmation as the only path to "verified" and also publishes the definition and the unconfirmed rate.

**Claims to use** (each is sourced above)
1. "The official dashboard counts 94.98% of 12.78 lakh complaints as resolved; a note on a Sahaaya dashboard page says a '2nd stage officer' verifies and closes." (S1; confirm the note first)
2. "Independent tracking found 23 of 167 'cleared' garbage spots reported again." (S2, small sample)
3. "The GBA says it lacks staff to inspect and verify pothole work each week." (S4)
4. "Residents asked for geo-tagged photo proof before closure; the GBA proposed citizen confirmation on 9 Sep 2026." The GBA's own proposal validates the need.

**Claims to avoid**
1. "No system lets citizens reopen complaints."
2. "First" or "only" citizen-confirmation system, without qualification.
3. "Sahaaya has no public data."
4. "3.4% of Bengaluru garbage complaints get resolved."
5. "Potholes killed N people in Bengaluru."
6. "Kannada is spoken by most Bengalureans."
7. "Kannada voice is unique." Sahaya 3.0 plans voice and Indian languages.
8. Anything sourced from the bare-IP site.

**Suggested framing against Sahaya 3.0** (my suggestion, your call)
- Cite the GBA's own proposal as proof of demand, then say LeadNet is live and department-independent.
- Offer an export or API so Sahaaya can ingest LeadNet's verified issues.
- Lead with the metric nobody publishes: citizen-confirmed resolution rate against officer-reported "resolved".

## 7. Language reality (three sentences for the deck)

> An analysis of Census 2011 by Shamika Ravi (Brookings) and Mudit Kapoor (ISI) counted over 100 languages in Bengaluru (22 scheduled, 84 non-scheduled), with Kannada the mother tongue of 44.62% of the city, followed by Tamil (15%), Telugu (14%), Urdu (12%), Hindi (6%) and Malayalam (3%) (Hindustan Times/PTI, 5 Sep 2021). Of the urban centres it compares, Bengaluru and Mumbai are the only two where the native language's share fell below half in both the 2001 and 2011 Censuses (Hindustan Times, 5 Jan 2024). Kannada remains the state language and, per The News Minute (17 Apr 2020), the city's "primary spoken language, lingua franca, and chief administrative language", so a Kannada-first voice channel with other-language fallback reaches the largest group without excluding the other half.

Notes:
- The evidence supports "Kannada-first, multilingual", not "Kannada-only".
- Use "over 100 languages" in the deck: the HT text says "107 languages" but its components (22 + 84) sum to 106.
- Figures vary by geography and analyst: 44.62% (Ravi and Kapoor analysis, HT/PTI [V]); 44.47% for Bangalore district (IndiaStat and IIMB-JJM district profiles [X]); 42.05% for the city area (Wikipedia citing the Census, secondary [X]). Safe wording: "about 44%" or "under half".
- Sources: HT 2021 https://www.hindustantimes.com/india-news/migrations-and-their-effect-on-bengaluru-s-lingual-diversity-101630781009634.html [V]; HT 2024 https://www.hindustantimes.com/india-news/number-theory-a-look-at-urban-migration-amid-language-riots-in-india-101704427120429.html [V]; The News Minute https://www.thenewsminute.com/karnataka/bengalurus-linguistic-diversity-what-historical-inscriptions-tell-us-122768 [X].
- Primary table to cite directly: Census 2011 C-16 (mother tongue), Karnataka: https://www.censusindia.gov.in/nada/index.php/catalog/study/PC11_C16-29. I did not open the table. The share of bilingual or trilingual residents (Census C-18) was not retrieved: UNVERIFIED.
- Census 2011 is the latest mother-tongue data I found.

## 8. Provenance warnings

- **Bare-IP site posing as the GBA.** `http://13.202.92.66:5443` appears in search results as "Greater Bengaluru Authority ... Public Grievance Redressal System", with the Chief Minister, Deputy Chief Minister and Minister's names and photos and GBA/BBMP logos. Its footer says: "Demonstration prototype -- Greater Bengaluru Authority, Bengaluru East City Corporation. All names, numbers and case data are simulated." It is not an official GBA property and its origin is unknown. I read it only through the Jina reader, not directly. Do not cite it or enter data there. It describes a close-out rule similar to LeadNet's (officer records evidence, citizen confirms by WhatsApp or SMS in Kannada and English, reopen escalates). Treat it as a competitive-awareness signal. If it is an earlier demo from your own team, check it against the fresh-code rule in 2.3.
- **Social posts.** Instagram reels announcing the GBA WhatsApp chatbot are not used. The number 9448197197 is confirmed on BSWML's official page.
- **Blocked or Cloudflare-gated pages.** ThePrint (S5) and parts of other outlets were [X] only.

## 9. UNVERIFIED and open items

- Submission cut-off time of day and timezone (only "Oct 18, 2026" is published; "23:59 IST" is from your brief).
- Google Cloud credits: not mentioned anywhere I read.
- Sahaya 3.0 launch status after 10 Sep 2026: no launch report found.
- Whether the 2025 "public pothole app" is the 2024 FixPothole app or a new release.
- Census 2011 C-16 table not opened; bilingual and trilingual shares (C-18) not retrieved.
- ICMyC current Bengaluru activity; the "93.5 % resolution rate" is a search excerpt only.
- Swachhata: Kannada support and voice input.
- NammaKasa: duplicate handling, Kannada and voice.
- FixMyStreet and SeeClickFix: public outcome metrics and multilingual voice.
- NCRB 2024 "sixth consecutive year" and ThePrint's 2024 "17 such deaths" are search-excerpt only. The Hindu's article (opened) confirms 17 cases.
- Whether the Sahaaya dashboard's ward-wise tab shows ward-level resolution times (not opened).
- How the "Social Choice Award" is decided.
- Whether LeadNet builds development-project tracking.

## 10. Source register (landscape and rules; statistic sources are inline in section 3)

| ID | Publisher, date | URL | Tag |
|---|---|---|---|
| L1 | TOI, 9 Sep 2026 (Sahaaya 3.0 consultation) | https://timesofindia.indiatimes.com/city/bengaluru/greater-bengaluru-authority-seeks-citizen-inputs-to-make-sahaaya-more-accountable/articleshow/133979355.cms | V |
| L2 | The Hindu, 9 Sep 2026 | https://www.thehindu.com/news/cities/bangalore/sahaya-30-gba-to-develop-upgraded-portal-for-civic-grievances/article71448055.ece | V |
| L3 | Deccan Herald, 9 Sep 2026 | https://www.deccanherald.com/india/karnataka/bengaluru/gba-to-overhaul-sahaya-30-require-citizen-confirmation-to-close-complaints-4141067 | V |
| L4 | New Indian Express, 10 Sep 2026 | https://www.newindianexpress.com/cities/bengaluru/2026/Sep/10/sahaya-30-bengaluru-citizens-to-report-civic-woes-through-voice-notes | V |
| L5 | thebengalurulive, 9 Sep 2026 | https://thebengalurulive.com/bengalurus-sahaaya-3-0-to-let-citizens-reopen-complaints-confirm-fixes-before-closure-rims-maps-%E2%82%B99151-crore-road-works/ | V |
| L6 | Indian Express, 9 Sep 2026 | https://indianexpress.com/article/cities/bangalore/new-platforms-sahay-for-grievance-redressal-transparent-roadworks-10870263/ | V |
| L7 | Deccan Herald, 10 Jul 2026 (Sahaaya Plus) | https://www.deccanherald.com/india/karnataka/bengaluru/single-window-system-to-track-civic-complaints-across-agencies-4069729 | V |
| L8 | Deccan Herald, 31 Jan 2024 (double escalation) | https://www.deccanherald.com/india/karnataka/bengaluru/sahaaya-2-0-s-double-escalation-feature-plugs-no-resolution-gap-2873920 | V |
| L9 | TOI, 17 Nov 2024 (closed without redressal) | https://timesofindia.indiatimes.com/city/bengaluru/bengalurus-bbmp-sahaaya-20-app-fails-to-address-civic-complaints/articleshow/115392024.cms | V |
| L10 | Bangalore Mirror, 4 Feb 2026 | https://bangaloremirror.indiatimes.com/bangalore/civic/online-fixes-ignore-real-street-problems/articleshow/127892713.cms | V |
| L11 | Bangalore Mirror, 16 Aug 2026 | https://bangaloremirror.indiatimes.com/bangalore/others/no-resolution-in-sight-loopholes-in-sahaya-leaving-citizens-helpless/articleshow/133267288.cms | X |
| L12 | Deccan Herald, 23 May 2026 | https://www.deccanherald.com/india/karnataka/bengaluru/docket-numbers-little-action-bengalureans-question-civic-complaint-redressal-4013343 | V |
| L13 | The Hindu, 19 Jun 2026 (engineer shortage) | https://www.thehindu.com/news/cities/bangalore/engineer-shortage-hits-civic-works-across-bengalurus-five-corporations/article71109050.ece | V |
| L14 | BSWML official page (channels) | https://bswml.karnataka.gov.in/174/register-complaint/en | V |
| L15 | Bangalore Mirror, 28 Jul 2024 (Fix Pothole) | https://bangaloremirror.indiatimes.com/bangalore/civic/will-fix-pothole-finally-fix-bengalurus-road-woes/articleshow/112069571.cms | V |
| L16 | The Hindu BusinessLine/PTI, 1 Oct 2025 | https://www.thehindubusinessline.com/news/national/13000-potholes-filled-in-bengaluru-app-launched-for-public-reporting/article70115725.ece | V |
| L17 | The Hindu, 7 Jul 2026 (NammaKasa) | https://www.thehindu.com/news/cities/bangalore/this-ai-driven-platform-is-taking-bengalurus-garbage-complaints-public/article71027848.ece | V |
| L18 | New Indian Express, 13 Apr 2026 (NammaKasa) | https://www.newindianexpress.com/states/karnataka/2026/Apr/13/bengaluru-designer-launches-nammakasa-app-to-report-civic-issues-logs-45000-users | V |
| L19 | Janaagraha, I Change My City (figures from 2017) | https://www.janaagraha.org/i-change-my-city/ | V |
| L20 | Janaagraha, Swachhata Technology Platform | https://www.janaagraha.org/work/swachhata-technology-platform/ | V |
| L21 | TOI Trichy, 2 Apr 2018 (Swachhata) | https://timesofindia.indiatimes.com/city/trichy/civic-body-only-resolves-complaints-uploaded-on-swachhata-app-grievances-remain/articleshow/63572013.cms | V |
| L22 | mySociety, FixMyStreet surveys | https://fixmystreet.org/running/surveys/ | V |
| L23 | mySociety research, FixMyStreet report (undated) | https://research.mysociety.org/html/fms-report/ | V |
| L24 | SocietyWorks, 25 May 2023 (duplicate suggestion) | https://www.societyworks.org/2023/05/25/the-duplicate-report-suggestion-radius-on-fixmystreet-pro-is-now-customisable/ | V |
| L25 | CivicPlus help, mark as duplicate | https://www.civicplus.help/seeclickfix/docs/mark-a-request-as-a-duplicate | V |
| L26 | Spectrum News, 18 Dec 2024 (Albany) | https://spectrumlocalnews.com/nys/capital-region/public-safety/2024/12/18/albany-seeclickfix-non-emergency-issue-reporting-system-down | V |
| L27 | Atlanta City Auditor, Jan 2016 | http://www.atlaudit.org/uploads/3/9/5/8/39584481/work_order_management_january_2016_.pdf | X |
| L28 | NYC Council Data Team | https://council.nyc.gov/data/311-agency/ | X |
| L29 | Cook, Zuhlke, Saywitz, 2024 | https://doi.org/10.1111/psj.12540 | X |
| L30 | Boxer et al., 2025 | https://doi.org/10.1214/24-aoas2003 | X |
| L31 | NammaWard, 14 Aug 2026 (Bengaluru North backlog) | https://nammaward.in/wardpulse/bengaluru-north-says-civic-grievance-backlog-fell-from-9-100-to-1-151 | V |
