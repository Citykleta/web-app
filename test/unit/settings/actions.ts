import {Assert} from 'zora';
import {changeTheme} from '../../../src/app/settings/actions';
import {Theme} from '../../../src/app/settings/reducer';
import {ActionType} from '../../../src/app/common/actions';

export default ({test}: Assert) => {
    test('create a CHANGE_THEME action', t => {
        t.eq(changeTheme(Theme.DARK), {
            type: ActionType.CHANGE_THEME,
            theme: Theme.DARK
        });
    });
}
