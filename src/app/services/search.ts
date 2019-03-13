import {ApplicationState, EnhancedDispatch} from './store';
import {Store} from 'redux';
import {
    fetchSuggestions,
    FetchSuggestionsAction,
    fetchSuggestionsFromAPI,
    fetchSuggestionsWithSuccess
} from '../actions/search';

export interface SearchService {
    search(query: string): Promise<any>;
}

export const provider = (store: Store<ApplicationState>): SearchService => {
    return {
        async search(query: string): Promise<any> {
            return query ? (<EnhancedDispatch<FetchSuggestionsAction>>store.dispatch)(fetchSuggestionsFromAPI(query))
                : fetchSuggestionsWithSuccess([]);
        }
    };
};
