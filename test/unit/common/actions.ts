import {Assert} from 'zora';
import {ActionType, changeHistoryPoint} from '../../../src/app/common/actions';
import {defaultState} from '../../../src/app/store/store';

export default (a: Assert) => {
    a.test('should generate a change history point action', t => {
        t.eq(changeHistoryPoint(defaultState()), {
            type: ActionType.CHANGE_HISTORY_POINT,
            state: defaultState()
        });
    });
};
