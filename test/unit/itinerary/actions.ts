import {ActionType} from '../../../src/app/common/actions';
import {
    addItineraryPoint,
    AddItineraryPointAction,
    addItineraryPointWithSideEffects,
    changeItineraryPointWithSideEffects,
    fetchRoutes,
    FetchRoutesAction,
    FetchRoutesFailureAction,
    fetchRoutesFromAPI,
    FetchRoutesSuccessAction,
    fetchRoutesWithFailure,
    fetchRoutesWithSuccess,
    goFrom,
    goTo,
    InsertionPosition,
    moveItineraryPoint,
    MoveItineraryPointAction,
    moveItineraryPointWithSideEffects,
    removeItineraryPoint,
    RemoveItineraryPointAction,
    removeItineraryPointWithSideEffects,
    resetRoutes,
    updateItineraryPoint,
    UpdateItineraryPointAction
} from '../../../src/app/itinerary/actions';
import {createTestSearchResult, defaultState, directionsAPIStub, testStore} from '../utils';
import {ItineraryState} from '../../../src/app/itinerary/reducer';
import {ApplicationState} from '../../../src/app/store/store';
import {GeoCoordSearchResult} from '../../../src/app/utils';
import {Assert} from 'zora';

const setState = (state: ItineraryState): ApplicationState => ({
    ...defaultState(),
    itinerary: state
});

export default (a: Assert) => {
    const {test, skip} = a;
    test('create an ADD_ITINERARY_ACTION without specifying the "before" item', t => {
        const expected: AddItineraryPointAction = {
            type: ActionType.ADD_ITINERARY_POINT,
            point: <GeoCoordSearchResult>{
                type: 'lng_lat',
                lng: -82.396679,
                lat: 23.115898
            },
            beforeId: null
        };

        t.eq(addItineraryPoint(<GeoCoordSearchResult>{
            type: 'lng_lat',
            lng: -82.396679,
            lat: 23.115898
        }), expected);
    });

    test('create an create an ADD_ITINERARY_ACTION specifying the "before" item', t => {
        const expected: AddItineraryPointAction = {
            type: ActionType.ADD_ITINERARY_POINT,
            point: <GeoCoordSearchResult>{
                type: 'lng_lat',
                lng: -82.396679,
                lat: 23.115898
            },
            beforeId: 666
        };

        t.eq(addItineraryPoint(<GeoCoordSearchResult>{
            type: 'lng_lat',
            lng: -82.396679,
            lat: 23.115898,
        }, 666), expected);
    });

    test('create a REMOVE_ITINERARY_POINT action', t => {
        const expected: RemoveItineraryPointAction = {
            type: ActionType.REMOVE_ITINERARY_POINT,
            id: 66
        };

        t.eq(removeItineraryPoint(66), expected);
    });

    test('create a UPDATE_ITINERARY_POINT action', t => {
        const expected: UpdateItineraryPointAction = {
            type: ActionType.UPDATE_ITINERARY_POINT,
            id: 42,
            location: <GeoCoordSearchResult>{
                type: 'lng_lat',
                lng: -82.396679,
                lat: 23.115898
            }
        };

        t.eq(updateItineraryPoint(42, <GeoCoordSearchResult>{
            type: 'lng_lat',
            lng: -82.396679,
            lat: 23.115898
        }), expected);
    });

    test('create a MOVE_ITINERARY_POINT action (insert after)', t => {
        const expected: MoveItineraryPointAction = {
            type: ActionType.MOVE_ITINERARY_POINT,
            sourceId: 2,
            targetId: 4,
            position: InsertionPosition.AFTER
        };

        t.eq(moveItineraryPoint(2, 4, InsertionPosition.AFTER), expected);
    });

    test('create a MOVE_ITINERARY_POINT action (insert before)', t => {
        const expected: MoveItineraryPointAction = {
            type: ActionType.MOVE_ITINERARY_POINT,
            sourceId: 2,
            targetId: 5,
            position: InsertionPosition.BEFORE
        };

        t.eq(moveItineraryPoint(2, 5, InsertionPosition.BEFORE), expected);
    });

    test('create a FETCH_ROUTES action', t => {
        const expected: FetchRoutesAction = {
            type: ActionType.FETCH_ROUTES
        };

        t.eq(fetchRoutes(), expected);
    });

    test('create a FETCH_ROUTES_SUCCESS action', t => {
        const expected: FetchRoutesSuccessAction = {
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
        const expected: FetchRoutesSuccessAction = {
            type: ActionType.FETCH_ROUTES_SUCCESS,
            routes: [{geometry: 'foo'}]
        };

        t.eq(fetchRoutesWithSuccess([{geometry: 'foo'}]), expected);
    });

    test('create a FETCH_ROUTES_FAILURE action', t => {

        const error = new Error('some error');

        const expected: FetchRoutesFailureAction = {
            type: ActionType.FETCH_ROUTES_FAILURE,
            error
        };

        t.eq(fetchRoutesWithFailure(error), expected);
    });

    test('create a RESET_ROUTES action', t => {
        const actual = resetRoutes();
        t.eq(actual, {type: ActionType.RESET_ROUTES});
    });

    test('create a FETCH_ROUTES action thunk: successful request', async t => {
        // given
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
            geometry: 'whatever'
        }]);
        const store = testStore(setState({
                stops: [
                    {id: 1, item: createTestSearchResult(1234, 4321)},
                    {id: 2, item: createTestSearchResult(4321, 1234)}
                ],
                routes: []
            }
        ), {
            directions: sdkMock
        });

        //@ts-ignore
        await store.dispatch(fetchRoutesFromAPI());

        // expectations
        t.eq(sdkMock.calls.length, 1, 'should have been called once');
        t.eq(sdkMock.calls[0], [{lng: 1234, lat: 4321}, {
            lng: 4321,
            lat: 1234
        }], 'should have forwarded the arguments');
        t.eq(store.getActions(), [{
            type: ActionType.FETCH_ROUTES
        }, {
            type: ActionType.FETCH_ROUTES_SUCCESS,
            routes: [{geometry: 'whatever'}]
        }]);
    });

    test('create a FETCH_ROUTES action thunk: errored request', async t => {
        // given
        const error = new Error('something went wrong');
        const sdkMock = directionsAPIStub();
        sdkMock.reject(error);
        const store = testStore(setState({
            stops: [{id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 1234, lat: 4321}}, {
                id: 2,
                item: {type: 'lng_lat', lng: 4321, lat: 1234}
            }],
            routes: []
        }), {directions: sdkMock});

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
        t.eq(sdkMock.calls[0], [{lng: 1234, lat: 4321}, {
            lng: 4321,
            lat: 1234
        }], 'should have forwarded the arguments');
    });

    test('add itinerary point with side effects should not have side effect if there is less than 2 stops', async t => {
        // given
        const sdkMock = directionsAPIStub();
        const store = testStore(setState({
            stops: [{id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}}],
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

    test('add itinerary point with side effects should trigger side effects if there is at least 2 points', async t => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
            geometry: 'geometry'
        }]);
        const store = testStore(setState({
            stops: [
                {id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}},
                {id: 2, item: {type: 'lng_lat', lng: 4321, lat: 1234}}
            ],
            routes: []
        }), {
            directions: sdkMock
        });

        //@ts-ignore
        await store.dispatch(addItineraryPointWithSideEffects({
            type: 'lng_lat',
            lng: 4321,
            lat: 1234
        }));
        t.eq(store.getActions(), [{
            type: ActionType.ADD_ITINERARY_POINT,
            point: {
                type: 'lng_lat',
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
            lng: 666,
            lat: 666
        }, {
            lng: 4321,
            lat: 1234
        }], 'should have forwarded the stop points lists');
    });

    test('move itinerary point before with side effects should trigger side effects', async t => {
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
            geometry: 'geometry'
        }]);
        const store = testStore(setState({
            stops: [
                {id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}},
                {id: 2, item: {type: 'lng_lat', lng: 4321, lat: 1234}}
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
            lng: 666,
            lat: 666
        }, {
            lng: 4321,
            lat: 1234
        }], 'should have forwarded the stop points lists');
    });

    test('move itinerary point after with side effects should trigger side effects', async t => {
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
            geometry: 'geometry'
        }]);
        const store = testStore(setState({
            stops: [
                {id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}},
                {id: 2, item: {type: 'lng_lat', lng: 4321, lat: 1234}}
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
            lng: 666,
            lat: 666
        }, {
            lng: 4321,
            lat: 1234
        }], 'should have forwarded the stop points lists');
    });

    test('remove itinerary point with side effects should not have side effect if there is less than 2 stops', async t => {
        // given
        const sdkMock = directionsAPIStub();
        const store = testStore(setState({
            stops: [{id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}}],
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

    test('remove itinerary point with side effects should trigger side effects if there is at least 2 points', async t => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
            geometry: 'geometry'
        }]);
        const store = testStore(setState({
            stops: [
                {id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}},
                {id: 2, item: {type: 'lng_lat', lng: 4321, lat: 1234}}
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
            lng: 666,
            lat: 666
        }, {
            lng: 4321,
            lat: 1234
        }], 'should have forwarded the stop points lists');
    });

    test('change itinerary point location with side effects should not have side effect if there is less than 2 stops', async t => {
        // given
        const sdkMock = directionsAPIStub();
        const store = testStore(setState({
            stops: [{id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}}],
            routes: []
        }), {
            directions: sdkMock
        });

        // @ts-ignore
        await store.dispatch(updateItineraryPoint(1, {lng: 666, lat: 666}));

        t.eq(store.getActions(), [{
            type: ActionType.UPDATE_ITINERARY_POINT,
            id: 1,
            location: {lng: 666, lat: 666}
        }], 'should only dispatched the ADD_ITINERARY_ACTION');
        t.notOk(sdkMock.calls.length, 'should not have tried to fetch remote resource');
    });

    test('change itinerary point location with side effects should trigger side effects if there is at least 2 points', async t => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
            geometry: 'geometry'
        }]);
        const store = testStore(setState({
            stops: [
                {id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}},
                {id: 2, item: {type: 'lng_lat', lng: 4321, lat: 1234}}
            ],
            routes: []
        }), {
            directions: sdkMock
        });

        //@ts-ignore
        await store.dispatch(changeItineraryPointWithSideEffects(1, {type: 'lng_lat', lng: 666, lat: 666}));
        t.eq(store.getActions(), [{
            type: ActionType.UPDATE_ITINERARY_POINT,
            id: 1,
            location: {
                type: 'lng_lat',
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
            lng: 666,
            lat: 666
        }, {
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

    test('move itinerary point with side effects should trigger side effects when there are at least two points', async t => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
            geometry: 'geometry'
        }]);
        const store = testStore(setState({
            stops: [
                {id: 1, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 666, lat: 666}},
                {id: 2, item: {type: 'lng_lat', lng: 4321, lat: 1234}}
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
            lng: 666,
            lat: 666
        }, {
            lng: 4321,
            lat: 1234
        }], 'should have forwarded the stop points lists');
    });

    test('move itinerary point with side effects should not trigger side effects when there is only one point', async t => {
        // given a fake store
        const sdkMock = directionsAPIStub();
        sdkMock.resolve([{
            geometry: 'geometry'
        }]);
        const store = testStore(setState({
            stops: [
                {id: 1, item: null},
                {id: 2, item: <GeoCoordSearchResult>{type: 'lng_lat', lng: 4321, lat: 1234}}
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

    test('go to action: should create a goTo action', t => {
        t.eq(goTo(<GeoCoordSearchResult>{
            type: 'lng_lat',
            lng: 12345,
            lat: 54321
        }), {
            type: ActionType.GO_TO,
            location: <GeoCoordSearchResult>{
                type: 'lng_lat',
                lng: 12345,
                lat: 54321
            }
        });
    });

    test('go from action: should create a goFrom action', t => {
        t.eq(goFrom(<GeoCoordSearchResult>{
            type: 'lng_lat',
            lng: 12345,
            lat: 54321
        }), {
            type: ActionType.GO_FROM,
            location: <GeoCoordSearchResult>{
                type: 'lng_lat',
                lng: 12345,
                lat: 54321
            }
        });

    });
}