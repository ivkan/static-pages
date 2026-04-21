# Seller Finance Deal Studio

A lightweight browser app for structuring and stress-testing a business sale for a low-cash buyer.

## What it does

- Uses a fixed dollar down payment as the core buyer equity input
- Supports modular financing blocks:
  - Senior debt
  - Mezzanine
  - Seller note
  - Royalty advance with a custom repayment cap
  - Earnout
- Lets each debt tranche use amortizing, interest-only, or balloon structures
- Includes editable `Low`, `Plausible`, and `Great` operating cases
- Highlights annual obligations, DSCR, buyer IRR, payback, and exit equity
- Produces a shareable summary plus a stress-test table

## Run it

Open [index.html](/Users/arthurveytsman/Documents/Codex/2026-04-20-can-you-see-my-chats-in/index.html) in a browser.

If you want a local server instead:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Current modeling assumptions

- DSCR uses net profit from the operating case
- Buyer IRR assumes resale at the chosen exit multiple at the end of the hold period
- Royalty can either stack on top of debt service or be constrained to preserve the target DSCR
- Earnout is modeled as a fixed delayed payment
- No prepayment penalty is assumed

## Next good upgrades

- Save multiple named deal structures and compare them side by side
- Export a buyer-facing PDF summary and a term-sheet version
- Add refinance scenarios and optional covenant warnings
- Break buyer cash flow into monthly detail instead of annual rollups
