import {ApplicationState, EnhancedDispatch} from './store';
import {Store} from 'redux';
import {
    FetchSuggestionsAction,
    fetchSuggestionsFromAPI,
    fetchSuggestionsWithSuccess, selectSuggestion
} from '../actions/search';
import {GeoLocation} from '../utils';
import {ServiceRegistry} from './service-registry';

export interface SearchService {
    search(query: string): Promise<any>;

    selectSuggestion(p: GeoLocation);
}

export const provider = (store: Store<ApplicationState>): SearchService => {
    return {
        async search(query: string): Promise<any> {
            return query ? (<EnhancedDispatch<FetchSuggestionsAction>>store.dispatch)(fetchSuggestionsFromAPI(query))
                : store.dispatch(fetchSuggestionsWithSuccess([]));
        },
        selectSuggestion(p: GeoLocation) {
            return store.dispatch(selectSuggestion(p));
        }
    };
};

export const suggester = (registry: ServiceRegistry) => {
    const {search, store} = registry;
    return async (q: string) => {
        await search.search(q);
        return store.getState().search.suggestions;
    };
};
