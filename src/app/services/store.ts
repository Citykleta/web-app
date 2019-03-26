import {Action, applyMiddleware, createStore, Store} from 'redux';
import thunk, {ThunkDispatch} from 'redux-thunk';
import {ItineraryState} from '../reducers/itinerary';
import {ToolBoxState} from '../reducers/tool-box';
import reducer from '../reducers/index';
import {Directions, factory as directionsAPI} from '../sdk/directions';
import {SettingsState, Theme} from '../reducers/settings';
import {Geocoder,} from '../sdk/geocoder';
import {factory as geocoderAPI} from '../sdk/geocoder';
import {SearchState} from '../reducers/search';
import {ToolType} from '../tools/interfaces';

export interface ApplicationState {
    tool: ToolBoxState;
    itinerary: ItineraryState;
    settings: SettingsState,
    search: SearchState
}

export interface API {
    directions: Directions
    geocoder: Geocoder
}

const debugMiddleware = store => next => action => {
    console.log(action);
    return next(action);
};

export const store = (api: API = {
    directions: directionsAPI(),
    geocoder: geocoderAPI()
}) => (initialState: ApplicationState = {
    tool: {
        selectedTool: ToolType.SEARCH
    },
    itinerary: {
        focus: null,
        stops: [{
            id: 0
        }, {
            id: 1
        }],
        routes: []
    },
    settings: {
        theme: Theme.LIGHT
    },
    search: {
        suggestions: [],
        selectedSuggestion: null
    }
}): Store<ApplicationState> => createStore(reducer, initialState, applyMiddleware(thunk.withExtraArgument<API>(api),
    debugMiddleware
));


export interface EnhancedDispatch<K extends Action<any>> extends ThunkDispatch<ApplicationState, API, K> {
}
