import {GeoCoord, GeoLocation} from '../utils';

export interface Geocoder {
    search(query: string): Promise<GeoLocation[]>;

    reverse(coordinates: GeoCoord): Promise<GeoLocation[]>;
}

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';

export const factory = ({endpoint = DEFAULT_ENDPOINT_ROOT} = {endpoint: DEFAULT_ENDPOINT_ROOT}): Geocoder => {
    let searchAbortController = null;

    return {
        async search(query: string = '') {

            if (searchAbortController) {
                searchAbortController.abort();
            }

            searchAbortController = new AbortController();

            try {
                const url = new URL(`/search/poi?query=${query}`, endpoint);
                const res = await fetch(url.toString(), {
                    headers: {
                        'Content-Type': 'application/json; charset=utf-8'
                    },
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
        async reverse(coordinates: GeoCoord) {
            const url = new URL(`/search/reverse?lng=${coordinates.lng}&lat=${coordinates.lat}`, endpoint);

            const res = await fetch(url.toString(), {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                }
            });

            if (res.ok !== true) {
                throw new Error('not ok response'); //todo handler error in a different way
            }

            return res.json();
        }
    };
};
