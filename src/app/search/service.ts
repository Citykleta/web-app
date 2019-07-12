import {ApplicationState, EnhancedDispatch} from '../store/store';
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
} from './actions';
import {GeoCoord, SearchResult} from '../utils';
import {updateMapPosition} from '../map/actions';
import {createSearchResultInstance} from './elements/search-result';

export interface SearchService {
    searchPointOfInterest(query: string): Promise<any>;

    searchPointOfInterestNearBy(location: GeoCoord): Promise<any>;

    searchAddress(query: string): Promise<any>;

    selectSearchResult(r: SearchResult);

    getSearchResult(): SearchResult[];
}

const searchActions = {
    fetchPointsOfInterestFromAPI,
    fetchPointsOfInterestWithSuccess,
    fetchSearchResultFromAPI,
    fetchSearchResultWithSuccess,
    selectSearchResult,
    fetchClosestFromAPI,
    updateMapPosition
};
export const provider = (store: Store<ApplicationState>, {
    fetchPointsOfInterestFromAPI,
    fetchPointsOfInterestWithSuccess,
    fetchSearchResultFromAPI,
    fetchSearchResultWithSuccess,
    selectSearchResult,
    fetchClosestFromAPI,
    updateMapPosition
} = searchActions): SearchService => ({
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
        const {lng, lat} = createSearchResultInstance(r).toPoint();
        store.dispatch(selectSearchResult(r));
        store.dispatch(updateMapPosition({
            center: [lng, lat],
            zoom: 15
        }));
    },
    getSearchResult() {
        return store.getState().search.searchResult;
    }
});
