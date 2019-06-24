import {ApplicationState, EnhancedDispatch} from './store';
import {Store} from 'redux';
import {
    FetchClosestAction,
    fetchClosestFromAPI,
    FetchPointsOfInterestAction,
    fetchPointsOfInterestFromAPI,
    fetchPointsOfInterestWithSuccess,
    fetchSearchResultFromAPI,
    fetchSearchResultWithSuccess,
    selectSearchResult
} from '../actions/search';
import {GeoCoord, SearchResult} from '../utils';

export interface SearchService {
    searchPointOfInterest(query: string): Promise<any>;

    searchPointOfInterestNearBy(location: GeoCoord): Promise<any>;

    searchAddress(query: string): Promise<any>;

    selectSearchResult(r: SearchResult);

}

const searchActions = {
    fetchPointsOfInterestFromAPI,
    fetchPointsOfInterestWithSuccess,
    fetchSearchResultFromAPI,
    fetchSearchResultWithSuccess,
    selectSearchResult,
    fetchClosestFromAPI
};
export const provider = (store: Store<ApplicationState>, {
    fetchPointsOfInterestFromAPI,
    fetchPointsOfInterestWithSuccess,
    fetchSearchResultFromAPI,
    fetchSearchResultWithSuccess,
    selectSearchResult,
    fetchClosestFromAPI
} = searchActions): SearchService => {
    return {
        async searchPointOfInterest(query: string): Promise<any> {
            return query ? (<EnhancedDispatch<FetchPointsOfInterestAction>>store.dispatch)(fetchPointsOfInterestFromAPI(query))
                : store.dispatch(fetchPointsOfInterestWithSuccess([]));
        },
        async searchPointOfInterestNearBy(location: GeoCoord) {
            return (<EnhancedDispatch<FetchClosestAction>>store.dispatch)(fetchClosestFromAPI(location));
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
