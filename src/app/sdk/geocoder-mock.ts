// todo use service worker instead

import {Geocoder} from './geocoder';
import {GeoCoord} from '../util';

const wait = (time = 300) => new Promise(resolve => {
    setTimeout(() => resolve(), time);
});

export const factory = (): Geocoder => {
    return {
        async search(query = '') {
            await wait();
            return [];
        },
        async reverse(coordinates: GeoCoord) {
            await wait();
            return [];
        }
    };
};
