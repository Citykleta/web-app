import {store} from './store';
import {fromUrlToState} from '../navigation/parser';
import {deserialize} from '../storage/url';

const initialState = deserialize(new URL(window.location.href));
export default store()(initialState);
