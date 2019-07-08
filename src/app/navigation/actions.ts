import {ActionType} from '../common/actions';
import {Action} from 'redux';
import {View} from './reducer';

export interface SelectViewAction extends Action<ActionType.SELECT_VIEW> {
    view: View
}

export const selectView = (view: View): SelectViewAction => ({
    type: ActionType.SELECT_VIEW,
    view
});
