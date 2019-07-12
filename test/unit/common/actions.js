import { ActionType } from '../../../src/app/common/actions';
import { changeHistoryPoint } from '../../../src/app/common/actions';
import { defaultState } from '../utils';
export default (a) => {
    a.test('should generate a change history point action', t => {
        t.eq(changeHistoryPoint(defaultState()), {
            type: ActionType.CHANGE_HISTORY_POINT,
            state: defaultState()
        });
    });
};
