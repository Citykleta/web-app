import {ApplicationState, EnhancedDispatch} from './store';
import {Store} from 'redux';
import {
    FetchPointsOfInterestAction,
    fetchPointsOfInterestFromAPI,
    fetchPointsOfInterestWithSuccess,
    fetchSearchResultFromAPI,
    fetchSearchResultWithSuccess,
    selectSearchResult
} from '../actions/search';
import {SearchResult} from '../utils';

export interface SearchService {
    searchPointOfInterest(query: string): Promise<any>;

    searchAddress(query: string): Promise<any>;

    selectSearchResult(r: SearchResult);
}

export const provider = (store: Store<ApplicationState>): SearchService => {
    return {
        async searchPointOfInterest(query: string): Promise<any> {
            return query ? (<EnhancedDispatch<FetchPointsOfInterestAction>>store.dispatch)(fetchPointsOfInterestFromAPI(query))
                : store.dispatch(fetchPointsOfInterestWithSuccess([])); // todo should cancel any pending request ? ...
        },
        async searchAddress(query: string) {
            return query ? (<EnhancedDispatch<FetchPointsOfInterestAction>>store.dispatch)(fetchSearchResultFromAPI(query))
                : store.dispatch(fetchSearchResultWithSuccess([]));
        },
        selectSearchResult(r) {
            return store.dispatch(selectSearchResult(r));
        }
    };
};
