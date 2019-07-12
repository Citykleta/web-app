import {Store} from 'redux';
import {ApplicationState} from '../store/store';
import {View} from './reducer';
import {selectView} from './actions';
import {changeHistoryPoint} from '../common/actions';
import {storage} from '../storage/url';

export interface NavigationService {
    selectView(tool: View): void;

    getView(): View;
}

const navigationActions = {
    selectView
};
export const provider = (store: Store<ApplicationState>, {
    selectView
} = navigationActions): NavigationService => {

    const stateStorage = storage(window);

    window.onpopstate = (ev) => {
        const {state} = ev;
        store.dispatch(changeHistoryPoint(state));
    };

    store.subscribe(async () => {
        const state = store.getState();
        await stateStorage.set(state);
    });

    return {
        selectView(view: View) {
            store.dispatch(selectView(view));
        },
        getView(): View {
            return store.getState().navigation.selectedView;
        }
    };
};
