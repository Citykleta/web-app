import {createStore, applyMiddleware, Store} from 'redux';
import thunk from 'redux-thunk';
import {ItineraryState} from '../reducers/itinerary';
import {ToolBoxState} from '../reducers/tool-box';
import reducer from '../reducers/index';
import {Directions, factory as directionsAPI} from '../sdk/directions';

export interface ApplicationState {
    tool: ToolBoxState;
    itinerary: ItineraryState
}

export interface API {
    directions: Directions
}

const debugMiddleware =  store => next => action => {
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
    }
}): Store<ApplicationState> => createStore(reducer, initialState, applyMiddleware(thunk.withExtraArgument<API>(api),
    // debugMiddleware
    ));
