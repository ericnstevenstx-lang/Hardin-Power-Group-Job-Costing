-- ============================================================
-- HPG ERP migration v2
-- Vendor backfill from PO history 2026-05-08
-- ============================================================
-- 
-- Source: 5 PO PDF archives, 253 POs parsed, 74 net-new vendors
-- Match: case-insensitive on wes_vendors.name
-- Action: upsert; if name exists, update vendor_type/primary_category/
--         address only if currently NULL (do not clobber existing edits)
-- Skipped: Ace Casters, KL Jack, Crouch Sales, Linde, Amazon
--          (these are in flight via Phase A)
-- 
-- Existing rows are preserved. New rows get:
--   active = true
--   notes  = 'imported from PO history 2026-05-08 | last PO: <date> | spend: $<amount>'
-- ============================================================

begin;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Community Recycling',
  'Community Recycling | 917 Avenue K | Plano, TX 75074',
  'scrap',
  'scrap (20/20 POs)',
  'imported from PO history 2026-05-08 | 20 POs | last PO: 04/28/2026 | total spend: $742,121.47',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'MSHOCK',
  'Michael Murphree | Chatanooga, TN 37419',
  'scrap',
  'scrap (3/4 POs)',
  'imported from PO history 2026-05-08 | 4 POs | last PO: 12/11/2025 | total spend: $502,138.83',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'NTT DATA Americas, Inc.',
  'NTT DATA Americas, Inc. | 7950 Legacy Drive | Plano, TX 75024',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/25/2026 | total spend: $425,000.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Generator Source',
  'Generator Source | 625 Baseline Road | Brighton, CO 80603',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/04/2025 | total spend: $254,950.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Lonestar Electrical and Demolition.',
  'Lonestar Electrical and Demolition. | 8666 Burdekin Rd. | Magnolia, TX 77351',
  'scrap',
  'scrap (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 03/06/2026 | total spend: $194,356.89',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'K&L CO Business Park LLC',
  'K&L CO Business Park LLC | 1330 Dowdy Ferry Road | Hutchins, TX 75141',
  'other',
  'mixed (0b/0s/0u)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 03/17/2026 | total spend: $125,000.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Greenville Transformer Co.',
  'Greenville Transformer Co. | PO BOX 845 | Greenville, TX 75403-0845',
  'brokered_components',
  'mixed broker+scrap (2b/1s)',
  'imported from PO history 2026-05-08 | 3 POs | last PO: 03/06/2026 | total spend: $109,117.45',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Morley Moss',
  'Morley Moss | 430 S Aston Dr | Sunnyvale, TX 75182',
  'scrap',
  'scrap (25/25 POs)',
  'imported from PO history 2026-05-08 | 25 POs | last PO: 12/23/2025 | total spend: $101,066.05',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Quality Switchgear',
  'Quality Switchgear | PO BOX 530 | Valley View, TX 76272',
  'scrap',
  'scrap (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/04/2025 | total spend: $95,216.91',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Entech Sales & Service, LLC.',
  'Entech Sales & Service, LLC. | 3404 Garden Brook Drive | Dallas, TX 75234',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 04/06/2026 | total spend: $94,400.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Parrish-Hare, Powerhouse, PHES',
  'Parrish-Hare, Powerhouse, PHES | P.O. Box 223564 | Dallas, TX 75222',
  'brokered_components',
  'mixed broker+scrap (17b/1s)',
  'imported from PO history 2026-05-08 | 28 POs | last PO: 12/30/2025 | total spend: $87,116.71',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Gold Auto Parts Recyclers',
  'Gold Auto Parts Recyclers | 3301 Botham Jean Blvd | Dallas, TX 75215',
  'service',
  'service/testing (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/16/2025 | total spend: $75,000.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'BCS Switchgear, INC',
  'BCS Switchgear, INC | 4790 US Hwy 377 South | Krugerville, TX 76227',
  'brokered_components',
  'brokered components (4/5 POs)',
  'imported from PO history 2026-05-08 | 5 POs | last PO: 04/01/2026 | total spend: $51,323.93',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Eric McAdoo',
  'Eric McAdoo | 14900 FM 17 | Canton, TX 75103',
  'scrap',
  'scrap (2/3 POs)',
  'imported from PO history 2026-05-08 | 3 POs | last PO: 12/01/2025 | total spend: $36,293.29',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Core Transformers.',
  'Core Transformers | 295 Jacobs Road | Seneca, SC 29678',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/01/2025 | total spend: $34,000.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Custard Core Supply',
  'Custard Core Supply | 3015 Hansboro Ave | Dallas, TX 75233 | United States',
  'scrap',
  'scrap (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 04/01/2026 | total spend: $33,479.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Electrical Now, LLC.',
  'Electrical Now, LLC. | P.O. Box 103677 | Pasadena, CA 91189',
  'brokered_components',
  'brokered components (4/4 POs)',
  'imported from PO history 2026-05-08 | 4 POs | last PO: 02/26/2026 | total spend: $32,690.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Cummings Electrical',
  'Cummings Electrical | 14900 Grand River Road, Suite 124 | Fort Worth, Texas 76155',
  'brokered_components',
  'mixed broker+scrap (2b/1s)',
  'imported from PO history 2026-05-08 | 3 POs | last PO: 11/13/2025 | total spend: $30,132.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Electrical Products and Control.',
  'Electrical Products and Control.',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/09/2026 | total spend: $29,148.16',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Angelo Mitchell',
  'Angelo Mitchell | 5141 Longview Ave | Dallas, TX 75227',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 12/09/2025 | total spend: $26,925.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'AIT Recycling',
  'AIT Recycling | 5141 Lawnview Ave Bldg | Suite A | Dallas, TX 75227',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 11/25/2025 | total spend: $20,000.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'FSG Dallas',
  'FSG Dallas',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 12/08/2025 | total spend: $17,750.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Breaker Broker Inc',
  'Breaker Broker Inc | 3101 W. Pioneer Parkway | Pantego, TX 76013',
  'brokered_components',
  'brokered components (14/14 POs)',
  'imported from PO history 2026-05-08 | 14 POs | last PO: 12/03/2025 | total spend: $16,221.70',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'AAA Fabrication LLC',
  'American Industrial Services Inc. | P.O. Box 637 | Waxahachie, TX 75168',
  'brokered_components',
  'brokered components (3/3 POs)',
  'imported from PO history 2026-05-08 | 3 POs | last PO: 03/05/2026 | total spend: $15,998.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'ARCA or Eastern Electrical',
  'ARCA or Eastern Electrical | 1130 Military Rd. | Buffalo, NY 14217',
  'brokered_components',
  'brokered components (9/9 POs)',
  'imported from PO history 2026-05-08 | 9 POs | last PO: 12/19/2025 | total spend: $14,518.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Eric. Turnipseed',
  'Eric. Turnipseed',
  'scrap',
  'scrap (3/3 POs)',
  'imported from PO history 2026-05-08 | 3 POs | last PO: 12/23/2025 | total spend: $14,170.95',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Silicon Valley Breaker & Control Inc.',
  'Silicon Valley Breaker & Control Inc. | 1502 Gladding Ct | Milpitas, CA 95035',
  'brokered_components',
  'brokered components (4/4 POs)',
  'imported from PO history 2026-05-08 | 4 POs | last PO: 04/07/2026 | total spend: $12,976.62',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Arkansas Electrical Outlet, LLC.',
  'Arkansas Electrical Outlet, LLC. | PO BOX 735907 | Dallas, TX 75373-5907',
  'brokered_components',
  'brokered components (4/4 POs)',
  'imported from PO history 2026-05-08 | 4 POs | last PO: 04/02/2026 | total spend: $12,801.30',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Cole Power Consulting Group LLC',
  'Cole Power Consulting Group | 1537 Owen Way | Waxahachie, TX 75165',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/09/2025 | total spend: $12,700.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Electric South-AL',
  'Electric South-AL | 17175 John Glenn Avenue | Robertsdale, AL 36567',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 11/20/2025 | total spend: $12,000.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Volunteer Equipment & Supply, Inc',
  'Volunteer Equipment & Supply, Inc | PO BOX 52505 | Knoxville, TN 37950',
  'brokered_components',
  'brokered components (5/5 POs)',
  'imported from PO history 2026-05-08 | 5 POs | last PO: 12/22/2025 | total spend: $8,803.75',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Electric Motor Supply Co- Emsco',
  'Electric Motor Supply Co- Emsco | 4650 Main Street N.E. | Fridley, MN 55421',
  'brokered_components',
  'brokered components (3/3 POs)',
  'imported from PO history 2026-05-08 | 3 POs | last PO: 04/02/2026 | total spend: $8,250.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Copper Asset Recovery',
  'Copper Asset Recovery',
  'scrap',
  'scrap (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/15/2025 | total spend: $8,000.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Fuseco',
  'Fuseco | PO BOX 224814 | DALLAS, TX 75222-4814',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 12/12/2025 | total spend: $7,783.15',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'JMEG Electrical Contractors',
  'JMEG Electrical Contractors | 13995 Diplomat Dr. #400 | Farmers Branch, Tx. 75234',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/23/2026 | total spend: $7,500.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Prestige Pools',
  'Eugene Lochman | 15550 Preston Rd | Frisco, TX 75033',
  'scrap',
  'scrap (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/16/2025 | total spend: $7,057.75',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Diversified Electrical Solutions',
  'Diversified Electrical Solutions | 2515 Willowbrook Dr | Suite 111 | Dallas, TX 75220',
  'scrap',
  'scrap (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 12/04/2025 | total spend: $7,021.74',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'ACIS Inc',
  'ACIS Inc | P. O. Box 3274 | McKinney, TX 75070',
  'scrap',
  'scrap (8/8 POs)',
  'imported from PO history 2026-05-08 | 8 POs | last PO: 12/11/2025 | total spend: $6,642.75',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Jose Rodriguez Garcia',
  'Jose De Jesus Rodriguez Garcia | 11200 McKinley Dr. | Venus, TX 76084',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/13/2026 | total spend: $6,500.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Hunt Electric Corporation',
  'Hunt Electric Corporation | Attn: Andy Leuer | 1000 Blue Gentian Rd. | Suite 300 | Eagan, MN 55121',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/04/2026 | total spend: $5,700.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Rafael Moreno, Jr',
  'Rafael Moreno, Jr',
  'scrap',
  'scrap (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/22/2025 | total spend: $5,274.06',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'J & S Circuit Breakers Inc.',
  'J & S Circuit Breakers Inc. | 6024 E. Olympic Blvd | Los Angeles, CA 90022',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/09/2026 | total spend: $5,025.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'M&J Electrical Supply , Inc.',
  'M&J Electrical Supply , Inc. | 7217 Stuebner Airline Rd. | Houston, TX 77091',
  'brokered_components',
  'brokered components (7/7 POs)',
  'imported from PO history 2026-05-08 | 7 POs | last PO: 11/12/2025 | total spend: $4,672.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Lanco Contacts LLC',
  'Lanco Contacts LLC | P.O. Box 520 | Argyle, TX 76226',
  'brokered_components',
  'brokered components (7/7 POs)',
  'imported from PO history 2026-05-08 | 7 POs | last PO: 04/30/2026 | total spend: $4,094.19',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'United Salvage Associates',
  'United Salvage Associates | 3332 Towerwood Dr | Dallas, TX 75234',
  'scrap',
  'scrap (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 12/15/2025 | total spend: $4,089.02',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Breakers Unlimited, Inc.',
  'Breakers Unlimited, Inc. | 15210 North Pointe Blvd. | Noblesville, IN 46060',
  'brokered_components',
  'brokered components (5/5 POs)',
  'imported from PO history 2026-05-08 | 5 POs | last PO: 04/30/2026 | total spend: $3,611.80',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'HC Beck',
  'HC Beck | 3210 TX-360 | Grapevine, TX 76051, TX 76051',
  'scrap',
  'scrap (3/3 POs)',
  'imported from PO history 2026-05-08 | 3 POs | last PO: 12/23/2025 | total spend: $3,212.60',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'J & P Electrical Company LLC',
  'J&P Electrical Company | J&P Electrical Company | 17157 E 10 Mile Rd. | Eastpointe, MI 48021',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 02/05/2026 | total spend: $3,150.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Sparkstone Electrical Group LLC',
  'Sparkstone Electrical Group LLC | 133 N Swift Rd. | Addison, IL 60101',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 11/17/2025 | total spend: $3,126.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Amber Electric',
  'Amber Electric | 2251 Century Center Blvd. | Irving, TX 75062',
  'scrap',
  'scrap (4/4 POs)',
  'imported from PO history 2026-05-08 | 4 POs | last PO: 12/30/2025 | total spend: $3,103.16',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Caleb Palmer.',
  'Caleb Palmer.',
  'other',
  'mixed (0b/0s/0u)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/03/2026 | total spend: $2,800.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Electrical Service Products',
  'Wayne Burley | Electrical Service Products | 110 N. Greene St. | Spokane, WA 99202 US',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 04/22/2026 | total spend: $2,500.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Advanced Electrical & Motor Controls Inc.',
  'Advanced Electrical & Motor Controls Inc. | P.O Box 735831 | Dallas, TX 75373',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 02/26/2026 | total spend: $2,400.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'BD Electrical.',
  'BD Electrical. | 1684 Hydraulic Drive | Howell, MI 48855',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 01/14/2026 | total spend: $2,218.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Artie Jones',
  'Artie Jones',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 12/08/2025 | total spend: $2,000.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Midwest Electrical Testing',
  'Midwest Electrical Testing | N93 W16170 Megal Drive | Menomonee Falls, WI 53051',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 04/28/2026 | total spend: $1,615.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Hargrove Electric Co, Inc..',
  'Hargrove Electric Co, Inc.. | 1522 Market Center Blvd. | Dallas, TX 75207',
  'scrap',
  'scrap (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 01/23/2026 | total spend: $1,604.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Moore Electrical Control',
  'Moore Electrical Control | 3732 Cerriots Ave | Ste. D | Los Alamitos, CA 90720',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 04/20/2026 | total spend: $1,485.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Rexel USA, Inc.',
  'Rexel USA, Inc. | 5429 LBJ Fwy #600 | Dallas, Texas 75240',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 04/20/2026 | total spend: $1,405.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Mark Davis',
  'Mark Davis | 1729 Camara Ct | Grand Prairie, TX 75051',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 11/20/2025 | total spend: $1,250.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Graphic Movers',
  'Graphic Movers | 1600 I-45 | Hutchins, TX 75141',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/23/2026 | total spend: $1,200.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Lectric Connection',
  'Lectric Connection | 79 Elm St | Amesbury, MA 01913',
  'brokered_components',
  'brokered components (3/3 POs)',
  'imported from PO history 2026-05-08 | 3 POs | last PO: 12/29/2025 | total spend: $1,190.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'JRL Electrical Supply Inc.',
  'JRL Electric Supply Inc. | 29170 Avenue Penn Units D & E | Valencia, CA 91355',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 03/06/2026 | total spend: $1,170.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Western Enterprises Supply Inc.',
  'Western Enterprises | 2965 Durahart | Riverside, CA 92507',
  'brokered_components',
  'brokered components (4/4 POs)',
  'imported from PO history 2026-05-08 | 4 POs | last PO: 12/30/2025 | total spend: $897.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Circuit Breaker Sales, Inc.',
  'Circuit Breaker Sales, Inc. | P.O. Box 735828 | Dallas, TX 75373 USA',
  'service',
  'service/testing (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 01/30/2026 | total spend: $750.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Preferred Mechanical Group, LLC (PMG)',
  'Brandon Smith | SCRAP vendor | 1551 N. Glenville Dr | Richardson, TX 75081',
  'scrap',
  'scrap (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 12/04/2025 | total spend: $749.33',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Simply Breakers.',
  'Simply Breakers. | 4220 Hyde Park Blvd. | Suite# 24720 | Niagara Falls, NY 14305',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 12/05/2025 | total spend: $590.50',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Colony Hardware',
  'Colony Hardware',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 03/05/2026 | total spend: $484.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'M.V.J CIRCUIT BREAKERS INC',
  'M.V.J CIRCUIT BREAKERS INC | 1147 W. Collins Ave | ORANGE, CA 92867',
  'brokered_components',
  'brokered components (2/2 POs)',
  'imported from PO history 2026-05-08 | 2 POs | last PO: 12/18/2025 | total spend: $400.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Electrical Surplus, Inc.',
  'Electrical Surplus, Inc. | 300 North Virginia Ave. | Oklahoma City, OK 73106',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 02/04/2026 | total spend: $388.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'American West Surplus.',
  'American West Surplus. | 1851 E 68th Ave | Denver, CO 80229',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 04/14/2026 | total spend: $300.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'The Motor Control Center...',
  'The Motor Control Center | 4019 Windgap Ave | Pittsburgh PA, 15204',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 03/20/2026 | total spend: $240.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Upstate Breaker Wholesale',
  'Upstate Breaker Wholesale | 1 Technology Place | Caledonia, NY 14423',
  'brokered_components',
  'brokered components (4/4 POs)',
  'imported from PO history 2026-05-08 | 4 POs | last PO: 12/10/2025 | total spend: $235.00',
  true
)
on conflict do nothing;

insert into public.wes_vendors (
  name, address, vendor_type, primary_category, notes, active
) values (
  'Many Circuit Breakers',
  'Many Circuit Breakers | 7904 Ronson Road, Ste. A | San Diego, CA 92111',
  'brokered_components',
  'brokered components (1/1 POs)',
  'imported from PO history 2026-05-08 | 1 POs | last PO: 04/03/2026 | total spend: $200.00',
  true
)
on conflict do nothing;


-- ------------------------------------------------------------
-- Backfill vendor_type/primary_category on existing rows that
-- match a PO history vendor by name (case-insensitive) but
-- currently have NULL vendor_type.
-- ------------------------------------------------------------

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (20/20 POs)')
 where lower(name) = lower('Community Recycling')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (3/4 POs)')
 where lower(name) = lower('MSHOCK')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('NTT DATA Americas, Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Generator Source')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (2/2 POs)')
 where lower(name) = lower('Lonestar Electrical and Demolition.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'other'),
       primary_category = coalesce(primary_category, 'mixed (0b/0s/0u)')
 where lower(name) = lower('K&L CO Business Park LLC')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'mixed broker+scrap (2b/1s)')
 where lower(name) = lower('Greenville Transformer Co.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (25/25 POs)')
 where lower(name) = lower('Morley Moss')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (1/1 POs)')
 where lower(name) = lower('Quality Switchgear')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('Entech Sales & Service, LLC.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'mixed broker+scrap (17b/1s)')
 where lower(name) = lower('Parrish-Hare, Powerhouse, PHES')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'service'),
       primary_category = coalesce(primary_category, 'service/testing (1/1 POs)')
 where lower(name) = lower('Gold Auto Parts Recyclers')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (4/5 POs)')
 where lower(name) = lower('BCS Switchgear, INC')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (2/3 POs)')
 where lower(name) = lower('Eric McAdoo')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Core Transformers.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (2/2 POs)')
 where lower(name) = lower('Custard Core Supply')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (4/4 POs)')
 where lower(name) = lower('Electrical Now, LLC.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'mixed broker+scrap (2b/1s)')
 where lower(name) = lower('Cummings Electrical')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Electrical Products and Control.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('Angelo Mitchell')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('AIT Recycling')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('FSG Dallas')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (14/14 POs)')
 where lower(name) = lower('Breaker Broker Inc')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (3/3 POs)')
 where lower(name) = lower('AAA Fabrication LLC')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (9/9 POs)')
 where lower(name) = lower('ARCA or Eastern Electrical')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (3/3 POs)')
 where lower(name) = lower('Eric. Turnipseed')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (4/4 POs)')
 where lower(name) = lower('Silicon Valley Breaker & Control Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (4/4 POs)')
 where lower(name) = lower('Arkansas Electrical Outlet, LLC.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Cole Power Consulting Group LLC')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Electric South-AL')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (5/5 POs)')
 where lower(name) = lower('Volunteer Equipment & Supply, Inc')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (3/3 POs)')
 where lower(name) = lower('Electric Motor Supply Co- Emsco')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (1/1 POs)')
 where lower(name) = lower('Copper Asset Recovery')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('Fuseco')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('JMEG Electrical Contractors')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (1/1 POs)')
 where lower(name) = lower('Prestige Pools')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (2/2 POs)')
 where lower(name) = lower('Diversified Electrical Solutions')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (8/8 POs)')
 where lower(name) = lower('ACIS Inc')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Jose Rodriguez Garcia')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Hunt Electric Corporation')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (1/1 POs)')
 where lower(name) = lower('Rafael Moreno, Jr')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('J & S Circuit Breakers Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (7/7 POs)')
 where lower(name) = lower('M&J Electrical Supply , Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (7/7 POs)')
 where lower(name) = lower('Lanco Contacts LLC')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (2/2 POs)')
 where lower(name) = lower('United Salvage Associates')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (5/5 POs)')
 where lower(name) = lower('Breakers Unlimited, Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (3/3 POs)')
 where lower(name) = lower('HC Beck')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('J & P Electrical Company LLC')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('Sparkstone Electrical Group LLC')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (4/4 POs)')
 where lower(name) = lower('Amber Electric')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'other'),
       primary_category = coalesce(primary_category, 'mixed (0b/0s/0u)')
 where lower(name) = lower('Caleb Palmer.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Electrical Service Products')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('Advanced Electrical & Motor Controls Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('BD Electrical.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Artie Jones')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('Midwest Electrical Testing')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (1/1 POs)')
 where lower(name) = lower('Hargrove Electric Co, Inc..')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('Moore Electrical Control')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Rexel USA, Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Mark Davis')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Graphic Movers')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (3/3 POs)')
 where lower(name) = lower('Lectric Connection')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('JRL Electrical Supply Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (4/4 POs)')
 where lower(name) = lower('Western Enterprises Supply Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'service'),
       primary_category = coalesce(primary_category, 'service/testing (1/1 POs)')
 where lower(name) = lower('Circuit Breaker Sales, Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'scrap'),
       primary_category = coalesce(primary_category, 'scrap (2/2 POs)')
 where lower(name) = lower('Preferred Mechanical Group, LLC (PMG)')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('Simply Breakers.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Colony Hardware')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (2/2 POs)')
 where lower(name) = lower('M.V.J CIRCUIT BREAKERS INC')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Electrical Surplus, Inc.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('American West Surplus.')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('The Motor Control Center...')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (4/4 POs)')
 where lower(name) = lower('Upstate Breaker Wholesale')
   and (vendor_type is null or primary_category is null);

update public.wes_vendors
   set vendor_type      = coalesce(vendor_type,      'brokered_components'),
       primary_category = coalesce(primary_category, 'brokered components (1/1 POs)')
 where lower(name) = lower('Many Circuit Breakers')
   and (vendor_type is null or primary_category is null);


commit;

-- ------------------------------------------------------------
-- Verification query
-- ------------------------------------------------------------
-- select vendor_type, count(*) from public.wes_vendors group by vendor_type order by 2 desc;
