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
                id: 0
            }, {
                id: 1
            }]
    },
    settings: {
        theme: Theme.LIGHT
    },
    search: {
        selectedSuggestion: null,
        suggestions: []
    }
});
export const spy = (fn) => {
    const calls = [];
    const outputFn = (...args) => {
        calls.push([...args]);
        return fn(...args);
    };
    return Object.defineProperty(outputFn, 'calls', {
        get() {
            return calls;
        }
    });
};
