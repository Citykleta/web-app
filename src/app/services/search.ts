import {ApplicationState, EnhancedDispatch} from './store';
import {Store} from 'redux';
import {
    fetchSearchResultFromAPI, fetchSearchResultWithSuccess,
    FetchSuggestionsAction,
    fetchSuggestionsFromAPI,
    fetchSuggestionsWithSuccess, selectSuggestion
} from '../actions/search';
import {GeoLocation} from '../utils';
import {ServiceRegistry} from './service-registry';

export interface SearchService {
    searchSuggestion(query: string): Promise<any>;

    search(query: string): Promise<any>;

    selectSuggestion(p: GeoLocation);
}

export const provider = (store: Store<ApplicationState>): SearchService => {
    return {
        async searchSuggestion(query: string): Promise<any> {
            return query ? (<EnhancedDispatch<FetchSuggestionsAction>>store.dispatch)(fetchSuggestionsFromAPI(query))
                : store.dispatch(fetchSuggestionsWithSuccess([]));
        },
        selectSuggestion(p: GeoLocation) {
            return store.dispatch(selectSuggestion(p));
        },
        async search(query: string) {
            return query ? (<EnhancedDispatch<FetchSuggestionsAction>>store.dispatch)(fetchSearchResultFromAPI(query))
                : store.dispatch(fetchSearchResultWithSuccess([]));
        }
    };
};

export const suggester = (registry: ServiceRegistry) => {
    const {search, store} = registry;
    return async (q: string) => {
        await search.searchSuggestion(q);
        return store.getState().search.suggestions;
    };
};
