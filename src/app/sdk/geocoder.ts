import {GeoCoord, GeoLocation} from '../util';

export interface Geocoder {
    search(query: string): Promise<GeoLocation[]>;
    reverse(coordinates: GeoCoord): Promise<GeoLocation[]>;
}

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';

export const factory = ({endpoint = DEFAULT_ENDPOINT_ROOT} = {endpoint: DEFAULT_ENDPOINT_ROOT}): Geocoder => {
    const pending = [];
    return {
        async search(query: string = '') {
            const url = new URL('/search/locations', endpoint);
            const body = {
                query
            };

            const res = await fetch(url.toString(), {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (res.ok !== true) {
                throw new Error('not ok response');
            }

            return res.json();
        },
        async reverse(coordinates: GeoCoord) {
            const url = new URL('/search/reverse', endpoint);
            const body = coordinates;

            const res = await fetch(url.toString(), {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                method: 'POST',
                body: JSON.stringify(body)
            });

            if (res.ok !== true) {
                throw new Error('not ok response'); //todo handler error in a different way
            }

            return res.json();
        }
    };
};
