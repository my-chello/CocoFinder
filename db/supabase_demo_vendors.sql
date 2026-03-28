-- CocoFinder demo vendors for Supabase discovery
-- Run this after supabase_all_in_one.sql or after creating the demo_vendor_* tables.

insert into public.demo_vendor_profiles (
    id, owner_name, business_name, logo_symbol, category, country, phone, opening_hours, about,
    is_live, live_latitude, live_longitude, live_updated_at, rating, price_hint, next_area, tags, updated_at
)
values
    (
        'vendor-roast-route', 'Mila Roast', 'Roast Route', '☕', 'Coffee Cart', 'Netherlands',
        '+31 20 555 1010', 'Mon-Fri · 07:00-14:00',
        'Small-batch espresso and warm pastries served from a bright yellow cart near busy office blocks.',
        false, 52.3759, 5.2195, now() - interval '2 minute', 4.9, 'EUR 3-8', 'Almere Centrum',
        array['Latte','Croissant','Morning Rush','Almere Centrum'],
        now()
    ),
    (
        'vendor-north-market', 'Jonas Market', 'North Market Van', '🥕', 'Fresh Produce', 'Netherlands',
        '+31 20 555 2020', 'Tue-Sat · 09:00-17:00',
        'Seasonal fruit, vegetables, and pantry staples with route updates for neighborhood square stops.',
        true, 52.3744, 5.2242, now() - interval '5 minute', 4.7, 'EUR 2-16', 'Marktmeesterstraat, Almere',
        array['Local','Organic','Daily Route','Market'],
        now()
    ),
    (
        'vendor-cocero', 'Maya Cocero', 'Cocero', '🥥', 'Coconut', 'Netherlands',
        '+31 20 555 6060', 'Daily · 10:00-18:00',
        'Fresh chilled coconut water and tropical fruit cups served from a bright mobile stand near the park.',
        true, 52.3714, 5.2181, now() - interval '1 minute', 4.9, 'EUR 4-8', 'Muzenpark, Almere',
        array['Coconut Water','Fresh Fruit','Tropical'],
        now()
    ),
    (
        'vendor-sweet-wheel', 'Nina Sweet', 'Sweet Wheel', '🍨', 'Dessert Van', 'Netherlands',
        '+31 20 555 5050', 'Daily · 11:00-21:00',
        'Fresh stroopwafels, mini pancakes, and soft-serve specials from a small dessert van parked nearby.',
        false, 52.3699, 5.2158, now() - interval '2 minute', 4.9, 'EUR 4-9', 'Esplanade, Almere',
        array['Stroopwafel','Mini Pancakes','Dessert','Almere'],
        now()
    ),
    (
        'vendor-truck-i-pan-almere', 'Ravi Pan', 'Truck I Pan Almere', '🍖', 'BBQ Truck', 'Netherlands',
        '+31 36 555 7070', 'Thu-Sun · 12:00-21:00',
        'Smoky BBQ sandwiches, grilled ribs, and loaded street plates served hot from a black food truck in Almere.',
        true, 52.36788, 5.19047, now() - interval '3 minute', 4.8, 'EUR 7-16', 'Michael Jacksonplein 1, 1323 PZ Almere',
        array['BBQ','Ribs','Street Food'],
        now()
    ),
    (
        'vendor-stroopwafel-kar', 'Sanne Wafel', 'De Stroopwafel Kar', '🧇', 'Dutch Snacks', 'Netherlands',
        '+31 36 555 8080', 'Daily · 11:00-19:00',
        'Fresh Dutch stroopwafels baked on the spot from a cozy cart near Almere Centrum.',
        true, 52.3753, 5.2199, now() - interval '1 minute', 4.9, 'EUR 3-7', 'Almere Centrum',
        array['Dutch Snacks','Stroopwafel','Sweet'],
        now()
    ),
    (
        'vendor-friet-van-pansen', 'Piet Pansen', 'Friet van Pansen', '🍟', 'Dutch Snacks', 'Netherlands',
        '+31 36 555 8181', 'Wed-Sun · 12:00-21:00',
        'Artisan Dutch fries with bold sauces and crunchy toppings served fresh in Almere Stad.',
        true, 52.3732, 5.2218, now() - interval '2 minute', 4.8, 'EUR 4-10', 'Almere Stad',
        array['Dutch Snacks','Fries','Street Food'],
        now()
    ),
    (
        'vendor-haring-henk', 'Henk Visser', 'Haring Henk', '🐟', 'Dutch Snacks', 'Netherlands',
        '+31 36 555 8282', 'Tue-Sat · 10:00-18:00',
        'Traditional herring cart with onions, pickles, and Dutch seafood classics near the Weerwater.',
        true, 52.3688, 5.2274, now() - interval '4 minute', 4.7, 'EUR 4-9', 'Weerwater, Almere',
        array['Dutch Snacks','Herring','Seafood'],
        now()
    )
on conflict (id) do update set
    owner_name = excluded.owner_name,
    business_name = excluded.business_name,
    logo_symbol = excluded.logo_symbol,
    category = excluded.category,
    country = excluded.country,
    phone = excluded.phone,
    opening_hours = excluded.opening_hours,
    about = excluded.about,
    is_live = excluded.is_live,
    live_latitude = excluded.live_latitude,
    live_longitude = excluded.live_longitude,
    live_updated_at = excluded.live_updated_at,
    rating = excluded.rating,
    price_hint = excluded.price_hint,
    next_area = excluded.next_area,
    tags = excluded.tags,
    updated_at = excluded.updated_at;

insert into public.demo_vendor_products (
    id, vendor_id, name, price_label, is_available, image_symbol, sort_order, updated_at
)
values
    ('product-latte', 'vendor-roast-route', 'Oat Latte', 'EUR 4.50', true, '☕', 0, now()),
    ('product-flat-white', 'vendor-roast-route', 'Flat White', 'EUR 4.20', true, '☕', 1, now()),
    ('product-pain-au-choc', 'vendor-roast-route', 'Pain au Chocolat', 'EUR 3.80', true, '🥐', 2, now()),
    ('product-berries', 'vendor-north-market', 'Fresh Berry Box', 'EUR 5.20', true, '🫐', 0, now()),
    ('product-veg-bag', 'vendor-north-market', 'Mixed Veg Bag', 'EUR 8.50', true, '🥬', 1, now()),
    ('product-apples', 'vendor-north-market', 'Dutch Apples', 'EUR 3.90', true, '🍎', 2, now()),
    ('product-coconut-water', 'vendor-cocero', 'Fresh Coconut Water', 'EUR 5.50', true, '🥥', 0, now()),
    ('product-coconut-lime', 'vendor-cocero', 'Coconut Lime Splash', 'EUR 6.20', true, '🥥', 1, now()),
    ('product-fruit-cup', 'vendor-cocero', 'Tropical Fruit Cup', 'EUR 7.40', true, '🍍', 2, now()),
    ('product-stroopwafel', 'vendor-sweet-wheel', 'Fresh Stroopwafel', 'EUR 4.50', true, '🧇', 0, now()),
    ('product-mini-pancakes', 'vendor-sweet-wheel', 'Mini Pancakes', 'EUR 7.40', true, '🥞', 1, now()),
    ('product-soft-serve', 'vendor-sweet-wheel', 'Vanilla Soft Serve', 'EUR 5.10', true, '🍦', 2, now()),
    ('product-truck-i-pan-ribs', 'vendor-truck-i-pan-almere', 'Sticky BBQ Ribs', 'EUR 15.50', true, '🍖', 0, now()),
    ('product-truck-i-pan-brisket', 'vendor-truck-i-pan-almere', 'Smoked Brisket Roll', 'EUR 11.80', true, '🍖', 1, now()),
    ('product-truck-i-pan-wings', 'vendor-truck-i-pan-almere', 'Fire Glazed Wings', 'EUR 9.60', true, '🍗', 2, now()),
    ('product-stroopwafel-classic', 'vendor-stroopwafel-kar', 'Classic Stroopwafel', 'EUR 4.20', true, '🧇', 0, now()),
    ('product-stroopwafel-choco', 'vendor-stroopwafel-kar', 'Chocolate Stroopwafel', 'EUR 5.10', true, '🧇', 1, now()),
    ('product-friet-classic', 'vendor-friet-van-pansen', 'Dutch Fries', 'EUR 4.80', true, '🍟', 0, now()),
    ('product-friet-special', 'vendor-friet-van-pansen', 'Friet Speciaal', 'EUR 6.40', true, '🍟', 1, now()),
    ('product-haring-classic', 'vendor-haring-henk', 'Hollandse Nieuwe', 'EUR 5.70', true, '🐟', 0, now()),
    ('product-kibbeling', 'vendor-haring-henk', 'Kibbeling Cup', 'EUR 8.20', true, '🐟', 1, now())
on conflict (id) do update set
    vendor_id = excluded.vendor_id,
    name = excluded.name,
    price_label = excluded.price_label,
    is_available = excluded.is_available,
    image_symbol = excluded.image_symbol,
    sort_order = excluded.sort_order,
    updated_at = excluded.updated_at;
