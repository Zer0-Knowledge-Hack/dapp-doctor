# DApp Doctor — business proposal

Written 11 September 2026, during the Burning Token hackathon. Every fact about
a payment provider below was checked against the provider's own page on that
date and is linked. Anything not checked is marked **to verify**.

The team is based in Latin America. That is the constraint this proposal is
built around: the standard way to sell a web subscription assumes a Stripe
account, and most of the region cannot open one.

---

## 1. Who pays, and when

Everyone who ships a dApp hits a misconfigured RPC at some point, and most of
them will never pay to find out why. That is fine: they are the funnel.

The moment someone pays is **the week before a mainnet launch**. A wrong chain
ID, a fallback that points at another network or a dead endpoint costs a
launching team real users on day one, and the team knows it. Launch Check exists
for that moment.

| | Free | Pro |
|---|---|---|
| Six-check diagnosis (`/diagnose`) | ✅ | ✅ |
| Before/after comparison (`/compare`) | ✅ | ✅ |
| MCP server for agents | ✅ | ✅ |
| **Launch Check** (`/launch`): the stricter bar before mainnet | | ✅ live |
| **Diagnosis history** | | ✅ live |
| Saved setups re-checked on a schedule, with a timeline | | not built |
| Launch Check from an agent or CI, with a personal token | | not built |
| Team seats | | not built |

Only the rows marked live exist today. The rest is roadmap and is sold as
nothing until it ships.

## 2. Pricing

**Today (hackathon):** USD 9.99 a month, 79.99 a year, 99.99 lifetime, sold
through RevenueCat **Test Store**. No card is charged.

**Proposed after the hackathon:**

- **Keep monthly and yearly.** Yearly at about eight months' price is standard
  and fine.
- **Drop lifetime, or raise it well above the yearly price.** At 99.99 it costs
  barely more than one year, for a service with running costs (live RPC calls,
  storage) that never stop.
- **Test a one-time Launch Pass**, 30 days of Pro. A launch is an event, not a
  habit. Some teams will pay once around a launch and never subscribe; that is
  revenue a subscription alone leaves on the table.

### Regional pricing

- [RevenueCat Billing supports a price per currency][rc-currency], with a
  minimum around USD 0.99 equivalent. Its currency table includes **BRL, MXN,
  CLP, COP, PEN and CRC**.
- It does **not** list ARS, BOB, UYU or PYG. Customers there would see the
  default currency, USD.
- Proposed rule: price each local currency at a fixed discount to USD, converted
  on the day it is set and reviewed each quarter. Choosing the discount needs
  real conversion data, so it is not fixed here.
- Caveat: per-currency prices are a feature of **RevenueCat Billing**, which runs
  on a connected Stripe account ([source][rc-stripe]). With Paddle as the engine
  (option A below), prices live in Paddle. Whether Paddle prices can be
  localized the same way is **to verify** in Paddle's documentation.

## 3. Getting paid from Latin America

This is the hard part, and the part the hackathon's Test Store setup hides.

### What was verified

- **RevenueCat needs a billing engine for real web purchases:**
  - RevenueCat Billing or Stripe Billing, both on a connected Stripe account
    ([source][rc-stripe]).
  - Or Paddle Billing, which also works with the Web SDK DApp Doctor already
    uses ([source][rc-paddle]).
- **Stripe self-serve signup in Latin America covers only Brazil and Mexico.**
  Stripe's country list offers no other country in the region
  ([source][stripe-global]). Elsewhere, Stripe points to **Atlas**, which
  incorporates a US company.
- **Paddle works with software sellers anywhere except 28 listed countries**
  ([source][paddle-countries]):
  - **Venezuela** is the only Latin American country on that list.
  - Paddle is the **merchant of record**, so it handles sales tax and VAT
    ([source][rc-paddle]).
  - It pays out once a month by **wire transfer or Payoneer**, with a USD 100
    minimum and a possible USD 15 SWIFT fee in some countries
    ([source][paddle-payouts]).
- **Mercado Pago runs country sites** for Argentina, Brazil, Mexico, Chile,
  Colombia, Peru and Uruguay, and supports recurring payments
  ([source][mp-docs]):
  - Its Bolivia and Paraguay domains redirect to Mercado Libre.
  - Its Venezuela site shows the service as paused.
  - **It is not a RevenueCat billing engine.**
- **A RevenueCat secret key can grant entitlements** through the REST API
  ([source][rc-auth]). That is what lets any payment rail RevenueCat does not
  process still unlock Pro.

### The options

| Option | What it takes | For | Against |
|---|---|---|---|
| **A. Paddle as the RevenueCat engine** | A Paddle account and a Paddle config in RevenueCat. The Web SDK code stays the same. | Open to sellers in most of the region; Paddle handles tax as merchant of record; payouts through Payoneer. | Seller onboarding and fees are Paddle's (**to verify**). Local currency pricing is not confirmed. |
| **B. Stripe** | A company in Brazil or Mexico, or a US company through Atlas. | The most complete RevenueCat path, including per-currency prices. | Needs an entity most of the team does not have; Atlas adds cost and US paperwork. |
| **C. USDC on Base, direct** | A small verifier on our server plus a RevenueCat grant (see below). | The audience already holds USDC on the chain we diagnose; no processor approval; works in every country the product does. | Refunds are manual; crypto income has tax and accounting treatment per country (**ask an accountant**); turning USDC into local currency is outside this proposal. |
| **D. Mercado Pago** | Our own integration and webhook, one country at a time, then a RevenueCat grant. | Local cards and payment methods in its seven markets. | Only worth it once a single market has proven demand. |

### How option C would work

1. The user picks a plan. The page shows a treasury address on Base and the
   exact USDC amount.
2. They pay from their own wallet. **DApp Doctor never asks for a key or a
   signature.** The user signs in their own wallet, as with any payment.
3. They paste the transaction hash.
4. The server verifies it with reads only:
   - the receipt succeeded;
   - it holds a `Transfer` log from the USDC contract to our treasury, for at
     least the price;
   - it has enough confirmations;
   - the hash was never used before, recorded in Redis.
5. The server grants `daap_doctor_pro` for 30 or 365 days through RevenueCat's
   API. From then on, access is checked the way it is today.

This keeps RevenueCat as the single source of truth for access, so Launch
Check and history do not change at all.

The verifier needs `eth_getTransactionReceipt`. That is a read, but it is not on
the engine's list of allowed methods. It would live in its own module, and
adding it is a team decision under the engine invariants in the rules file.

## 4. Recommendation

1. **Now, for the hackathon:** Test Store, declared as such everywhere. Nothing
   changes.
2. **First 90 days after:**
   - Pro through **Paddle as the RevenueCat engine (option A)**, priced in USD.
   - Goal: the first 10 paying teams.
   - Measure the funnel: diagnosis → Launch Check → paywall → purchase.
3. **Next:**
   - Add **USDC on Base (option C)** as a second rail, starting with yearly
     plans and the Launch Pass.
   - It is the rail that matches the audience, and the one no country blocks.
4. **Later, only with demand:**
   - Local currency prices in the markets RevenueCat supports.
   - Or Mercado Pago in the one market that asks for it.
   - Option B only if the company is incorporated in Brazil, Mexico or the US
     for other reasons.

## 5. Reaching customers

- **The MCP server is the distribution.** A developer who adds DApp Doctor to
  their agent runs it every time the agent touches RPC configuration. The Pro
  upgrade should appear where the agent reports a result, once a personal token
  exists.
- **Launch moments.** Hackathons, accelerator demo days and mainnet launch
  announcements are where the need is sharpest. Start with the communities the
  team already belongs to, NERDCONF's included.
- **Spanish and Portuguese.** The product is in English. Translating the landing
  and the report's "what to do" lines is cheap and is the clearest regional
  advantage over tools built elsewhere.

## 6. Costs to quantify

These have not been measured yet, so no figures are given:

- Vercel functions per diagnosis (six checks, up to 30 s each in the worst case).
- Upstash Redis storage per Pro user (50 reports each, capped).
- RevenueCat's fee above its free tier (**to verify** on its pricing page).
- The payment rail's fees: Paddle's, or network gas for USDC, which the payer
  covers.

## 7. Open questions

- Which country would the company be registered in? That decides whether
  option B is even available.
- Does Paddle onboard a pre-revenue solo or three-person team? Its seller review
  has not been checked.
- Is there a usage cap on Pro, so a scripted agent cannot run Launch Check
  thousands of times a day on one subscription?

[rc-currency]: https://www.revenuecat.com/docs/web/web-billing/multi-currency-support
[rc-stripe]: https://www.revenuecat.com/docs/web/connect-stripe-account
[rc-paddle]: https://www.revenuecat.com/docs/web/integrations/paddle
[rc-auth]: https://www.revenuecat.com/docs/projects/authentication
[stripe-global]: https://stripe.com/global
[paddle-countries]: https://www.paddle.com/help/start/intro-to-paddle/which-countries-are-supported-by-paddle
[paddle-payouts]: https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid
[mp-docs]: https://www.mercadopago.com.ar/developers/en/docs
