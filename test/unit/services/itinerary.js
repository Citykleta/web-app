import { store as storeProvider } from '../../../src/app/services/store';
import { provider } from '../../../src/app/services/itinerary';
import { defaultState, directionsAPIStub, testStore } from '../utils';
import { ActionType } from '../../../src/app/actions/types';
const storeFactory = storeProvider();
const setup = (store) => {
    let state = null;
    store.subscribe(() => {
        state = store.getState().itinerary;
    });
    return {
        state() {
            return state;
        }
    };
};
export default (a) => {
    const { test } = a;
    test('add point the first point: no side effect should occur', async (t) => {
        const sdkMock = directionsAPIStub();
        const newPoint = { lng: 1234, lat: 4321, id: 1 };
        const store = testStore({
            itinerary: {
                routes: [],
                stops: [newPoint]
            },
            tool: {
                selectedTool: null
            }
        }, {
            directions: sdkMock
        });
        const service = provider(store);
        await service.addPoint(newPoint);
        t.eq(store.getActions(), [{
                type: ActionType.ADD_ITINERARY_POINT,
                point: newPoint,
                beforeId: null
            }]);
        t.ok(sdkMock.calls.length === 0);
    });
    test('add a second point: routes should be fetched', async (t) => {
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geom'
            }]);
        const newPoint = { lng: 666, lat: 777, id: 2 };
        const initialState = Object.assign(defaultState(), {
            itinerary: {
                stops: [{ lng: 1234, lat: 4321, id: 1 }, newPoint],
                routes: []
            }
        });
        const store = testStore(initialState, {
            directions: sdkMock
        });
        const service = provider(store);
        await service.addPoint(newPoint);
        t.eq(store.getActions(), [{
                type: ActionType.ADD_ITINERARY_POINT,
                point: newPoint,
                beforeId: null
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geom'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'remote service should have been called');
        t.eq(sdkMock.calls[0], [
            { lng: 1234, lat: 4321, id: 1 },
            { lng: 666, lat: 777, id: 2 }
        ]);
    });
    test('add a second point by specifying the insertion position', async (t) => {
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geom'
            }]);
        const firstPoint = { lng: 1234, lat: 4321, id: 6 };
        const newPoint = { lng: 666, lat: 777, id: 7 };
        const initialState = Object.assign(defaultState(), {
            itinerary: {
                stops: [newPoint, firstPoint],
                routes: []
            }
        });
        const store = testStore(initialState, {
            directions: sdkMock
        });
        const service = provider(store);
        await service.addPoint(newPoint, firstPoint);
        t.eq(store.getActions(), [{
                type: ActionType.ADD_ITINERARY_POINT,
                point: newPoint,
                beforeId: 6
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geom'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'remote service should have been called');
        t.eq(sdkMock.calls[0], [
            newPoint,
            firstPoint
        ]);
    });
    test('remove point no side effects as there is only one point left', async (t) => {
        const sdkMock = directionsAPIStub();
        const store = testStore({
            itinerary: {
                routes: [],
                stops: [{ lng: 1234, lat: 4321, id: 1 }]
            },
            tool: {
                selectedTool: null
            }
        }, {
            directions: sdkMock
        });
        const service = provider(store);
        await service.removePoint({ lng: 35345, lat: 2423, id: 4 });
        t.eq(store.getActions(), [{
                type: ActionType.REMOVE_ITINERARY_POINT,
                id: 4,
            }]);
        t.ok(sdkMock.calls.length === 0);
    });
    test('remove point should trigger remote fetch as there are still at least two points left', async (t) => {
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geom'
            }]);
        const stops = [{ lng: 1234, lat: 4321, id: 1 }, { lng: 666, lat: 777, id: 2 }];
        const initialState = Object.assign(defaultState(), {
            itinerary: {
                stops,
                routes: []
            }
        });
        const store = testStore(initialState, {
            directions: sdkMock
        });
        const service = provider(store);
        await service.removePoint({ lng: 35345, lat: 2423, id: 4 });
        t.eq(store.getActions(), [{
                type: ActionType.REMOVE_ITINERARY_POINT,
                id: 4
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geom'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'remote service should have been called');
        t.eq(sdkMock.calls[0], stops);
    });
    test('reset should remove all the stops points of the list', t => {
        const store = storeFactory();
        const { state } = setup(store);
        const service = provider(store);
        service.addPoint({ lng: 1234, lat: 1234 });
        service.addPoint({ lng: 12345, lat: 5432 });
        t.eq(state(), {
            stops: [{
                    id: 0, lng: 1234, lat: 1234
                }, {
                    id: 1, lng: 12345, lat: 5432
                }],
            routes: []
        });
        service.reset();
        t.eq(state(), {
            stops: [],
            routes: []
        });
    });
    a.skip('move before', t => {
        t.fail('not implemented');
    });
    a.skip('move after', t => {
        t.fail('not implemented');
    });
};
