import {ServiceRegistry} from '../services/service-registry';
import {Component} from './types';
import {Theme} from '../reducers/settings';
import {changeTheme} from '../actions/settings';

const template = (theme) => `
<h2>Settings</h2>
<div class="tool-content">
<label>
<span>Theme</span>
<select>
<option value="${Theme.LIGHT}" ${theme === Theme.LIGHT ? 'selected' : ''}>Light</option>
<option value="${Theme.DARK}" ${theme === Theme.DARK ? 'selected' : ''}>Dark</option>
</select>
</label>
</div>
`;

export const factory = (registry: ServiceRegistry): Component => {
    const {store} = registry;
    const {theme} = store.getState().settings;
    const domElement = document.createElement('DIV');
    domElement.innerHTML = template(theme);
    const range = document.createRange();
    range.selectNodeContents(domElement);
    const select = domElement.querySelector('select');

    select.addEventListener('input', ({target}) => {
        //@ts-ignore todo
        const {value} = target;
        store.dispatch(changeTheme(value));
    });

    return {
        clean() {
        },
        dom() {
            return range.extractContents();
        }
    };
};

