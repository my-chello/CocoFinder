# Customer User Stories

## Epic: Location And Discovery

### Story 1
As a customer, I want the app to detect my location so I can see nearby vendors.

Acceptance criteria:
- The app requests location permission when the map screen loads.
- If permission is granted, the app gets the current GPS position.
- The map centers on the customer location.
- The customer location is shown with a blue marker.
- If permission is denied, the app falls back to a default city map.
- The app shows a clear status message for loading, success, or fallback.
- The customer can retry location detection.

### Story 2
As a customer, I want to see nearby vendors on a map so I can discover what is close to me.

Acceptance criteria:
- Nearby vendors appear relative to the current map area.
- Each vendor can be represented with a marker or pin.
- The map remains usable even if location is unavailable.

### Story 3
As a customer, I want to search for vendors or products so I can quickly find what I want.

Acceptance criteria:
- A search bar is visible on the map screen.
- Search can support vendor names, categories, or products.
- Search does not block use of the map.

### Story 4
As a customer, I want to filter vendors so I can narrow results to what matters to me.

Acceptance criteria:
- A filter control is available from the map screen.
- Filters can later include category, distance, rating, and open-now.

## Epic: Vendor Browsing

### Story 5
As a customer, I want to browse vendor profiles so I can learn what they sell.

Acceptance criteria:
- The app shows vendor business information.
- The app shows latest location information when available.
- The app shows menu items and prices.
- The app shows business status and open state.

### Story 6
As a customer, I want to see product availability so I know whether an item can be purchased.

Acceptance criteria:
- Products show available or unavailable state.
- Prices are displayed clearly.

## Epic: Favorites And Retention

### Story 7
As a customer, I want to favorite vendors so I can find them again easily.

Acceptance criteria:
- I can save a vendor as a favorite.
- Favorites appear in a dedicated tab.
- Favorite state is persisted per customer account.

### Story 8
As a customer, I want alerts when favorite vendors are nearby so I do not miss them.

Acceptance criteria:
- The app can later notify me when a favorite vendor enters my area.
- Notification preferences can be managed from the profile.

## Epic: Account And Preferences

### Story 9
As a customer, I want to manage my profile and permissions so I can control my experience.

Acceptance criteria:
- The profile tab includes account settings.
- The profile tab includes location and notification settings.
- Privacy controls can be added for GDPR support.
