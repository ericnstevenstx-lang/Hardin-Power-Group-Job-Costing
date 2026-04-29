const SYSTEM_PROMPT = `You are a fabrication BOM extraction engine for Hardin Power Group, Dallas TX.
You will be shown a technical drawing of a Spider Box Rack, Charging Station Frame, Temp Power Skid Frame, or A-Frame Panel Mount.

Extract ALL dimensional data and return ONLY valid JSON in this exact structure:
{
  "product_type": "spider-box" | "charging-station" | "temp-skid" | "a-frame",
  "confidence": 0.0-1.0,
  "dimensions": {
    "description": "brief summary of what you read",
    "members": [
      {"description": "e.g. 2x2 SQ tube uprights", "qty": 2, "length_inches": 106, "unit": "each"}
    ],
    "notes": ["any flagged ambiguities or missing dims"]
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

TUBE STOCK OPTIONS — always read the drawing and select the correct size:
- 1-1/4" x 1-1/4" SQ tube: $2.50/ft (A-Frame small skids, spider box variants)
- 1-1/2" x 1-1/2" SQ tube: $3.00/ft (spider box frames, smaller A-frames)
- 2" x 2" SQ tube: $4.00/ft (charging station, temp skid, large A-frame panel mounts)
If the drawing does not specify tube size, flag it in warnings and use the product default below.

MATERIAL RATES (use exactly):
- Rec Tube 6x3 11GA: $9.32/ft (fork pockets/rails)
- Caster 6"x2" Poly Swivel w/Brake: $45.51/ea
- Caster 6"x2" Poly Rigid: $29.99/ea
- Powder Coat Polyester TGIC Gloss: $18.00/lb
- Consumables MIG wire gas grinder: $5.00/hr
- Plasma Consumables Tips electrodes gas: $8.00/hr
- 10GA 4x8 HR sheet: $75.00/cwt (180 lbs per sheet)
- 16GA 5x10 sheet: $95.00/pc
- Flat Plate 1/4" 4x8: $98.00/cwt
- Angle 2x2x1/8: $90.00/cwt

PRODUCT DEFAULTS (use only if dims are missing from drawing):
SPIDER BOX: 23ft 1.5" tube, 2 swivel casters, 2 rigid casters, 6 rings $1.20ea, 0.5lb powder coat, 5hr labor, 0.25hr plasma rails.
CHARGING STATION: 120"x2 + 116"x1 + 80"x5 + 56"x3 + 54"x1 + 44"x3 + 23"x2 + 21"x4 + 20"x2 (all 2"x2"), 4 swivel, 4 rigid casters, 0.5lb powder coat, 12hr labor.
TEMP SKID FRAME: variable size, 2"x2" for all members, 6x3 rec tube fork pockets, 4 swivel, 4 rigid casters, 0.5lb powder coat, 12hr labor.
A-FRAME PANEL MOUNT: extract all dims from drawing. Default tube: 1-1/4"x1-1/4" for small skids (HOM series), 2"x2" for large panel mounts. Include fork rails if shown (6"x3" rec tube). Include lifting eyes if shown (hardware, note separately). Labor default: 6hr small skid, 10hr large panel mount. Powder coat: 0.3-0.5lb depending on size.

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
