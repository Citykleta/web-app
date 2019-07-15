import { reducer } from '../../../src/app/map/reducer';
import { selectView } from '../../../src/app/navigation/actions';
import { View } from '../../../src/app/navigation/reducer';
import { ActionType } from '../../../src/app/common/actions';
import { updateMapPosition } from '../../../src/app/map/actions';
import { defaultState } from '../../../src/app/store/store';
export default function ({ test }) {
    test(`should forward previous state if action is not relevant`, t => {
        const state = defaultState();
        t.eq(reducer(state.map, selectView(View.SETTINGS)), defaultState().map);
    });
    test(`should react to ${ActionType.UPDATE_MAP} action by updating the map part of the state`, t => {
        const initial = defaultState();
        t.eq(reducer(initial.map, updateMapPosition({
            center: [123, 654],
            zoom: 6
        })), {
            center: [123, 654],
            zoom: 6
        });
    });
}
