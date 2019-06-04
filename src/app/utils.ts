import * as p from '@mapbox/polyline';

const polyline = p.default;

export const decodeLine = (lineString: string) => polyline.decode(lineString).map(pair => pair.reverse());

export const truncate = (value: number): number => Math.trunc(value * 10 ** 6) / 10 ** 6;

export const debounce = (fn, time = 250) => {
    let timer = null;
    return function (...args) {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn(...args), time);
    };
};

export interface GeoCoord {
    lng: number;
    lat: number;
}

export interface Address {
    number?: string;
    street?: string;
    municipality?: string;
}

export type SearchResultType = 'corner' | 'street_block' | 'street' | 'point_of_interest' | 'lng_lat';

export interface SearchResult {
    type: SearchResultType,
    municipality?: string
}

interface GeoJSONPoint {
    type: 'Point',
    coordinates: [number, number]
}

interface GeoJSONLineString {
    type: 'LineString',
    coordinates: string
}

export interface CornerSearchResult extends SearchResult {
    type: 'corner',
    geometry: GeoJSONPoint,
    streets: [string, string]
}

export interface BlockSearchResult extends SearchResult {
    type: 'street_block',
    name: string,
    geometry: GeoJSONLineString,
    intersections: [
        { type: 'corner', geometry: GeoJSONPoint, name: string },
        { type: 'corner', geometry: GeoJSONPoint, name: string }
        ]
}

export interface StreetSearchResult extends SearchResult {
    type: 'street',
    name: string,
    geometry: GeoJSONLineString
}

export interface PointOfInterestSearchResult extends SearchResult {
    type: 'point_of_interest'
    name: string;
    geometry: GeoJSONPoint;
    address: Address;
    category: string;
    description?: string;
}

export interface GeoCoordSearchResult extends SearchResult {
    type: 'lng_lat',
    lng: number,
    lat: number,
    address?: Address
}

export interface ItineraryPoint {
    id: number;
    item: SearchResult
}

//todo formalize routes type
export interface Route {
    geometry: string;
}
