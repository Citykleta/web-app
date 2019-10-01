import { d as defaultState, V as View, s as store$1 } from './icons-f5db5bed.js';
import { t as truncate } from './utils-e3a39699.js';

// todo it is a rough serialization could be optimized as we shall know the data structure (to be check too we backward compatibility issues in case of structure changes)
const serializeData = (state) => btoa(JSON.stringify(project(state)));
const deserializeData = (encoded) => JSON.parse(atob(encoded));
const mergeStates = (...states) => {
    const [init, ...rest] = states;
    return rest.reduce((acc, curr) => {
        acc.search = Object.assign({}, acc.search, curr.search);
        acc.itinerary = Object.assign({}, acc.itinerary, curr.itinerary);
        return acc;
    }, init);
};
const project = (state) => {
    switch (state.navigation.selectedView) {
        case View.ITINERARY:
            return { itinerary: { stops: state.itinerary.stops } };
        case View.SEARCH:
            return { search: { selectedSearchResult: state.search.selectedSearchResult } };
        case View.LEISURE:
            return {};
        default:
            return {};
    }
};
const serialize = (state) => {
    const view = state.navigation.selectedView;
    const location = [...state.map.center.map(v => truncate(v, 8)), `${state.map.zoom}z`].join((','));
    const data = serializeData(state);
    return new URL(`/${view.toLowerCase()}/@${location}/data=${data}`, window.location.origin);
};
const viewRegexp = /^(settings|search|itinerary|leisure)/;
const locationRegexp = /^@.*z$/;
const dataRegexp = /^data=/;
const deserialize = (url) => {
    try {
        const parts = url.pathname.split('/');
        const view = parts.find(v => viewRegexp.test(v));
        const location = parts.find(v => locationRegexp.test(v));
        const data = parts.find(v => dataRegexp.test(v));
        let state = defaultState();
        if (view) {
            state.navigation.selectedView = view.toUpperCase();
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
    }
    catch (e) {
        console.log(e);
        return defaultState();
    }
};
const storage = (window) => {
    return {
        async get() {
            return deserialize(window.location.href);
        },
        async set(state) {
            const url = serialize(state);
            if (url.href !== window.location.href) {
                window.history.pushState(state, '', url.pathname);
            }
        }
    };
};

const initialState = deserialize(new URL(window.location.href));
var store = store$1()(initialState);

export { storage as a, store as s };
//# sourceMappingURL=index-656706d2.js.map
