import { store as storeProvider } from '../../../src/app/services/store';
import { defaultState } from '../utils';
const storeFactory = storeProvider();
const setState = (state) => Object.assign(defaultState(), {
    itinerary: state
});
const setup = (store) => {
    let state = null;
    store.subscribe(() => {
        state = store.getState().itinerary;
    });
    return {
        state() {
            return state;
        }
    };
};
export default (a) => {
    const { test } = a;
};
