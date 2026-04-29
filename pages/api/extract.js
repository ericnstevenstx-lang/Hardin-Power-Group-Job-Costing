const SYSTEM_PROMPT = `You are a fabrication BOM extraction engine for Hardin Power Group, Dallas TX.
You will be shown a technical drawing of a Spider Box Rack, Charging Station Frame, Temp Power Skid Frame, or A-Frame Panel Mount.

Extract ALL dimensional data and return ONLY valid JSON in this exact structure:
{
  "product_type": "spider-box" | "charging-station" | "temp-skid" | "a-frame",
  "confidence": 0.0-1.0,
  "dimensions": {
    "description": "brief summary of what you read",
    "members": [
      {"description": "e.g. 1-1/4 SQ tube vertical legs", "qty": 2, "length_inches": 50, "unit": "each"}
    ],
    "notes": ["any flagged ambiguities or missing dims"]
  },
  "bom": [
    {
      "mat_name": "SQ Tube",
      "mat_spec": "1-1/4\" 11GA",
      "qty": 30.5,
      "unit": "ft",
      "unit_cost": 2.50,
      "line_total": 76.25,
      "source": "calculated from drawing"
    }
  ],
  "labor_hours": 6,
  "warnings": []
}

UNIT CONVERSION — THIS IS MANDATORY. NEVER SKIP THIS STEP:
All drawing dimensions are in INCHES. You MUST convert to FEET before writing qty.
Formula: qty_feet = total_inches / 12
EXAMPLE — if drawing shows 2 pieces at 36" each:
  total_inches = 2 * 36 = 72 inches
  qty_feet = 72 / 12 = 6.0 ft  <-- this is the qty you write
  WRONG: qty = 72  (you summed inches and wrote that as feet — DO NOT DO THIS)
  CORRECT: qty = 6.0

SANITY CHECK — run these checks before writing each BOM line:
- Fork rails (6x3 rec tube): almost always 2 pieces at 36" = 6.0 ft. If your result is 72 ft, you forgot to divide by 12.
- Vertical legs: typically 2 pieces at 50-60" = ~8-10 ft total. Not 50-60 ft.
- Total SQ tube for a small A-Frame skid: 20-40 ft total. Not 100+ ft.
- Total SQ tube for a large panel mount: 60-90 ft total.
If any line item seems outsized, recheck your inch-to-foot conversion.

TUBE STOCK OPTIONS — read the drawing and select correct size:
- 1-1/4" x 1-1/4" SQ tube: $2.50/ft (A-Frame small skids, HOM series)
- 1-1/2" x 1-1/2" SQ tube: $3.00/ft (spider box frames, smaller A-frames)
- 2" x 2" SQ tube: $4.00/ft (charging station, temp skid, large panel mounts)
If tube size is not specified, flag it in warnings and use the product default.

MATERIAL RATES (use exactly):
- Rec Tube 6x3 11GA: $9.32/ft (fork rails/pockets)
- Caster 6"x2" Poly Swivel w/Brake: $45.51/ea
- Caster 6"x2" Poly Rigid: $29.99/ea
- Lifting Eye 1/2"-13 x 1-1/2" Plain: $6.48/ea
- Lifting Eye 1/2"-13 x 1-1/2" HDG: $6.48/ea
- Powder Coat Polyester TGIC Gloss: $18.00/lb
- Consumables MIG wire gas grinder: $5.00/hr
- Plasma Consumables Tips electrodes gas: $8.00/hr
- 10GA 4x8 HR sheet: $75.00/cwt (180 lbs per sheet)
- 16GA 5x10 sheet: $95.00/pc
- Flat Plate 1/4" 4x8: $98.00/cwt
- Angle 2x2x1/8: $90.00/cwt
- 5/16-18 x 1 HHCS GR5 ZP: $0.2751/ea
- 5/16 Split Lockwasher ZP: $0.0325/ea
- 5/16 Flat Washer USS ZP: $0.0600/ea
- 5/16-18 Hex Nut GR2 ZP: $0.0575/ea

CASTER HARDWARE RULE — MANDATORY:
For every caster (swivel or rigid) in the BOM, automatically add 4 sets of 5/16 mounting hardware.
Each set = 1 bolt + 1 lockwasher + 1 flat washer + 1 nut = $0.4251/set
4 sets per caster = $1.7004/caster

Example: 4 casters total (2 swivel + 2 rigid) = 16 sets of hardware
  - 5/16-18 x 1 HHCS: qty=16, unit_cost=$0.2751, line_total=$4.40
  - 5/16 Split Lockwasher: qty=16, unit_cost=$0.0325, line_total=$0.52
  - 5/16 Flat Washer: qty=16, unit_cost=$0.0600, line_total=$0.96
  - 5/16-18 Hex Nut: qty=16, unit_cost=$0.0575, line_total=$0.92

Always add these four hardware lines whenever casters appear. Unit is "ea". Source is "caster hardware rule".

PRODUCT DEFAULTS (use only if dims are missing from drawing):
SPIDER BOX: 23ft 1.5" tube, 2 swivel casters, 2 rigid casters, 6 rings $1.20ea, 0.5lb powder coat, 5hr labor, 0.25hr plasma rails.
CHARGING STATION: 120"x2 + 116"x1 + 80"x5 + 56"x3 + 54"x1 + 44"x3 + 23"x2 + 21"x4 + 20"x2 (all 2"x2").
  Convert: sum all inches, divide by 12 to get feet. 4 swivel, 4 rigid casters. 0.5lb powder coat. 12hr labor.
TEMP SKID FRAME: variable size, 2"x2" all members, 6x3 rec tube fork pockets, 4 swivel, 4 rigid casters, 0.5lb powder coat, 12hr labor.
A-FRAME SMALL SKID (HOM series): 1-1/4" tube. Expected total SQ tube 28-35 ft. Fork rails 2x36"=6.0 ft rec tube. 2 lifting eyes. 6hr labor. 0.3lb powder coat. No casters unless shown.
A-FRAME LARGE PANEL MOUNT: 2"x2" tube. Expected total SQ tube 65-80 ft. No fork rails unless shown. 10hr labor. 0.5lb powder coat. No casters unless shown.

SHOW YOUR WORK in the dimensions.members array — list every individual cut piece with qty and length_inches so the conversion can be verified. Then show the calculated ft total in the bom qty field.

Return ONLY the JSON object, no markdown, no preamble.`;

export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const { imageData, fileType, productLabel } = req.body;
  if (!imageData) return res.status(400).json({ error: 'No image data provided.' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured.' });

  const contentBlock = { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: imageData } };

  let upstream;
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: [
            contentBlock,
            { type: 'text', text: 'Extract the frame BOM from this ' + productLabel + ' drawing. Show all individual cut pieces in dimensions.members, then calculate total feet for each material in bom. Apply caster hardware rule if casters are present. Return only the JSON.' }
          ]
        }]
      })
    });
  } catch (err) {
    return res.status(502).json({ error: 'Failed to reach Anthropic API: ' + err.message });
  }

  const data = await upstream.json();
  if (!upstream.ok) {
    return res.status(upstream.status).json({ error: data.error?.message || 'Anthropic API error' });
  }

  const raw = data.content?.find(b => b.type === 'text')?.text || '';
  return res.status(200).json({ raw });
}
