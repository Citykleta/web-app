import {UIPointOrPlaceholder} from './reducers/itinerary';

export const truncate = (value: number): number => Math.trunc(value * 10 ** 6) / 10 ** 6;

export const concatParts = (parts: string[], separator = ', '): string => parts
    .filter(s => s !== '' || s === void 0)
    .join(separator);

export const isSameLocation = (a: GeoCoord, b: GeoCoord): boolean => {
    if (a === b) {
        return true;
    }

    if (a === null || b === null) {
        return false;
    }

    return truncate(a.lng) === truncate(b.lng) && truncate(a.lat) === truncate(b.lat);
};

export const stringify = (p: GeoLocation | StatePoint): string => {
    const point = <GeoLocation>p;
    if (point === null || !isGeoCoord(point)) {
        return '';
    }

    if (point.name) {
        return point.name + (point.address && point.address.municipality ? `, ${point.address.municipality}` : '');
    }

    if (point.address) {
        const {address} = point;
        return address.formatted || concatParts([
            concatParts([
                address.number,
                address.street
            ], ' '),
            address.municipality]);
    }

    return `${truncate(point.lng)},${truncate(point.lat)}`;
};

export const debounce = (fn, time = 300) => {
    let timer = null;
    return function (...args) {
        if (timer) {
            clearTimeout(timer);
        }
        timer = setTimeout(() => fn(...args), time);
    };
};

export const isGeoCoord = (input: GeoCoord | StatePoint): input is GeoCoord => {
    if (!input) {
        return false;
    } else {
        const p = <GeoCoord>input;
        return p.lat !== void 0 && p.lng !== void 0;
    }
};

export interface GeoCoord {
    lng: number;
    lat: number;
}

export interface Address {
    number?: string;
    street?: string;
    municipality?: string;
    formatted?: string
}

export interface GeoLocation extends GeoCoord {
    name?: string;
    address?: Address;
    category?: string; // todo use an enum (restaurant, cafe, etc)
}

export interface StatePoint {
    id: number
}

export interface UIPoint extends GeoLocation, StatePoint {
}


//todo formalize routes type
export interface Route {
    geometry: string;
}
