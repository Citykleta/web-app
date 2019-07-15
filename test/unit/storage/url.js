import { deserialize, serialize } from '../../../src/app/storage/url';
import { View } from '../../../src/app/navigation/reducer';
import { defaultState } from '../../../src/app/store/store';
export default function (a) {
    a.test('Serialize a state currently in search view', t => {
        const state = Object.assign(defaultState(), {
            search: {
                searchResult: [{
                        'id': 5988,
                        'type': 'point_of_interest',
                        'name': 'Vistamar',
                        'category': 'restaurant',
                        'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                        'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                        'description': null
                    }],
                selectedSearchResult: {
                    'id': 5988,
                    'type': 'point_of_interest',
                    'name': 'Vistamar',
                    'category': 'restaurant',
                    'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                    'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                    'description': null
                }
            }
        });
        const expected = Object.assign(defaultState(), {
            search: {
                isSearching: false,
                searchResult: [],
                selectedSearchResult: {
                    'id': 5988,
                    'type': 'point_of_interest',
                    'name': 'Vistamar',
                    'category': 'restaurant',
                    'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                    'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                    'description': null
                }
            }
        });
        t.eq(deserialize(serialize(state)).search, expected.search, 'should have serialized the selected result only');
    });
    a.test('Serialize a state currently in search view should serialize map location data', t => {
        const state = Object.assign(defaultState(), {
            map: {
                zoom: 15.48,
                center: [-82.413233, 23.129075]
            },
            search: {
                searchResult: [{
                        'id': 5988,
                        'type': 'point_of_interest',
                        'name': 'Vistamar',
                        'category': 'restaurant',
                        'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                        'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                        'description': null
                    }],
                selectedSearchResult: {
                    'id': 5988,
                    'type': 'point_of_interest',
                    'name': 'Vistamar',
                    'category': 'restaurant',
                    'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                    'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                    'description': null
                }
            }
        });
        const expected = Object.assign(defaultState(), {
            map: {
                zoom: 15.48,
                center: [-82.413233, 23.129075]
            },
            search: {
                isSearching: false,
                searchResult: [],
                selectedSearchResult: {
                    'id': 5988,
                    'type': 'point_of_interest',
                    'name': 'Vistamar',
                    'category': 'restaurant',
                    'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                    'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                    'description': null
                }
            }
        });
        t.eq(deserialize(serialize(state)), expected, 'should have serialized the selected result only');
    });
    a.test('Serialize a state currently in itinerary view', t => {
        const state = Object.assign(defaultState(), {
            navigation: {
                selectedView: View.ITINERARY
            },
            itinerary: {
                stops: [{
                        id: 0,
                        item: {
                            'id': 5988,
                            'type': 'point_of_interest',
                            'name': 'Vistamar',
                            'category': 'restaurant',
                            'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                            'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                            'description': null
                        }
                    }, {
                        id: 1,
                        item: {
                            'id': 7583,
                            'type': 'point_of_interest',
                            'name': 'Fábrica de Arte Cubano',
                            'category': 'nightclub',
                            'geometry': { 'type': 'Point', 'coordinates': [-82.410017, 23.127506] },
                            'address': { 'number': null, 'street': 'Calle 26', 'municipality': 'Plaza de la Revolución' },
                            'description': null
                        }
                    }]
            },
            'routes': [{
                    'geometry': 'iadlCjv~uNg@`@pGxIlM~RhBhB{]xZvSnZ',
                    'legs': [{ 'summary': '', 'weight': 650, 'duration': 534.4, 'steps': [], 'distance': 2055 }],
                    'weight_name': 'cyclability',
                    'weight': 650,
                    'duration': 534.4,
                    'distance': 2055
                }],
            'waypoints': [{
                    'distance': 16.11451552639027,
                    'name': 'Calle 26',
                    'location': [-82.410138, 23.127413]
                }, { 'distance': 28.4612272787436, 'name': '1ra Avenida', 'location': [-82.42462, 23.125018] }],
            'code': 'Ok',
            'uuid': 'cjy4jd73f00kp3ylhx4zxure3'
        });
        const expected = Object.assign(defaultState(), {
            navigation: {
                selectedView: View.ITINERARY
            },
            itinerary: {
                stops: [{
                        id: 0,
                        item: {
                            'id': 5988,
                            'type': 'point_of_interest',
                            'name': 'Vistamar',
                            'category': 'restaurant',
                            'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                            'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                            'description': null
                        }
                    }, {
                        id: 1,
                        item: {
                            'id': 7583,
                            'type': 'point_of_interest',
                            'name': 'Fábrica de Arte Cubano',
                            'category': 'nightclub',
                            'geometry': { 'type': 'Point', 'coordinates': [-82.410017, 23.127506] },
                            'address': { 'number': null, 'street': 'Calle 26', 'municipality': 'Plaza de la Revolución' },
                            'description': null
                        }
                    }],
                routes: []
            }
        });
        t.eq(deserialize(serialize(state)).itinerary, expected.itinerary, 'should have serialized the stops points only');
    });
    a.test('Serialize a state currently in itinerary view should save map state too', t => {
        const state = Object.assign(defaultState(), {
            map: {
                zoom: 15.48,
                center: [-82.413233, 23.129075]
            },
            navigation: {
                selectedView: View.ITINERARY
            },
            itinerary: {
                stops: [{
                        id: 0,
                        item: {
                            'id': 5988,
                            'type': 'point_of_interest',
                            'name': 'Vistamar',
                            'category': 'restaurant',
                            'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                            'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                            'description': null
                        }
                    }, {
                        id: 1,
                        item: {
                            'id': 7583,
                            'type': 'point_of_interest',
                            'name': 'Fábrica de Arte Cubano',
                            'category': 'nightclub',
                            'geometry': { 'type': 'Point', 'coordinates': [-82.410017, 23.127506] },
                            'address': { 'number': null, 'street': 'Calle 26', 'municipality': 'Plaza de la Revolución' },
                            'description': null
                        }
                    }]
            },
            'routes': [{
                    'geometry': 'iadlCjv~uNg@`@pGxIlM~RhBhB{]xZvSnZ',
                    'legs': [{ 'summary': '', 'weight': 650, 'duration': 534.4, 'steps': [], 'distance': 2055 }],
                    'weight_name': 'cyclability',
                    'weight': 650,
                    'duration': 534.4,
                    'distance': 2055
                }],
            'waypoints': [{
                    'distance': 16.11451552639027,
                    'name': 'Calle 26',
                    'location': [-82.410138, 23.127413]
                }, { 'distance': 28.4612272787436, 'name': '1ra Avenida', 'location': [-82.42462, 23.125018] }],
            'code': 'Ok',
            'uuid': 'cjy4jd73f00kp3ylhx4zxure3'
        });
        const expected = Object.assign(defaultState(), {
            map: {
                zoom: 15.48,
                center: [-82.413233, 23.129075]
            },
            navigation: {
                selectedView: View.ITINERARY
            },
            itinerary: {
                stops: [{
                        id: 0,
                        item: {
                            'id': 5988,
                            'type': 'point_of_interest',
                            'name': 'Vistamar',
                            'category': 'restaurant',
                            'geometry': { 'type': 'Point', 'coordinates': [-82.424801, 23.125213] },
                            'address': { 'number': '2206', 'street': '1ra Avenida', 'municipality': 'Playa' },
                            'description': null
                        }
                    }, {
                        id: 1,
                        item: {
                            'id': 7583,
                            'type': 'point_of_interest',
                            'name': 'Fábrica de Arte Cubano',
                            'category': 'nightclub',
                            'geometry': { 'type': 'Point', 'coordinates': [-82.410017, 23.127506] },
                            'address': { 'number': null, 'street': 'Calle 26', 'municipality': 'Plaza de la Revolución' },
                            'description': null
                        }
                    }],
                routes: []
            }
        });
        t.eq(deserialize(serialize(state)).itinerary, expected.itinerary, 'should have serialized the stops points only');
    });
    a.test('should set the default state if does not understand the url', t => {
        const state = deserialize(new URL('foo/bar/bim', 'https://localhost.com'));
        t.eq(state, defaultState());
    });
}
