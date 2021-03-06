import {html, LitElement} from 'lit-element';
import {Theme} from '../reducer';
import {style} from './settings-panel.style';
import {SettingsService} from '../service';
import {ServiceRegistry} from '../../common/service-registry';
import {style as contentPanelStyle} from '../../common/elements/panel-content.style'

export const template = ({onChange, theme}) => html`
<div>
    <label>
        <span>Theme</span>
        <select @change="${onChange}" name="theme">
                <option value="${Theme.LIGHT}" ?selected="${theme === Theme.LIGHT}">Light</option>
                <option value="${Theme.DARK}" ?selected="${theme === Theme.DARK}">Dark</option>
        </select>
    </label>
</div>`;

export const propDef = {};

export class SettingsPanel extends LitElement {

    private readonly _settings: SettingsService = null;

    constructor(serviceRegistry: ServiceRegistry) {
        super();
        this._settings = serviceRegistry.get('settings');
    }

    static get styles() {
        return [style, contentPanelStyle];
    }

    static get properties() {
        return propDef;
    }

    render() {
        const onChange = (ev) => this._settings.changeTheme(ev.target.value);
        const theme = this._settings.getTheme();
        return template({
            onChange,
            theme
        });
    }
}

