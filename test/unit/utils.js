import { applyMiddleware, createStore } from 'redux';
import thunk from 'redux-thunk';
import { Theme } from '../../src/app/reducers/settings';
export const testStore = (state, extraArgs) => {
    let actions = [];
    const collectActionsMiddleware = store => next => action => {
        actions.push(action);
        return next(action);
    };
    const enhancer = applyMiddleware(thunk.withExtraArgument(extraArgs), collectActionsMiddleware);
    //@ts-ignore
    return Object.assign(createStore(state => state, state, enhancer), {
        getActions() {
            return actions;
        }
    });
};
export const directionsAPIStub = () => {
    const calls = [];
    let reason = null;
    let resolve = null;
    return Object.defineProperties({
        async search(points) {
            calls.push(points);
            if (reason !== null) {
                throw reason;
            }
            return resolve;
        },
        resolve(value) {
            resolve = value;
        },
        reject(reasonValue) {
            reason = reasonValue;
        }
    }, {
        calls: {
            get() {
                return calls;
            }
        }
    });
};
export const defaultState = () => ({
    tool: {
        selectedTool: null
    },
    itinerary: {
        routes: [],
        stops: [{
                id: 0,
                item: null
            }, {
                id: 1,
                item: null
            }]
    },
    settings: {
        theme: Theme.LIGHT
    },
    search: {
        isSearching: false,
        searchResult: [],
        selectedSearchResult: null
    }
});
export const stubFactory = name => () => {
    const calls = [];
    return {
        [name]: (...args) => {
            calls.push(args);
            return args;
        },
        hasBeenCalled(count = 1) {
            return calls.length === count;
        },
        getCall(index = 0) {
            return calls[index];
        }
    };
};
export const createTestSearchResult = (lng, lat) => ({
    type: 'lng_lat',
    lng,
    lat
});
