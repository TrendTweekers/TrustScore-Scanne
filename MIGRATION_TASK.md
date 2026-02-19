# Task: Complete TrustScore Scanner - Lovable Design Migration

## 🎯 Mission
Fix the broken TypeScript-to-JavaScript conversion and complete the migration of our Shopify app frontend to use Lovable's premium design.

## 📊 Context

### Current State
- **Backend:** Working perfectly on port 3001 ✅
- **Frontend:** Vite running on port 5173, but showing blank page ❌
- **Issue:** TypeScript syntax wasn't fully removed, causing runtime errors

### What We Have
1. `/backend` - Node.js/Express backend (DO NOT MODIFY)
2. `/frontend` - React frontend with broken Lovable components
3. `/trust-ace-main` or reference to https://github.com/TrendTweekers/trust-ace - Original Lovable design

### Current Errors (from browser console)
```
Uncaught ReferenceError: isBro is not defined
  at FixRecommendations.jsx:16
  
Uncaught ReferenceError: lsPro is not defined
  at FixRecommendations.jsx:18

Uncaught ReferenceError: score is not defined
  at ScoreBreakdown.jsx:127
```

These are caused by broken regex replacements that corrupted the TypeScript conversion.

## 🔧 Your Mission - Step by Step

### Step 1: Analyze Current Broken Components

Check these files for corruption:
- `frontend/components/FixRecommendations.jsx`
- `frontend/components/ScoreBreakdown.jsx`
- `frontend/components/AIAnalysis.jsx`
- `frontend/components/MonitoringCard.jsx`
- `frontend/components/DashboardHeader.jsx`
- `frontend/components/CompetitorView.jsx`

Look for:
- Incomplete variable names (like `isBro` should be `isPro`)
- Missing closing parentheses
- Broken ternary operators (`? x` missing `: y`)
- Variables referenced but never defined

### Step 2: Get Clean Source from Lovable

If you have access to the Lovable repo files, use them as reference.
Otherwise, reconstruct the components based on their purpose.

### Step 3: Convert TypeScript → JavaScript (Carefully!)

For each component, follow this exact process:

**A. Remove Interface Declarations**
```typescript
// REMOVE THIS:
interface ScoreHeroProps {
  score: number;
  maxScore: number;
  trend: number;
}

// Keep the component as-is
```

**B. Remove Type Annotations from Function Parameters**
```typescript
// CHANGE FROM:
const ScoreHero = ({ score, maxScore, trend }: ScoreHeroProps) => {

// CHANGE TO:
const ScoreHero = ({ score, maxScore, trend }) => {
```

**C. Remove Type Annotations from Variables**
```typescript
// CHANGE FROM:
const tabs: Tab[] = [...];

// CHANGE TO:
const tabs = [...];
```

**D. Remove Type Casts**
```typescript
// CHANGE FROM:
const data = [...] as CategoryComparison[];

// CHANGE TO:
const data = [...];
```

**E. Remove Return Type Annotations**
```typescript
// CHANGE FROM:
const formatDate = (date: string): string => {

// CHANGE TO:
const formatDate = (date) => {
```

### Step 4: Wire Components to Backend API

Our backend provides these endpoints:

#### GET `/api/dashboard`
Returns:
```json
{
  "shop": "store.myshopify.com",
  "plan": "FREE" | "PRO" | "PLUS",
  "currentScore": 29,
  "trend": 0,
  "history": [
    {
      "score": 29,
      "timestamp": "2024-02-19T10:30:00Z",
      "result": {
        "breakdown": [
          { "label": "Trust Badges", "points": 0, "maxPoints": 25, "passed": false },
          { "label": "SSL Security", "points": 20, "maxPoints": 20, "passed": true }
        ],
        "recommendations": [
          { "severity": "HIGH", "title": "Missing Trust Signals", "description": "..." }
        ],
        "aiAnalysis": "Your store is missing critical trust elements..."
      }
    }
  ],
  "scanCount": 5,
  "aiUsage": 1,
  "shopData": { /* full shop record */ }
}
```

#### POST `/api/scan`
Triggers new scan, returns similar structure to history item.

### Step 5: Fix Specific Component Issues

#### FixRecommendations.jsx
**Problem:** Variables `isBro` and `lsPro` are undefined (likely should be `isPro`)

**Expected structure:**
```javascript
const fixes = [
  {
    severity: "HIGH" | "MEDIUM" | "LOW",
    title: "Issue title",
    estimatedLift: "+3-7%",
    revenueImpact: "$75-$175/mo",
    fixTime: "15 mins",
    description: "How to fix...",
    actionLabel: "Button text",
    isPro: true | false
  }
];
```

**Fix:**
- Find where `isBro` or `lsPro` appear
- Replace with `isPro` or correct variable name
- Check ternary operators are complete: `condition ? valueIfTrue : valueIfFalse`

#### ScoreBreakdown.jsx
**Problem:** Variable `score` is undefined

**Expected props:**
```javascript
const ScoreBreakdown = ({ breakdown = [] }) => {
  // breakdown is an array of items with:
  // { label, points, maxPoints, passed }
}
```

**Fix:**
- Remove any reference to undefined `score` variable
- Use only the `breakdown` prop
- Provide default breakdown if none provided

#### Dashboard.jsx
**Problem:** May not be fetching API correctly

**Expected behavior:**
```javascript
useEffect(() => {
  fetch('/api/dashboard')
    .then(res => res.json())
    .then(data => {
      // Use data.currentScore, data.plan, data.history, etc.
      setDashboardData(data);
    });
}, []);
```

### Step 6: Verify Build

Run these commands to test:
```bash
npm run build
```

**Success criteria:**
- ✅ Build completes without TypeScript errors
- ✅ No "Expected )" or "Expected ;" errors
- ✅ dist/ folder is created
- ✅ No undefined variable references

### Step 7: Test Runtime (if possible)

If you can start the dev server:
```bash
npm run dev
```

Check:
- ✅ Frontend loads at http://localhost:5173
- ✅ No console errors about undefined variables
- ✅ Components render (even if showing loading/empty state)

## 📋 Component Reference Guide

### Priority Components (Fix These First)

1. **ScoreHero** - Main score display with animated donut chart
   - Props: `{ score, maxScore, lastScanTime, trend, plan, estimatedConversionLoss }`
   - No TypeScript issues reported yet ✅

2. **FixRecommendations** - List of fixes with collapsible details
   - Props: `{ recommendations }`
   - **BROKEN:** Has `isBro`/`lsPro` errors ❌

3. **ScoreBreakdown** - Breakdown of score components
   - Props: `{ breakdown }`
   - **BROKEN:** References undefined `score` ❌

4. **Dashboard** - Main container that fetches data
   - No props (fetches from API)
   - May need API wiring fixes

5. **DashboardHeader** - Header with tabs and scan button
   - Props: `{ activeTab, onTabChange, onRunScan, isScanning }`

6. **AIAnalysis** - AI-generated insights
   - Props: `{ plan, aiUsageCount, aiUsageLimit, analysis }`

7. **MonitoringCard** - Alert settings sidebar card
   - Props: `{ plan }`

### Supporting Components (Lower Priority)

8. **CredibilityCard** - Shows methodology
9. **RecentScans** - Recent scan history
10. **CompetitorView** - Competitor analysis page
11. **HelpFAQ** - Help section

## 🚫 What NOT to Touch

**DO NOT MODIFY:**
- Anything in `/backend` directory
- `package.json` dependencies (already correct)
- `tailwind.config.js` (already correct)
- `postcss.config.js` (already correct)
- `vite.config.js` (already correct)
- `frontend/styles/globals.css` (already correct)
- `frontend/lib/utils.js` (already correct)
- Any UI components in `frontend/components/ui/*` (already correct)

## ✅ Success Criteria

### Must Have (Critical)
- [ ] `npm run build` completes without errors
- [ ] No TypeScript syntax errors in any .jsx files
- [ ] No undefined variable errors in console
- [ ] All components export correctly
- [ ] Dashboard component fetches from `/api/dashboard`

### Nice to Have (If Time)
- [ ] Components render correctly with data
- [ ] Scan button triggers `/api/scan`
- [ ] Loading states work
- [ ] Empty states work

## 📝 Specific Files to Create/Fix

### Create if missing:
None - all files should exist

### Fix these existing files:
1. `frontend/components/FixRecommendations.jsx` - Fix isBro/lsPro
2. `frontend/components/ScoreBreakdown.jsx` - Fix undefined score
3. `frontend/components/Dashboard.jsx` - Verify API wiring
4. Any other component with TypeScript remnants

## 🔍 How to Verify Each Component

For each component, check:

```javascript
// ✅ GOOD - No TypeScript
const MyComponent = ({ prop1, prop2 }) => {
  const data = [1, 2, 3];
  return <div>...</div>;
};

// ❌ BAD - Has TypeScript
const MyComponent = ({ prop1, prop2 }: MyProps) => {
  const data: number[] = [1, 2, 3];
  return <div>...</div>;
};
```

## 💡 Debugging Tips

If you find a component is completely corrupted:
1. Look at the Lovable original
2. Copy the entire component
3. Manually remove TypeScript following Step 3 rules
4. Save as .jsx

Common corruption patterns from bad regex:
- `isBro` → should be `isPro`
- `lsPro` → should be `isPro` 
- `condition ? value )` → should be `condition ? value : other`
- Missing closing braces `}` or parentheses `)`

## 🎯 Final Checklist

Before marking complete:
- [ ] All .jsx files have no TypeScript syntax
- [ ] npm run build works
- [ ] No console errors about undefined variables
- [ ] Dashboard fetches from /api/dashboard
- [ ] Components export default properly
- [ ] Imports use correct paths (@/components/...)

## 📊 Estimated Token Usage

- Reading both codebases: ~50K tokens
- Analyzing errors: ~20K tokens  
- Fixing components: ~30K tokens
- Testing builds: ~10K tokens
- **Total: ~110K tokens** (~$4 cost)

## 🎉 Success Looks Like

User opens http://localhost:5173 and sees:
1. Teal/green header with "TrustScore Scanner"
2. Dashboard/Competitor/Help tabs
3. "Run Trust Audit" button
4. Either loading state, empty state, or score display
5. **NO console errors**
6. **NO blank white page**

---

**Good luck! Fix the broken TypeScript conversion and make this work!**
