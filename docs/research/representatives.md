# Bengaluru representative contact directory

Checked on **18 October 2026**. This directory contains real public office contacts. It is separate from Namma Civic's fictional demonstration leaders, issue authors, budgets and outcomes. No party preference, endorsement or claim of a representative's involvement in a demonstration issue is implied.

## Matching method and limits

The existing API assigns coordinates to the bundled GBA ward polygon. Every one of the 369 source polygons has an `assembly` attribute, covering 28 distinct Assembly constituencies. The contact lookup uses that source attribute and an explicit alias table to join the Karnataka Assembly member list. The Election Commission's AC-to-PC table then selects the corresponding Lok Sabha constituency. An LLM never chooses an office holder or an email address.

This is a **ward-attribute reference match**, not point-in-polygon matching against official Assembly or Parliamentary constituency boundaries. Ward attributes and geolocation accuracy may be imperfect, especially at edges. Show the method, official source links, date and a request to check the constituency before sending. Unknown/out-of-coverage locations must return no match. A contact's publication does not establish that the mailbox accepts mail, is monitored, or will respond. Civic service complaints can also require the municipal authority; MLA/MP contacts are awareness/escalation options, not an assertion of municipal operational responsibility.

Location from a browser capture is the device's reported position at capture time. An imported image without trusted capture metadata cannot be said to have been photographed at the device's current location. Namma Civic's public upload pipeline strips EXIF/GPS; any location the user chooses to publish must be confirmed separately.

## Primary sources

| Source | Evidence used |
| --- | --- |
| [Karnataka Legislative Assembly: Sixteenth Assembly members](https://kla.kar.nic.in/assembly/member/16assemblymemberslist.htm) | Current member names and numbered Assembly constituencies. Retrieved directly on the checked date; the page links an address list dated 1 September 2026. |
| [Karnataka Assembly: Sixteenth Assembly Who's Who](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf) | Public `@karnataka.gov.in` constituency mailboxes on each member's profile. English email text was extracted from the PDF; no address was generated from a naming pattern. Per-contact links include the physical PDF page. |
| [Election Commission: Delimitation Order 2008](https://www.eci.gov.in/Documents/Delimitation/DelimitationofParliamentaryAssemblyConstituenciesOrder-2008(English).pdf#page=208) | Karnataka Schedule XIV, Table B, printed pages 207-208 (physical PDF pages 208-209). Lists the Assembly segments of Bangalore Rural, North, Central, South and Chikkballapur. It is used only for the AC-to-PC relationship, not as a replacement for current municipal boundaries. |
| [Digital Sansad: 18th Lok Sabha member directory](https://sansad.in/ls/members) | Sitting member names, constituencies and `@mpls.sansad.in` public office email addresses. The site's public endpoint `https://sansad.in/api_ls/member?loksabha=18&size=543&page=1` was read and filtered to `status: Sitting`, Karnataka and the five mapped constituencies. Per-contact source links point to their public biographies. |
| [Namma Civic ward provenance](wards.md) | GBA 2025 ward polygons and assembly attributes, via OpenCity, plus documented spelling/source limitations. |

## Assembly coverage

All 28 distinct Assembly labels present in the shipped ward data have a source-backed MLA and MP record. The spelling in the first column is preserved exactly for deterministic joins; official Assembly names can differ. In particular, **Bangalore South Assembly (176) is in Bangalore Rural Parliamentary constituency**, and **Yelahanka Assembly (150) is in Chikkballapur Parliamentary constituency**. Matching by similar names would produce incorrect recipients.

| Ward assembly attribute | AC | MLA | Official mailbox | Lok Sabha constituency |
| --- | --- | --- | --- | --- |
| Yelahanka | 150 | S R Vishwanath | [yelhanka.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=434) | Chikkballapur |
| K.R. Pura | 151 | B A Basavaraja | [k.r.pura.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=136) | Bangalore North |
| Byatarayanapura | 152 | C B Krishna Byregowda | [byatarayanapura.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=50) | Bangalore North |
| Yeshwanthapura | 153 | S T Somashekar | [yeshvanthpura.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=382) | Bangalore North |
| Rajarajeshwarinagar | 154 | Munirathna | [rrnagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=283) | Bangalore Rural |
| Dasarahalli | 155 | S Muniraju | [dasarahalli.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=285) | Bangalore North |
| Mahalakshmi Layout | 156 | K Gopalaiah | [mllayout.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=195) | Bangalore North |
| Malleshwaram | 157 | Dr C N Ashwath Narayana | [malleshwaram.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=119) | Bangalore North |
| Hebbal | 158 | Suresh B S | [hebbal.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=84) | Bangalore North |
| Pulakeshinagar | 159 | A C Srinivasa | [pulakeshinagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=384) | Bangalore North |
| Sarvagnanagar | 160 | K J George | [sarvagnanagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=42) | Bangalore Central |
| C.V. Raman Nagar | 161 | S Raghu | [c.v.ramannagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=319) | Bangalore Central |
| Shivajinagar | 162 | Rizwan Arshad | [shivajinagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=345) | Bangalore Central |
| Shanthinagar | 163 | N A Haris | [shantinagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=220) | Bangalore Central |
| Gandhinagara | 164 | Dinesh Gundurao | [gandhinagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=44) | Bangalore Central |
| Rajajinagar | 165 | S Suresh Kumar | [rajajinagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=406) | Bangalore Central |
| Govindraj Nagar | 166 | Priyakrishna | [govindrajnagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=314) | Bangalore South |
| Vijayanagar | 167 | M Krishnappa | [vijaynagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=251) | Bangalore South |
| Chamrajapet | 168 | Jameer Ahmed Khan | [chamrajpet.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=56) | Bangalore Central |
| Chickpet | 169 | Uday B Garudachar | [chickpet.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=416) | Bangalore South |
| Basavanagudi | 170 | L A Ravisubramanya | [basavanagudi.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=341) | Bangalore South |
| Padmanabanagar | 171 | R Ashoka | [padmanabhanagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=25) | Bangalore South |
| B.T.M Layout | 172 | Ramalinga Reddy | [b.t.m.layout.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=38) | Bangalore South |
| Jayanagar | 173 | C K Ramamurthy | [jayanagar.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=330) | Bangalore South |
| Mahadevapura | 174 | Manjula S | [mahadevapura.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=271) | Bangalore Central |
| Bommanahalli | 175 | M Satish Reddy | [bommanahalli.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=355) | Bangalore South |
| Bangalore South | 176 | M Krishnappa | [bangaloresouth.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=253) | Bangalore Rural |
| Anekal | 177 | B Shivanna | [anekal.mla@karnataka.gov.in](https://kla.kar.nic.in/assembly/member/16thWhosWho.pdf#page=380) | Bangalore Rural |

## Lok Sabha coverage

| Constituency | MP | Official mailbox |
| --- | --- | --- |
| Bangalore Central | P C Mohan | [pc.mohan@mpls.sansad.in](https://sansad.in/ls/members/biographyM/4321?from=members) |
| Bangalore North | Shobha Karandlaje | [karandlaje.shobha@mpls.sansad.in](https://sansad.in/ls/members/biographyM/4616?from=members) |
| Bangalore Rural | C N Manjunath | [drcnmanjunath.mp@mpls.sansad.in](https://sansad.in/ls/members/biographyM/5590?from=members) |
| Bangalore South | Tejasvi Surya | [tejasvi.surya@mpls.sansad.in](https://sansad.in/ls/members/biographyM/5182?from=members) |
| Chikkballapur | K Sudhakar | [keshava.sudhakar@mpls.sansad.in](https://sansad.in/ls/members/biographyM/5602?from=members) |

## Data contract and maintenance

- Identical JSON snapshots ship at `apps/api/data/representatives.json` and `apps/web/public/data/representatives.json`; the latter supports the explicit local demonstration.
- `contacts` holds `{ id, role, name, constituency, email, sourceUrl, checkedAt }`. `email` must be `null` when an official address is unavailable. This snapshot has 33 contacts (28 MLA, 5 MP) and 33 sourced official-domain addresses.
- `assemblyToContacts` maps the exact ward `assembly` attribute to the MLA ID and MP ID. `assemblyMapping` retains the numbered AC, PC and mapping provenance.
- Names and email strings are a checked snapshot. Recheck the official member directories after elections, vacancies, replacements, email changes or future delimitation. Never update names while silently retaining a previous member's personal email.
- Every future unverified field stays null or absent; no fuzzy constituency choice, invented boundary, inferred mailbox, fabricated delivery or automatic sending. The user reviews the draft and recipients before any external handoff.
- Validation performed: 369/369 ward attributes covered; 28/28 exact assembly joins; 33 unique contact IDs; each assembly resolves to one MLA and one MP; all addresses match email syntax and the official domain for their role; API/web snapshots are byte-identical. Representative inbox delivery was not tested and no messages were sent.

## Anthropic typography request

The live [Anthropic home page](https://www.anthropic.com/) and its [published CSS](https://cdn.prod.website-files.com/67ce28cfec624e2b733f8a52/css/ant-brand.shared.67f55a9666b2ae2332f5f893.fa6b3aa41.min.css) were inspected on the checked date. The current CSS declares **Anthropic Sans**, **Anthropic Serif** and **Anthropic Mono**, with website-hosted WOFF2 files. Some legacy classes still mention Tiempos Text. The current first-party CSS therefore does not support claiming that Styrene/Copernicus are the exact current site fonts.

No public redistribution or independent application-use license for the custom Anthropic fonts was verified. A readable asset URL is not a reuse license. No proprietary font files were downloaded, copied, installed or linked by this research. Namma Civic can use a clearly described **Anthropic-inspired** warm editorial treatment with the already available Inter and system Georgia fallbacks; using the exact custom fonts requires an appropriate license or written permission.
