import {ApplicationState, defaultState} from '../store/store';
import {truncate} from '../utils';
import {View} from './reducer';

const viewRegexp = /^(settings|search|itinerary)/;
const locationRegexp = /^@.*z$/;
const dataRegexp = /^data=/;

export const mergeStates = (...states) => {
    return states.reduce((acc, curr) => {
        acc.search = Object.assign({}, acc.search, curr.search);
        acc.itinerary = Object.assign({}, acc.itinerary, curr.itinerary);
        return acc;
    }, Object.assign({}, defaultState));
};

export const fromUrlToState = (url: URL): ApplicationState => {
    try {
        const parts = url.pathname.split('/');
        const view = parts.find(v => viewRegexp.test(v));
        const location = parts.find(v => locationRegexp.test(v));
        const data = parts.find(v => dataRegexp.test(v));

        let state = Object.assign({}, defaultState);

        if (view) {
            state.navigation.selectedView = <View>view.toUpperCase();
        }

        if (location) {
            const [lng, lat, zoom] = location.slice(1).split(',');
            state.map.center = [Number(lng), Number(lat)];
            state.map.zoom = Number(zoom.slice(0, zoom.length - 1));
        }

        if (data) {
            const decoded = deserializeData(data.slice(5));
            state = mergeStates(state, decoded);
        }

        return state;
    } catch (e) {
        console.log(e);
        return Object.assign({}, defaultState);
    }
};

const project = (state: ApplicationState) => {
    switch (state.navigation.selectedView) {
        case View.ITINERARY:
            return {itinerary: {stops: state.itinerary.stops}};
        case View.SEARCH:
            return {search: {selectedSearchResult: state.search.selectedSearchResult}};
        default:
            return {};
    }
};

// todo it is a rough serialization could be optimized as we shall know the data structure (to be check too we backward compatibility issues in case of structure changes)
const serializeData = (state: ApplicationState): string => btoa(JSON.stringify(project(state)));
const deserializeData = (encoded: string) => JSON.parse(atob(encoded));

export const fromStateToUrl = (state: ApplicationState): URL => {
    const view = state.navigation.selectedView;
    const location = [...state.map.center.map(v => truncate(v, 8)), `${state.map.zoom}z`].join((','));
    const data = serializeData(state);
    return new URL(`/${view.toLowerCase()}/@${location}/data=${data}`, window.location.origin);
};
