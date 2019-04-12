import { reducer } from '../../../src/app/reducers/search';
import { addItineraryPoint } from '../../../src/app/actions/itinerary';
import { fetchSuggestionsWithSuccess, selectSuggestion } from '../../../src/app/actions/search';
const defaultState = () => ({
    suggestions: [],
    selectedSuggestion: null
});
export default ({ test }) => {
    test('should return state is if the action type is not related to search', t => {
        const initialState = defaultState();
        const actual = reducer(initialState, addItineraryPoint({ lng: 5432, lat: 1234 }));
        t.eq(actual, initialState, 'should return the same state');
    });
    test('responding to FETCH_SUGGESTIONS action, should change the suggestions part of the search state', t => {
        const initialState = defaultState();
        const actual = reducer(initialState, fetchSuggestionsWithSuccess([
            { lng: 5432, lat: 1234 }, { lng: 754, lat: 344 }
        ]));
        t.eq(actual, {
            suggestions: [{
                    id: 0,
                    lng: 5432,
                    lat: 1234
                }, {
                    id: 1,
                    lng: 754,
                    lat: 344
                }],
            selectedSuggestion: null
        });
    });
    test('responding to SELECT_SUGGESTION action, should change the selectedSuggestion part of the state', t => {
        const suggestions = [{ id: 0, lng: 5432, lat: 1234 }];
        const initialState = Object.assign(defaultState(), {
            suggestions
        });
        t.eq(reducer(initialState, selectSuggestion(suggestions[0])), {
            suggestions,
            selectedSuggestion: suggestions[0]
        });
    });
};
