import { ActionType } from '../../../src/app/common/actions';
import { fetchLeisureRoutes, fetchLeisureRoutesFromAPI, fetchLeisureRoutesWithFailure, fetchLeisureRoutesWithSuccess } from '../../../src/app/leisure/actions';
export default (a) => {
    a.test(`create a ${ActionType.FETCH_LEISURE_ROUTES} action`, t => {
        t.eq(fetchLeisureRoutes(), { type: ActionType.FETCH_LEISURE_ROUTES }, `action creator should return a ${ActionType.FETCH_LEISURE_ROUTES} action`);
    });
    a.test(`create a ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS}`, t => {
        const leisureRoutes = [{
                id: 5,
                duration: 100,
                distance: 2010,
                description: 'descriptions',
                title: 'A nice promenade',
                geometry: {
                    type: 'LineString',
                    coordinates: 'some encoded string'
                },
                stops: []
            }];
        t.eq(fetchLeisureRoutesWithSuccess(leisureRoutes), {
            type: ActionType.FETCH_LEISURE_ROUTES_SUCCESS,
            result: leisureRoutes
        }, `action creator should return a ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS} action passing the result along`);
    });
    a.test(`create a ${ActionType.FETCH_LEISURE_ROUTES_FAILURE} action`, t => {
        const error = new Error('some unexpected error');
        t.eq(fetchLeisureRoutesWithFailure(error), {
            type: ActionType.FETCH_LEISURE_ROUTES_FAILURE,
            error
        }, `action creator should return a ${ActionType.FETCH_LEISURE_ROUTES_FAILURE} providing the error`);
    });
    a.test('fetch leisure route from API when API returns data', async (t) => {
        const actions = [];
        const thunk = fetchLeisureRoutesFromAPI();
        const leisureRouteStub = [{
                id: 5,
                duration: 100,
                distance: 2010,
                description: 'descriptions',
                title: 'A nice promenade',
                geometry: {
                    type: 'LineString',
                    coordinates: 'some encoded string'
                },
                stops: []
            }];
        const fakeDispatch = a => actions.push(a);
        const fakeLeisure = {
            async searchRoutes() {
                return leisureRouteStub;
            }
        };
        await thunk(fakeDispatch, () => {
        }, {
            //@ts-ignore
            leisure: fakeLeisure
        });
        t.eq(actions.length, 2, 'should have dispatched two actions');
        t.eq(actions[0], { type: ActionType.FETCH_LEISURE_ROUTES }, `first the ${ActionType.FETCH_LEISURE_ROUTES} action`);
        t.eq(actions[1], {
            type: ActionType.FETCH_LEISURE_ROUTES_SUCCESS,
            result: leisureRouteStub
        }, `then the ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS}, forwarding the result from the API call`);
    });
    a.test('fetch leisure route from API when API fails', async (t) => {
        const actions = [];
        const error = new Error('API error');
        const thunk = fetchLeisureRoutesFromAPI();
        const fakeDispatch = a => actions.push(a);
        const fakeLeisure = {
            async searchRoutes() {
                throw error;
            }
        };
        await thunk(fakeDispatch, () => {
        }, 
        //@ts-ignore
        {
            leisure: fakeLeisure
        });
        t.eq(actions.length, 2, 'should have dispatched two actions');
        t.eq(actions[0], { type: ActionType.FETCH_LEISURE_ROUTES }, `first the ${ActionType.FETCH_LEISURE_ROUTES} action`);
        t.eq(actions[1], {
            type: ActionType.FETCH_LEISURE_ROUTES_FAILURE,
            error
        }, `then the ${ActionType.FETCH_LEISURE_ROUTES_FAILURE}, forwarding the error`);
    });
};
