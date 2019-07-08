import {Assert} from 'zora';
import {selectView} from '../../../src/app/navigation/actions';
import {View} from '../../../src/app/navigation/reducer';
import {ActionType} from '../../../src/app/common/actions';

export default (a: Assert) => {
    a.test('should generate a select view action', t => {
        t.eq(selectView(View.SETTINGS), {
            type: ActionType.SELECT_VIEW,
            view: View.SETTINGS
        });
    });
};
