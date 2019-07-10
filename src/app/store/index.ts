import {store} from './store';
import {fromUrlToState} from '../navigation/parser';

const initialState = fromUrlToState(new URL(window.location.href));
export default store()(initialState);
