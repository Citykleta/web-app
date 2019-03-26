import {truncate, Route, GeoCoord} from '../util';

export interface Directions {
    search(points: GeoCoord[]): Promise<Route[]>;
}

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';

export const factory = ({endpoint = DEFAULT_ENDPOINT_ROOT} = {endpoint: DEFAULT_ENDPOINT_ROOT}): Directions => {

    let searchDirectionController = new AbortController();
    let request = null;

    return {
        async search(points: GeoCoord[]) {

            if (request) {
                searchDirectionController.abort();
            }

            const waypoints = points.map(({lat, lng}) => ({
                lat: truncate(lat),
                lng: truncate(lng)
            }));

            const url = new URL('/search/directions', endpoint);
            const body = {
                waypoints
            };

            request = fetch(url.toString(), {
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                method: 'POST',
                body: JSON.stringify(body)
            });

            const res = await request;
            request = null;

            if (res.ok !== true) {
                throw new Error('not ok response');
            }

            return (await res.json()).routes;
        }
    };
};
