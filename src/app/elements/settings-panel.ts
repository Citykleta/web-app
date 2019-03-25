import {html, LitElement} from 'lit-element';
import {ServiceRegistry} from '../services/service-registry';
import {Theme} from '../reducers/settings';
import {Store} from 'redux';
import {ApplicationState} from '../services/store';
import {changeTheme} from '../actions/settings';

export const template = ({onChange, theme}) => {
    return html`
<link rel="stylesheet" href="settings-panel.css">
<label>
    <span>Theme</span>
    <select @change="${onChange}" name="theme">
            <option value="${Theme.LIGHT}" ?selected="${theme === Theme.LIGHT}">Light</option>
            <option value="${Theme.DARK}" ?selected="${theme === Theme.DARK}">Dark</option>
    </select>
</label>`;
};

export const propDef = {};


export class SettingsPanel extends LitElement {

    static get properties() {
        return propDef;
    }

    private store: Store<ApplicationState> = null;

    constructor({store}: ServiceRegistry) {
        super();
        this.store = store;
    }

    render() {
        const onChange = (ev) => this.store.dispatch(changeTheme(ev.target.value));
        const {theme} = this.store.getState().settings;
        return template({
            onChange,
            theme
        });
    }
}

