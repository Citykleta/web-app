import { reducer } from '../../../src/app/leisure/reducer';
import { selectView } from '../../../src/app/navigation/actions';
import { View } from '../../../src/app/navigation/reducer';
import { ActionType } from '../../../src/app/common/actions';
import { fetchLeisureRoutes, fetchLeisureRoutesWithFailure, fetchLeisureRoutesWithSuccess, selectLeisureRoute } from '../../../src/app/leisure/actions';
const createInitialState = (routes = []) => ({
    isSearching: false,
    selectedRouteId: null,
    routes,
    selectedStopIndex: null
});
export default (a) => {
    a.test(`unrelated action`, t => {
        t.eq(reducer(createInitialState(), selectView(View.LEISURE)), {
            isSearching: false,
            selectedRouteId: null,
            routes: [],
            selectedStopIndex: null
        });
    });
    a.test(`react to ${ActionType.FETCH_LEISURE_ROUTES} action`, t => {
        t.eq(reducer(createInitialState(), fetchLeisureRoutes()), {
            isSearching: true,
            selectedRouteId: null,
            routes: [],
            selectedStopIndex: null
        }, 'should be put into searching mode');
    });
    a.test(`react to ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS} action when result is not empty`, t => {
        const routes = [{
                id: 8,
                title: 'first balade',
                description: 'a nice one',
                stops: [],
                duration: 2000,
                distance: 3000,
                geometry: {
                    type: 'LineString',
                    coordinates: 'some encoded stuff'
                }
            }, {
                id: 66,
                title: 'second balade',
                description: 'a nicer one',
                stops: [],
                duration: 124,
                distance: 432,
                geometry: {
                    type: 'LineString',
                    coordinates: 'some encoded stuff'
                }
            }];
        t.eq(reducer(createInitialState(routes), fetchLeisureRoutesWithSuccess(routes)), {
            isSearching: false,
            routes,
            selectedRouteId: 8,
            selectedStopIndex: 0
        });
    });
    a.test(`react to ${ActionType.FETCH_LEISURE_ROUTES_SUCCESS} action when result is not empty`, t => {
        const routes = [];
        t.eq(reducer(createInitialState(routes), fetchLeisureRoutesWithSuccess(routes)), {
            isSearching: false,
            routes,
            selectedRouteId: null,
            selectedStopIndex: null
        });
    });
    a.test(`react to ${ActionType.SELECT_LEISURE_ROUTE} action`, t => {
        const routes = [{
                id: 8,
                title: 'first balade',
                description: 'a nice one',
                stops: [],
                duration: 2000,
                distance: 3000,
                geometry: {
                    type: 'LineString',
                    coordinates: 'some encoded stuff'
                }
            }, {
                id: 66,
                title: 'second balade',
                description: 'a nicer one',
                stops: [],
                duration: 124,
                distance: 432,
                geometry: {
                    type: 'LineString',
                    coordinates: 'some encoded stuff'
                }
            }];
        const leisureState = createInitialState(routes);
        leisureState.selectedRouteId = 8;
        t.eq(reducer(leisureState, selectLeisureRoute(66)), {
            isSearching: false,
            routes,
            selectedRouteId: 66,
            selectedStopIndex: 0
        });
    });
    a.test(`react to ${ActionType.SELECT_LEISURE_ROUTE} action when route id does not match any route`, t => {
        const routes = [{
                id: 8,
                title: 'first balade',
                description: 'a nice one',
                stops: [],
                duration: 2000,
                distance: 3000,
                geometry: {
                    type: 'LineString',
                    coordinates: 'some encoded stuff'
                }
            }, {
                id: 66,
                title: 'second balade',
                description: 'a nicer one',
                stops: [],
                duration: 124,
                distance: 432,
                geometry: {
                    type: 'LineString',
                    coordinates: 'some encoded stuff'
                }
            }];
        const leisureState = createInitialState(routes);
        leisureState.selectedRouteId = 8;
        t.eq(reducer(leisureState, selectLeisureRoute(999)), {
            isSearching: false,
            routes,
            selectedRouteId: 8,
            selectedStopIndex: 0
        });
    });
    a.test(`react to ${ActionType.FETCH_LEISURE_ROUTES_FAILURE} action`, t => {
        const error = new Error('oops');
        const leisureState = createInitialState();
        leisureState.isSearching = true;
        t.eq(reducer(leisureState, fetchLeisureRoutesWithFailure(error)), {
            isSearching: false,
            routes: [],
            selectedRouteId: null,
            selectedStopIndex: null
        }, 'should have reset the isSearching to false');
    });
};
