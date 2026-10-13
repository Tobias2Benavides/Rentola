// Default map center shown before any listing/location is picked.
export const DEFAULT_MAP_CENTER = { latitude: 51.5606, longitude: 5.0913 }

// PLACEHOLDER COORDINATES -- verify every one of these against a real
// map (drop a pin on openstreetmap.org or Google Maps) before launch.
// These are meant as safe, well-lit, public meetup spots near Tilburg
// University that an owner can offer instead of their home address.
// Replace label/address/lat/lng with values you've personally checked.
export const MEETUP_SPOTS = [
  {
    label: 'Tilburg University main entrance',
    address: 'Warandelaan 2, Tilburg',
    latitude: 51.5606,
    longitude: 5.0414,
  },
  {
    label: 'LocHal library',
    address: 'Burgemeester Brokxlaan 1000, Tilburg',
    latitude: 51.5595,
    longitude: 5.0831,
  },
  {
    label: 'Tilburg Centraal station',
    address: 'Stationsstraat, Tilburg',
    latitude: 51.5614,
    longitude: 5.0831,
  },
  {
    label: 'Wilhelminapark',
    address: 'Wilhelminapark, Tilburg',
    latitude: 51.5537,
    longitude: 5.0763,
  },
] as const
