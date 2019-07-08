import {Directions} from '../../src/sdk/directions';
import {ApplicationState} from '../../src/app/store/store';
import {AnyAction, applyMiddleware, createStore, Store} from 'redux';
import thunk from 'redux-thunk';
import {Theme} from '../../src/app/settings/reducer';
import {GeoCoord, GeoCoordSearchResult, Route} from '../../src/app/utils';
import {View} from '../../src/app/navigation/reducer';

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
    navigation: {
        selectedView: View.SEARCH
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
    },
    map: {
        center: [-82.367408, 23.122419],
        zoom: 12.4,
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

export const createTestSearchResult = (lng: number, lat: number): GeoCoordSearchResult => ({
    type: 'lng_lat',
    lng,
    lat
});
