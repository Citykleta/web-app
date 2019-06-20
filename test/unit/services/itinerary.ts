import {Assert} from 'zora';
import {ApplicationState, store as storeProvider} from '../../../src/app/services/store';
import {Store} from 'redux';
import {defaultState} from '../utils';
import {ItineraryState} from '../../../src/app/reducers/itinerary';


const storeFactory = storeProvider();
const setState = (state: ItineraryState): ApplicationState => Object.assign(defaultState(), {
    itinerary: state
});

const setup = (store: Store<ApplicationState>) => {
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

export default (a: Assert) => {
    const {test} = a;
}
