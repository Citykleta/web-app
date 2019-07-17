import {GeoCoord, Route, truncate} from '../app/utils';

/*
const mock = {
    'routes': [
        {
            'geometry': '_kdlCdp`vN{JgNzOmNnHcGJ_@cDoBwC{Bp@m@VB~BzB~BoB{EsGf@a@',
            'legs': [
                {
                    'summary': '',
                    'weight': 485.1,
                    'duration': 425.7,
                    'steps': [],
                    'distance': 1617.8
                }
            ],
            'weight_name': 'cyclability',
            'weight': 485.1,
            'duration': 425.7,
            'distance': 1617.8
        },
        {
            'geometry': '_kdlCdp`vNxHaHdIwGlIyHmLiQqGyIf@a@',
            'legs': [
                {
                    'summary': '',
                    'weight': 532.3,
                    'duration': 418.3,
                    'steps': [],
                    'distance': 1350.9
                }
            ],
            'weight_name': 'cyclability',
            'weight': 532.3,
            'duration': 418.3,
            'distance': 1350.9
        },
        {
            'geometry': '_kdlCdp`vNuRqXaBsBzRoPMQC[BMNKVDpAjB`@R^K~BoBVB~BzB~BoB{EsGf@a@',
            'legs': [
                {
                    'summary': '',
                    'weight': 521.8,
                    'duration': 448.3,
                    'steps': [],
                    'distance': 1759.4
                }
            ],
            'weight_name': 'cyclability',
            'weight': 521.8,
            'duration': 448.3,
            'distance': 1759.4
        }
    ],
    'waypoints': [
        {
            'distance': 0,
            'name': '1ra Avenida',
            'location': [
                -82.419388,
                23.128963
            ]
        },
        {
            'distance': 16.11451552639027,
            'name': 'Calle 26',
            'location': [
                -82.410138,
                23.127413
            ]
        }
    ],
    'code': 'Ok',
    'uuid': 'cjy5yo9tz00og3xmwil3pzmht'
};
*/


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
