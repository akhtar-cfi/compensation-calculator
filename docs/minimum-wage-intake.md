# Minimum-wage intake checklist

Courts value the income of a victim without income proof at the **state minimum wage in force on the accident date**.
This checklist is for the person who collects the official orders. It takes about an hour per state. The maintainer
then reads every file, checks its arithmetic and adds it to `sources/minimum-wages/<STATE>.yaml`.

Most state labour websites refuse automated access and are not archived, so this step has to be done by someone in
India using a normal browser. The map of sources is `sources/watch.yaml`.

## What to collect

For each state, **every** minimum-wage order effective from **1 April 2019 to today**:

- basic-rate revisions (fresh fixation or revision under the Minimum Wages Act / Code on Wages);
- every dearness allowance (DA / VDA) order, usually twice a year;
- any circular declaring an order fake, withdrawn or corrected;
- Hindi and English versions if both exist.

## Rules

1. Download **only from government websites** (`.gov.in`, `.nic.in`) or the state gazette.
   - Never use compliance or HR sites (TeamLease, Simpliance, Paycheck, factoHR and similar) as the source.
   - In October 2025 a **forged** Delhi DA order was reported by such sites as genuine. The Labour Department had to issue a circular calling it fake.
   - If an order can only be found on a private site, save it in `<STATE>/unofficial/` and say so in the log.
2. Keep the **original file name**. Do not edit, merge or re-save PDFs.
3. Save a **PDF print or screenshot of the listing page** showing the full list and today's date, as `<STATE>/_listing_<YYYY-MM-DD>.pdf`. This becomes the `last_checked` date.
4. If a listed order's link is broken, screenshot the entry and note it in the log.
5. Fill one row per file in the intake log. Columns:
   - state
   - file name
   - title as listed
   - date shown on the site
   - effective date (if visible)
   - page URL where found
   - file URL
   - downloaded by
   - download date
   - notes

## Where to look

| State            | Start here                                                                                                  | Also check                                                                                                                                                                           | What to expect                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| Haryana          | https://hrylabour.gov.in/home/readmore?cat_id=53&status=1 ("Minimum Wage Notifications"; page back to 2019) | Haryana e-Gazette https://www.egazetteharyana.gov.in/ (search "Minimum Wages"). Example file: https://storage.hrylabour.gov.in/uploads/labour_laws/Y2026/April/W2/D09/1775725409.pdf | Half-yearly DA orders, plus a large revision reported in 2026                                   |
| Rajasthan        | https://labour.rajasthan.gov.in/Notification.aspx                                                           | https://labour.rajasthan.gov.in/Circulars.aspx · https://labour.rajasthan.gov.in/DisplayNews.aspx                                                                                    | "Minimum Wages Notification" of 30/07/2021 and 28/06/2022, plus later revisions and VDA notices |
| Uttar Pradesh    | https://uplabour.gov.in/Pages/MWA.aspx                                                                      | Home page notice https://uplabour.gov.in/ ("Revised minimum wages basic rates with VDA in 74 scheduled employment, effective from 01/04/2026")                                       | VDA orders every April and October (mostly Hindi), plus the 1 April 2026 revision               |
| Madhya Pradesh   | https://labour.mp.gov.in/LabourCommissioner/Default.aspx?g=10 → "Minimum Wages"                             | Search the site for "परिवर्तनशील महंगाई भत्ता" (VDA) and "न्यूनतम वेतन"                                                                                                              | VDA orders every April and October (Hindi), plus any basic-rate revision                        |
| Delhi (optional) | https://labour.delhi.gov.in/labour/current-minimum-wage-rate                                                | —                                                                                                                                                                                    | Already loaded from archived copies. Downloading the PDFs lets us record file hashes            |
| Central sphere   | —                                                                                                           | —                                                                                                                                                                                    | Nothing to do: read automatically from archived official files                                  |

Official file URLs already found by the search watcher are listed in `sources/watch-seen.json`. For Haryana, these
include orders dated Sep 2019, Oct 2022, Aug 2023, Apr 2025 and 30 Oct 2025, plus the April 2026 gazette. Use them as a
starting point, not as the complete list.

## What the maintainer does with the files

For every order:

- record the effective date, the rates by zone and category, the notification number and date, the official file URL, a verbatim table row and the file's SHA-256;
- check that the previous rate plus DA equals the new rate, and that a higher skill category is never paid less than a lower one;
- set `last_checked` to the listing-page date;
- add a test for at least one known rate.

Anything missing is recorded in the state's `gaps` list rather than estimated.
