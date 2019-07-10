import {Store} from 'redux';
import {ApplicationState} from '../store/store';
import {View} from './reducer';
import {selectView} from './actions';
import {fromStateToUrl} from './parser';

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

    store.subscribe(() => {
        const state = store.getState();
        const newUrl = fromStateToUrl(state);
        if (newUrl.href !== window.location.href) {
            window.history.pushState(state, '', newUrl.pathname);
        }
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
