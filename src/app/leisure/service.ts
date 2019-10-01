import {FetchLeisureRoutesAction, fetchLeisureRoutesFromAPI, selectLeisureRoute} from './actions';
import {ApplicationState, EnhancedDispatch} from '../store/store';
import {Store} from 'redux';

export interface LeisureService {
    searchRoutes(): Promise<any>;

    selectRoute(id: number): void;
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
        }
    };
};