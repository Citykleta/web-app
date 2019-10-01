import * as p from '@mapbox/polyline';
import {MapState} from './map/reducer';
import {html} from 'lit-html';

const polyline = p.default;

export const decodeLine = (lineString: string) => polyline.decode(lineString).map(pair => pair.reverse());

export const truncate = (value: number, radix = 6): number => Math.trunc(value * 10 ** radix) / 10 ** radix;

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
    type: SearchResultType;
    id?: number; //todo search result with id will be a type in the reducers land, without -> it has to be response from sdk
    municipality?: string;
}

interface GeoJSONPoint {
    type: 'Point',
    coordinates: [number, number]
}

export interface GeoJSONLineString {
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
    category?: string;
    description?: string;
    distance?: number;
}

export interface GeoCoordSearchResult extends GeoCoord, SearchResult {
    type: 'lng_lat'
}

export interface ItineraryPoint {
    id: number;
    item: SearchResult
}

//todo formalize routes type
export interface Route {
    geometry: GeoJSONLineString | string;
    duration: number;
    distance: number;
}

export const createGeoCoord = (lng: number, lat: number): GeoCoordSearchResult => ({
    type: 'lng_lat',
    lng,
    lat
});

export const once = (fn: Function): Function => {
    let run = false;
    return (...args) => {
        if (!run) {
            fn(...args);
            run = true;
        }
    };
};

export const isEqual = (a: MapState, b: MapState) => a.zoom === b.zoom && truncate(a.center[0]) === truncate(b.center[0]) && truncate(a.center[1]) === truncate(b.center[1]);

export const formatDuration = (duration: number) => duration > 60 ? html`${Math.floor(duration / 60)}<span class="unit">min</span>` : html`${duration}<span class="unit">sec</span>`;

export const formatDistance = (distance: number) => {
    const meterDistance = Math.round(distance);
    const printedDistance = meterDistance > 1000 ? Math.round(meterDistance / 100) / 10 : meterDistance;
    return html`${printedDistance}<span class="unit">${meterDistance > 1000 ? 'km' : 'm'}</span>`;
};
