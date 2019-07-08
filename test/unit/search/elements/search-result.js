import { createGeoCoord } from '../../../../src/app/utils';
import { createSearchResultInstance } from '../../../../src/app/search/elements/search-result';
export default function ({ test }) {
    test('corner search result', t => {
        const createCorner = (lng = 1234, lat = 4321, street1 = 'st1', street2 = 'st2', municipality = 'playa') => ({
            type: 'corner',
            geometry: {
                type: 'Point',
                coordinates: [lng, lat]
            },
            streets: [street1, street2],
            municipality
        });
        t.test(`toPoint() should return the corner itself`, t => {
            const corner = createCorner(1234, 4321);
            t.eq(createSearchResultInstance(corner).toPoint(), {
                lng: 1234,
                lat: 4321
            });
        });
        t.test(`toGeoFeature() should return the point geo feature`, t => {
            const corner = createCorner(1234, 4321, 'st1', 'st2');
            t.eq(createSearchResultInstance(corner).toGeoFeature(), {
                type: 'Point',
                coordinates: [1234, 4321]
            });
        });
        t.test(`toString() should return the detialed corner`, t => {
            const corner = createCorner(1234, 4321, 'st1', 'st2', 'Marianao');
            t.eq(createSearchResultInstance(corner).toString(), `esquina st1 y st2, Marianao`);
        });
        t.skip('toOptionElement()', t => {
        });
        t.skip('toDetailElement()', t => {
        });
    });
    test('street search result', t => {
        const createStreet = (name, municipality = 'Playa') => ({
            type: 'street',
            name,
            geometry: {
                type: 'LineString',
                coordinates: 'y_dlC|q_vNf@t@oDbDaNbLwB}CrDaD'
            },
            municipality
        });
        t.test(`toPoint() should return the center of the street`, t => {
            const street = createStreet('streeeeet', 'Plaza de la revolucion');
            t.eq(createSearchResultInstance(street).toPoint(), {
                lat: 23.12856485463554,
                lng: -82.4153450022219
            });
        });
        t.test(`toGeoFeature() should return the line geo feature`, t => {
            const street = createStreet('streeeeet', 'Marianao');
            t.eq(createSearchResultInstance(street).toGeoFeature(), {
                type: 'LineString',
                coordinates: [
                    [-82.41455, 23.12717],
                    [-82.41482, 23.12697],
                    [-82.41564, 23.12785],
                    [-82.41774, 23.13026],
                    [-82.41695, 23.13086],
                    [-82.41614, 23.12996]
                ]
            });
        });
        t.test(`toString() should return the detialed corner`, t => {
            const street = createStreet('streeeeet', 'Marianao');
            t.eq(createSearchResultInstance(street).toString(), 'streeeeet, Marianao');
        });
        t.skip('toOptionElement()', t => {
        });
        t.skip('toDetailElement()', t => {
        });
    });
    test('street_block search result', t => {
        const createStreetBlock = () => ({
            'type': 'street_block',
            'name': 'Calle 10',
            'municipality': 'Playa',
            'geometry': { 'type': 'LineString', 'coordinates': '_kdlCdp`vNxHaH' },
            'intersections': [{
                    'type': 'corner',
                    'geometry': { 'type': 'Point', 'coordinates': [-82.419388, 23.1289632] },
                    'name': '1ra Avenida'
                }, {
                    'type': 'corner',
                    'geometry': { 'type': 'Point', 'coordinates': [-82.417943, 23.1273865] },
                    'name': '3ra Avenida'
                }]
        });
        t.test('toPoint() should return the center of the block', t => {
            t.eq(createSearchResultInstance(createStreetBlock()).toPoint(), {
                lng: -82.41866500070331,
                lat: 23.128174925369397
            });
        });
        t.test('toGeoFeature() should return the geojson line', t => {
            t.eq(createSearchResultInstance(createStreetBlock()).toGeoFeature(), {
                coordinates: [
                    [-82.41939, 23.12896],
                    [-82.41794, 23.12739]
                ],
                type: 'LineString'
            });
        });
        t.test('toString()', t => {
            t.eq(createSearchResultInstance(createStreetBlock()).toString(), 'Calle 10 e/ 1ra Avenida y 3ra Avenida, Playa');
        });
        t.skip('toOptionElement()', t => {
        });
        t.skip('toDetailElement()', t => {
        });
    });
    test('point_of_interest search result', t => {
        const createPointOfInterest = () => ({
            type: 'point_of_interest',
            name: 'Teatro Karl Marx',
            category: 'stop_position',
            geometry: { type: 'Point', 'coordinates': [-82.420269, 23.125608] },
            address: { 'number': null, 'street': null, 'municipality': 'Playa' },
            description: null,
            municipality: 'Playa'
        });
        t.test('toPoint() should return the point', t => {
            t.eq(createSearchResultInstance(createPointOfInterest()).toPoint(), { lng: -82.420269, lat: 23.125608 });
        });
        t.test('toGeoFeature() should return the geojson version of the poin', t => {
            t.eq(createSearchResultInstance(createPointOfInterest()).toGeoFeature(), {
                type: 'Point',
                coordinates: [-82.420269, 23.125608]
            });
        });
        t.test('toString()', t => {
            t.eq(createSearchResultInstance(createPointOfInterest()).toString(), 'Teatro Karl Marx, Playa');
        });
        t.skip('toOptionElement()', t => {
        });
        t.skip('toDetailElement()', t => {
        });
    });
    test('lng_last search result', t => {
        const createGeoCoordSearchResult = () => createGeoCoord(-82.420269, 23.125608);
        t.test('toPoint() should return the point', t => {
            t.eq(createSearchResultInstance(createGeoCoordSearchResult()).toPoint(), { lng: -82.420269, lat: 23.125608 });
        });
        t.test('toGeoFeature() should return the geojson version of the poin', t => {
            t.eq(createSearchResultInstance(createGeoCoordSearchResult()).toGeoFeature(), {
                type: 'Point',
                coordinates: [-82.420269, 23.125608]
            });
        });
        t.test('toString()', t => {
            t.eq(createSearchResultInstance(createGeoCoordSearchResult()).toString(), 'Pointed location at -82.420269,23.125608');
        });
        t.skip('toOptionElement()', t => {
        });
        t.skip('toDetailElement()', t => {
        });
    });
}
;
