import {Assert} from 'zora';
import {changeTheme} from '../../../src/app/actions/settings';
import {Theme} from '../../../src/app/reducers/settings';
import {ActionType} from '../../../src/app/actions/types';

export default ({test}: Assert) => {
    test('create a CHANGE_THEME action', t => {
        t.eq(changeTheme(Theme.DARK), {
            type: ActionType.CHANGE_THEME,
            theme: Theme.DARK
        });
    });
}
