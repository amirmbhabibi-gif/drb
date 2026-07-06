# DaruGard – Monetization Architecture

Monetization is designed into the data model and system architecture from day one, even though Phase 1 doesn't implement it. The goal is to avoid costly schema migrations and re-architectures later.

## Revenue Streams

### A. Subscription Tiers (SaaS)

The primary Phase 1-2 revenue model. Pharmacies pay for access to the platform's network and features.

| Tier | Price (indicative) | Limits | Features |
|---|---|---|---|
| FREE | 0 | 3 active listings | Basic search, manual matching |
| STANDARD | $X/mo | 20 active listings | Full search, email notifications |
| PREMIUM | $Y/mo | Unlimited | Priority matching, analytics, API access |

**Architecture hook**: `organisations.subscription_tier` enum column. Feature-flag middleware checks this before allowing premium actions. `ListingService.createListing()` will call `SubscriptionGuard.checkListingQuota()` in Phase 2.

### B. Boosted Listings

Pharmacies pay to increase a listing's visibility in search results.

**Architecture hook**: `listings.boost_score` and `listings.featured_until` columns are already reserved in the Prisma schema (commented out). The `PrismaListingRepository.buildWhereClause()` will order by `boost_score DESC, created_at DESC` when boost is enabled, with a simple feature-flag check.

### C. Transaction Fee (Future)

A percentage fee on the declared value of completed exchanges. Requires:
1. Exchange value capture (agreed_price in Exchange aggregate).
2. Payment processor integration (Stripe Connect or equivalent).
3. Fee calculation service hooked into `ExchangeCompleted` domain event.

Estimated Phase 3.

### D. Premium Matching

Subscription gate on the AI-powered matching engine. Free tier gets basic text matching; Premium gets vector similarity + geographic + expiry scoring.

**Architecture hook**: `MatchingService.score()` accepts a `tier` parameter and applies different scoring strategies via strategy pattern.

### E. Risk Reduction Services

- **Verification badge**: pharmacies pay for identity/license verification. Badge displayed on listings.
- **Exchange protection**: fee-based insurance for failed exchanges (escrow model).
- **Batch validation**: bulk listing audit by DaruGard compliance team.

### F. Data & Intelligence (Phase 3+)

- Aggregated shortage maps (sold to distributors, government agencies).
- Demand prediction reports (subscription to manufacturers).
- Market pricing benchmarks.

**Critical**: all data products must use aggregated, anonymised data. Individual pharmacy data is never sold. Privacy-by-design is a trust prerequisite.

## Feature Flag Architecture

All premium features are gated by a feature flag service. Phase 1 uses a simple enum check. Phase 2 will use a proper feature flag system (LaunchDarkly or self-hosted Unleash).

```typescript
// Phase 1: simple enum check in service layer
if (pharmacy.tier < SubscriptionTier.PREMIUM) {
  throw new ForbiddenException('Feature requires Premium subscription');
}

// Phase 2: feature flag service
const canUseAIMatching = await this.featureFlags.isEnabled('ai-matching', { pharmacyId });
```

## Pricing Hooks in Matching Algorithm

The matching engine's ranking function must accept a `boostMultiplier` parameter:

```typescript
finalScore = (textScore * 0.4) + (geoScore * 0.3) + (expiryScore * 0.2) + (reputationScore * 0.1);
finalScore *= listing.boostScore ?? 1.0;  // boost multiplier (1.0 = no boost)
```

Boost values: Free = 1.0, Paid boost tier 1 = 1.5, Paid boost tier 2 = 2.0.
