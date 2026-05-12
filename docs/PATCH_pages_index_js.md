# Patch: pages/index.js (Hardin-Power-Group-Job-Costing repo)

Two surgical edits. Do NOT replace the file.

## Edit 1 - Import the picker

Add at the top of `pages/index.js`:

```js
import ComponentPicker from '../components/ComponentPicker';
```

## Edit 2 - Add picker to Section 3

Around line 481 in `pages/index.js` (Section 3 "Electrical components & misc"),
add the picker after the descriptive text:

```jsx
<div className="section-label">3. Electrical components &amp; misc</div>
<div style={{ marginBottom: 10 }}>
  Add transformer, panels, disconnects, and any other components priced
  separately from the frame.
</div>

<ComponentPicker
  onAdd={(c) => setComponents(prev => [...prev, c])}
  allowFreeText={true}
/>

{/* leave existing components list/display below */}
```

You can keep the original free-text inputs in place, or remove them since
the picker has a built-in "Free-text item" toggle.

## Edit 3 - Persist new columns in createJob

Around line 308 in `createJob`, change:

```js
const compRows = components.map(c => ({
  job_id: job.id,
  description: c.description,
  qty: c.qty,
  unit_cost: c.unit_cost
}));
```

to:

```js
const compRows = components.map(c => ({
  job_id: job.id,
  description: c.description,
  qty: c.qty,
  unit_cost: c.unit_cost,
  part_catalog_id: c.part_catalog_id || null,
  condition_code:  c.condition_code  || null,
  grade:           c.grade           || null,
}));
```

Free-text picks emit `null` for all three new fields, so old behavior
is preserved.
