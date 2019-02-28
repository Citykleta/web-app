import {GeoCoord} from '../tools/interfaces';
import {truncate} from '../util';

//todo set up abort signal to avoid unnecessary round trip with server

export interface Directions {
    search(points: GeoCoord[]): Promise<any>; //todo share types with api
}

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';

export const factory = ({endpoint = DEFAULT_ENDPOINT_ROOT} = {endpoint: DEFAULT_ENDPOINT_ROOT}): Directions => {
    const pending = [];
    return {
        async search(points: GeoCoord[]) {
            const waypoints = points.map(({lat, lng}) => ({
                lat: truncate(lat),
                lng: truncate(lng)
            }));

            const url = new URL('/search/directions', endpoint);
            const body = {
                waypoints
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
        }
    };
};
