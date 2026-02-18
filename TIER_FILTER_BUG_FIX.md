# Tier Filter Bug Fix - Subscriptions Page

**Date:** February 18, 2026
**Issue:** Selecting a tier filter showed no results (filtered out all subscriptions)
**Status:** ✅ **FIXED**

---

## Problem

When clicking "View All" on any tier card (Enterprise, Professional, Basic, Trial), the page would:
1. Show "Filtering: ENTERPRISE" indicator (filter was detected)
2. But display zero subscriptions (all results filtered out)

This was the opposite of what should happen - the filter should show subscriptions of that tier, not hide them.

---

## Root Cause

**The Issue:** The subscription page was sending lowercase tier values (`'enterprise'`, `'professional'`, etc.) to the API, but the database stores plan_tier values in UPPERCASE (`'ENTERPRISE'`, `'PROFESSIONAL'`, etc.).

**Why it failed:** The API was doing a direct string comparison without case conversion:
```typescript
// BEFORE - WRONG
if (tier) {
  where.plan_tier = tier;  // Comparing 'enterprise' != 'ENTERPRISE' → no match
}
```

This meant:
- Frontend sends: `tier: 'enterprise'`
- Database has: `plan_tier: 'ENTERPRISE'`
- Comparison: `'enterprise' === 'ENTERPRISE'` → FALSE
- Result: No subscriptions found (empty list)

---

## Solution

Updated the API route to normalize tier values to uppercase and use case-insensitive comparison:

```typescript
// AFTER - CORRECT
if (tier) {
  // Handle tier filtering - case insensitive matching for tier values
  where.plan_tier = {
    equals: tier.toUpperCase(),
    mode: 'insensitive',
  };
}
```

This matches the pattern used in `/app/api/subscriptions/stats/route.ts` which was already working correctly.

---

## File Modified

**File:** `/app/api/subscriptions/route.ts`
**Lines:** 34-40
**Change Type:** Bug fix - tier filtering logic

---

## Testing the Fix

To verify the fix works:

1. **Navigate to Subscriptions page** → `/dashboard/subscriptions`
2. **Click "View All" on Enterprise card**
   - Should show "✓ Filtering" on button
   - Should show "Filtering: ENTERPRISE" banner
   - List below should show only ENTERPRISE tier subscriptions
3. **Repeat for other tiers** (Professional, Basic, Trial)
4. **Click clear filter button** to reset

All tier filters should now work correctly.

---

## Why This Matters

✅ **User Experience:** Users can now filter by tier without getting empty results
✅ **Data Integrity:** Ensures filters are applied correctly
✅ **Consistency:** Uses same pattern as stats API (which was already working)
✅ **Case Handling:** Properly handles case-insensitive database comparisons

---

## Related Code

The same pattern is used successfully in:
- `/app/api/subscriptions/stats/route.ts` - Works correctly
- Uses: `equals: 'ENTERPRISE', mode: 'insensitive'`
- Same fix applied to subscriptions route for consistency

---

**Status:** ✅ Fixed and Ready
**Next:** Users can now properly filter subscriptions by tier
