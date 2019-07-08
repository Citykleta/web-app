import {Store} from 'redux';
import {ApplicationState} from '../store/store';
import {View} from './reducer';
import {selectView} from './actions';

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
    return {
        selectView(view: View) {
            store.dispatch(selectView(view));
        },
        getView(): View {
            return store.getState().navigation.selectedView;
        }
    };
};
