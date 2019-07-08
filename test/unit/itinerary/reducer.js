import { reducer } from '../../../src/app/itinerary/reducer';
import { addItineraryPoint, fetchRoutesWithSuccess, goFrom, goTo, InsertionPosition, moveItineraryPoint, removeItineraryPoint, resetRoutes, updateItineraryPoint } from '../../../src/app/itinerary/actions';
import { createTestSearchResult as sr } from '../utils';
import { selectView } from '../../../src/app/navigation/actions';
import { View } from '../../../src/app/navigation/reducer';
export default ({ test }) => {
    test('should return the previous state if action is not related to itinerary', t => {
        const initialState = {
            stops: [{
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321
                    },
                    id: 43
                }],
            routes: []
        };
        const actual = reducer(initialState, selectView(View.ITINERARY));
        t.eq(actual, initialState, 'state should not have changed');
    });
    test('add a point without specifying the insertion position', t => {
        const initialState = {
            stops: [{
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321,
                    },
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, addItineraryPoint({
            type: 'lng_lat',
            lng: 789,
            lat: 987
        }));
        t.eq(actual, {
            stops: [{
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321
                    },
                    id: 2
                }, {
                    item: {
                        type: 'lng_lat',
                        lng: 789,
                        lat: 987,
                    },
                    id: 3
                }],
            routes: []
        });
    });
    test('add a point specifying a valid insertion position', t => {
        const initialState = {
            stops: [{
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321
                    },
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, addItineraryPoint({
            type: 'lng_lat',
            lng: 789,
            lat: 987,
        }, 2));
        t.eq(actual, {
            stops: [{
                    id: 3, item: {
                        type: 'lng_lat',
                        lng: 789,
                        lat: 987,
                    }
                }, {
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321
                    },
                    id: 2
                }],
            routes: []
        });
    });
    test('change an existing point coordinates', t => {
        const initialState = {
            stops: [{
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321
                    },
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, updateItineraryPoint(2, {
            type: 'lng_lat',
            lng: 789,
            lat: 987
        }));
        t.eq(actual, {
            stops: [{
                    id: 2,
                    item: {
                        type: 'lng_lat',
                        lng: 789,
                        lat: 987
                    }
                }],
            routes: []
        });
    });
    test('change a non existing point coordinates: should not modify state', t => {
        const initialState = {
            stops: [{
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321
                    },
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, updateItineraryPoint(666, {
            type: 'lng_lat',
            lng: 789,
            lat: 987
        }));
        t.eq(actual, initialState);
    });
    test('remove an existing point', t => {
        const initialState = {
            stops: [{
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321
                    },
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, removeItineraryPoint(2));
        t.eq(actual, { stops: [], routes: [] });
    });
    test('remove a non existing point', t => {
        const initialState = {
            stops: [{
                    item: {
                        type: 'lng_lat',
                        lng: 1234,
                        lat: 4321
                    },
                    id: 2
                }],
            routes: []
        };
        const actual = reducer(initialState, removeItineraryPoint(666));
        t.eq(actual, initialState);
    });
    test('move point should not do anything if target sourceId does not match any', t => {
        const stops = [{
                id: 2,
                item: {
                    type: 'lng_lat',
                    lng: 22,
                    lat: 33
                }
            }, {
                id: 3,
                item: {
                    type: 'lng_lat',
                    lng: 44,
                    lat: 55
                }
            }, {
                id: 4,
                item: {
                    type: 'lng_lat',
                    lng: 55,
                    lat: 66
                }
            }];
        const initialState = {
            routes: [],
            stops
        };
        const actual = reducer(initialState, moveItineraryPoint(2, 666, InsertionPosition.AFTER));
        t.eq(actual.stops, stops);
    });
    test('move point should not do anything if source sourceId does not match any', t => {
        const stops = [{
                id: 2,
                item: {
                    type: 'lng_lat',
                    lng: 22,
                    lat: 33
                }
            }, {
                id: 3,
                item: {
                    type: 'lng_lat',
                    lng: 44,
                    lat: 55
                }
            }, {
                id: 4,
                item: {
                    type: 'lng_lat',
                    lng: 55,
                    lat: 66
                }
            }];
        const initialState = {
            routes: [],
            stops
        };
        const actual = reducer(initialState, moveItineraryPoint(666, 3, InsertionPosition.BEFORE));
        t.eq(actual.stops, stops);
    });
    test('move before existing itinerary points from higher index to lower index', t => {
        const stops = [{
                id: 2,
                item: sr(22, 33)
            }, {
                id: 3,
                item: sr(44, 55)
            }, {
                id: 4,
                item: sr(55, 66)
            }];
        const initialState = {
            routes: [],
            stops
        };
        const actual = reducer(initialState, moveItineraryPoint(4, 3, InsertionPosition.BEFORE));
        t.eq(actual.stops, [stops[0], stops[2], stops[1]]);
    });
    test('move before existing itinerary points from lower index to higher index', t => {
        const stops = [{
                id: 2,
                item: sr(22, 33)
            }, {
                id: 3,
                item: sr(44, 55)
            }, {
                id: 4,
                item: sr(55, 66)
            }];
        const initialState = {
            routes: [],
            stops
        };
        const actual = reducer(initialState, moveItineraryPoint(2, 4, InsertionPosition.BEFORE));
        t.eq(actual.stops, [stops[1], stops[0], stops[2]]);
    });
    test('move after existing itinerary points from higher index to lower index', t => {
        const stops = [{
                id: 2,
                item: sr(22, 33)
            }, {
                id: 3,
                item: sr(44, 55)
            }, {
                id: 4,
                item: sr(55, 66)
            }];
        const initialState = {
            routes: [],
            stops
        };
        const actual = reducer(initialState, moveItineraryPoint(4, 2, InsertionPosition.AFTER));
        t.eq(actual.stops, [stops[0], stops[2], stops[1]]);
    });
    test('move after existing itinerary points from lower index to higher index', t => {
        const stops = [{
                id: 2,
                item: sr(22, 33)
            }, {
                id: 3,
                item: sr(44, 55)
            }, {
                id: 4,
                item: sr(55, 66)
            }];
        const initialState = {
            focus: null,
            routes: [],
            stops
        };
        const actual = reducer(initialState, moveItineraryPoint(2, 3, InsertionPosition.AFTER));
        t.eq(actual.stops, [stops[1], stops[0], stops[2]]);
    });
    test('reset routes and stop points', t => {
        const initialState = {
            stops: [{
                    item: sr(1234, 4321),
                    id: 2
                }],
            routes: [{ geometry: 'bar' }]
        };
        const actual = reducer(initialState, resetRoutes());
        t.eq(actual, {
            routes: [], stops: [{
                    id: 0,
                    item: null
                }, {
                    id: 1,
                    item: null
                }]
        });
    });
    test('set routes', t => {
        const initialState = {
            stops: [{
                    id: 1, item: sr(1234, 5432)
                }],
            routes: []
        };
        const actual = reducer(initialState, fetchRoutesWithSuccess([{
                geometry: 'geom'
            }]));
        t.eq(actual, {
            stops: [{
                    id: 1, item: sr(1234, 5432)
                }],
            routes: [{
                    geometry: 'geom'
                }]
        });
    });
    test('respond to a GO_TO action, should set the stops state', t => {
        const initialState = {
            stops: [
                { id: 1, item: sr(1234, 4321) },
                { id: 1, item: sr(5678, 8765) }
            ],
            routes: []
        };
        t.eq(reducer(initialState, goTo(sr(6666, 7777))), {
            stops: [{
                    id: 0,
                    item: null
                }, {
                    id: 1,
                    item: sr(6666, 7777)
                }],
            routes: []
        });
    });
    test('respond to a GO_FROM action, should set the stops state', t => {
        const initialState = {
            stops: [
                { id: 1, item: sr(1234, 4321) },
                { id: 1, item: sr(5678, 8765) }
            ],
            routes: []
        };
        t.eq(reducer(initialState, goFrom(sr(6666, 7777))), {
            stops: [{
                    id: 0,
                    item: sr(6666, 7777)
                }, {
                    id: 1,
                    item: null
                }],
            routes: []
        });
    });
};
