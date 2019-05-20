import {truncate, Route, GeoCoord} from '../utils';

export interface Directions {
    search(points: GeoCoord[]): Promise<Route[]>;
}

const DEFAULT_ENDPOINT_ROOT = 'https://api.citykleta-test.com';

export const factory = ({endpoint = DEFAULT_ENDPOINT_ROOT} = {endpoint: DEFAULT_ENDPOINT_ROOT}): Directions => {

    let searchDirectionController = null;

    return {
        async search(points: GeoCoord[]) {

            if (searchDirectionController) {
                searchDirectionController.abort();
            }

            searchDirectionController = new AbortController();

            try {
                const waypoints = points.map(({lat, lng}) => ({
                    lat: truncate(lat),
                    lng: truncate(lng)
                }));

                const url = new URL('/direction', endpoint);
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
                    throw new Error('not ok response');
                }

                return (await res.json()).routes;
            } finally {
                searchDirectionController = null;
            }
        }
    };
};
