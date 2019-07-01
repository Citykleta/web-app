import {ClickTool, ToolType} from './interfaces';
import {ServiceRegistry} from '../services/service-registry';
import {createGeoCoord, PointOfInterestSearchResult} from '../utils';
import {fetchSearchResultWithSuccess, selectSearchResult} from '../actions/search';

const TRESHOLD = 10;

export const searchPointerTool = (registry: ServiceRegistry): ClickTool => {
    const {search, store} = registry;
    return {
        type: ToolType.SEARCH,
        async actionClick(p) {
            const {lng, lat} = p;
            await search.searchPointOfInterestNearBy({lng, lat});
            const suggestions = store.getState().search.searchResult;

            if (suggestions.length && (<PointOfInterestSearchResult>suggestions[0]).distance < TRESHOLD) {
                store.dispatch(fetchSearchResultWithSuccess([]));
                return store.dispatch(selectSearchResult(suggestions[0]));
            }

            const newSuggestions = [...suggestions];
            newSuggestions.unshift(createGeoCoord(lng, lat));
            if (newSuggestions.length > 1) {
                newSuggestions.pop();
            }
            store.dispatch(fetchSearchResultWithSuccess(newSuggestions));
            return store.dispatch(selectSearchResult(newSuggestions[0]));
        }
    };
};
