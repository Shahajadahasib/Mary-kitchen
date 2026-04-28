/**
 * Shared address types — used by AddressAutocomplete and AddressFormModal.
 * Google Maps code has been removed. Address search now uses Nominatim
 * (OpenStreetMap), which is 100% free with no API key required.
 */

export interface ParsedAddress {
  address_line1: string;
  suburb: string;
  state: string;
  postcode: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
}
