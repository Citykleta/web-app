import {GeoCoord, GeoLocation} from '../utils';

export interface Geocoder {
    search_poi(query: string): Promise<GeoLocation[]>;

    search_address(query: string): Promise<any>;

    reverse(coordinates: GeoCoord): Promise<GeoLocation[]>;
}

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';

export const factory = ({endpoint = DEFAULT_ENDPOINT_ROOT} = {endpoint: DEFAULT_ENDPOINT_ROOT}): Geocoder => {
    let searchAbortController = null;

    return {
        async search_poi(query: string = '') {

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

                return raw.map(({name, id, address, description, category, geometry}) => {

                    const [lng, lat] = geometry.coordinates;
                    return {
                        osmId: id,
                        name,
                        address,
                        category,
                        lng,
                        lat,
                        description
                    };
                });
            } finally {
                searchAbortController = null;
            }
        },
        async search_address(query: string = '') {
            const url = new URL(`/address?search=${encodeURIComponent(query)}`);
            const res = await fetch(url.toString());

            if (res.ok !== true) {
                throw new Error('something went wrong');
            }

            return res.json;
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
