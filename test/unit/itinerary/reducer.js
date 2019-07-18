import { reducer } from '../../../src/app/itinerary/reducer';
import { addItineraryPoint, fetchRoutesWithSuccess, goFrom, goTo, InsertionPosition, moveItineraryPoint, removeItineraryPoint, resetRoutes, selectRoute, updateItineraryPoint } from '../../../src/app/itinerary/actions';
import { createTestSearchResult } from '../utils';
import { selectView } from '../../../src/app/navigation/actions';
import { View } from '../../../src/app/navigation/reducer';
import { ActionType } from '../../../src/app/common/actions';
const createInitalState = (...stops) => ({
    stops,
    routes: [],
    selectedRoute: 0
});
export default ({ test }) => {
    test('should return the previous state if action is not related to itinerary', t => {
        const initialState = createInitalState(createTestSearchResult(1234, 4321));
        const actual = reducer(initialState, selectView(View.ITINERARY));
        t.eq(actual, initialState, 'state should not have changed');
    });
    test('add a point without specifying the insertion position', t => {
        const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
        const actual = reducer(initialState, addItineraryPoint(createTestSearchResult(789, 987)));
        t.eq(actual, {
            stops: [{
                    item: createTestSearchResult(1234, 4321),
                    id: 2
                }, {
                    item: createTestSearchResult(789, 987),
                    id: 3
                }],
            routes: [],
            selectedRoute: 0
        });
    });
    test('add a point specifying a valid insertion position', t => {
        const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
        const actual = reducer(initialState, addItineraryPoint({
            type: 'lng_lat',
            lng: 789,
            lat: 987,
        }, 2));
        t.eq(actual, {
            stops: [{
                    id: 3, item: createTestSearchResult(789, 987)
                }, {
                    item: createTestSearchResult(1234, 4321),
                    id: 2
                }],
            routes: [],
            selectedRoute: 0
        });
    });
    test('change an existing point coordinates', t => {
        const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
        const actual = reducer(initialState, updateItineraryPoint(2, createTestSearchResult(789, 987)));
        t.eq(actual, {
            stops: [{
                    id: 2,
                    item: createTestSearchResult(789, 987)
                }],
            routes: [],
            selectedRoute: 0
        });
    });
    test('change a non existing point coordinates: should not modify state', t => {
        const initialState = createInitalState(createTestSearchResult(1234, 4321));
        const actual = reducer(initialState, updateItineraryPoint(666, {
            type: 'lng_lat',
            lng: 789,
            lat: 987
        }));
        t.eq(actual, initialState);
    });
    test('remove an existing point', t => {
        const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
        const actual = reducer(initialState, removeItineraryPoint(2));
        t.eq(actual, { stops: [], routes: [], selectedRoute: 0 });
    });
    test('remove a non existing point', t => {
        const initialState = createInitalState({ id: 2, item: createTestSearchResult(1234, 4321) });
        const actual = reducer(initialState, removeItineraryPoint(666));
        t.eq(actual, initialState);
    });
    test('move point should not do anything if target sourceId does not match any', t => {
        const stops = [{
                id: 2,
                item: createTestSearchResult(22, 33)
            }, {
                id: 3,
                item: createTestSearchResult(44, 55)
            }, {
                id: 4,
                item: createTestSearchResult(55, 66)
            }];
        const initialState = createInitalState(...stops);
        const actual = reducer(initialState, moveItineraryPoint(2, 666, InsertionPosition.AFTER));
        t.eq(actual.stops, stops);
    });
    test('move point should not do anything if source sourceId does not match any', t => {
        const stops = [{
                id: 2,
                item: createTestSearchResult(22, 33)
            }, {
                id: 3,
                item: createTestSearchResult(44, 55)
            }, {
                id: 4,
                item: createTestSearchResult(55, 66)
            }];
        const initialState = createInitalState(...stops);
        const actual = reducer(initialState, moveItineraryPoint(666, 3, InsertionPosition.BEFORE));
        t.eq(actual.stops, stops);
    });
    test('move before existing itinerary points from higher index to lower index', t => {
        const stops = [{
                id: 2,
                item: createTestSearchResult(22, 33)
            }, {
                id: 3,
                item: createTestSearchResult(44, 55)
            }, {
                id: 4,
                item: createTestSearchResult(55, 66)
            }];
        const initialState = createInitalState(...stops);
        const actual = reducer(initialState, moveItineraryPoint(4, 3, InsertionPosition.BEFORE));
        t.eq(actual.stops, [stops[0], stops[2], stops[1]]);
    });
    test('move before existing itinerary points from lower index to higher index', t => {
        const stops = [{
                id: 2,
                item: createTestSearchResult(22, 33)
            }, {
                id: 3,
                item: createTestSearchResult(44, 55)
            }, {
                id: 4,
                item: createTestSearchResult(55, 66)
            }];
        const initialState = createInitalState(...stops);
        const actual = reducer(initialState, moveItineraryPoint(2, 4, InsertionPosition.BEFORE));
        t.eq(actual.stops, [stops[1], stops[0], stops[2]]);
    });
    test('move after existing itinerary points from higher index to lower index', t => {
        const stops = [{
                id: 2,
                item: createTestSearchResult(22, 33)
            }, {
                id: 3,
                item: createTestSearchResult(44, 55)
            }, {
                id: 4,
                item: createTestSearchResult(55, 66)
            }];
        const initialState = createInitalState(...stops);
        const actual = reducer(initialState, moveItineraryPoint(4, 2, InsertionPosition.AFTER));
        t.eq(actual.stops, [stops[0], stops[2], stops[1]]);
    });
    test('move after existing itinerary points from lower index to higher index', t => {
        const stops = [{
                id: 2,
                item: createTestSearchResult(22, 33)
            }, {
                id: 3,
                item: createTestSearchResult(44, 55)
            }, {
                id: 4,
                item: createTestSearchResult(55, 66)
            }];
        const initialState = createInitalState(...stops);
        const actual = reducer(initialState, moveItineraryPoint(2, 3, InsertionPosition.AFTER));
        t.eq(actual.stops, [stops[1], stops[0], stops[2]]);
    });
    test('reset routes and stop points', t => {
        const initialState = Object.assign(createInitalState({ id: 3, item: createTestSearchResult(1234, 4321) }), {
            routes: [{ geometry: 'bar' }],
            selectedRoute: 0
        });
        const actual = reducer(initialState, resetRoutes());
        t.eq(actual, {
            routes: [],
            stops: [{
                    id: 0,
                    item: null
                }, {
                    id: 1,
                    item: null
                }],
            selectedRoute: 0
        });
    });
    test('set routes', t => {
        const initialState = Object.assign({}, createInitalState({ id: 1, item: createTestSearchResult(1234, 4321) }), {
            selectedRoute: 3
        });
        const actual = reducer(initialState, fetchRoutesWithSuccess([{
                geometry: 'geom',
                duration: 3453,
                distance: 2323
            }]));
        t.eq(actual.stops, [{
                id: 1, item: createTestSearchResult(1234, 4321)
            }], 'should have let the stops untouched');
        t.eq(actual.routes, [{
                geometry: 'geom',
                duration: 3453,
                distance: 2323
            }], 'should have set the new routes');
        t.eq(actual.selectedRoute, 0, 'should have re initialized the selected route');
    });
    test('respond to a GO_TO action, should set the stops state', t => {
        const initialState = createInitalState(createTestSearchResult(1234, 4321), createTestSearchResult(5678, 8765));
        t.eq(reducer(initialState, goTo(createTestSearchResult(6666, 7777))), {
            stops: [{
                    id: 0,
                    item: null
                }, {
                    id: 1,
                    item: createTestSearchResult(6666, 7777)
                }],
            routes: [],
            selectedRoute: 0
        });
    });
    test('respond to a GO_FROM action, should set the stops state', t => {
        const initialState = createInitalState(createTestSearchResult(1234, 4321), createTestSearchResult(5678, 8765));
        t.eq(reducer(initialState, goFrom(createTestSearchResult(6666, 7777))), {
            stops: [{
                    id: 0,
                    item: createTestSearchResult(6666, 7777)
                }, {
                    id: 1,
                    item: null
                }],
            routes: [],
            selectedRoute: 0
        });
    });
    test(`respond to a ${ActionType.SELECT_ROUTE} action with a valid index should select the route`, t => {
        const initialState = Object.assign(createInitalState(), {
            routes: [{
                    geometry: 'route1',
                    duration: 1234,
                    distance: 4321
                }, {
                    geometry: 'route2',
                    duration: 6789,
                    distance: 9876
                }],
            selectedRoute: 1
        });
        const actual = reducer(initialState, selectRoute(0));
        t.eq(actual.routes, initialState.routes, 'routes part of the state should be left untouched');
        t.eq(actual.selectedRoute, 0, 'should have changed the selectedRoute');
    });
    test(`respond to a ${ActionType.SELECT_ROUTE} action with an invalid index should keep the currently selected route`, t => {
        const initialState = Object.assign(createInitalState(), {
            routes: [{
                    geometry: 'route1',
                    duration: 1234,
                    distance: 4321
                }, {
                    geometry: 'route2',
                    duration: 6789,
                    distance: 9876
                }],
            selectedRoute: 1
        });
        const actual = reducer(initialState, selectRoute(2));
        t.eq(actual.routes, initialState.routes, 'routes part of the state should be left untouched');
        t.eq(actual.selectedRoute, 1, 'should have kept the selected route');
    });
};
