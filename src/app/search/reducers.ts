import {Reducer} from 'redux';
import {SearchResult} from '../utils';
import {ActionType} from '../common/actions';

export interface SearchState {
    searchResult: SearchResult[];
    isSearching: boolean;
    selectedSearchResult: SearchResult;
}

export const defaultState = () => ({
    searchResult: [],
    isSearching: false,
    selectedSearchResult: null
});

export const reducer: Reducer<SearchState> = (previousState = defaultState(), action) => {
    switch (action.type) {
        case ActionType.FETCH_POINTS_OF_INTEREST:
        case ActionType.FETCH_SEARCH_RESULT:
        case ActionType.FETCH_CLOSEST: {
            return Object.assign({}, previousState, {
                searchResult: [],
                isSearching: true,
                selectedSearchResult: null
            });
        }
        case ActionType.FETCH_POINTS_OF_INTEREST_SUCCESS:
        case ActionType.FETCH_CLOSEST_SUCCESS:
        case ActionType.FETCH_SEARCH_RESULT_SUCCESS:
            const {result: searchResult} = action;
            const selectedSearchResult = searchResult.length === 1 ? searchResult[0] : null;
            return Object.assign({}, previousState, {
                searchResult: searchResult.map((s, i) => Object.assign(s, {
                    id: i
                })),
                isSearching: false,
                selectedSearchResult
            });
        case ActionType.FETCH_CLOSEST_FAILURE:
        case ActionType.FETCH_SEARCH_RESULT_FAILURE:
            return Object.assign({}, previousState, {isSearching: false});
        case ActionType.SELECT_SEARCH_RESULT:
            return Object.assign({}, previousState, {
                selectedSearchResult: action.searchResult
            });
        default:
            return previousState;
    }
};
