const SYSTEM_PROMPT = `You are a fabrication BOM extraction engine for Hardin Power Group, Dallas TX.
You will be shown a hand-drawn or printed technical drawing of a Spider Box Rack, Charging Station Frame, or Temp Power Skid Frame.

Extract ALL dimensional data and return ONLY valid JSON in this exact structure:
{
  "product_type": "spider-box" | "charging-station" | "temp-skid",
  "confidence": 0.0-1.0,
  "dimensions": {
    "description": "brief summary of what you read",
    "members": [
      {"description": "e.g. 2x2 11GA SQ tube main rails", "qty": 2, "length_inches": 120, "unit": "each"}
    ],
    "notes": ["any flagged ambiguities or re-draw notes"]
  },
  "bom": [
    {
      "mat_name": "SQ Tube",
      "mat_spec": "2\" 11GA",
      "qty": 23.5,
      "unit": "ft",
      "unit_cost": 4.00,
      "line_total": 94.00,
      "source": "calculated from drawing"
    }
  ],
  "labor_hours": 12,
  "warnings": []
}

MATERIAL RATES (use exactly):
- SQ Tube 1-1/2" 11GA: $3.00/ft -- spider box frame only
- SQ Tube 2" 11GA: $4.00/ft -- charging station and temp skid frames
- Rec Tube 6x3 11GA: $9.32/ft -- fork pockets
- Caster 6"x2" Poly Swivel w/Brake: $45.51/ea
- Caster 6"x2" Poly Rigid: $29.99/ea
- Powder Coat Polyester TGIC Gloss: $18.00/lb
- Consumables MIG wire gas grinder: $5.00/hr
- Plasma Consumables Tips electrodes gas: $8.00/hr
- 10GA 4x8 HR sheet: $75.00/cwt (180 lbs per sheet)
- 16GA 5x10 sheet: $95.00/pc
- Flat Plate 1/4" 4x8: $98.00/cwt
- Angle 2x2x1/8: $90.00/cwt

SPIDER BOX defaults (use if dims unclear): 23ft 1.5" tube, 2 swivel casters, 2 rigid casters, 6 rings $1.20ea, 0.5lb powder coat, 5hr labor, 0.25hr plasma rails.
CHARGING STATION defaults: 120"x2 + 116"x1 + 80"x5 + 56"x3 + 54"x1 + 44"x3 + 23"x2 + 21"x4 + 20"x2 (all 2"x2" 11GA), 4 swivel, 4 rigid casters, 0.5lb powder coat, 12hr labor.
TEMP SKID FRAME defaults: variable size, 2"x2" 11GA for all members, 6x3 rec tube for fork pockets, 4 swivel casters, 4 rigid casters, 0.5lb powder coat, 12hr labor. Extract actual footage from drawing if visible.

Convert all inch measurements to decimal feet for qty. Return ONLY the JSON object, no markdown, no preamble.`;

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
            { type: 'text', text: 'Extract the frame BOM from this ' + productLabel + ' drawing. Return only the JSON.' }
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
