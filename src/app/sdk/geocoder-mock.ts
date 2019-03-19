// todo use service worker instead

import {Geocoder} from './geocoder';
import {GeoCoord} from '../util';

const wait = (time = 300) => new Promise(resolve => {
    setTimeout(() => resolve(), time);
});

export const factory = (): Geocoder => {
    return {
        async search(query = '') {
            await wait(500);
            return query ? [{
                name: 'Don Cangrejo',
                lat: 23.1270455,
                lng: -82.4224199,
                address: {
                    number: '',
                    street: '1ra Avenida',
                    municipality: 'Miramar'
                }
            }, {
                name: 'DiMar',
                lat: 23.142668,
                lng: -82.4000326,
                address: {
                    number: '',
                    street: 'Calle C',
                    municipality: 'El Vedado'
                }
            },{
                name: 'Vista Hermosa',
                lat: 23.0951823,
                lng: -82.3153047,
                address: {
                    number: '',
                    street: '',
                    municipality: 'Vista Hermosa'
                }
            }] : [];
        },
        async reverse(coordinates: GeoCoord) {
            await wait();
            return [{
                name: 'Don Cangrejo',
                lat: 23.1270455,
                lng: -82.4224199,
                address: {
                    number: '',
                    street: '1ra Avenida',
                    municipality: 'Miramar'
                }
            }, {
                name: 'DiMar',
                lat: 23.142668,
                lng: -82.4000326,
                address: {
                    number: '',
                    street: 'Calle C',
                    municipality: 'El Vedado'
                }
            }];
        }
    };
};
