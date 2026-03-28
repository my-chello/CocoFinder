# Vendor User Stories

## Epic: Vendor Onboarding And Live Operations

### Story 1
As a vendor, I want to register my business so I can appear in the app.

Acceptance criteria:
- A vendor can create an account.
- A vendor can enter business name, category, description, and contact details.
- The business profile is saved to the database.
- The vendor is not publicly visible until registration is complete.
- The business can move through statuses like `pending`, `active`, and `inactive`.

### Story 2
As a vendor, I want to set products and prices so customers know what I sell.

Acceptance criteria:
- A vendor can add products to a menu.
- Each product has a name, description, price, and availability state.
- A vendor can edit or remove products later.
- Customers can see the latest saved product list.

### Story 3
As a vendor, I want to tap Go Live so customers can find me in real time.

Acceptance criteria:
- A vendor can toggle `Go Live` on and off.
- When `Go Live` is on, the app shares the vendor location.
- Customers can see the vendor as live on the map.
- When `Go Live` is off, location sharing stops.
- The latest vendor location is stored and timestamped.

## Suggested Build Order
1. Vendor registration
2. Product and price management
3. Go Live with location updates
