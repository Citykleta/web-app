export const truncate = (value: number): number => Math.trunc(value * 10 ** 6) / 10 ** 6;

export const debounce = (fn, time = 300) => {
    let timer = null;
    return (...args) => {
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
    number?: number;
    street?: string;
    municipality: string;
}

export interface GeoLocation extends GeoCoord {
    name?: string;
    address?: Address;
    category?: string; // todo use an enum (restaurant, cafe, etc)
}

export interface UIPoint extends GeoLocation {
    id: number;
}

//todo formalize routes type
export interface Route {
    geometry: string;
}
