import {GeoCoord} from '../tools/interfaces';
//todo set up abort signal to avoid unnecessary round trip with server

export interface Geocoder {
    search(query: string): Promise<any>; //todo share types with api
    reverse(coordinates: GeoCoord): Promise<any>;
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
                throw new Error('not ok response'); //todo handler error in a different way
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
