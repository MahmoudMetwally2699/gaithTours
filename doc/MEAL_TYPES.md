# Meal Types Mapping

This document explains how ETG/RateHawk meal types are mapped to user-friendly display names in our application.

## ETG Meal Type Values

ETG provides the following meal types in the `rate.meal` field:

| ETG Value | Display Name | Description |
|-----------|--------------|-------------|
| `nomeal` | Room Only | No meals included |
| `breakfast` | Breakfast | Breakfast included |
| `halfboard` | Half Board | Breakfast + Dinner |
| `fullboard` | Full Board | Breakfast + Lunch + Dinner |
| `allinclusive` | All Inclusive | All meals + drinks |
| `halfboard-breakfast` | Half Board | Breakfast + Dinner (variant) |

## Implementation

The meal type mapping is implemented in the backend service:

**Location:** `backend/utils/RateHawkService.js`

```javascript
// Meal type normalization in rate processing
const mealMapping = {
  'nomeal': 'Room Only',
  'breakfast': 'Breakfast Included',
  'halfboard': 'Half Board',
  'fullboard': 'Full Board',
  'allinclusive': 'All Inclusive',
  'halfboard-breakfast': 'Half Board'
};
```

## Frontend Display

The frontend displays meal information in:
- **Room Cards** (`RoomCard.tsx`) - Shows breakfast included or room only icons
- **Booking Flow** (`HotelBookingFlow.tsx`) - Displays selected meal type
- **Search Results** - Shows meal type badges on room options

## Icons Used

| Meal Type | Icon | Usage |
|-----------|------|-------|
| Breakfast | 🍳 | Green text, indicates value |
| All Inclusive | 🍽️ | Green text, premium feature |
| No Meal | 🚫 | Gray text, neutral |

## API Reference

For more details, refer to the ETG API documentation:
- [ETG API Rate Object](https://docs.ratehawk.com/api/rates)
- Rate responses include the `meal` field in each rate object

## Notes

- Always display the meal type prominently as it affects guest expectations
- Free breakfast is a significant selling point - highlight accordingly
- Some properties may have multiple meal options at different price points
