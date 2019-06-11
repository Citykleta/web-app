import {Directions} from '../../src/app/sdk/directions';
import {ApplicationState} from '../../src/app/services/store';
import {AnyAction, applyMiddleware, createStore, Store} from 'redux';
import thunk from 'redux-thunk';
import {Theme} from '../../src/app/reducers/settings';
import {GeoCoord, GeoCoordSearchResult, Route} from '../../src/app/utils';

interface DirectionsAPIStub extends Directions {
    readonly calls: any[];

    resolve(value: Route[]): void;

    reject(reason: any): void;
}

interface TestStore extends Store<ApplicationState> {
    getActions(): AnyAction[];
}

export const testStore = (state: ApplicationState, extraArgs: any): TestStore => {

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

export const directionsAPIStub = (): DirectionsAPIStub => {
    const calls: Array<GeoCoord[]> = [];
    let reason = null;
    let resolve = null;

    return Object.defineProperties({
        async search(points: GeoCoord[]) {

            calls.push(points);

            if (reason !== null) {
                throw reason;
            }
            return resolve;
        },
        resolve(value) {
            resolve = value;
        },
        reject(reasonValue: any) {
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

export const defaultState = (): ApplicationState => ({
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

export const spy = (fn: Function) => {
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

export const createTestSearchResult = (lng: number, lat: number): GeoCoordSearchResult => ({
    type: 'lng_lat',
    lng,
    lat
});
