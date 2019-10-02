import {FetchLeisureRoutesAction, fetchLeisureRoutesFromAPI, selectLeisureRoute, selectLeisureStop} from './actions';
import {ApplicationState, EnhancedDispatch} from '../store/store';
import {Store} from 'redux';

export interface LeisureService {
    searchRoutes(): Promise<any>;

    selectRoute(id: number): void;

    selectStop(id: number): void;
}

const leisureActions = {
    fetchLeisureRoutesFromAPI,
    selectLeisureRoute
};

export const provider = (store: Store<ApplicationState>, {
    fetchLeisureRoutesFromAPI,
    selectLeisureRoute
} = leisureActions): LeisureService => {
    return {
        async searchRoutes() {
            (<EnhancedDispatch<FetchLeisureRoutesAction>>store.dispatch)(fetchLeisureRoutesFromAPI());
        },
        selectRoute(id: number): void {
            store.dispatch(selectLeisureRoute(id));
        },

        selectStop(id: number): void {
            store.dispatch(selectLeisureStop(id));
        }
    };
};