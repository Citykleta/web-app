import { ActionType } from '../../../src/app/actions/types';
import { addItineraryPoint, addItineraryPointWithSideEffects, changeItineraryPointWithSideEffects, fetchRoutes, fetchRoutesFromAPI, fetchRoutesWithFailure, fetchRoutesWithSuccess, InsertionPosition, moveItineraryPoint, moveItineraryPointWithSideEffects, removeItineraryPoint, removeItineraryPointWithSideEffects, resetRoutes, updateItineraryPoint } from '../../../src/app/actions/itinerary';
import { directionsAPIStub, testStore } from '../utils';
import { Theme } from '../../../src/app/reducers/settings';
const setState = (state) => ({
    itinerary: Object.assign({ focus: null }, state),
    settings: {
        theme: Theme.LIGHT
    },
    tool: {
        selectedTool: null
    },
    search: {
        searchResult: [],
        selectedSuggestion: null,
        suggestions: []
    }
});
export default (a) => {
    const { test, skip } = a;
    test('create an ADD_ITINERARY_ACTION without specifying the "before" item', t => {
        const expected = {
            type: ActionType.ADD_ITINERARY_POINT,
            point: {
                lng: -82.396679, lat: 23.115898
            },
            beforeId: null
        };
        t.eq(addItineraryPoint({
            lng: -82.396679,
            lat: 23.115898
        }), expected);
    });
    test('create an create an ADD_ITINERARY_ACTION specifying the "before" item', t => {
        const expected = {
            type: ActionType.ADD_ITINERARY_POINT,
            point: {
                lng: -82.396679, lat: 23.115898
            },
            beforeId: 666
        };
        t.eq(addItineraryPoint({
            lng: -82.396679,
            lat: 23.115898,
        }, 666), expected);
    });
    test('create a REMOVE_ITINERARY_POINT action', t => {
        const expected = {
            type: ActionType.REMOVE_ITINERARY_POINT,
            id: 66
        };
        t.eq(removeItineraryPoint(66), expected);
    });
    test('create a UPDATE_ITINERARY_POINT action', t => {
        const expected = {
            type: ActionType.UPDATE_ITINERARY_POINT,
            id: 42,
            location: {
                lng: -82.396679,
                lat: 23.115898
            }
        };
        t.eq(updateItineraryPoint(42, {
            lng: -82.396679,
            lat: 23.115898
        }), expected);
    });
    test('create a MOVE_ITINERARY_POINT action (insert after)', t => {
        const expected = {
            type: ActionType.MOVE_ITINERARY_POINT,
            sourceId: 2,
            targetId: 4,
            position: InsertionPosition.AFTER
        };
        t.eq(moveItineraryPoint(2, 4, InsertionPosition.AFTER), expected);
    });
    test('create a MOVE_ITINERARY_POINT action (insert before)', t => {
        const expected = {
            type: ActionType.MOVE_ITINERARY_POINT,
            sourceId: 2,
            targetId: 4,
            position: InsertionPosition.BEFORE
        };
        t.eq(moveItineraryPoint(2, 4, InsertionPosition.BEFORE), expected);
    });
    test('create a FETCH_ROUTES action', t => {
        const expected = {
            type: ActionType.FETCH_ROUTES
        };
        t.eq(fetchRoutes(), expected);
    });
    test('create a FETCH_ROUTES_SUCCESS action', t => {
        const expected = {
            type: ActionType.FETCH_ROUTES_SUCCESS,
            routes: [{
                    geometry: 'foo'
                }]
        };
        t.eq(fetchRoutesWithSuccess([{
                geometry: 'foo'
            }]), expected);
    });
    test('create a FETCH_ROUTES_SUCCESS action', t => {
        const expected = {
            type: ActionType.FETCH_ROUTES_SUCCESS,
            routes: [{ geometry: 'foo' }]
        };
        t.eq(fetchRoutesWithSuccess([{ geometry: 'foo' }]), expected);
    });
    test('create a FETCH_ROUTES_FAILURE action', t => {
        const error = new Error('some error');
        const expected = {
            type: ActionType.FETCH_ROUTES_FAILURE,
            error
        };
        t.eq(fetchRoutesWithFailure(error), expected);
    });
    test('create a RESET_ROUTES action', t => {
        const actual = resetRoutes();
        t.eq(actual, { type: ActionType.RESET_ROUTES });
    });
    test('create a FETCH_ROUTES action thunk: successful request', async (t) => {
        // given
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'whatever'
            }]);
        const store = testStore(setState({
            stops: [{ id: 1, lng: 1234, lat: 4321 }, { id: 2, lng: 4321, lat: 1234 }],
            routes: []
        }), {
            directions: sdkMock
        });
        //@ts-ignore
        await store.dispatch(fetchRoutesFromAPI());
        // expectations
        t.eq(sdkMock.calls.length, 1, 'should have been called once');
        t.eq(sdkMock.calls[0], [{ id: 1, lng: 1234, lat: 4321 }, {
                id: 2,
                lng: 4321,
                lat: 1234
            }], 'should have forwarded the arguments');
        t.eq(store.getActions(), [{
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{ geometry: 'whatever' }]
            }]);
    });
    test('create a FETCH_ROUTES action thunk: errored request', async (t) => {
        // given
        const error = new Error('something went wrong');
        const sdkMock = directionsAPIStub();
        sdkMock.reject(error);
        const store = testStore(setState({
            stops: [{ id: 1, lng: 1234, lat: 4321 }, { id: 2, lng: 4321, lat: 1234 }],
            routes: []
        }), { directions: sdkMock });
        //@ts-ignore
        await store.dispatch(fetchRoutesFromAPI());
        //expectations
        t.eq(store.getActions(), [{
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_FAILURE,
                error
            }]);
        t.eq(sdkMock.calls.length, 1, 'should have been called once');
        t.eq(sdkMock.calls[0], [{ id: 1, lng: 1234, lat: 4321 }, {
                id: 2,
                lng: 4321,
                lat: 1234
            }], 'should have forwarded the arguments');
    });
    test('add itinerary point with side effects should not have side effect if there is less than 2 stops', async (t) => {
        // given
        const sdkMock = directionsAPIStub();
        const store = testStore(setState({
            stops: [{ id: 1, lng: 666, lat: 666 }],
            routes: []
        }), {
            directions: sdkMock
        });
        // @ts-ignore
        await store.dispatch(addItineraryPointWithSideEffects({
            lng: 4321,
            lat: 1234
        }));
        t.eq(store.getActions(), [{
                type: ActionType.ADD_ITINERARY_POINT,
                point: {
                    lng: 4321,
                    lat: 1234
                },
                beforeId: null
            }], 'should only dispatched the ADD_ITINERARY_ACTION');
        t.notOk(sdkMock.calls.length, 'should not have tried to fetch remote resource');
    });
    test('add itinerary point with side effects should trigger side effects if there is at least 2 points', async (t) => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geometry'
            }]);
        const store = testStore(setState({
            stops: [
                { id: 1, lng: 666, lat: 666 },
                { id: 2, lng: 4321, lat: 1234 }
            ],
            routes: []
        }), {
            directions: sdkMock
        });
        //@ts-ignore
        await store.dispatch(addItineraryPointWithSideEffects({
            lng: 4321,
            lat: 1234
        }));
        t.eq(store.getActions(), [{
                type: ActionType.ADD_ITINERARY_POINT,
                point: {
                    lat: 1234,
                    lng: 4321
                },
                beforeId: null
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geometry'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
        t.eq(sdkMock.calls[0], [{
                id: 1,
                lng: 666,
                lat: 666
            }, {
                id: 2,
                lng: 4321,
                lat: 1234
            }], 'should have forwarded the stop points lists');
    });
    test('move itinerary point before with side effects should trigger side effects', async (t) => {
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geometry'
            }]);
        const store = testStore(setState({
            stops: [
                { id: 1, lng: 666, lat: 666 },
                { id: 2, lng: 4321, lat: 1234 }
            ],
            routes: []
        }), {
            directions: sdkMock
        });
        //@ts-ignore
        await store.dispatch(moveItineraryPointWithSideEffects(2, 1, InsertionPosition.BEFORE));
        t.eq(store.getActions(), [{
                type: ActionType.MOVE_ITINERARY_POINT,
                sourceId: 2,
                targetId: 1,
                position: InsertionPosition.BEFORE
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geometry'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
        t.eq(sdkMock.calls[0], [{
                id: 1,
                lng: 666,
                lat: 666
            }, {
                id: 2,
                lng: 4321,
                lat: 1234
            }], 'should have forwarded the stop points lists');
    });
    test('move itinerary point after with side effects should trigger side effects', async (t) => {
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geometry'
            }]);
        const store = testStore(setState({
            stops: [
                { id: 1, lng: 666, lat: 666 },
                { id: 2, lng: 4321, lat: 1234 }
            ],
            routes: []
        }), {
            directions: sdkMock
        });
        //@ts-ignore
        await store.dispatch(moveItineraryPointWithSideEffects(1, 2, InsertionPosition.AFTER));
        t.eq(store.getActions(), [{
                type: ActionType.MOVE_ITINERARY_POINT,
                sourceId: 1,
                targetId: 2,
                position: InsertionPosition.AFTER
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geometry'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
        t.eq(sdkMock.calls[0], [{
                id: 1,
                lng: 666,
                lat: 666
            }, {
                id: 2,
                lng: 4321,
                lat: 1234
            }], 'should have forwarded the stop points lists');
    });
    test('remove itinerary point with side effects should not have side effect if there is less than 2 stops', async (t) => {
        // given
        const sdkMock = directionsAPIStub();
        const store = testStore(setState({
            stops: [{ id: 1, lng: 666, lat: 666 }],
            routes: []
        }), {
            directions: sdkMock
        });
        // @ts-ignore
        await store.dispatch(removeItineraryPointWithSideEffects(3));
        t.eq(store.getActions(), [{
                type: ActionType.REMOVE_ITINERARY_POINT,
                id: 3
            }], 'should only dispatched the ADD_ITINERARY_ACTION');
        t.notOk(sdkMock.calls.length, 'should not have tried to fetch remote resource');
    });
    test('remove itinerary point with side effects should trigger side effects if there is at least 2 points', async (t) => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geometry'
            }]);
        const store = testStore(setState({
            stops: [
                { id: 1, lng: 666, lat: 666 },
                { id: 2, lng: 4321, lat: 1234 }
            ],
            routes: []
        }), {
            directions: sdkMock
        });
        //@ts-ignore
        await store.dispatch(removeItineraryPointWithSideEffects(3));
        t.eq(store.getActions(), [{
                type: ActionType.REMOVE_ITINERARY_POINT,
                id: 3
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geometry'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
        t.eq(sdkMock.calls[0], [{
                id: 1,
                lng: 666,
                lat: 666
            }, {
                id: 2,
                lng: 4321,
                lat: 1234
            }], 'should have forwarded the stop points lists');
    });
    test('change itinerary point location with side effects should not have side effect if there is less than 2 stops', async (t) => {
        // given
        const sdkMock = directionsAPIStub();
        const store = testStore(setState({
            stops: [{ id: 1, lng: 666, lat: 666 }],
            routes: []
        }), {
            directions: sdkMock
        });
        // @ts-ignore
        await store.dispatch(updateItineraryPoint(1, { lng: 666, lat: 666 }));
        t.eq(store.getActions(), [{
                type: ActionType.UPDATE_ITINERARY_POINT,
                id: 1,
                location: { lng: 666, lat: 666 }
            }], 'should only dispatched the ADD_ITINERARY_ACTION');
        t.notOk(sdkMock.calls.length, 'should not have tried to fetch remote resource');
    });
    test('change itinerary point location with side effects should trigger side effects if there is at least 2 points', async (t) => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geometry'
            }]);
        const store = testStore(setState({
            stops: [
                { id: 1, lng: 666, lat: 666 },
                { id: 2, lng: 4321, lat: 1234 }
            ],
            routes: []
        }), {
            directions: sdkMock
        });
        //@ts-ignore
        await store.dispatch(changeItineraryPointWithSideEffects(1, { lng: 666, lat: 666 }));
        t.eq(store.getActions(), [{
                type: ActionType.UPDATE_ITINERARY_POINT,
                id: 1,
                location: {
                    lng: 666,
                    lat: 666
                }
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geometry'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
        t.eq(sdkMock.calls[0], [{
                id: 1,
                lng: 666,
                lat: 666
            }, {
                id: 2,
                lng: 4321,
                lat: 1234
            }], 'should have forwarded the stop points lists');
    });
    test('create MOVE_ITINERARY_POINT action', t => {
        const action = moveItineraryPoint(3, 5, InsertionPosition.AFTER);
        t.eq(action, {
            type: ActionType.MOVE_ITINERARY_POINT,
            sourceId: 3,
            targetId: 5,
            position: InsertionPosition.AFTER
        });
    });
    test('move itinerary point with side effects should trigger side effects when there are at least two points', async (t) => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geometry'
            }]);
        const store = testStore(setState({
            stops: [
                { id: 1, lng: 666, lat: 666 },
                { id: 2, lng: 4321, lat: 1234 }
            ],
            routes: []
        }), {
            directions: sdkMock
        });
        //@ts-ignore
        await store.dispatch(moveItineraryPointWithSideEffects(2, 1, InsertionPosition.BEFORE));
        t.eq(store.getActions(), [{
                type: ActionType.MOVE_ITINERARY_POINT,
                sourceId: 2,
                targetId: 1,
                position: InsertionPosition.BEFORE
            }, {
                type: ActionType.FETCH_ROUTES
            }, {
                type: ActionType.FETCH_ROUTES_SUCCESS,
                routes: [{
                        geometry: 'geometry'
                    }]
            }]);
        t.eq(sdkMock.calls.length, 1, 'should have tried to fetch the remote resource');
        t.eq(sdkMock.calls[0], [{
                id: 1,
                lng: 666,
                lat: 666
            }, {
                id: 2,
                lng: 4321,
                lat: 1234
            }], 'should have forwarded the stop points lists');
    });
    test('move itinerary point with side effects should not trigger side effects when there is only one point', async (t) => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
                geometry: 'geometry'
            }]);
        const store = testStore(setState({
            stops: [
                { id: 1 },
                { id: 2, lng: 4321, lat: 1234 }
            ],
            routes: []
        }), {
            directions: sdkMock
        });
        //@ts-ignore
        await store.dispatch(moveItineraryPointWithSideEffects(2, 1, InsertionPosition.BEFORE));
        t.eq(store.getActions(), [{
                type: ActionType.MOVE_ITINERARY_POINT,
                sourceId: 2,
                targetId: 1,
                position: InsertionPosition.BEFORE
            }]);
        t.eq(sdkMock.calls.length, 0, 'should not have fetched routes');
    });
};
