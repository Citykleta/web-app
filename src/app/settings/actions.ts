import {Action} from 'redux';
import {ActionType} from '../common/actions';
import {Theme} from './reducer';

export interface ChangeThemeAction extends Action<ActionType.CHANGE_THEME> {
    theme: Theme
}

export const changeTheme = (theme: Theme): ChangeThemeAction => ({
    type: ActionType.CHANGE_THEME,
    theme
});
