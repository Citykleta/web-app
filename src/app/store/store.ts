import {Action, applyMiddleware, createStore, Store} from 'redux';
import thunk, {ThunkDispatch} from 'redux-thunk';
import {defaultState as defaultItineraryState, ItineraryState} from '../itinerary/reducer';
import {Directions, factory as directionsAPI} from '../../sdk/directions';
import {factory as geocoderAPI, Geocoder,} from '../../sdk/geocoder';
import {defaultState as defaultSettingsState, SettingsState} from '../settings/reducer';
import {defaultState as defaultSearchState, SearchState} from '../search/reducers';
import apiConf from '../../conf/api';
import {defaultState as defaultMapState, MapState} from '../map/reducer';
import {
    defaultState as defaultNavigationState,
    NavigationState,
    reducer as navigationReducer
} from '../navigation/reducer';
import {createReducer} from './combine-reducer';

export interface ApplicationState {
    itinerary: ItineraryState;
    settings: SettingsState,
    search: SearchState,
    map: MapState,
    navigation: NavigationState
}

export interface API {
    directions: Directions
    geocoder: Geocoder
}

const debugMiddleware = store => next => action => {
    console.log(action);
    return next(action);
};

export const defaultState = () => ({
    navigation: defaultNavigationState(),
    itinerary: defaultItineraryState(),
    search: defaultSearchState(),
    settings: defaultSettingsState(),
    map: defaultMapState()
});

const defaultAPI = {
    directions: directionsAPI({
        endpoint: apiConf.endpoint
    }),
    geocoder: geocoderAPI({
        endpoint: apiConf.endpoint
    })
};

// placeholder for dynamically injected reducers
const passThroughReducer = (state = {}) => state;

export const store = (api: API = defaultAPI) => (initialState: ApplicationState = defaultState()): Store<ApplicationState> => {

    const staticReducer = {
        navigation: navigationReducer,
        map: passThroughReducer,
        itinerary: passThroughReducer,
        settings: passThroughReducer,
        search: passThroughReducer
    };

    // @ts-ignore
    const store = createStore(createReducer(staticReducer), initialState, applyMiddleware(thunk.withExtraArgument<API>(api),
        // debugMiddleware
    ));

    const dynamicReducers = {};

    // @ts-ignore
    return Object.assign(store, {
        injectReducer(key, reducer) {
            dynamicReducers[key] = reducer;
            store.replaceReducer(createReducer(Object.assign({}, staticReducer, dynamicReducers)));
        }
    });
};

export interface EnhancedDispatch<K extends Action<any>> extends ThunkDispatch<ApplicationState, API, K> {
}
