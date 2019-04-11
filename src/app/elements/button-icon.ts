import {html, LitElement} from 'lit-element';
import {style} from './button-icon.style';

export const propDef = {};

export const template = () => html`<button><slot></slot></button>`;

export class ButtonIcon extends LitElement {

    static get styles() {
        return style;
    }

    static get properties() {
        return propDef;
    }

    constructor() {
        super();
    }

    render() {
        return template();
    }
}
