# Users Page - Complete Testing Plan

## Icon Integration & Badge Filtering Tests

### 1. Grid View - Icons & Filtering
**Test: Verify icons appear on all badges in grid view**
- [ ] Navigate to `/dashboard/users`
- [ ] Verify view mode is set to "Grid"
- [ ] Verify Group By is set to "None"
- [ ] Check each user card displays:
  - [ ] Tier badge with icon (Crown for Enterprise, Briefcase for Professional, Layers for Basic, Users for Free)
  - [ ] Status badge with icon (Zap for Active, Clock for Trialing, AlertCircle for Pending, XCircle for Cancelled)
  - [ ] Suspended badge with Ban icon (if suspended)
  - [ ] Active badge with Zap icon (if active and not suspended)

**Test: Click tier badge to filter in grid view**
- [ ] Click on "Enterprise" badge on any card
- [ ] Verify page resets and shows only Enterprise users
- [ ] Verify tierFilter is set to "ENTERPRISE"
- [ ] Verify all displayed badges are "Enterprise"
- [ ] Click badge again to verify it filters (should maintain filter)

**Test: Click status badge to filter in grid view**
- [ ] Click on "Active" badge on any card
- [ ] Verify page resets and shows only Active users
- [ ] Verify statusFilter is set to "active"
- [ ] Verify all displayed badges are "Active"
- [ ] Click badge again to verify it filters

**Test: Click Suspended badge to filter**
- [ ] Find a suspended user card
- [ ] Click the "Suspended" badge
- [ ] Verify filtering works (should show suspended users)

### 2. List View (Ungrouped) - Icons & Filtering
**Test: Verify icons appear on badges in list view**
- [ ] Navigate to `/dashboard/users`
- [ ] Change View Mode to "List"
- [ ] Verify Group By is set to "None"
- [ ] Check the table displays:
  - [ ] Tier badges with icons (all 4 icon types)
  - [ ] Status badges with icons (all 4 icon types)

**Test: Click tier badge in list view table**
- [ ] Click on any tier badge in the table
- [ ] Verify page resets and filters by that tier
- [ ] Verify all displayed tier badges match the selected tier

**Test: Click status badge in list view table**
- [ ] Click on any status badge in the table
- [ ] Verify page resets and filters by that status
- [ ] Verify all displayed status badges match the selected status

### 3. Grouped View - Icons & Filtering
**Test: Group by Tier - Verify icons**
- [ ] Change Group By to "Tier"
- [ ] Keep View Mode as "Grid"
- [ ] Verify sections appear for each tier with headers showing count
- [ ] Verify all badges within each section have correct icons

**Test: Group by Tier - Filter from grouped grid view**
- [ ] In grouped grid view, click on a tier badge
- [ ] Verify filter is applied
- [ ] Navigate back and verify ungrouped view shows filtered results

**Test: Group by Status with List View**
- [ ] Change Group By to "Status"
- [ ] Change View Mode to "List"
- [ ] Verify table sections appear for each status
- [ ] Verify all badges have correct icons in grouped list view
- [ ] Click a badge to filter and verify it works

### 4. Combined Filtering Tests
**Test: Status + Tier filters together**
- [ ] Set Status Filter to "active"
- [ ] Set Tier Filter to "PROFESSIONAL"
- [ ] Verify only Professional + Active users display
- [ ] Verify badges show correct icons
- [ ] Click a badge to change one filter while maintaining the other

**Test: Search + Filter**
- [ ] Type a name in search box
- [ ] Also apply a tier filter
- [ ] Verify results match both criteria
- [ ] Click a badge to change the filter
- [ ] Verify search is maintained

**Test: Search + Status + Tier**
- [ ] Search for a user by email
- [ ] Apply Status filter
- [ ] Apply Tier filter
- [ ] Verify all three filters work together

### 5. View Mode Switching Tests
**Test: Switch between Grid and List**
- [ ] Start in Grid view with Group By: None
- [ ] Switch to List view
- [ ] Verify badges have icons in list view
- [ ] Switch back to Grid
- [ ] Verify view switches correctly

**Test: Switch views with active filters**
- [ ] Apply a status filter
- [ ] Switch from Grid to List
- [ ] Verify filter is maintained and badges are correct
- [ ] Switch to grouped view
- [ ] Verify filter is still applied

### 6. Stats Cards Interaction Tests
**Test: Click stats cards to filter**
- [ ] Click on "Active Users" card count
- [ ] Verify it filters to show only active users (if filter exists)
- [ ] Click on other stat cards
- [ ] Verify appropriate filtering occurs

### 7. Pagination with Filters Tests
**Test: Pagination maintains filters**
- [ ] Apply a tier filter
- [ ] Navigate to page 2
- [ ] Verify the filter is still applied
- [ ] Click a badge on page 2 to change filter
- [ ] Verify page resets to 1

**Test: Filter clears pagination**
- [ ] Navigate to page 2
- [ ] Apply a new filter
- [ ] Verify page resets to 1
- [ ] Verify filter is applied

### 8. Icon Visual Consistency Tests
**Test: Consistent icon sizing**
- [ ] Check all icons are 3x3 or 4x4 size (w-3 h-3)
- [ ] Verify no icons appear oversized or undersized
- [ ] Check icon spacing (gap-1 between icon and text)

**Test: Icon color matches badge background**
- [ ] Enterprise icons should match purple badge color
- [ ] Professional icons should match blue badge color
- [ ] Basic icons should match green badge color
- [ ] Free icons should match slate badge color
- [ ] Status icons should match their respective colors

### 9. Accessibility Tests
**Test: Badge buttons are accessible**
- [ ] Hover over badges to verify hover states
- [ ] Check title attributes appear on hover
- [ ] Verify badges are keyboard navigable
- [ ] Tab through page and verify badges can be focused

### 10. Edge Cases
**Test: Users with null/missing tier**
- [ ] Check users with no tier display "Free" with Users icon
- [ ] Verify filtering for Free tier works

**Test: Users with null/missing status**
- [ ] Check users with no status display "Inactive" with AlertCircle icon
- [ ] Verify proper badge coloring

**Test: Suspended users in grouped view**
- [ ] Group by status with suspended users
- [ ] Verify Suspended badge appears with Ban icon
- [ ] Click Suspended badge to filter

**Test: Empty results**
- [ ] Apply filters that return no results
- [ ] Verify "No users found" message displays
- [ ] Verify badges are still clickable in this state (if visible)

## Expected Behavior Summary

### Tier Icons
- Crown icon → Enterprise
- Briefcase icon → Professional
- Layers icon → Basic
- Users icon → Free

### Status Icons
- Zap icon → Active
- Clock icon → Trialing
- AlertCircle icon → Pending
- XCircle icon → Cancelled

### Filtering Rules
- All badges are clickable buttons in all views
- Clicking a badge sets the corresponding filter
- Page resets to 1 when filter is applied
- Filters are case-insensitive (API handles this)
- Multiple filters can be combined
- Grouping doesn't affect filtering behavior
- View mode switching maintains filters
