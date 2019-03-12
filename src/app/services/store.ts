import {applyMiddleware, createStore, Store} from 'redux';
import thunk from 'redux-thunk';
import {ItineraryState} from '../reducers/itinerary';
import {ToolBoxState} from '../reducers/tool-box';
import reducer from '../reducers/index';
import {Directions, factory as directionsAPI} from '../sdk/directions';
import {SettingsState, Theme} from '../reducers/settings';

export interface ApplicationState {
    tool: ToolBoxState;
    itinerary: ItineraryState;
    settings: SettingsState
}

export interface API {
    directions: Directions
}

const debugMiddleware = store => next => action => {
    console.log(action);
    return next(action);
};

export const store = (api: API = {
    directions: directionsAPI()
}) => (initialState: ApplicationState = {
    tool: {
        selectedTool: null
    },
    itinerary: {
        stops: [],
        routes: []
    },
    settings: {
        theme: Theme.LIGHT
    }
}): Store<ApplicationState> => createStore(reducer, initialState, applyMiddleware(thunk.withExtraArgument<API>(api),
    // debugMiddleware
));
