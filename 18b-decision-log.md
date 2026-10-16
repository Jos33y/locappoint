# 18b. Decision log, part B

Part B of claude/18-decision-log.md, which holds everything up to WhatsApp agent round 6 (13 October 2026) and takes no new entries. Same format: one entry per decision, saying what was decided, why, where it is in the code, and what changing it involves. Add to it whenever a product rule is chosen. Newest first.

## Founding offer: first month free for the first 100 businesses, no rate lock (16 October 2026, decided by Joseey)

| Decision | Choice | Why |
|---|---|---|
| What founding businesses get | The first 100 businesses to go live get their first month of fees free, counted from the day fees start | Booking software is a proven thing people pay for; the offer rewards being early without discounting the product |
| Counted how | 100 across Porto, Lagos and Lisbon together, not per city | One line everyone understands: "one of our first 100" |
| Rate lock | None. Doc 28's "business fee locked at the launch rate for 12 months" is withdrawn | Same reason: no long-term discount on a product people already pay for elsewhere |
| Everyone else | Pays from the day fees start; no free first month | Replaces doc 16's free first month for all |
| How the 100 are known | A founding number from 1 to 100, set once when a business first goes live and never reused (its own kit, after the test-data clean-up, launch list 1.7, and an internal flag so test pages do not take numbers). Existing live real businesses are numbered by their go-live date | Owners, admin and the fee logic need one answer to "is this business in the first 100" |

**Where it lives:** not in code yet. Copy to change with it: the home page pricing receipt (`src/pages/app/home/Pricing.jsx`, "Your first month of it is free" reads as everyone) and its test (`tests/suites/pricing.mjs` checks for "first month"); docs 16 and 28.

## Real bookings: WhatsApp counts (14 October 2026, launch fix 1.9, decided before code)

| Decision | Choice | Why |
|---|---|---|
| What a real client booking is | Any `source` except `manual` and `assistant`: web, whatsapp, ai_assistant, google. One SQL helper, `public.is_client_booking(source)`, read by every count | WhatsApp bookings were missing from referral milestones and parts of Insights. One definition, one place to change it |
| `assistant` | An owner-added booking, like `manual`: on the statement's "you added" line, never a fee | Only `owner_book_appointment` writes it, beside `manual`. Counting it as real would put the fee on bookings owners typed in themselves |
| The page funnel | `booked_counted` stays `source = 'web'` | Only web bookings pass through page views; WhatsApp bookings would outnumber visits. The WhatsApp funnel is measured on its own (doc 23, funnel C) |
| Review requests | `queue_visit_followups` emails WhatsApp clients who gave an email, as booking emails and receipts have done since agent-4 | The same client, the same follow-up, whichever channel they booked on |
| How production is changed | Live function bodies patched in place, the agent-4 way: each old rule must match an exact number of times or nothing changes; safe to re-run | Production differs from the repo (`statement_week` was already patched by agent-4; `weekly-statement.sql` is out of date) |

**Where it lives:** `supabase/migrations/real-bookings.sql` and `supabase/queries/real-bookings-verify.sql` (to be shipped); patched in place: `real_booking_count`, `statement_week`, `insights_period` (`booked_online`), `business_insights` (`lead_hours`), `queue_visit_followups`. Definition in `23-metrics-and-measurement.md` section 1.

**How to change:**
- *Which sources are real:* the body of `is_client_booking`, and the definition in doc 23 together.

**Not covered yet:** the `is_internal` flag on businesses (doc 23); until then the test-data clean-up (launch list 1.7) keeps the numbers honest.

## Lagos owner polish and payout safety (13 October 2026, travelfee.zip, payname.zip, polish1.zip)

| Decision | Choice | Why |
|---|---|---|
| Travel fee limit | Follows the business currency: up to €500 in Portugal, up to ₦200,000 in Lagos. The database has no upper limit | A ₦5,000 Lagos travel fee was refused by a euro-sized cap of 500 |
| Who payouts can go to (Lagos) | Paystack's account name must match the owner's name (two words in common, any order, extra names allowed; one when the owner gave one word) or the business name (one distinctive word). Titles and filler words (LTD, ENTERPRISES, VENTURES, STUDIO, THE ...) do not count; accents and case do not matter. Refused on screen before saving and again on the server | No paying a business's money into someone else's account; compliance |
| Footer | No city in the Contact column (email and phone only) | "Porto, Portugal" contradicted the registered address in Enugu that Meta checks |
| Sidebar switcher | The business logo once uploaded, on a 1px edge; initials on azure without one | The owner's own brand where they work every day |
| New on Locappoint | A pill as wide as its words | It stretched into what looked like a progress bar |
| Distance on Services | Hidden while address search is off (a shop placed earlier still shows); areas only | Owners were told about a setting they cannot change |

**Where it lives:** `ServiceEditor.jsx` (`TRAVEL_MAX`, `serviceProblems(service, currency)`, `servicesValid(services, currency)`); `payouts/providers.ts` (`nameWords`, `nameMatches`), `payouts/index.ts` (resolve returns `matches`; connect refuses with 409), `PaymentsPage.jsx` (`BankForm`); `Appfooter.jsx`; `BusinessShell.jsx` and `shell.css` (`biz-avatar--logo`); `reviews.css` (`.lc-rating.is-new`); `ServicesPage.jsx` (`Distance`).

**How to change:**
- *Travel fee limits:* `TRAVEL_MAX` in `ServiceEditor.jsx`.
- *Name rule:* `FILLER` and the counts in `nameMatches`; tests in `tests/suites/payouts.mjs`.

**Not covered yet:** a manual Support review for a genuine account under a different registered name; Stripe Identity tested with a Nigerian NIN slip or driver's licence (Nigeria is on Stripe's document list; passports are safe).

## Lisbon live, and agent round 7 (13 October 2026, agentfix7.zip)

| Decision | Choice | Why |
|---|---|---|
| Lisbon | Live, the same as Porto: taking bookings, pay at the visit. Switcher, cohort count, Businesses, sign-in, home, footer, status page and the agent all say Porto, Lagos and Lisbon | Joseey: Lisbon is the same as Porto. The 30-person evaluation showed the agent telling Lisbon clients it was "opening soon" while booking them there |
| Which city the agent offers | +234 is Lagos, +351 is Porto or Lisbon, unless they say otherwise. Only businesses in their country, and in their city when known; another country only when they ask. Nothing in their city: the other Portuguese city first | It offered a Lagos barber in naira to a Lisbon client, and Lagos to a Porto client when Lisbon had the haircut |
| The hello | A short hello as Locappoint's booking assistant, no list of cities | The city line was the most repeated mistake in the reviews |
| Internal ids | The agent never sees Support request ids, only their numbers (#1041); support_reply takes the number. A reply with any id in it is asked again without it, and an id that comes back is cut out | It gave a client a database id as a "reference" |
| Website bookings | The agent says it cannot see them, points to the Change or cancel link in the confirmation email, and offers to open a Support request when they cannot find it | It guessed at how to cancel one, and never offered Support |
| Empty answers | Asked again twice before the "Sorry, I did not get that" fallback | A plain Sunday question got the fallback |

**Where it lives:** `services/engine.js` (`MARKETS`, Lisbon `live: true`), `services/cohort.js`, `Appfooter.jsx`, `StatusApp.jsx`, `Setup.jsx`, `BusinessPage.jsx`, `AuthPage.jsx`, `AuthShell.jsx` (Lisbon map spot), `Hero.jsx`, `Cta.jsx`, `Contact.jsx`, `constants/locations.js`; `_shared/agent.ts` (`SYSTEM`, context, `support_reply`, the id and empty-answer retries); `tests/agent-eval/run.mjs` (an id in any reply fails; the reviewer knows Lisbon is live and the email link).

**How to change:**
- *A new city:* a row in `markets`, an entry in `MARKETS` and `CITIES`, the copy lines, and the city rule in `SYSTEM`.
- *Which numbers mean which city:* `SYSTEM` and the context lines in `runAgent`.

**Not covered yet:** Lisbon has no travel regions (as Porto); the email footer order.

## WhatsApp 3c: visits at home, Support from the chat, Lagos (13 October 2026, whatsapp3c.zip)

| Decision | Choice | Why |
|---|---|---|
| Visits at the client's place | Booked in the chat when the business lists areas: the agent asks the area (one of the business's areas, matched loosely), the street address and directions in one message; free times count travel for that area; the summary shows the address and the travel fee; Yes books through book_appointment, which keeps the address from the business until it confirms. A business that only travels by distance still gets its page link | Most Lagos home services start on WhatsApp; the page link lost them |
| Wrong area | Told plainly that this business does not go there, with the shop or another business offered | No booking a business cannot reach |
| Support from the chat | report_problem opens a request to Locappoint Support (no-show, a visit that went badly, payment, safety, bookings, account, other), linked to the booking when it is about one (upcoming, or a visit that ended up to 48 hours ago). No email or account needed: the ticket keeps the WhatsApp number. A second report on the same booking joins the open request | Clients complain where they booked |
| Replies | Every reply from /admin on such a request goes back to that WhatsApp (inside 24 hours as a message, outside as the lc_client_support template); staff notes stay inside; after STOP, replies stay in email and /admin. Their answers go into the same request (support_reply) | One conversation, where the client is |
| What the agent may say | The request number and that a person replies here, usually within a working day. Never a refund, a compensation or a verdict. Anyone in danger: the emergency number first (112 in Portugal; 112 or 767 in Lagos) | Support decides, not the model |
| Lagos | Search covers Lagos; a +234 number is taken to be in Lagos and not asked which city | It asked "which city?" to a Lagos number |
| Small fixes | A free service reads Free, never 0.00; "the nearest free time is", never "the earliest I can offer"; one goodbye only (a second thank-you gets no reply); naira as ₦18,000 in every WhatsApp message | From the evaluations and live tests |
| Owner's view of the chat | Not built | One WhatsApp conversation covers every business a client talks about; showing it to one business would show them the others. The booking already carries what the owner needs |

**Where it lives:** `agent-7.sql` (`wa_business` with visit_areas and travel_fee; `wa_times`, `wa_free_days` with mode and area; `wa_book` with address, landmark and area; `wa_search` with area; `wa_areas`; `wa_client_view` shows the visit address; `support_tickets.wa_phone`; `wa_recent`, `wa_tickets`, `wa_report`, `wa_support_reply`; the `support_messages_whatsapp` trigger); `_shared/agent.ts` (rules, report_problem, support_reply, visits in propose_booking); `_shared/wa-client.ts` (visit summary, Support message and template, naira); `whatsapp/index.ts` (the Yes passes the address); `tests/agent-eval` (30 people, a Lagos business, visits and Support).

**How to change:**
- *Report window:* `support_report_open` (48 hours), shared with the website.
- *Reports a day per number:* the 5 in `wa_report`.
- *Emergency numbers and the no-promise rule:* `SYSTEM` in `agent.ts`.
- *Template words:* `CLIENT_TEMPLATES.lc_client_support` and claude/19-whatsapp-templates.md together.

**Not covered yet:** photos with a report; Portuguese templates; travel shown to the business on the calendar.

## Travel time between visits (13 October 2026, travel.zip)

| Decision | Choice | Why |
|---|---|---|
| The problem | Free times ignored travel, so a visit in Ikorodu could be booked straight after one in Lekki, or a shop booking right after a visit across town | Lagos traffic makes travel the biggest gap in a day of home visits |
| Where the minutes come from | Lagos areas grouped into 13 regions (Island, Lekki, Ajah, Ibeju-Lekki and Epe, Yaba and Surulere, Festac and Apapa, Gbagada and Maryland, Ikeja, Ojodu and Magodo, Oshodi and Isolo, Alimosho, Ikorodu, Badagry) with set off-peak minutes between every pair, and between two places in the same region | Free to run and easy to tune. Google's Route Matrix for all 5,329 area pairs would cost about USD 27, or about USD 53 with traffic, and still not know Lagos rush hour unless paid for |
| Rush hour | 1.5 times slower when leaving on a weekday between 06:30 and 10:00 or 16:00 and 20:00, rounded up to 5 minutes | Lekki to Ikorodu is 75 minutes at noon and 115 at 5pm |
| When it counts | Between any two bookings of the same staff member in different places: the shop, a client's area, another client's area. None for online sessions or shop to shop. Added on top of the business's buffer | The gap is about moving, not about the service |
| Unknown places | An address with no area, or a shop with no start area: 60 minutes | Better a gap too long than a missed visit |
| Where visits start | `businesses.base_zone`, filled from the neighbourhood or city when it names an area; the owner can change it under Services, Where you go, "You start from" (shown only in cities with regions) | Travel to and from the shop needs to know where the shop is |
| The client | Picking "At your place" or the area after the time checks the time again; if the travel no longer fits, they are told ("With the travel to Ikorodu, 14:30 no longer works") and pick another time before confirming | The time is picked before the address in the booking sheet |
| Porto and Lisbon | No regions yet, so no travel: free times work exactly as before | Lagos first; Porto regions can be added as rows |

**Where it lives:** `travel.sql` (`market_regions`, `market_zones.region`, `region_minutes`, `market_peaks`, `markets.travel_unknown_minutes`, `businesses.base_zone` with the `businesses_zone` trigger, `visit_place`, `travel_minutes`; `get_available_slots` takes `p_mode` and `p_zone`; `book_appointment` and `engine_match` patched in place to pass them); `services/booking.js` (`loadSlots`); `BookingSheet.jsx` (the check after the area); `ServicesPage.jsx` (`StartFrom`); `services/setup.js` (`travelsBetween`).

**How to change:**
- *Minutes:* rows in `region_minutes` (one row per pair, `a <= b`).
- *Which region an area is in:* `market_zones.region`.
- *Rush hours:* rows in `market_peaks` (times, factor, weekdays only).
- *Unknown places:* `markets.travel_unknown_minutes`.
- *Porto or Lisbon:* add rows to `market_regions`, set `market_zones.region`, add `region_minutes`; nothing in code.

**Not covered yet:** travel shown to the business on the calendar; travel for bookings the business adds by hand or moves itself (owners can still place any time); real trip times feeding back into the minutes.

## Cities: Porto and Lagos live, Lisbon next (13 October 2026, cities.zip)

Lisbon went live the same day: see the agentfix7 entry above.

| Decision | Choice | Why |
|---|---|---|
| Live cities | Porto and Lagos taking bookings; Lisbon open to sign-ups ("opening soon") | Lagos is fully ready, Paystack included |
| How each city pays | Lagos: Paystack, paying ahead by transfer or card, as built. Porto: launches with pay at the visit; paying online in Porto waits until the Stripe side is simplified. Recorded here; no payment code changes in this build | Lagos is ready for payments; Porto launches without the online-payment complexity |
| City switcher | In the site header and the client app's top bar: a pin and the city name; on phones a bottom sheet. Remembered on the device (`lc.city`); the first visit takes Lagos when the phone's clock is Africa/Lagos, otherwise Porto | Both audiences land on their own city without a question |
| What follows the city | The Businesses page (hero, count, places, call to action), the client Home's Popular, client Search, "What do you need?", the cohort count on Home and sign-in | A Lagos client should never scroll past Porto places |
| Demo and test pages | A place belongs to its `market`; a row without one falls back to its city name | Every live row has a market from the `businesses_market` trigger |
| Money | Prices in the business's own currency everywhere they show: menus, the booking sheet and ticket, place results, the business booking sheet, New booking, Services (price field prefix and the "three people pay" hint). Naira in whole numbers, euro with cents only when there are cents | Lagos prices were shown in euro |
| Launch area | Greater Porto, Greater Lisbon and Lagos; a business elsewhere is told we are open in Porto and Lagos, with Lisbon next. Neighbourhood hint "Like Lekki or Yaba" for Nigeria | Lagos owners were told we were coming later |
| Lagos areas | 73, alphabetical: the 18 from engine-foundation plus 55 (Igando, Ipaja, Ayobo, Kola, the Lekki axis to Ibeju-Lekki and Epe, the mainland from Ebute Metta to Berger, Alimosho, Badagry). The area picker is searchable past 12 areas. A business can list up to 40 areas; past that it is asked to set a distance | Lagos is too big for a short list |
| Copy | Porto and Lagos first everywhere: hero, footer, sign-in, contact, pricing, search titles ("Porto, Lagos and Lisbon"), status page | One story across the site |
| Travel time between areas | Not in this build | Its own build after Cities |

**Where it lives:** `cities.sql` (Lagos `market_zones`), `services/engine.js` (`MARKETS`, `defaultCity`, `saveCity`, `onCityChange`), `hooks/useCity.js`, `components/common/CitySwitcher.jsx`, `styles/app/city.css`, `AppHeader.jsx`, `header.css` (phone widths), `ClientLayout.jsx`, `services/cohort.js` (`CITIES`, `inMarket`), `useCohort.js`, `Businesses.jsx`, `client/Home.jsx`, `client/Search.jsx`, `services/business.js` (`formatMoney`, `menuPrice`, `currencySign`), `constants/locations.js` (`inLaunchArea`, `neighbourhoodHint`), `server/seo.mjs`, `StatusApp.jsx`.

**How to change:**
- *Open Lisbon:* `live: true` on Lisbon in `MARKETS` and `later` in `CITIES`; the copy lines that say "with Lisbon next".
- *First-visit city:* `defaultCity` in `services/engine.js`.
- *Lagos areas:* rows in `market_zones` (keep `sort_order` alphabetical, as `cities.sql` does). The Google address match uses the area names, so a new area should be spelled the way Google writes it.
- *Areas per business:* `MAX_AREAS` in `ServicesPage.jsx` and the cardinality check on `businesses.service_zones`, together.

**Not covered yet:** travel shown to the business on the calendar; travel for bookings the business adds by hand or moves itself (owners can still place any time); real trip times feeding back into the minutes.
