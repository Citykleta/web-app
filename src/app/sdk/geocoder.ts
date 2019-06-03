import {GeoCoord, PointOfInterestSearchResult, SearchResult} from '../utils';

export interface Geocoder {
    searchPointsOfInterest(query: string): Promise<PointOfInterestSearchResult[]>;

    searchAddress(query: string): Promise<SearchResult[]>;

    reverse(coordinates: GeoCoord): Promise<any[]>;//todo
}

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';

export const factory = ({endpoint = DEFAULT_ENDPOINT_ROOT} = {endpoint: DEFAULT_ENDPOINT_ROOT}): Geocoder => {
    let searchAbortController = null;

    return {
        async searchPointsOfInterest(query: string = '') {

            if (searchAbortController) {
                searchAbortController.abort();
            }

            searchAbortController = new AbortController();

            try {
                const url = new URL(`/poi?search=${encodeURIComponent(query)}`, endpoint);
                const res = await fetch(url.toString(), {
                    signal: searchAbortController.signal
                });

                if (res.ok !== true) {
                    throw new Error('not ok response');
                }

                const raw = await res.json();
                return raw.map(i => Object.assign(i, {municipality: i.address.municipality}));
            } finally {
                searchAbortController = null;
            }
        },
        async searchAddress(query: string = '') {
            const url = new URL(`/address?search=${encodeURIComponent(query)}`, endpoint);

            // if we have requested an address lookup we stop any ongoing points of interest lookup
            if (searchAbortController) {
                searchAbortController.abort();
            }

            const res = await fetch(url.toString());

            if (res.ok !== true) {
                throw new Error('something went wrong');
            }

            return res.json();
        },
        async reverse(coordinates: GeoCoord) {
            const url = new URL(`/location?lng=${coordinates.lng}&lat=${coordinates.lat}`, endpoint);
            const res = await fetch(url.toString());

            if (res.ok !== true) {
                throw new Error('not ok response'); //todo handler error in a different way
            }

            return res.json();
        }
    };
};
