import {ActionType} from '../../../src/app/actions/types';
import {Assert} from 'zora';
import {Theme} from '../../../src/app/reducers/settings';
import {UIPointOrPlaceholder} from '../../../src/app/reducers/itinerary';
import {ApplicationState} from '../../../src/app/services/store';
import {Route} from '../../../src/app/utils';
import {
    fetchSuggestions,
    fetchSuggestionsFromAPI,
    fetchSuggestionsWithFailure,
    fetchSuggestionsWithSuccess,
    selectSuggestion
} from '../../../src/app/actions/search';

const setState = (state: { stops: UIPointOrPlaceholder[], routes: Route[], focus?: number }): ApplicationState => ({
    itinerary: Object.assign({focus: null}, state),
    settings: {
        theme: Theme.LIGHT
    },
    tool: {
        selectedTool: null
    },
    search: {
        selectedSuggestion: null,
        suggestions: []
    }
});

export default ({test}: Assert) => {
    test('create a FETCH_SUGGESTIONS action', t => {
        t.eq(fetchSuggestions('don cangrejo'), {
            type: ActionType.FETCH_SUGGESTIONS,
            query: 'don cangrejo'
        });
    });

    test('create a FETCH_SUGGESTIONS_SUCCESS action', t => {
        t.eq(fetchSuggestionsWithSuccess([{
            lng: 1234,
            lat: 4321
        }]), {
            type: ActionType.FETCH_SUGGESTIONS_SUCCESS,
            suggestions: [{
                lng: 1234,
                lat: 4321
            }]
        });
    });

    test('create a FETCH_SUGGESTIONS_FAILURE action', t => {
        t.eq(fetchSuggestionsWithFailure('some error'), {
            type: ActionType.FETCH_SUGGESTIONS_FAILURE,
            error: 'some error'
        });
    });

    test('fetch suggestions from API when API returns suggestions', async t => {
        const actions = [];
        const thunk = fetchSuggestionsFromAPI('revolucion');
        const suggestionsStub = [
            {lng: 1234, lat: 5432}
        ];
        const fakeDispatch = a => actions.push(a);
        const fakeGeocoder = {
            async search(query) {
                return suggestionsStub;
            }
        };

        await thunk(fakeDispatch, () => {
        }, {
            // @ts-ignore
            geocoder: fakeGeocoder
        });

        t.eq(actions, [{
            type: ActionType.FETCH_SUGGESTIONS,
            query: 'revolucion'
        }, {
            type: ActionType.FETCH_SUGGESTIONS_SUCCESS,
            suggestions: suggestionsStub
        }]);
    });

    test('fetch suggestions from API when API fails', async t => {
        const actions = [];
        const thunk = fetchSuggestionsFromAPI('revolucion');
        const fakeDispatch = a => actions.push(a);
        const error = new Error('oh no!');
        const fakeGeocoder = {
            async search(query) {
                throw error;
            }
        };

        await thunk(fakeDispatch, () => {
        }, {
            // @ts-ignore
            geocoder: fakeGeocoder
        });

        t.eq(actions, [{
            type: ActionType.FETCH_SUGGESTIONS,
            query: 'revolucion'
        }, {
            type: ActionType.FETCH_SUGGESTIONS_FAILURE,
            error
        }]);
    });

    test('create a SELECT_SUGGESTION action', t => {
        t.eq(selectSuggestion({
            lng: 5432,
            lat: 1234
        }), {
            type: ActionType.SELECT_SUGGESTION,
            suggestion: {
                lng: 5432,
                lat: 1234
            }
        });
    });
}
