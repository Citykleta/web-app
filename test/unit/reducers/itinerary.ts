import {Assert} from 'zora';
import {ItineraryState, reducer} from '../../../src/app/reducers/itinerary';
import {selectTool} from '../../../src/app/actions/tool-box';
import {ToolType} from '../../../src/app/tools/interfaces';
import {
    addItineraryPoint,
    updateItineraryPoint,
    fetchRoutesWithSuccess,
    InsertionPosition,
    moveItineraryPoint,
    removeItineraryPoint,
    resetRoutes
} from '../../../src/app/actions/itinerary';

export default ({test}: Assert) => {
    test('should return the previous state if action is not related to itinerary', t => {
        const initialState: ItineraryState = {
            stops: [{
                lng: 1234,
                lat: 4321,
                id: 43
            }],
            routes: []
        };
        const actual = reducer(initialState, selectTool(ToolType.ITINERARY));
        t.eq(actual, initialState, 'state should not have changed');
    });

    test('add a point without specifying the insertion position', t => {
        const initialState: ItineraryState = {
            stops: [{
                lng: 1234,
                lat: 4321,
                id: 2
            }],
            routes: []
        };

        const actual = reducer(initialState, addItineraryPoint({
            lng: 789,
            lat: 987
        }));

        t.eq(actual, {
            stops: [{
                lng: 1234,
                lat: 4321,
                id: 2
            }, {
                lng: 789,
                lat: 987,
                id: 3
            }],
            routes: []
        });
    });

    test('add a point specifying a valid insertion position', t => {
        const initialState: ItineraryState = {
            stops: [{
                lng: 1234,
                lat: 4321,
                id: 2
            }],
            routes: []
        };

        const actual = reducer(initialState, addItineraryPoint({
            lng: 789,
            lat: 987,
        }, 2));

        t.eq(actual, {
            stops: [{
                lng: 789,
                lat: 987,
                id: 3
            }, {
                lng: 1234,
                lat: 4321,
                id: 2
            }],
            routes: []
        });
    });

    test('change an existing point coordinates', t => {
        const initialState: ItineraryState = {
            stops: [{
                lng: 1234,
                lat: 4321,
                id: 2
            }],
            routes: []
        };

        const actual = reducer(initialState, updateItineraryPoint(2, {
            lng: 789,
            lat: 987
        }));

        t.eq(actual, {
            stops: [{
                id: 2,
                lng: 789,
                lat: 987
            }],
            routes: []
        });
    });

    test('change a non existing point coordinates: should not modify state', t => {
        const initialState = {
            stops: [{
                lng: 1234,
                lat: 4321,
                id: 2
            }],
            routes: []
        };

        const actual = reducer(initialState, updateItineraryPoint(666, {
            lng: 789,
            lat: 987
        }));

        t.eq(actual, initialState);
    });

    test('remove an existing point', t => {
        const initialState = {
            stops: [{
                lng: 1234,
                lat: 4321,
                id: 2
            }],
            routes: []
        };

        const actual = reducer(initialState, removeItineraryPoint(2));

        t.eq(actual, {stops: [], routes: []});
    });

    test('remove a non existing point', t => {
        const initialState = {
            stops: [{
                lng: 1234,
                lat: 4321,
                id: 2
            }],
            routes: []
        };

        const actual = reducer(initialState, removeItineraryPoint(666));

        t.eq(actual, initialState);
    });

    test('move point should not do anything if target id does not match any', t => {
        const stops = [{
            id: 2,
            lng: 22,
            lat: 33
        }, {
            id: 3,
            lng: 44,
            lat: 55
        }, {
            id: 4,
            lng: 55,
            lat: 66
        }];

        const initialState = {
            routes: [],
            stops
        };

        const actual = reducer(initialState, moveItineraryPoint(2, 666, InsertionPosition.AFTER));
        t.eq(actual.stops, stops);
    });

    test('move point should not do anything if source id does not match any', t => {
        const stops = [{
            id: 2,
            lng: 22,
            lat: 33
        }, {
            id: 3,
            lng: 44,
            lat: 55
        }, {
            id: 4,
            lng: 55,
            lat: 66
        }];

        const initialState: ItineraryState = {
            routes: [],
            stops
        };

        const actual = reducer(initialState, moveItineraryPoint(666, 3, InsertionPosition.BEFORE));
        t.eq(actual.stops, stops);
    });

    test('move before existing itinerary points from higher index to lower index', t => {
        const stops = [{
            id: 2,
            lng: 22,
            lat: 33
        }, {
            id: 3,
            lng: 44,
            lat: 55
        }, {
            id: 4,
            lng: 55,
            lat: 66
        }];

        const initialState: ItineraryState = {
            routes: [],
            stops
        };

        const actual = reducer(initialState, moveItineraryPoint(4, 3, InsertionPosition.BEFORE));
        t.eq(actual.stops, [stops[0], stops[2], stops[1]]);
    });

    test('move before existing itinerary points from lower index to higher index', t => {
        const stops = [{
            id: 2,
            lng: 22,
            lat: 33
        }, {
            id: 3,
            lng: 44,
            lat: 55
        }, {
            id: 4,
            lng: 55,
            lat: 66
        }];

        const initialState: ItineraryState = {
            routes: [],
            stops
        };

        const actual = reducer(initialState, moveItineraryPoint(2, 4, InsertionPosition.BEFORE));
        t.eq(actual.stops, [stops[1], stops[0], stops[2]]);
    });

    test('move after existing itinerary points from higher index to lower index', t => {
        const stops = [{
            id: 2,
            lng: 22,
            lat: 33
        }, {
            id: 3,
            lng: 44,
            lat: 55
        }, {
            id: 4,
            lng: 55,
            lat: 66
        }];

        const initialState: ItineraryState = {
            routes: [],
            stops
        };

        const actual = reducer(initialState, moveItineraryPoint(4, 2, InsertionPosition.AFTER));
        t.eq(actual.stops, [stops[0], stops[2], stops[1]]);
    });

    test('move after existing itinerary points from lower index to higher index', t => {
        const stops = [{
            id: 2,
            lng: 22,
            lat: 33
        }, {
            id: 3,
            lng: 44,
            lat: 55
        }, {
            id: 4,
            lng: 55,
            lat: 66
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
                lng: 1234,
                lat: 4321,
                id: 2
            }],
            routes: [{geometry: 'bar'}]
        };

        const actual = reducer(initialState, resetRoutes());
        t.eq(actual, {
            routes: [], stops: [{
                id: 0
            }, {
                id: 1
            }]
        });
    });

    test('set routes', t => {
        const initialState: ItineraryState = {
            stops: [{id: 1, lat: 1234, lng: 5432}],
            routes: []
        };
        const actual = reducer(initialState, fetchRoutesWithSuccess([{
            geometry: 'geom'
        }]));

        t.eq(actual, {
            stops: [{id: 1, lat: 1234, lng: 5432}],
            routes: [{
                geometry: 'geom'
            }]
        });
    });

}
